package attachment

import (
	"time"

	"github.com/google/uuid"
)

type OwnerType string

const (
	OwnerTypeTrial  OwnerType = "TRIAL"
	OwnerTypeRecipe OwnerType = "RECIPE"
)

func (o OwnerType) IsValid() bool {
	return o == OwnerTypeTrial || o == OwnerTypeRecipe
}

type Attachment struct {
	ID          uuid.UUID `json:"id"`
	OwnerType   OwnerType `json:"ownerType"`
	OwnerID     uuid.UUID `json:"ownerId"`
	FileName    string    `json:"fileName"`
	ContentType string    `json:"contentType"`
	SizeBytes   int64     `json:"sizeBytes"`
	ObjectKey   string    `json:"objectKey"`
	Caption     *string   `json:"caption"`
	IsCover     bool      `json:"isCover"`
	URL         string    `json:"url"` // Presigned GET url
	CreatedBy   uuid.UUID `json:"createdBy"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Repository interface {
	List(ownerType OwnerType, ownerID uuid.UUID) ([]Attachment, error)
	GetByID(id uuid.UUID) (*Attachment, error)
	Create(att *Attachment) error
	Update(id uuid.UUID, caption *string, isCover *bool) (*Attachment, error)
	Delete(id uuid.UUID) error
	ClearCovers(ownerType OwnerType, ownerID uuid.UUID) error
	GetCover(ownerType OwnerType, ownerID uuid.UUID) (*Attachment, error)
}
