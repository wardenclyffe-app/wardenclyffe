package store

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	agentNetworkTypes "github.com/shippin/wardenclyffe/management/internals/modules/agentnetwork/types"
	"github.com/shippin/wardenclyffe/management/internals/modules/reverseproxy/accesslogs"
)

func TestSqlStoreLogQueriesUseRuntimeTables(t *testing.T) {
	ctx := context.Background()
	sqlStore, err := NewSqliteStore(ctx, t.TempDir(), nil, false)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, sqlStore.Close(ctx)) })
	assertLogQueriesUseRuntimeTables(t, sqlStore)
}

func assertLogQueriesUseRuntimeTables(t *testing.T, sqlStore *SqlStore) {
	t.Helper()
	ctx := context.Background()
	cutoff := time.Now().UTC().Truncate(time.Second)
	for _, entry := range []struct {
		id, account string
		timestamp   time.Time
	}{
		{"expired-log", "log-account", cutoff.Add(-time.Hour)},
		{"current-log", "log-account", cutoff.Add(time.Hour)},
		{"other-log", "other-log-account", cutoff.Add(-time.Hour)},
	} {
		require.NoError(t, sqlStore.CreateAgentNetworkAccessLog(ctx, &agentNetworkTypes.AgentNetworkAccessLog{
			ID: entry.id, AccountID: entry.account, Timestamp: entry.timestamp,
		}, []agentNetworkTypes.AgentNetworkAccessLogGroup{
			{LogID: entry.id, AccountID: entry.account, GroupID: "log-group"},
		}))
		require.NoError(t, sqlStore.CreateAgentNetworkUsage(ctx, &agentNetworkTypes.AgentNetworkUsage{
			ID: entry.id, AccountID: entry.account, Timestamp: entry.timestamp,
		}, []agentNetworkTypes.AgentNetworkUsageGroup{
			{UsageID: entry.id, AccountID: entry.account, GroupID: "log-group"},
		}))
	}
	filter := agentNetworkTypes.AgentNetworkAccessLogFilter{GroupIDs: []string{"log-group"}}
	logs, total, err := sqlStore.GetAgentNetworkAccessLogs(ctx, LockingStrengthNone, "log-account", filter)
	require.NoError(t, err, "group filtering must use the canonical child table")
	assert.Equal(t, int64(2), total, "group filter must isolate account logs")
	require.Len(t, logs, 2, "matching logs must be returned")
	rows, err := sqlStore.GetAgentNetworkUsageRows(ctx, LockingStrengthNone, "log-account", filter)
	require.NoError(t, err, "usage group filtering must use the canonical child table")
	require.Len(t, rows, 2, "matching usage rows must be returned")

	search := "expired-log"
	logs, total, err = sqlStore.GetAgentNetworkAccessLogs(ctx, LockingStrengthNone, "log-account",
		agentNetworkTypes.AgentNetworkAccessLogFilter{Search: &search})
	require.NoError(t, err, "log search must query the canonical user table")
	require.Len(t, logs, 1, "search must return the matching log")
	assert.Equal(t, int64(1), total, "search count must match")
	require.NoError(t, sqlStore.CreateAccessLog(ctx, &accesslogs.AccessLogEntry{
		ID: search, AccountID: "log-account", Timestamp: cutoff,
	}))
	proxyLogs, total, err := sqlStore.GetAccountAccessLogs(ctx, LockingStrengthNone, "log-account",
		accesslogs.AccessLogFilter{Page: 1, PageSize: 50, Search: &search})
	require.NoError(t, err, "proxy search must query the canonical user table")
	require.Len(t, proxyLogs, 1, "proxy search must return the matching log")
	assert.Equal(t, int64(1), total, "proxy search count must match")

	deleted, err := sqlStore.DeleteOldAgentNetworkAccessLogs(ctx, "log-account", cutoff)
	require.NoError(t, err, "retention must delete canonical child rows")
	assert.Equal(t, int64(1), deleted, "only the account's expired log must be deleted")
	var children []agentNetworkTypes.AgentNetworkAccessLogGroup
	require.NoError(t, sqlStore.db.Find(&children).Error)
	assert.NotContains(t, children, agentNetworkTypes.AgentNetworkAccessLogGroup{
		LogID: "expired-log", AccountID: "log-account", GroupID: "log-group",
	}, "expired log must not leave orphan group rows")
	require.Len(t, children, 2, "current and other-account groups must survive")
	rows, err = sqlStore.GetAgentNetworkUsageRows(ctx, LockingStrengthNone, "log-account", filter)
	require.NoError(t, err)
	assert.Len(t, rows, 2, "log retention must preserve long-term usage")
}
