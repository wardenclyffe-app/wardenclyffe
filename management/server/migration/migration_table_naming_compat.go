package migration

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"github.com/shippin/wardenclyffe/management/server/schema"
)

// CreatePrefixedTableCopies creates compatibility copies for the planned
// wardenclyffe_* domain-grouped table names while leaving existing runtime
// table names untouched.
//
// Phase 2 behavior is intentionally non-breaking:
//   - when legacy table exists and prefixed table is missing, create the
//     prefixed table with matching shape.
//   - if the prefixed table is empty, copy all rows from the legacy table.
//   - if the prefixed table already has rows, leave it untouched.
//
// This prepares data for a later full switch without changing current query
// paths. The function is idempotent and safe to run on every startup.
func CreatePrefixedTableCopies(ctx context.Context, db *gorm.DB) error {
	for _, entry := range schema.TableNamingPlan() {
		if err := ensurePrefixedTableCopy(ctx, db, entry.CurrentTable, entry.TargetTable); err != nil {
			return err
		}
	}
	return nil
}

func ensurePrefixedTableCopy(ctx context.Context, db *gorm.DB, sourceTable, targetTable string) error {
	migrator := db.Migrator()
	if !migrator.HasTable(sourceTable) {
		return nil
	}

	if !migrator.HasTable(targetTable) {
		if err := createTableLike(db, sourceTable, targetTable); err != nil {
			return fmt.Errorf("create compatibility table %s from %s: %w", targetTable, sourceTable, err)
		}
		log.WithContext(ctx).Infof("created compatibility table %s from %s", targetTable, sourceTable)
	}

	targetCount, err := countTableRows(db, targetTable)
	if err != nil {
		return fmt.Errorf("count rows in %s: %w", targetTable, err)
	}
	if targetCount > 0 {
		return nil
	}

	// AutoMigrate may have added columns to the runtime table after the empty
	// compatibility copy was created. SELECT * then fails because the tables
	// no longer have the same width. Copy the shared columns by name.
	copySQL, err := copySharedColumnsSQL(db, sourceTable, targetTable)
	if err != nil {
		return err
	}
	if copySQL == "" {
		return nil
	}
	res := db.Exec(copySQL)
	if res.Error != nil {
		return fmt.Errorf("copy data from %s to %s: %w", sourceTable, targetTable, res.Error)
	}
	if res.RowsAffected > 0 {
		log.WithContext(ctx).Infof("copied %d rows from %s to compatibility table %s", res.RowsAffected, sourceTable, targetTable)
	}
	return nil
}

func copySharedColumnsSQL(db *gorm.DB, sourceTable, targetTable string) (string, error) {
	sourceCols, err := tableColumns(db, sourceTable)
	if err != nil {
		return "", err
	}
	targetCols, err := tableColumns(db, targetTable)
	if err != nil {
		return "", err
	}
	present := make(map[string]struct{}, len(targetCols))
	for _, column := range targetCols {
		present[column] = struct{}{}
	}
	shared := make([]string, 0, len(sourceCols))
	for _, column := range sourceCols {
		if _, ok := present[column]; ok {
			shared = append(shared, quoteIdent(db, column))
		}
	}
	if len(shared) == 0 {
		return "", nil
	}
	list := strings.Join(shared, ", ")
	return fmt.Sprintf("INSERT INTO %s (%s) SELECT %s FROM %s",
		quoteIdent(db, targetTable), list, list, quoteIdent(db, sourceTable)), nil
}

func tableColumns(db *gorm.DB, table string) ([]string, error) {
	if !identOK(table) {
		return nil, fmt.Errorf("refusing non-identifier table %s", table)
	}
	var columns []string
	switch db.Name() {
	case "sqlite":
		err := db.Raw(fmt.Sprintf("SELECT name FROM pragma_table_info('%s') ORDER BY cid", table)).Scan(&columns).Error
		return columns, err
	case "postgres":
		err := db.Raw(`SELECT column_name FROM information_schema.columns WHERE table_schema = CURRENT_SCHEMA() AND table_name = ? ORDER BY ordinal_position`, table).Scan(&columns).Error
		return columns, err
	case "mysql":
		err := db.Raw(`SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position`, table).Scan(&columns).Error
		return columns, err
	default:
		return nil, fmt.Errorf("unsupported database %q", db.Name())
	}
}

func countTableRows(db *gorm.DB, tableName string) (int64, error) {
	var count int64
	row := db.Raw(fmt.Sprintf("SELECT COUNT(1) FROM %s", quoteIdent(db, tableName))).Row()
	if err := row.Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func createTableLike(db *gorm.DB, sourceTable, targetTable string) error {
	source := quoteIdent(db, sourceTable)
	target := quoteIdent(db, targetTable)

	switch db.Name() {
	case "mysql":
		return db.Exec(fmt.Sprintf("CREATE TABLE %s LIKE %s", target, source)).Error
	case "postgres":
		return db.Exec(fmt.Sprintf("CREATE TABLE %s (LIKE %s INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)", target, source)).Error
	default:
		// CREATE TABLE AS SELECT drops the primary key. Later upserts then
		// fail because SQLite has no conflict target. Clone the original
		// CREATE statement so the key travels with the copy.
		return cloneSQLiteTable(db, sourceTable, targetTable)
	}
}

func cloneSQLiteTable(db *gorm.DB, sourceTable, targetTable string) error {
	var createSQL string
	if err := db.Raw(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`, sourceTable).Scan(&createSQL).Error; err != nil {
		return err
	}
	if createSQL == "" {
		return fmt.Errorf("sqlite table %s has no create statement", sourceTable)
	}
	rewritten, err := rewriteSQLiteCreateTable(createSQL, sourceTable, targetTable)
	if err != nil {
		return err
	}
	return db.Exec(rewritten).Error
}

func rewriteSQLiteCreateTable(createSQL, sourceTable, targetTable string) (string, error) {
	pattern := regexp.MustCompile(`(?i)^(\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?)(\S+)`)
	match := pattern.FindStringSubmatchIndex(createSQL)
	if match == nil {
		return "", fmt.Errorf("unrecognized create statement for %s", sourceTable)
	}
	token := createSQL[match[4]:match[5]]
	if strings.Trim(token, "\"'`") != sourceTable {
		return "", fmt.Errorf("create statement names %s, want %s", token, sourceTable)
	}
	return createSQL[:match[3]] + `"` + targetTable + `"` + createSQL[match[5]:], nil
}

func quoteIdent(db *gorm.DB, ident string) string {
	if db.Name() == "mysql" {
		return fmt.Sprintf("`%s`", ident)
	}
	return fmt.Sprintf("\"%s\"", ident)
}
