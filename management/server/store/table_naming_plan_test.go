package store

import (
	"strings"
	"testing"

	"github.com/shippin/wardenclyffe/management/server/schema"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestTableNamingPlan_CoversManagedStoreTables(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	plan := schema.TableNamingPlan()
	planByCurrent := make(map[string]schema.TableNamingPlanEntry, len(plan))
	for _, entry := range plan {
		_, exists := planByCurrent[entry.CurrentTable]
		require.Falsef(t, exists, "duplicate current table in plan: %s", entry.CurrentTable)
		planByCurrent[entry.CurrentTable] = entry

		require.Truef(t, strings.HasPrefix(entry.TargetTable, "wardenclyffe_"), "target table must use wardenclyffe_ prefix: %s", entry.TargetTable)
		require.Containsf(t, entry.TargetTable, "_"+entry.Domain+"_", "target table must include domain grouping: %s", entry.TargetTable)
	}

	for _, model := range managedStoreModels() {
		stmt := &gorm.Statement{DB: db}
		require.NoError(t, stmt.Parse(model))

		_, exists := planByCurrent[stmt.Schema.Table]
		require.Truef(t, exists, "managed table is missing from naming plan: %s", stmt.Schema.Table)
	}
}
