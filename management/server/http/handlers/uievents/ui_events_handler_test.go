package uievents

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/require"

	nbcontext "github.com/shippin/wardenclyffe/management/server/context"
	"github.com/shippin/wardenclyffe/management/server/permissions"
	"github.com/shippin/wardenclyffe/management/server/store"
	"github.com/shippin/wardenclyffe/management/server/types"
	"github.com/shippin/wardenclyffe/shared/auth"
)

func newTestRouter(t *testing.T, allowUpdate bool) (*mux.Router, *store.SqlStore) {
	t.Helper()
	ctx := context.Background()
	sqlStore, err := store.NewSqliteStore(ctx, t.TempDir(), nil, false)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, sqlStore.Close(ctx))
	})

	for _, accountID := range []string{"account-a", "account-b", "account-c"} {
		user := types.NewAdminUser("user-" + accountID)
		user.AccountID = accountID
		if !allowUpdate {
			user.Role = types.UserRoleNetworkAdmin
		}
		require.NoError(t, sqlStore.SaveUser(ctx, user))
	}

	router := mux.NewRouter()
	AddEndpoints(sqlStore, permissions.NewManager(sqlStore), router)
	return router, sqlStore
}

func uiEventRequest(method, path, body, accountID string) *http.Request {
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	if accountID != "" {
		request = nbcontext.SetUserAuthInRequest(request, auth.UserAuth{
			UserId:    "user-" + accountID,
			AccountId: accountID,
		})
	}
	return request
}

func TestUIEventsHandlerCreateListUpdateDelete(t *testing.T) {
	router, _ := newTestRouter(t, true)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, uiEventRequest(http.MethodPost, "/ui-events", validInputJSON(), "account-a"))
	require.Equal(t, http.StatusCreated, recorder.Code)

	var created map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &created))
	require.Len(t, created, 10)
	require.NotEmpty(t, created["id"])
	require.Equal(t, false, created["enabled"])
	require.Equal(t, "/agent-network", created["route"])
	require.Equal(t, "overview", created["target"])
	require.Equal(t, "hover", created["trigger"])
	require.Equal(t, "tooltip", created["kind"])
	require.Equal(t, "Help", created["title"])
	require.Equal(t, "Plain text", created["body"])
	require.EqualValues(t, 7, created["priority"])
	require.Equal(t, map[string]any{"source": "operator", "signal": "configuration"}, created["provenance"])

	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, uiEventRequest(http.MethodGet, "/ui-events", "", "account-a"))
	require.Equal(t, http.StatusOK, recorder.Code)
	var listed []map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &listed))
	require.Len(t, listed, 1)
	require.Equal(t, created, listed[0])

	id := created["id"].(string)
	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, uiEventRequest(http.MethodPut, "/ui-events/"+id, updatedInputJSON(), "account-a"))
	require.Equal(t, http.StatusOK, recorder.Code)
	var updated map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &updated))
	require.Equal(t, id, updated["id"])
	require.Equal(t, true, updated["enabled"])
	require.Equal(t, "Updated", updated["title"])
	require.EqualValues(t, 0, updated["priority"])

	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, uiEventRequest(http.MethodDelete, "/ui-events/"+id, "", "account-a"))
	require.Equal(t, http.StatusOK, recorder.Code)

	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, uiEventRequest(http.MethodGet, "/ui-events", "", "account-a"))
	require.Equal(t, http.StatusOK, recorder.Code)
	require.JSONEq(t, "[]", recorder.Body.String())
}

func TestUIEventsHandlerEnforcesPermissionsAndAccountIsolation(t *testing.T) {
	router, sqlStore := newTestRouter(t, true)
	first := &types.UIEvent{
		AccountID: "account-a",
		ID:        "shared-id",
		Enabled:   true,
		Route:     "/agent-network",
		Target:    "overview",
		Trigger:   "focus",
		Kind:      "popup",
		Title:     "Account A",
		Body:      "A",
		Priority:  1,
		Provenance: types.UIEventProvenance{
			Source: "operator",
			Signal: "signal-a",
		},
	}
	second := *first
	second.AccountID = "account-b"
	second.Title = "Account B"
	second.Provenance.Signal = "signal-b"
	require.NoError(t, sqlStore.CreateUIEvent(context.Background(), first))
	require.NoError(t, sqlStore.CreateUIEvent(context.Background(), &second))

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, uiEventRequest(http.MethodGet, "/ui-events", "", "account-a"))
	require.Equal(t, http.StatusOK, recorder.Code)
	var firstList []map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &firstList))
	require.Len(t, firstList, 1)
	require.Equal(t, "Account A", firstList[0]["title"])

	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, uiEventRequest(http.MethodPut, "/ui-events/shared-id", updatedInputJSON(), "account-b"))
	require.Equal(t, http.StatusOK, recorder.Code)
	accountAEvents, err := sqlStore.GetAccountUIEvents(context.Background(), "account-a")
	require.NoError(t, err)
	require.Equal(t, "Account A", accountAEvents[0].Title)
	accountBEvents, err := sqlStore.GetAccountUIEvents(context.Background(), "account-b")
	require.NoError(t, err)
	require.Equal(t, "Updated", accountBEvents[0].Title)

	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, uiEventRequest(http.MethodDelete, "/ui-events/shared-id", "", "account-c"))
	require.Equal(t, http.StatusNotFound, recorder.Code)
	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, uiEventRequest(http.MethodPut, "/ui-events/shared-id", updatedInputJSON(), "account-c"))
	require.Equal(t, http.StatusNotFound, recorder.Code)
	accountBEvents, err = sqlStore.GetAccountUIEvents(context.Background(), "account-b")
	require.NoError(t, err)
	require.Len(t, accountBEvents, 1)

	deniedRouter, _ := newTestRouter(t, false)
	for _, mutation := range []struct {
		method string
		path   string
		body   string
	}{
		{method: http.MethodPost, path: "/ui-events", body: validInputJSON()},
		{method: http.MethodPut, path: "/ui-events/eventid", body: updatedInputJSON()},
		{method: http.MethodDelete, path: "/ui-events/eventid"},
	} {
		recorder = httptest.NewRecorder()
		deniedRouter.ServeHTTP(recorder, uiEventRequest(mutation.method, mutation.path, mutation.body, "account-a"))
		require.Equal(t, http.StatusForbidden, recorder.Code)
	}
	recorder = httptest.NewRecorder()
	deniedRouter.ServeHTTP(recorder, uiEventRequest(http.MethodGet, "/ui-events", "", "account-a"))
	require.Equal(t, http.StatusOK, recorder.Code)
	require.JSONEq(t, "[]", recorder.Body.String())

	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, uiEventRequest(http.MethodGet, "/ui-events", "", "account-c"))
	require.Equal(t, http.StatusOK, recorder.Code)
	require.JSONEq(t, "[]", recorder.Body.String())
}

func TestUIEventsHandlerRequiresAuthenticationAndValidInput(t *testing.T) {
	router, _ := newTestRouter(t, true)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, uiEventRequest(http.MethodGet, "/ui-events", "", ""))
	require.Equal(t, http.StatusUnauthorized, recorder.Code)

	invalidInputs := []struct {
		name string
		body string
		code int
	}{
		{name: "malformed JSON", body: `{"enabled":`, code: http.StatusBadRequest},
		{name: "client supplied ID", body: strings.TrimSuffix(validInputJSON(), "}") + `,"id":"client-id"}`, code: http.StatusBadRequest},
		{name: "missing required fields", body: `{"enabled":true}`, code: http.StatusBadRequest},
		{name: "unknown enum", body: strings.Replace(validInputJSON(), `"hover"`, `"load"`, 1), code: http.StatusUnprocessableEntity},
		{name: "unknown kind", body: strings.Replace(validInputJSON(), `"tooltip"`, `"action"`, 1), code: http.StatusUnprocessableEntity},
		{name: "invalid target", body: strings.Replace(validInputJSON(), `"overview"`, `"bad target"`, 1), code: http.StatusUnprocessableEntity},
		{name: "query in route", body: strings.Replace(validInputJSON(), `"/agent-network"`, `"/agent-network?x=1"`, 1), code: http.StatusUnprocessableEntity},
		{name: "fragment in route", body: strings.Replace(validInputJSON(), `"/agent-network"`, `"/agent-network#target"`, 1), code: http.StatusUnprocessableEntity},
		{name: "whitespace in route", body: strings.Replace(validInputJSON(), `"/agent-network"`, `"/agent network"`, 1), code: http.StatusUnprocessableEntity},
		{name: "priority too large", body: strings.Replace(validInputJSON(), `"priority":7`, `"priority":100001`, 1), code: http.StatusUnprocessableEntity},
		{name: "title too long", body: strings.Replace(validInputJSON(), `"Help"`, fmt.Sprintf(`"%s"`, strings.Repeat("x", 201)), 1), code: http.StatusUnprocessableEntity},
		{name: "body too long", body: strings.Replace(validInputJSON(), `"Plain text"`, fmt.Sprintf(`"%s"`, strings.Repeat("x", 4001)), 1), code: http.StatusUnprocessableEntity},
		{name: "source too long", body: strings.Replace(validInputJSON(), `"operator"`, fmt.Sprintf(`"%s"`, strings.Repeat("x", 201)), 1), code: http.StatusUnprocessableEntity},
		{name: "signal too long", body: strings.Replace(validInputJSON(), `"configuration"`, fmt.Sprintf(`"%s"`, strings.Repeat("x", 201)), 1), code: http.StatusUnprocessableEntity},
		{name: "unknown executable field", body: strings.TrimSuffix(validInputJSON(), "}") + `,"action":"javascript:alert(1)"}`, code: http.StatusBadRequest},
	}
	for _, test := range invalidInputs {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, uiEventRequest(http.MethodPost, "/ui-events", test.body, "account-a"))
			require.Equal(t, test.code, recorder.Code, recorder.Body.String())
		})
	}
}

func validInputJSON() string {
	return `{"enabled":false,"route":"/agent-network","target":"overview","trigger":"hover","kind":"tooltip","title":"Help","body":"Plain text","priority":7,"provenance":{"source":"operator","signal":"configuration"}}`
}

func updatedInputJSON() string {
	return `{"enabled":true,"route":"/agent-network/settings","target":"settings.panel","trigger":"click","kind":"popup","title":"Updated","body":"Updated text","priority":0,"provenance":{"source":"system","signal":"refresh"}}`
}
