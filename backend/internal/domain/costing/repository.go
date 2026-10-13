package costing

import (
	"context"

	"github.com/google/uuid"
	"github.com/mookrob/backend/pkg/pagination"
)

type ListFilter struct {
	Search   string
	RecipeID *uuid.UUID
}

type Repository interface {
	Create(ctx context.Context, c *CostCalculation) error
	GetByID(ctx context.Context, id uuid.UUID) (*CostCalculation, error)
	Update(ctx context.Context, c *CostCalculation) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter ListFilter, page pagination.Params) (*pagination.Paged[CostCalculation], error)
}
