package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application"
	"github.com/mookrob/backend/internal/domain/attachment"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/interfaces/http/middleware"
	"github.com/mookrob/backend/internal/interfaces/http/response"
	"github.com/mookrob/backend/pkg/apperror"
)

type AttachmentHandler struct {
	attService *application.AttachmentService
	cfg        *config.Config
}

func NewAttachmentHandler(attService *application.AttachmentService, cfg *config.Config) *AttachmentHandler {
	return &AttachmentHandler{
		attService: attService,
		cfg:        cfg,
	}
}

func (h *AttachmentHandler) Upload(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (limit memory to 10MB, rest to temp files)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		response.Error(w, r, apperror.BadRequest("failed to parse multipart form"))
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.Error(w, r, apperror.BadRequest("file field is required"))
		return
	}
	defer file.Close()

	ownerType := attachment.OwnerType(r.FormValue("ownerType"))
	if !ownerType.IsValid() {
		response.Error(w, r, apperror.BadRequest("valid ownerType is required (RECIPE or TRIAL)"))
		return
	}

	ownerID, err := uuid.Parse(r.FormValue("ownerId"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("valid ownerId is required"))
		return
	}

	var caption *string
	if capVal := r.FormValue("caption"); capVal != "" {
		caption = &capVal
	}

	isCover := r.FormValue("isCover") == "true"

	// Sniff content type using first 512 bytes
	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	contentType := http.DetectContentType(buf[:n])
	// Reconstruct reader
	reader := io.MultiReader(bytes.NewReader(buf[:n]), file)

	claims := middleware.GetUserClaims(r.Context())

	att, err := h.attService.Upload(r.Context(), application.UploadInput{
		OwnerType:   ownerType,
		OwnerID:     ownerID,
		FileName:    header.Filename,
		ContentType: contentType,
		SizeBytes:   header.Size,
		Reader:      reader,
		Caption:     caption,
		IsCover:     isCover,
		CreatedBy:   claims.UserID,
	})
	if err != nil {
		response.Error(w, r, err)
		return
	}

	response.Created(w, att)
}

func (h *AttachmentHandler) List(w http.ResponseWriter, r *http.Request) {
	ownerType := attachment.OwnerType(r.URL.Query().Get("ownerType"))
	ownerIDStr := r.URL.Query().Get("ownerId")
	if !ownerType.IsValid() || ownerIDStr == "" {
		response.Error(w, r, apperror.BadRequest("ownerType and ownerId query parameters are required"))
		return
	}

	ownerID, err := uuid.Parse(ownerIDStr)
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid ownerId"))
		return
	}

	list, err := h.attService.List(r.Context(), ownerType, ownerID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, list)
}

type UpdateAttachmentRequest struct {
	Caption *string `json:"caption"`
	IsCover *bool   `json:"isCover"`
}

func (h *AttachmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid attachment id"))
		return
	}

	var req UpdateAttachmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	att, err := h.attService.Update(r.Context(), id, req.Caption, req.IsCover)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, att)
}

func (h *AttachmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid attachment id"))
		return
	}

	if err := h.attService.Delete(r.Context(), id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}
