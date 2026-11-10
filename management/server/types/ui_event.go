package types

// UIEvent is an account-scoped, persisted UI event definition.
type UIEvent struct {
	AccountID  string            `json:"-" gorm:"primaryKey;size:64"`
	ID         string            `json:"id" gorm:"primaryKey;size:64"`
	Enabled    bool              `json:"enabled"`
	Route      string            `json:"route" gorm:"size:2048"`
	Target     string            `json:"target" gorm:"size:200"`
	Trigger    string            `json:"trigger" gorm:"size:16"`
	Kind       string            `json:"kind" gorm:"size:16"`
	Title      string            `json:"title" gorm:"size:200"`
	Body       string            `json:"body" gorm:"type:text"`
	Priority   int               `json:"priority"`
	Provenance UIEventProvenance `json:"provenance" gorm:"embedded;embeddedPrefix:provenance_"`
}

// UIEventProvenance identifies the source signal for a UI event definition.
type UIEventProvenance struct {
	Source string `json:"source" gorm:"size:200"`
	Signal string `json:"signal" gorm:"size:200"`
}

// TableName returns the legacy name used to map the table to its canonical name.
func (UIEvent) TableName() string {
	return "ui_events"
}
