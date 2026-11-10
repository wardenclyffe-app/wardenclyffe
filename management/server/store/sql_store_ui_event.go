package store

import (
	"context"
	"errors"

	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"github.com/shippin/wardenclyffe/management/server/types"
	"github.com/shippin/wardenclyffe/shared/management/status"
)

// CreateUIEvent stores a new UI event definition.
func (s *SqlStore) CreateUIEvent(ctx context.Context, event *types.UIEvent) error {
	if err := s.db.Create(event).Error; err != nil {
		log.WithContext(ctx).Errorf("failed to create UI event: %v", err)
		return status.Errorf(status.Internal, "failed to create UI event")
	}
	return nil
}

// GetAccountUIEvents returns all UI event definitions belonging to an account.
func (s *SqlStore) GetAccountUIEvents(ctx context.Context, accountID string) ([]*types.UIEvent, error) {
	var events []*types.UIEvent
	if err := s.db.
		Where(accountIDCondition, accountID).
		Order("priority DESC, id ASC").
		Find(&events).Error; err != nil {
		log.WithContext(ctx).Errorf("failed to list UI events: %v", err)
		return nil, status.Errorf(status.Internal, "failed to list UI events")
	}
	if events == nil {
		events = make([]*types.UIEvent, 0)
	}
	return events, nil
}

// UpdateUIEvent updates a definition only when it belongs to the account.
func (s *SqlStore) UpdateUIEvent(ctx context.Context, accountID, eventID string, event *types.UIEvent) error {
	updates := map[string]any{
		"enabled":           event.Enabled,
		"route":             event.Route,
		"target":            event.Target,
		"trigger":           event.Trigger,
		"kind":              event.Kind,
		"title":             event.Title,
		"body":              event.Body,
		"priority":          event.Priority,
		"provenance_source": event.Provenance.Source,
		"provenance_signal": event.Provenance.Signal,
	}
	return s.transaction(func(tx *gorm.DB) error {
		var existing types.UIEvent
		err := tx.Where(accountAndIDQueryCondition, accountID, eventID).Take(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return status.Errorf(status.NotFound, "UI event not found")
		}
		if err != nil {
			log.WithContext(ctx).Errorf("failed to find UI event for update: %v", err)
			return status.Errorf(status.Internal, "failed to update UI event")
		}

		result := tx.Model(&types.UIEvent{}).
			Where(accountAndIDQueryCondition, accountID, eventID).
			Updates(updates)
		if result.Error != nil {
			log.WithContext(ctx).Errorf("failed to update UI event: %v", result.Error)
			return status.Errorf(status.Internal, "failed to update UI event")
		}
		if result.RowsAffected == 0 {
			var count int64
			if err := tx.Model(&types.UIEvent{}).
				Where(accountAndIDQueryCondition, accountID, eventID).
				Count(&count).Error; err != nil {
				log.WithContext(ctx).Errorf("failed to verify UI event update: %v", err)
				return status.Errorf(status.Internal, "failed to update UI event")
			}
			if count == 0 {
				return status.Errorf(status.NotFound, "UI event not found")
			}
		}
		return nil
	})
}

// DeleteUIEvent deletes a definition only when it belongs to the account.
func (s *SqlStore) DeleteUIEvent(ctx context.Context, accountID, eventID string) error {
	result := s.db.Delete(&types.UIEvent{}, accountAndIDQueryCondition, accountID, eventID)
	if result.Error != nil {
		log.WithContext(ctx).Errorf("failed to delete UI event: %v", result.Error)
		return status.Errorf(status.Internal, "failed to delete UI event")
	}
	if result.RowsAffected == 0 {
		return status.Errorf(status.NotFound, "UI event not found")
	}
	return nil
}
