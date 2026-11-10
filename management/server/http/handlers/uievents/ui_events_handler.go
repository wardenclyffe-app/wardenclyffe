package uievents

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/gorilla/mux"
	"github.com/rs/xid"
	log "github.com/sirupsen/logrus"

	nbcontext "github.com/shippin/wardenclyffe/management/server/context"
	"github.com/shippin/wardenclyffe/management/server/permissions"
	"github.com/shippin/wardenclyffe/management/server/permissions/modules"
	"github.com/shippin/wardenclyffe/management/server/permissions/operations"
	"github.com/shippin/wardenclyffe/management/server/store"
	"github.com/shippin/wardenclyffe/management/server/types"
	"github.com/shippin/wardenclyffe/shared/auth"
	"github.com/shippin/wardenclyffe/shared/management/http/util"
	"github.com/shippin/wardenclyffe/shared/management/status"
)

const maxRequestBodyBytes = 32 * 1024

var (
	targetPattern  = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$`)
	eventIDPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,63}$`)
)

type handler struct {
	store              store.Store
	permissionsManager permissions.Manager
}

type input struct {
	Enabled    *bool            `json:"enabled"`
	Route      *string          `json:"route"`
	Target     *string          `json:"target"`
	Trigger    *string          `json:"trigger"`
	Kind       *string          `json:"kind"`
	Title      *string          `json:"title"`
	Body       *string          `json:"body"`
	Priority   *int             `json:"priority"`
	Provenance *inputProvenance `json:"provenance"`
}

type inputProvenance struct {
	Source *string `json:"source"`
	Signal *string `json:"signal"`
}

type malformedRequestError struct {
	err error
}

func (e malformedRequestError) Error() string {
	return e.err.Error()
}

func (e malformedRequestError) Unwrap() error {
	return e.err
}

type eventResponse struct {
	ID         string                  `json:"id"`
	Enabled    bool                    `json:"enabled"`
	Route      string                  `json:"route"`
	Target     string                  `json:"target"`
	Trigger    string                  `json:"trigger"`
	Kind       string                  `json:"kind"`
	Title      string                  `json:"title"`
	Body       string                  `json:"body"`
	Priority   int                     `json:"priority"`
	Provenance types.UIEventProvenance `json:"provenance"`
}

// AddEndpoints registers UI event persistence endpoints.
func AddEndpoints(eventStore store.Store, permissionsManager permissions.Manager, router *mux.Router) {
	h := &handler{store: eventStore, permissionsManager: permissionsManager}
	router.HandleFunc("/ui-events", h.list).Methods(http.MethodGet, http.MethodOptions)
	router.HandleFunc("/ui-events", h.create).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/ui-events/{id}", h.update).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/ui-events/{id}", h.delete).Methods(http.MethodDelete, http.MethodOptions)
}

func (h *handler) list(w http.ResponseWriter, r *http.Request) {
	userAuth, err := authenticatedUser(r)
	if err != nil {
		util.WriteError(r.Context(), err, w)
		return
	}

	events, err := h.store.GetAccountUIEvents(r.Context(), userAuth.AccountId)
	if err != nil {
		util.WriteError(r.Context(), err, w)
		return
	}

	responses := make([]eventResponse, 0, len(events))
	for _, event := range events {
		responses = append(responses, toResponse(event))
	}
	util.WriteJSONObject(r.Context(), w, responses)
}

func (h *handler) create(w http.ResponseWriter, r *http.Request) {
	userAuth, ok := h.authorizeMutation(w, r)
	if !ok {
		return
	}

	event, err := decodeInput(w, r)
	if err != nil {
		writeInputError(r, w, err)
		return
	}
	event.ID = xid.New().String()
	event.AccountID = userAuth.AccountId

	if err := h.store.CreateUIEvent(r.Context(), event); err != nil {
		util.WriteError(r.Context(), err, w)
		return
	}
	writeCreatedJSON(r.Context(), w, toResponse(event))
}

func (h *handler) update(w http.ResponseWriter, r *http.Request) {
	userAuth, ok := h.authorizeMutation(w, r)
	if !ok {
		return
	}

	eventID := mux.Vars(r)["id"]
	if !eventIDPattern.MatchString(eventID) {
		util.WriteError(r.Context(), status.Errorf(status.InvalidArgument, "invalid UI event id"), w)
		return
	}
	event, err := decodeInput(w, r)
	if err != nil {
		writeInputError(r, w, err)
		return
	}
	event.AccountID = userAuth.AccountId
	event.ID = eventID

	if err := h.store.UpdateUIEvent(r.Context(), userAuth.AccountId, eventID, event); err != nil {
		util.WriteError(r.Context(), err, w)
		return
	}
	util.WriteJSONObject(r.Context(), w, toResponse(event))
}

func (h *handler) delete(w http.ResponseWriter, r *http.Request) {
	userAuth, ok := h.authorizeMutation(w, r)
	if !ok {
		return
	}

	eventID := mux.Vars(r)["id"]
	if !eventIDPattern.MatchString(eventID) {
		util.WriteError(r.Context(), status.Errorf(status.InvalidArgument, "invalid UI event id"), w)
		return
	}
	if err := h.store.DeleteUIEvent(r.Context(), userAuth.AccountId, eventID); err != nil {
		util.WriteError(r.Context(), err, w)
		return
	}
	util.WriteJSONObject(r.Context(), w, util.EmptyObject{})
}

func (h *handler) authorizeMutation(w http.ResponseWriter, r *http.Request) (auth.UserAuth, bool) {
	userAuth, err := authenticatedUser(r)
	if err != nil {
		util.WriteError(r.Context(), err, w)
		return auth.UserAuth{}, false
	}

	allowed, ctx, err := h.permissionsManager.ValidateUserPermissions(
		r.Context(), userAuth.AccountId, userAuth.UserId, modules.Settings, operations.Update,
	)
	if err != nil {
		util.WriteError(ctx, status.NewPermissionValidationError(err), w)
		return auth.UserAuth{}, false
	}
	if !allowed {
		util.WriteError(ctx, status.NewPermissionDeniedError(), w)
		return auth.UserAuth{}, false
	}
	return userAuth, true
}

func authenticatedUser(r *http.Request) (auth.UserAuth, error) {
	userAuth, err := nbcontext.GetUserAuthFromContext(r.Context())
	if err != nil || userAuth.AccountId == "" || userAuth.UserId == "" {
		return auth.UserAuth{}, status.Errorf(status.Unauthorized, "authentication required")
	}
	return userAuth, nil
}

func decodeInput(w http.ResponseWriter, r *http.Request) (*types.UIEvent, error) {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxRequestBodyBytes))
	decoder.DisallowUnknownFields()
	var req input
	if err := decoder.Decode(&req); err != nil {
		return nil, malformedRequestError{err: err}
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return nil, malformedRequestError{err: errors.New("request must contain one JSON object")}
	}
	if req.Enabled == nil || req.Route == nil || req.Target == nil || req.Trigger == nil ||
		req.Kind == nil || req.Title == nil || req.Body == nil || req.Priority == nil ||
		req.Provenance == nil || req.Provenance.Source == nil || req.Provenance.Signal == nil {
		return nil, malformedRequestError{err: errors.New("required UI event fields are missing")}
	}

	event := &types.UIEvent{
		Enabled:  *req.Enabled,
		Route:    *req.Route,
		Target:   *req.Target,
		Trigger:  *req.Trigger,
		Kind:     *req.Kind,
		Title:    *req.Title,
		Body:     *req.Body,
		Priority: *req.Priority,
		Provenance: types.UIEventProvenance{
			Source: *req.Provenance.Source,
			Signal: *req.Provenance.Signal,
		},
	}
	if err := validateEvent(event); err != nil {
		return nil, err
	}
	return event, nil
}

func validateEvent(event *types.UIEvent) error {
	if !validText(event.Title, 200, false) || !validText(event.Body, 4000, true) ||
		!validText(event.Provenance.Source, 200, false) || !validText(event.Provenance.Signal, 200, false) {
		return errors.New("UI event text is empty, too long, or contains invalid control characters")
	}
	if !targetPattern.MatchString(event.Target) {
		return errors.New("invalid UI event target")
	}
	if err := validateRoute(event.Route); err != nil {
		return err
	}
	switch event.Trigger {
	case "hover", "focus", "click", "manual":
	default:
		return errors.New("invalid UI event trigger")
	}
	switch event.Kind {
	case "tooltip", "popup":
	default:
		return errors.New("invalid UI event kind")
	}
	if event.Priority < 0 || event.Priority > 100000 {
		return errors.New("UI event priority is out of range")
	}
	return nil
}

func validText(value string, maxRunes int, allowNewlines bool) bool {
	if strings.TrimSpace(value) == "" || utf8.RuneCountInString(value) > maxRunes {
		return false
	}
	for _, char := range value {
		if unicode.IsControl(char) && !(allowNewlines && (char == '\n' || char == '\r' || char == '\t')) {
			return false
		}
	}
	return true
}

func validateRoute(route string) error {
	if route == "" || utf8.RuneCountInString(route) > 2048 || route[0] != '/' ||
		strings.HasPrefix(route, "//") || strings.ContainsAny(route, "?#\\") {
		return errors.New("route must be an absolute pathname")
	}
	for _, char := range route {
		if unicode.IsSpace(char) || unicode.IsControl(char) {
			return errors.New("route must not contain whitespace or control characters")
		}
	}
	parsed, err := url.ParseRequestURI(route)
	if err != nil || parsed.IsAbs() || parsed.Host != "" || parsed.RawQuery != "" ||
		parsed.Fragment != "" || parsed.Path == "" || parsed.Path[0] != '/' {
		return errors.New("route must be an absolute pathname")
	}
	return nil
}

func writeInputError(r *http.Request, w http.ResponseWriter, err error) {
	var maxBytesError *http.MaxBytesError
	if errors.As(err, &maxBytesError) {
		util.WriteErrorResponse("UI event request is too large", http.StatusBadRequest, w)
		return
	}
	var malformed malformedRequestError
	if errors.As(err, &malformed) {
		util.WriteErrorResponse("invalid UI event request", http.StatusBadRequest, w)
		return
	}
	if _, ok := status.FromError(err); ok {
		util.WriteError(r.Context(), err, w)
		return
	}
	util.WriteError(r.Context(), status.Errorf(status.InvalidArgument, "%s", err.Error()), w)
}

func toResponse(event *types.UIEvent) eventResponse {
	return eventResponse{
		ID:         event.ID,
		Enabled:    event.Enabled,
		Route:      event.Route,
		Target:     event.Target,
		Trigger:    event.Trigger,
		Kind:       event.Kind,
		Title:      event.Title,
		Body:       event.Body,
		Priority:   event.Priority,
		Provenance: event.Provenance,
	}
}

func writeCreatedJSON(ctx context.Context, w http.ResponseWriter, event eventResponse) {
	body, err := json.Marshal(event)
	if err != nil {
		util.WriteError(ctx, err, w)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusCreated)
	if _, err := w.Write(append(body, '\n')); err != nil {
		log.WithContext(ctx).Warnf("failed to write created UI event response: %v", err)
	}
}
