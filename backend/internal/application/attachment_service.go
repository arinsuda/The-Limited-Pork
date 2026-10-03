package application

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/domain/attachment"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/pkg/apperror"
)

type AttachmentService struct {
	attRepo attachment.Repository
	storage ports.ObjectStorage
	clock   ports.Clock
	idGen   ports.IDGen
	cfg     *config.Config
}

func NewAttachmentService(
	attRepo attachment.Repository,
	storage ports.ObjectStorage,
	clock ports.Clock,
	idGen ports.IDGen,
	cfg *config.Config,
) *AttachmentService {
	return &AttachmentService{
		attRepo: attRepo,
		storage: storage,
		clock:   clock,
		idGen:   idGen,
		cfg:     cfg,
	}
}

type UploadInput struct {
	OwnerType   attachment.OwnerType
	OwnerID     uuid.UUID
	FileName    string
	ContentType string
	SizeBytes   int64
	Reader      io.Reader
	Caption     *string
	IsCover     bool
	CreatedBy   uuid.UUID
}

func (s *AttachmentService) Upload(ctx context.Context, input UploadInput) (*attachment.Attachment, error) {
	if !input.OwnerType.IsValid() {
		return nil, apperror.Validation("invalid ownerType")
	}

	if input.SizeBytes > s.cfg.UploadMaxBytes {
		return nil, apperror.New(413, apperror.CodePayloadTooLarge, fmt.Sprintf("file exceeds max size of %d bytes", s.cfg.UploadMaxBytes))
	}

	if !s.cfg.IsAllowedMIME(input.ContentType) {
		return nil, apperror.New(415, apperror.CodeUnsupportedMediaType, fmt.Sprintf("unsupported media type: %s", input.ContentType))
	}

	attID := s.idGen.NewUUID()
	ext := filepath.Ext(input.FileName)
	if ext == "" {
		if strings.Contains(input.ContentType, "png") {
			ext = ".png"
		} else if strings.Contains(input.ContentType, "webp") {
			ext = ".webp"
		} else {
			ext = ".jpg"
		}
	}

	objectKey := fmt.Sprintf("%s/%s/%s%s", strings.ToLower(string(input.OwnerType)), input.OwnerID, attID, ext)

	if err := s.storage.Upload(ctx, objectKey, input.Reader, input.SizeBytes, input.ContentType); err != nil {
		return nil, fmt.Errorf("storage upload failed: %w", err)
	}

	att := &attachment.Attachment{
		ID:          attID,
		OwnerType:   input.OwnerType,
		OwnerID:     input.OwnerID,
		FileName:    input.FileName,
		ContentType: input.ContentType,
		SizeBytes:   input.SizeBytes,
		ObjectKey:   objectKey,
		Caption:     input.Caption,
		IsCover:     input.IsCover,
		CreatedBy:   input.CreatedBy,
		CreatedAt:   s.clock.Now(),
	}

	if input.IsCover {
		_ = s.attRepo.ClearCovers(input.OwnerType, input.OwnerID)
	}

	if err := s.attRepo.Create(att); err != nil {
		_ = s.storage.Delete(ctx, objectKey)
		return nil, err
	}

	presignedURL, _ := s.storage.PresignGet(ctx, objectKey, time.Duration(s.cfg.MinIOPresignTTLMin)*time.Minute)
	att.URL = presignedURL

	return att, nil
}

func (s *AttachmentService) List(ctx context.Context, ownerType attachment.OwnerType, ownerID uuid.UUID) ([]attachment.Attachment, error) {
	list, err := s.attRepo.List(ownerType, ownerID)
	if err != nil {
		return nil, err
	}

	for i := range list {
		url, err := s.storage.PresignGet(ctx, list[i].ObjectKey, time.Duration(s.cfg.MinIOPresignTTLMin)*time.Minute)
		if err == nil {
			list[i].URL = url
		}
	}

	return list, nil
}

func (s *AttachmentService) Update(ctx context.Context, id uuid.UUID, caption *string, isCover *bool) (*attachment.Attachment, error) {
	att, err := s.attRepo.Update(id, caption, isCover)
	if err != nil {
		return nil, err
	}

	url, _ := s.storage.PresignGet(ctx, att.ObjectKey, time.Duration(s.cfg.MinIOPresignTTLMin)*time.Minute)
	att.URL = url

	return att, nil
}

func (s *AttachmentService) Delete(ctx context.Context, id uuid.UUID) error {
	att, err := s.attRepo.GetByID(id)
	if err != nil {
		return err
	}

	if err := s.attRepo.Delete(id); err != nil {
		return err
	}

	_ = s.storage.Delete(ctx, att.ObjectKey)
	return nil
}
