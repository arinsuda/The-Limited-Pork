package minio

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/mookrob/backend/internal/infrastructure/config"
)

type Storage struct {
	client    *minio.Client
	cfg       *config.Config
	bucket    string
	publicURL string
}

func NewStorage(cfg *config.Config) (*Storage, error) {
	client, err := minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create minio client: %w", err)
	}

	return &Storage{
		client:    client,
		cfg:       cfg,
		bucket:    cfg.MinIOBucket,
		publicURL: cfg.MinIOPublicEndpoint,
	}, nil
}

func (s *Storage) EnsureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("failed to check if bucket exists: %w", err)
	}
	if !exists {
		err = s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{})
		if err != nil {
			return fmt.Errorf("failed to create bucket: %w", err)
		}
	}
	return nil
}

func (s *Storage) Upload(ctx context.Context, objectKey string, reader io.Reader, sizeBytes int64, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, objectKey, reader, sizeBytes, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("failed to upload object %s: %w", objectKey, err)
	}
	return nil
}

func (s *Storage) PresignGet(ctx context.Context, objectKey string, expires time.Duration) (string, error) {
	reqParams := make(url.Values)
	u, err := s.client.PresignedGetObject(ctx, s.bucket, objectKey, expires, reqParams)
	if err != nil {
		return "", fmt.Errorf("failed to presign get object %s: %w", objectKey, err)
	}

	res := u.String()
	// If public endpoint is specified and differs from minio endpoint, replace the host/scheme so browser can download
	if s.publicURL != "" && !strings.Contains(res, s.publicURL) {
		pubURL, err := url.Parse(s.publicURL)
		if err == nil {
			u.Scheme = pubURL.Scheme
			u.Host = pubURL.Host
			res = u.String()
		}
	}

	return res, nil
}

func (s *Storage) Delete(ctx context.Context, objectKey string) error {
	err := s.client.RemoveObject(ctx, s.bucket, objectKey, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete object %s: %w", objectKey, err)
	}
	return nil
}
