package store

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/shippin/wardenclyffe/management/server/types"
)

func TestSqlStoreUIEventsPersistAndIsolateAccounts(t *testing.T) {
	ctx := context.Background()
	sqlStore, err := NewSqliteStore(ctx, t.TempDir(), nil, false)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, sqlStore.Close(ctx))
	})
	require.True(t, sqlStore.db.Migrator().HasTable("wardenclyffe_core_ui_events"))

	accountAEvent := &types.UIEvent{
		AccountID: "account-a",
		ID:        "shared-id",
		Enabled:   true,
		Route:     "/agent-network",
		Target:    "overview",
		Trigger:   "hover",
		Kind:      "tooltip",
		Title:     "Account A",
		Body:      "Account A body",
		Priority:  10,
		Provenance: types.UIEventProvenance{
			Source: "operator",
			Signal: "configuration",
		},
	}
	accountBEvent := *accountAEvent
	accountBEvent.AccountID = "account-b"
	accountBEvent.Title = "Account B"
	accountBEvent.Body = "Account B body"

	require.NoError(t, sqlStore.CreateUIEvent(ctx, accountAEvent))
	require.NoError(t, sqlStore.CreateUIEvent(ctx, &accountBEvent))

	accountAEvents, err := sqlStore.GetAccountUIEvents(ctx, "account-a")
	require.NoError(t, err)
	require.Len(t, accountAEvents, 1)
	require.Equal(t, accountAEvent, accountAEvents[0])

	accountBEvents, err := sqlStore.GetAccountUIEvents(ctx, "account-b")
	require.NoError(t, err)
	require.Len(t, accountBEvents, 1)
	require.Equal(t, accountBEvent.Title, accountBEvents[0].Title)

	updated := *accountAEvent
	updated.Enabled = false
	updated.Priority = 0
	updated.Title = "Updated"
	updated.Body = "Updated body"
	updated.Provenance = types.UIEventProvenance{Source: "system", Signal: "refresh"}
	require.Error(t, sqlStore.UpdateUIEvent(ctx, "account-c", "shared-id", &updated))
	require.NoError(t, sqlStore.UpdateUIEvent(ctx, "account-a", "shared-id", &updated))
	require.NoError(t, sqlStore.UpdateUIEvent(ctx, "account-a", "shared-id", &updated))

	accountAEvents, err = sqlStore.GetAccountUIEvents(ctx, "account-a")
	require.NoError(t, err)
	require.Len(t, accountAEvents, 1)
	require.Equal(t, updated, *accountAEvents[0])
	accountBEvents, err = sqlStore.GetAccountUIEvents(ctx, "account-b")
	require.NoError(t, err)
	require.Equal(t, "Account B", accountBEvents[0].Title)

	require.Error(t, sqlStore.DeleteUIEvent(ctx, "account-c", "shared-id"))
	require.NoError(t, sqlStore.DeleteUIEvent(ctx, "account-a", "shared-id"))
	accountAEvents, err = sqlStore.GetAccountUIEvents(ctx, "account-a")
	require.NoError(t, err)
	require.Empty(t, accountAEvents)
	accountBEvents, err = sqlStore.GetAccountUIEvents(ctx, "account-b")
	require.NoError(t, err)
	require.Len(t, accountBEvents, 1)
}
