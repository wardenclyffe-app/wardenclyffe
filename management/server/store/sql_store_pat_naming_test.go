package store

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/shippin/wardenclyffe/management/server/types"
	"github.com/shippin/wardenclyffe/shared/management/status"
)

func TestSqlStorePATUserUsesRuntimeTables(t *testing.T) {
	ctx := context.Background()
	sqlStore, err := NewSqliteStore(ctx, t.TempDir(), nil, false)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, sqlStore.Close(ctx)) })

	user := &types.User{Id: "owner", AccountID: "account-a", Role: types.UserRoleOwner}
	other := &types.User{Id: "other", AccountID: "account-b", Role: types.UserRoleUser}
	require.NoError(t, sqlStore.SaveUser(ctx, user))
	require.NoError(t, sqlStore.SaveUser(ctx, other))
	require.NoError(t, sqlStore.SavePAT(ctx, &types.PersonalAccessToken{
		ID: "owner-token", UserID: user.Id, Name: "test",
	}))
	require.NoError(t, sqlStore.SavePAT(ctx, &types.PersonalAccessToken{
		ID: "other-token", UserID: other.Id, Name: "test",
	}))
	assert.False(t, sqlStore.db.Migrator().HasTable("users"), "fresh store must not need legacy users")
	assert.False(t, sqlStore.db.Migrator().HasTable("personal_access_tokens"),
		"fresh store must not need legacy tokens")

	for _, expected := range []*types.User{user, other} {
		t.Run(expected.Id, func(t *testing.T) {
			tokenID := expected.Id + "-token"
			actual, err := sqlStore.GetUserByPATID(ctx, LockingStrengthNone, tokenID)
			require.NoError(t, err)
			assert.Equal(t, expected.Id, actual.Id, "token must resolve to its owner")
			assert.Equal(t, expected.AccountID, actual.AccountID, "token must retain its account")
		})
	}

	actual, err := sqlStore.GetUserByPATID(ctx, LockingStrengthNone, "missing")
	require.Error(t, err)
	assert.Nil(t, actual, "unknown token must not resolve to a user")
	storeErr, ok := status.FromError(err)
	require.True(t, ok, "missing token must return a structured error")
	assert.Equal(t, status.NotFound, storeErr.Type(), "missing token must return not found")
}

func TestSqlStoreGroupLookupsUseRuntimeTables(t *testing.T) {
	ctx := context.Background()
	sqlStore, err := NewSqliteStore(ctx, t.TempDir(), nil, false)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, sqlStore.Close(ctx)) })

	for _, group := range []*types.Group{
		{ID: "empty", AccountID: "account-a", Name: "team"},
		{ID: "populated", AccountID: "account-a", Name: "team"},
		{ID: "foreign", AccountID: "account-b", Name: "team"},
	} {
		require.NoError(t, sqlStore.CreateGroup(ctx, group))
	}
	require.NoError(t, sqlStore.AddPeerToGroup(ctx, "account-a", "peer-a", "populated"))
	require.NoError(t, sqlStore.AddPeerToGroup(ctx, "account-b", "peer-a", "foreign"))
	require.NoError(t, sqlStore.CreateGroups(ctx, "account-a", []*types.Group{
		{ID: "empty", AccountID: "account-a", Name: "team"},
	}))
	require.NoError(t, sqlStore.UpdateGroups(ctx, "account-a", []*types.Group{
		{ID: "empty", AccountID: "account-a", Name: "team"},
	}))
	assert.False(t, sqlStore.db.Migrator().HasTable("groups"), "fresh store must not need legacy groups")
	assert.False(t, sqlStore.db.Migrator().HasTable("group_peers"), "fresh store must not need legacy memberships")

	group, err := sqlStore.GetGroupByName(ctx, LockingStrengthNone, "account-a", "team")
	require.NoError(t, err)
	assert.Equal(t, "populated", group.ID, "same-name lookup must prefer the group with more peers")
	assert.Equal(t, []string{"peer-a"}, group.Peers, "lookup must load actual memberships")
	groups, err := sqlStore.GetPeerGroups(ctx, LockingStrengthNone, "account-a", "peer-a")
	require.NoError(t, err)
	require.Len(t, groups, 1, "peer lookup must exclude memberships in other accounts")
	assert.Equal(t, "populated", groups[0].ID, "peer lookup must return the correct group")
	_, err = sqlStore.GetGroupByName(ctx, LockingStrengthNone, "account-c", "team")
	require.Error(t, err, "same-name groups in other accounts must not resolve")
}
