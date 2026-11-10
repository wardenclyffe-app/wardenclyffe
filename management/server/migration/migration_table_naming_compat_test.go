package migration_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/shippin/wardenclyffe/management/server/migration"
)

func TestCreatePrefixedTableCopies_CopiesLegacyData(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:pref-copy?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, db.Exec(`CREATE TABLE accounts (id TEXT PRIMARY KEY, created_by TEXT)`).Error)
	require.NoError(t, db.Exec(`INSERT INTO accounts (id, created_by) VALUES ('acc-1', 'user-1')`).Error)

	err = migration.CreatePrefixedTableCopies(context.Background(), db)
	require.NoError(t, err)

	require.True(t, db.Migrator().HasTable("wardenclyffe_core_accounts"))

	var copied int64
	require.NoError(t, db.Raw(`SELECT COUNT(1) FROM "wardenclyffe_core_accounts"`).Scan(&copied).Error)
	require.EqualValues(t, 1, copied)
}

func TestCreatePrefixedTableCopies_CopiesSharedColumnsWhenShapesDiffer(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:pref-shape?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, db.Exec(`CREATE TABLE extra_settings (account_id TEXT, peer_approval_enabled NUMERIC)`).Error)
	require.NoError(t, db.Exec(`INSERT INTO extra_settings (account_id, peer_approval_enabled) VALUES ('acc-1', 1)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE wardenclyffe_core_extra_settings (account_id TEXT, peer_approval_enabled NUMERIC, user_approval_required NUMERIC, integrated_validator_groups TEXT)`).Error)

	require.NoError(t, migration.CreatePrefixedTableCopies(context.Background(), db))

	var copied int64
	require.NoError(t, db.Raw(`SELECT COUNT(1) FROM "wardenclyffe_core_extra_settings" WHERE account_id = 'acc-1' AND peer_approval_enabled = 1`).Scan(&copied).Error)
	require.EqualValues(t, 1, copied)
}

func TestCreatePrefixedTableCopies_IsIdempotent(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:pref-idem?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, db.Exec(`CREATE TABLE accounts (id TEXT PRIMARY KEY, created_by TEXT)`).Error)
	require.NoError(t, db.Exec(`INSERT INTO accounts (id, created_by) VALUES ('acc-1', 'user-1')`).Error)

	require.NoError(t, migration.CreatePrefixedTableCopies(context.Background(), db))
	require.NoError(t, migration.CreatePrefixedTableCopies(context.Background(), db))

	var copied int64
	require.NoError(t, db.Raw(`SELECT COUNT(1) FROM "wardenclyffe_core_accounts"`).Scan(&copied).Error)
	require.EqualValues(t, 1, copied)
}
