package response

import (
	"encoding/json"
	"net/http"

	"github.com/mookrob/backend/pkg/apperror"
	"github.com/mookrob/backend/pkg/pagination"
)

type DataEnvelope[T any] struct {
	Data T `json:"data"`
}

type PagedEnvelope[T any] struct {
	Data []T             `json:"data"`
	Meta pagination.Meta `json:"meta"`
}

type ErrorBody struct {
	Code      string            `json:"code"`
	Message   string            `json:"message"`
	Details   []apperror.Detail `json:"details,omitempty"`
	RequestID string            `json:"requestId,omitempty"`
}

type ErrorEnvelope struct {
	Error ErrorBody `json:"error"`
}

func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func OK[T any](w http.ResponseWriter, data T) {
	JSON(w, http.StatusOK, DataEnvelope[T]{Data: data})
}

func Created[T any](w http.ResponseWriter, data T) {
	JSON(w, http.StatusCreated, DataEnvelope[T]{Data: data})
}

func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

func Paged[T any](w http.ResponseWriter, paged pagination.Paged[T]) {
	JSON(w, http.StatusOK, PagedEnvelope[T]{
		Data: paged.Data,
		Meta: paged.Meta,
	})
}

func Error(w http.ResponseWriter, r *http.Request, err error) {
	requestID := r.Header.Get("X-Request-ID")

	if appErr, ok := apperror.AsAppError(err); ok {
		JSON(w, appErr.HTTPStatus, ErrorEnvelope{
			Error: ErrorBody{
				Code:      appErr.Code,
				Message:   appErr.Message,
				Details:   appErr.Details,
				RequestID: requestID,
			},
		})
		return
	}

	JSON(w, http.StatusInternalServerError, ErrorEnvelope{
		Error: ErrorBody{
			Code:      apperror.CodeInternal,
			Message:   "an internal server error occurred",
			RequestID: requestID,
		},
	})
}
