package store

import (
	"context"
	"fmt"

	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
	gschema "gorm.io/gorm/schema"

	"github.com/shippin/wardenclyffe/management/server/schema"
)

type runtimeTableNamingStrategy struct {
	gschema.NamingStrategy
}

func (s runtimeTableNamingStrategy) TableName(str string) string {
	legacyName := s.NamingStrategy.TableName(str)
	return schema.RuntimeTableName(legacyName)
}

func validatePrefixedTableReadiness(ctx context.Context, db *gorm.DB) error {
	for _, entry := range schema.TableNamingPlan() {
		sourceExists := db.Migrator().HasTable(entry.CurrentTable)
		targetExists := db.Migrator().HasTable(entry.TargetTable)

		// Fresh installs are allowed to create only the target tables.
		if !sourceExists {
			continue
		}

		if !targetExists {
			return fmt.Errorf(
				"prefixed table %s is missing while legacy table %s exists; compatibility copy did not complete",
				entry.TargetTable, entry.CurrentTable,
			)
		}

		sourceCount, err := countRowsByTableName(db, entry.CurrentTable)
		if err != nil {
			return fmt.Errorf("count rows in legacy table %s: %w", entry.CurrentTable, err)
		}

		targetCount, err := countRowsByTableName(db, entry.TargetTable)
		if err != nil {
			return fmt.Errorf("count rows in prefixed table %s: %w", entry.TargetTable, err)
		}

		if sourceCount > 0 && targetCount == 0 {
			return fmt.Errorf(
				"prefixed table %s is empty while legacy table %s has %d row(s); compatibility copy did not complete",
				entry.TargetTable, entry.CurrentTable, sourceCount,
			)
		}
	}

	log.WithContext(ctx).Infof("using wardenclyffe_* runtime table names")
	return nil
}

func countRowsByTableName(db *gorm.DB, tableName string) (int64, error) {
	var count int64
	row := db.Raw(fmt.Sprintf("SELECT COUNT(1) FROM %s", quoteIdent(db, tableName))).Row()
	if err := row.Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func quoteIdent(db *gorm.DB, ident string) string {
	if db.Name() == "mysql" {
		return fmt.Sprintf("`%s`", ident)
	}
	return fmt.Sprintf("\"%s\"", ident)
}
