package schema

func RuntimeTableName(name string) string {
	for _, entry := range tableNamingPlan {
		if entry.CurrentTable == name {
			return entry.TargetTable
		}
	}

	return name
}
