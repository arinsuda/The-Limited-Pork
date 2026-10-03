package application

import (
	"context"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/domain/masterdata"
	"github.com/mookrob/backend/pkg/pagination"
)

type MasterDataService struct {
	repo  masterdata.MasterDataRepository
	clock ports.Clock
	idGen ports.IDGen
	hub   ports.WebSocketHub
}

func NewMasterDataService(
	repo masterdata.MasterDataRepository,
	clock ports.Clock,
	idGen ports.IDGen,
	hub ports.WebSocketHub,
) *MasterDataService {
	return &MasterDataService{
		repo:  repo,
		clock: clock,
		idGen: idGen,
		hub:   hub,
	}
}

// Units
func (s *MasterDataService) ListUnits(ctx context.Context, includeInactive bool) ([]masterdata.Unit, error) {
	return s.repo.ListUnits(includeInactive)
}

func (s *MasterDataService) GetUnit(ctx context.Context, id uuid.UUID) (*masterdata.Unit, error) {
	return s.repo.GetUnitByID(id)
}

func (s *MasterDataService) CreateUnit(ctx context.Context, u *masterdata.Unit) error {
	u.ID = s.idGen.NewUUID()
	u.Version = 1
	u.CreatedAt = s.clock.Now()
	u.UpdatedAt = s.clock.Now()
	if err := s.repo.CreateUnit(u); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", u.ID, "created")
	return nil
}

func (s *MasterDataService) UpdateUnit(ctx context.Context, u *masterdata.Unit) error {
	if err := s.repo.UpdateUnit(u); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", u.ID, "updated")
	return nil
}

func (s *MasterDataService) DeleteUnit(ctx context.Context, id uuid.UUID) error {
	if err := s.repo.DeleteUnit(id); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", id, "deleted")
	return nil
}

// Taste Attributes
func (s *MasterDataService) ListTasteAttributes(ctx context.Context, includeInactive bool) ([]masterdata.TasteAttribute, error) {
	return s.repo.ListTasteAttributes(includeInactive)
}

func (s *MasterDataService) GetTasteAttribute(ctx context.Context, id uuid.UUID) (*masterdata.TasteAttribute, error) {
	return s.repo.GetTasteAttributeByID(id)
}

func (s *MasterDataService) CreateTasteAttribute(t *masterdata.TasteAttribute) error {
	t.ID = s.idGen.NewUUID()
	t.Version = 1
	t.CreatedAt = s.clock.Now()
	t.UpdatedAt = s.clock.Now()
	if err := s.repo.CreateTasteAttribute(t); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", t.ID, "created")
	return nil
}

func (s *MasterDataService) UpdateTasteAttribute(t *masterdata.TasteAttribute) error {
	if err := s.repo.UpdateTasteAttribute(t); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", t.ID, "updated")
	return nil
}

func (s *MasterDataService) DeleteTasteAttribute(ctx context.Context, id uuid.UUID) error {
	if err := s.repo.DeleteTasteAttribute(id); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", id, "deleted")
	return nil
}

// Process Step Types
func (s *MasterDataService) ListProcessStepTypes(ctx context.Context, includeInactive bool) ([]masterdata.ProcessStepType, error) {
	return s.repo.ListProcessStepTypes(includeInactive)
}

func (s *MasterDataService) GetProcessStepType(ctx context.Context, id uuid.UUID) (*masterdata.ProcessStepType, error) {
	return s.repo.GetProcessStepTypeByID(id)
}

func (s *MasterDataService) CreateProcessStepType(p *masterdata.ProcessStepType) error {
	p.ID = s.idGen.NewUUID()
	p.Version = 1
	p.CreatedAt = s.clock.Now()
	p.UpdatedAt = s.clock.Now()
	if err := s.repo.CreateProcessStepType(p); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", p.ID, "created")
	return nil
}

func (s *MasterDataService) UpdateProcessStepType(p *masterdata.ProcessStepType) error {
	if err := s.repo.UpdateProcessStepType(p); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", p.ID, "updated")
	return nil
}

func (s *MasterDataService) DeleteProcessStepType(ctx context.Context, id uuid.UUID) error {
	if err := s.repo.DeleteProcessStepType(id); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", id, "deleted")
	return nil
}

// Lookups
func (s *MasterDataService) ListLookupCategories(ctx context.Context) ([]masterdata.LookupCategory, error) {
	return s.repo.ListLookupCategories()
}

func (s *MasterDataService) ListLookups(ctx context.Context, category string, includeInactive bool) ([]masterdata.Lookup, error) {
	return s.repo.ListLookups(category, includeInactive)
}

func (s *MasterDataService) CreateLookup(ctx context.Context, l *masterdata.Lookup) error {
	l.ID = s.idGen.NewUUID()
	l.Version = 1
	l.CreatedAt = s.clock.Now()
	l.UpdatedAt = s.clock.Now()
	if err := s.repo.CreateLookup(l); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", l.ID, "created")
	return nil
}

func (s *MasterDataService) UpdateLookup(ctx context.Context, l *masterdata.Lookup) error {
	if err := s.repo.UpdateLookup(l); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", l.ID, "updated")
	return nil
}

func (s *MasterDataService) DeleteLookup(ctx context.Context, id uuid.UUID) error {
	if err := s.repo.DeleteLookup(id); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", id, "deleted")
	return nil
}

// Ingredients
func (s *MasterDataService) ListIngredients(ctx context.Context, categoryID *uuid.UUID, includeInactive bool, params pagination.Params) (pagination.Paged[masterdata.Ingredient], error) {
	list, total, err := s.repo.ListIngredients(categoryID, includeInactive, params.Q, params.Limit(), params.Offset())
	if err != nil {
		return pagination.Paged[masterdata.Ingredient]{}, err
	}
	return pagination.NewPaged(list, params.Page, params.PageSize, total), nil
}

func (s *MasterDataService) GetIngredient(ctx context.Context, id uuid.UUID) (*masterdata.Ingredient, error) {
	return s.repo.GetIngredientByID(id)
}

func (s *MasterDataService) CreateIngredient(ctx context.Context, ing *masterdata.Ingredient) error {
	ing.ID = s.idGen.NewUUID()
	ing.Version = 1
	ing.CreatedAt = s.clock.Now()
	ing.UpdatedAt = s.clock.Now()
	if err := s.repo.CreateIngredient(ing); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", ing.ID, "created")
	return nil
}

func (s *MasterDataService) UpdateIngredient(ctx context.Context, ing *masterdata.Ingredient) error {
	if err := s.repo.UpdateIngredient(ing); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", ing.ID, "updated")
	return nil
}

func (s *MasterDataService) DeleteIngredient(ctx context.Context, id uuid.UUID) error {
	if err := s.repo.DeleteIngredient(id); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("masterdata", id, "deleted")
	return nil
}

// Settings
func (s *MasterDataService) ListSettings(ctx context.Context, publicOnly bool) ([]masterdata.Setting, error) {
	return s.repo.ListSettings(publicOnly)
}

func (s *MasterDataService) UpdateSetting(ctx context.Context, key string, value any, version int) (*masterdata.Setting, error) {
	setting, err := s.repo.UpdateSetting(key, value, version)
	if err != nil {
		return nil, err
	}
	s.hub.BroadcastEntityChanged("settings", uuid.Nil, "updated")
	return setting, nil
}
