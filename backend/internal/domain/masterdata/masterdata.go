package masterdata

import (
	"time"

	"github.com/google/uuid"
)

const (
	DimensionMass        = "MASS"
	DimensionVolume      = "VOLUME"
	DimensionCount       = "COUNT"
	DimensionTemperature = "TEMPERATURE"
	DimensionTime        = "TIME"
	DimensionLength      = "LENGTH"
)

type Unit struct {
	ID           uuid.UUID  `json:"id"`
	Code         string     `json:"code"`
	Symbol       string     `json:"symbol"`
	Dimension    string     `json:"dimension"`
	BaseUnitID   *uuid.UUID `json:"baseUnitId"`
	FactorToBase float64    `json:"factorToBase"`
	NameTh       string     `json:"nameTh"`
	NameEn       string     `json:"nameEn"`
	SortOrder    int        `json:"sortOrder"`
	IsActive     bool       `json:"isActive"`
	Version      int        `json:"version"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type TasteAttribute struct {
	ID            uuid.UUID `json:"id"`
	Code          string    `json:"code"`
	NameTh        string    `json:"nameTh"`
	NameEn        string    `json:"nameEn"`
	DescriptionTh *string   `json:"descriptionTh"`
	DescriptionEn *string   `json:"descriptionEn"`
	MinScore      int       `json:"minScore"`
	MaxScore      int       `json:"maxScore"`
	Color         string    `json:"color"`
	SortOrder     int       `json:"sortOrder"`
	IsActive      bool      `json:"isActive"`
	Version       int       `json:"version"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type ParamField struct {
	Key            string   `json:"key"`
	LabelTh        string   `json:"labelTh"`
	LabelEn        string   `json:"labelEn"`
	Type           string   `json:"type"` // number, text, boolean, lookup
	LookupCategory *string  `json:"lookupCategory,omitempty"`
	UnitCode       *string  `json:"unitCode,omitempty"`
	Required       bool     `json:"required"`
	Min            *float64 `json:"min,omitempty"`
	Max            *float64 `json:"max,omitempty"`
}

type ProcessStepType struct {
	ID              uuid.UUID    `json:"id"`
	Code            string       `json:"code"`
	NameTh          string       `json:"nameTh"`
	NameEn          string       `json:"nameEn"`
	Icon            *string      `json:"icon"`
	UsesTemperature bool         `json:"usesTemperature"`
	UsesDuration    bool         `json:"usesDuration"`
	UsesOrientation bool         `json:"usesOrientation"`
	IsRepeatable    bool         `json:"isRepeatable"`
	ParamSchema     []ParamField `json:"paramSchema"`
	SortOrder       int          `json:"sortOrder"`
	IsActive        bool         `json:"isActive"`
	Version         int          `json:"version"`
	CreatedAt       time.Time    `json:"createdAt"`
	UpdatedAt       time.Time    `json:"updatedAt"`
}

type LookupCategory struct {
	Code     string `json:"code"`
	NameTh   string `json:"nameTh"`
	NameEn   string `json:"nameEn"`
	IsSystem bool   `json:"isSystem"`
}

type Lookup struct {
	ID        uuid.UUID      `json:"id"`
	Category  string         `json:"category"`
	Code      string         `json:"code"`
	NameTh    string         `json:"nameTh"`
	NameEn    string         `json:"nameEn"`
	Metadata  map[string]any `json:"metadata"`
	SortOrder int            `json:"sortOrder"`
	IsActive  bool           `json:"isActive"`
	Version   int            `json:"version"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
}

type Ingredient struct {
	ID            uuid.UUID  `json:"id"`
	Code          string     `json:"code"`
	NameTh        string     `json:"nameTh"`
	NameEn        string     `json:"nameEn"`
	CategoryID    *uuid.UUID `json:"categoryId"`
	Category      *Lookup    `json:"category,omitempty"`
	DefaultUnitID uuid.UUID  `json:"defaultUnitId"`
	DefaultUnit   *Unit      `json:"defaultUnit,omitempty"`
	Notes         *string    `json:"notes"`
	SortOrder     int        `json:"sortOrder"`
	IsActive      bool       `json:"isActive"`
	Version       int        `json:"version"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

type Setting struct {
	Key           string    `json:"key"`
	Value         any       `json:"value"`
	ValueType     string    `json:"valueType"`
	DescriptionTh string    `json:"descriptionTh"`
	DescriptionEn string    `json:"descriptionEn"`
	IsPublic      bool      `json:"isPublic"`
	Version       int       `json:"version"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type MasterDataRepository interface {
	// Units
	ListUnits(includeInactive bool) ([]Unit, error)
	GetUnitByID(id uuid.UUID) (*Unit, error)
	CreateUnit(u *Unit) error
	UpdateUnit(u *Unit) error
	DeleteUnit(id uuid.UUID) error

	// Taste Attributes
	ListTasteAttributes(includeInactive bool) ([]TasteAttribute, error)
	GetTasteAttributeByID(id uuid.UUID) (*TasteAttribute, error)
	CreateTasteAttribute(t *TasteAttribute) error
	UpdateTasteAttribute(t *TasteAttribute) error
	DeleteTasteAttribute(id uuid.UUID) error

	// Process Step Types
	ListProcessStepTypes(includeInactive bool) ([]ProcessStepType, error)
	GetProcessStepTypeByID(id uuid.UUID) (*ProcessStepType, error)
	CreateProcessStepType(p *ProcessStepType) error
	UpdateProcessStepType(p *ProcessStepType) error
	DeleteProcessStepType(id uuid.UUID) error

	// Lookups
	ListLookupCategories() ([]LookupCategory, error)
	ListLookups(category string, includeInactive bool) ([]Lookup, error)
	GetLookupByID(id uuid.UUID) (*Lookup, error)
	CreateLookup(l *Lookup) error
	UpdateLookup(l *Lookup) error
	DeleteLookup(id uuid.UUID) error

	// Ingredients
	ListIngredients(categoryID *uuid.UUID, includeInactive bool, q string, limit, offset int) ([]Ingredient, int, error)
	GetIngredientByID(id uuid.UUID) (*Ingredient, error)
	CreateIngredient(i *Ingredient) error
	UpdateIngredient(i *Ingredient) error
	DeleteIngredient(id uuid.UUID) error

	// Settings
	ListSettings(publicOnly bool) ([]Setting, error)
	GetSetting(key string) (*Setting, error)
	UpdateSetting(key string, value any, version int) (*Setting, error)
}
