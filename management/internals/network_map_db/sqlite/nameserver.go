package networkmap_sqlite

import (
	"context"

	networkmapdb "github.com/shippin/wardenclyffe/management/internals/network_map_db"
	"github.com/shippin/wardenclyffe/shared/management/networkmap/nmdata"
)

const (
	GetNameserversQuery = `
	select id, public_id, name, description, name_servers, groups, "primary", domains, enabled, search_domains_enabled
	from name_server_groups
	where account_id=?
	`
)

func (sc *SqliteStoreConn) GetNameServerGroups(ctx context.Context, accountId string) ([]nmdata.NameServerGroup, error) {
	rows, err := sc.Conn.QueryContext(ctx, GetNameserversQuery, accountId)
	if err != nil {
		return nil, err
	}

	nsgroups, err := CollectRowsForSqlite[networkmapdb.NameserverGroup](rows)
	if err != nil {
		return nil, err
	}

	return networkmapdb.ConvertAllToSharedTypes[networkmapdb.NameserverGroup, nmdata.NameServerGroup](nsgroups)
}
