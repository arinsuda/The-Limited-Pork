package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mookrob/backend/internal/domain/attachment"
	"github.com/mookrob/backend/pkg/apperror"
)

type AttachmentRepo struct {
	pool *pgxpool.Pool
}

func NewAttachmentRepo(pool *pgxpool.Pool) *AttachmentRepo {
	return &AttachmentRepo{pool: pool}
}

func (r *AttachmentRepo) List(ownerType attachment.OwnerType, ownerID uuid.UUID) ([]attachment.Attachment, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, owner_type, owner_id, file_name, content_type, size_bytes, object_key, caption, is_cover, created_by, created_at
		FROM attachments
		WHERE owner_type = $1 AND owner_id = $2
		ORDER BY is_cover DESC, created_at DESC
	`
	rows, err := q.Query(ctx, query, ownerType, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []attachment.Attachment
	for rows.Next() {
		var a attachment.Attachment
		if err := rows.Scan(
			&a.ID, &a.OwnerType, &a.OwnerID, &a.FileName, &a.ContentType,
			&a.SizeBytes, &a.ObjectKey, &a.Caption, &a.IsCover, &a.CreatedBy, &a.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, nil
}

func (r *AttachmentRepo) GetByID(id uuid.UUID) (*attachment.Attachment, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, owner_type, owner_id, file_name, content_type, size_bytes, object_key, caption, is_cover, created_by, created_at
		FROM attachments
		WHERE id = $1
	`
	var a attachment.Attachment
	err := q.QueryRow(ctx, query, id).Scan(
		&a.ID, &a.OwnerType, &a.OwnerID, &a.FileName, &a.ContentType,
		&a.SizeBytes, &a.ObjectKey, &a.Caption, &a.IsCover, &a.CreatedBy, &a.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("attachment", id.String())
		}
		return nil, err
	}
	return &a, nil
}

func (r *AttachmentRepo) Create(att *attachment.Attachment) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		INSERT INTO attachments (id, owner_type, owner_id, file_name, content_type, size_bytes, object_key, caption, is_cover, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := q.Exec(ctx, query,
		att.ID, att.OwnerType, att.OwnerID, att.FileName, att.ContentType,
		att.SizeBytes, att.ObjectKey, att.Caption, att.IsCover, att.CreatedBy, att.CreatedAt,
	)
	return err
}

func (r *AttachmentRepo) Update(id uuid.UUID, caption *string, isCover *bool) (*attachment.Attachment, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	att, err := r.GetByID(id)
	if err != nil {
		return nil, err
	}

	if caption != nil {
		att.Caption = caption
	}
	if isCover != nil {
		att.IsCover = *isCover
		if *isCover {
			_ = r.ClearCovers(att.OwnerType, att.OwnerID)
		}
	}

	query := `UPDATE attachments SET caption = $1, is_cover = $2 WHERE id = $3`
	_, err = q.Exec(ctx, query, att.Caption, att.IsCover, id)
	if err != nil {
		return nil, err
	}
	return att, nil
}

func (r *AttachmentRepo) Delete(id uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	tag, err := q.Exec(ctx, `DELETE FROM attachments WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.NotFound("attachment", id.String())
	}
	return nil
}

func (r *AttachmentRepo) ClearCovers(ownerType attachment.OwnerType, ownerID uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	_, err := q.Exec(ctx, `UPDATE attachments SET is_cover = false WHERE owner_type = $1 AND owner_id = $2`, ownerType, ownerID)
	return err
}

func (r *AttachmentRepo) GetCover(ownerType attachment.OwnerType, ownerID uuid.UUID) (*attachment.Attachment, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, owner_type, owner_id, file_name, content_type, size_bytes, object_key, caption, is_cover, created_by, created_at
		FROM attachments
		WHERE owner_type = $1 AND owner_id = $2 AND is_cover = true
		LIMIT 1
	`
	var a attachment.Attachment
	err := q.QueryRow(ctx, query, ownerType, ownerID).Scan(
		&a.ID, &a.OwnerType, &a.OwnerID, &a.FileName, &a.ContentType,
		&a.SizeBytes, &a.ObjectKey, &a.Caption, &a.IsCover, &a.CreatedBy, &a.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}
