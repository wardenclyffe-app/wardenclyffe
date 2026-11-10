//go:build e2e

package store

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	rpservice "github.com/shippin/wardenclyffe/management/internals/modules/reverseproxy/service"
	"github.com/shippin/wardenclyffe/management/server/types"
)

func TestPostgresRuntimeAccountLoaders(t *testing.T) {
	dsn := os.Getenv("WARDENCLYFFE_TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("requires a disposable PostgreSQL database via WARDENCLYFFE_TEST_POSTGRES_DSN")
	}
	ctx := context.Background()
	sqlStore, err := NewPostgresqlStore(ctx, dsn, nil, false)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, sqlStore.Close(ctx)) })

	account := newAccountWithId(ctx, "runtime-account", "runtime-owner", "")
	account.Services = []*rpservice.Service{{
		ID: "runtime-service", AccountID: account.Id, Name: "runtime-service",
		Domain: "runtime.invalid", Enabled: true,
		Targets: []*rpservice.Target{{
			AccountID: account.Id, ServiceID: "runtime-service",
			Host: "target.invalid", Port: 443, Protocol: "https", Enabled: true,
			TargetType: rpservice.TargetTypeDomain,
			Options: rpservice.TargetOptions{
				DirectUpstream: true, CustomHeaders: map[string]string{"X-Acceptance": "runtime"},
			},
		}},
	}}
	require.NoError(t, sqlStore.SaveAccount(ctx, account))
	require.NoError(t, sqlStore.SavePAT(ctx, &types.PersonalAccessToken{
		ID: "runtime-token", UserID: "runtime-owner", Name: "runtime-test",
	}))
	require.NoError(t, sqlStore.CreateGroup(ctx, &types.Group{
		ID: "runtime-group", AccountID: account.Id, Name: "runtime-group",
	}))
	require.NoError(t, sqlStore.AddPeerToGroup(ctx, account.Id, "runtime-peer", "runtime-group"))
	otherAccount := newAccountWithId(ctx, "other-account", "other-owner", "")
	require.NoError(t, sqlStore.SaveAccount(ctx, otherAccount))
	require.NoError(t, sqlStore.SavePAT(ctx, &types.PersonalAccessToken{
		ID: "other-token", UserID: "other-owner", Name: "other-test",
	}))
	require.False(t, sqlStore.db.Migrator().HasTable("accounts"),
		"fresh PostgreSQL must not depend on legacy tables")

	fromGorm, err := sqlStore.getAccountGorm(ctx, account.Id)
	require.NoError(t, err)
	fromPgx, err := sqlStore.GetAccount(ctx, account.Id)
	require.NoError(t, err, "production pgx loader must read canonical tables")
	assert.Equal(t, fromGorm.Id, fromPgx.Id, "both loaders must return the same account")
	assert.Equal(t, fromGorm.Settings, fromPgx.Settings, "settings must survive the pgx path")
	require.Contains(t, fromPgx.Users, "runtime-owner", "pgx must load the owner")
	require.Contains(t, fromPgx.Users["runtime-owner"].PATs, "runtime-token", "pgx must load nested tokens")
	require.Contains(t, fromPgx.Groups, "runtime-group", "pgx must load the created group")
	assert.NotContains(t, fromPgx.Users, "other-owner", "pgx must isolate account users")
	assert.Equal(t, []string{"runtime-peer"}, fromPgx.Groups["runtime-group"].Peers,
		"pgx must load group membership")
	require.Len(t, fromPgx.Services, 1, "pgx must load persisted services")
	require.Len(t, fromPgx.Services[0].Targets, 1, "pgx must load nested service targets")
	assert.Equal(t, fromGorm.Services, fromPgx.Services, "service and target fields must match GORM")
	require.Len(t, fromPgx.Policies, len(fromGorm.Policies), "pgx must load policies")
	for i, policy := range fromGorm.Policies {
		require.Len(t, fromPgx.Policies[i].Rules, len(policy.Rules), "pgx must load nested policy rules")
	}

	t.Run("comprehensive-relations", func(t *testing.T) {
		assertGetAccountComprehensiveFields(t, sqlStore)
	})
	t.Run("custom-domains", func(t *testing.T) {
		assertGetAccountLoadsCustomDomains(t, sqlStore)
	})
	t.Run("log-query-tables", func(t *testing.T) {
		assertLogQueriesUseRuntimeTables(t, sqlStore)
	})
}
