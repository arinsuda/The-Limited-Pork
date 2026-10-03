package apperror

import (
	"errors"
	"fmt"
	"net/http"
)

// Standard error codes matching docs/api-contract.md §0
const (
	CodeValidationFailed       = "VALIDATION_FAILED"
	CodeBadRequest             = "BAD_REQUEST"
	CodeInvalidStateTransition = "INVALID_STATE_TRANSITION"
	CodeUnauthenticated        = "UNAUTHENTICATED"
	CodeInvalidCredentials     = "INVALID_CREDENTIALS"
	CodeTokenExpired           = "TOKEN_EXPIRED"
	CodeForbidden              = "FORBIDDEN"
	CodeNotFound               = "NOT_FOUND"
	CodeConflict               = "CONFLICT"
	CodeVersionConflict        = "VERSION_CONFLICT"
	CodeDuplicate              = "DUPLICATE"
	CodePayloadTooLarge        = "PAYLOAD_TOO_LARGE"
	CodeUnsupportedMediaType   = "UNSUPPORTED_MEDIA_TYPE"
	CodeRateLimited            = "RATE_LIMITED"
	CodeInternal               = "INTERNAL"
)

type Detail struct {
	Field string `json:"field,omitempty"`
	Code  string `json:"code"`
	Param string `json:"param,omitempty"`
}

type AppError struct {
	HTTPStatus int      `json:"-"`
	Code       string   `json:"code"`
	Message    string   `json:"message"`
	Details    []Detail `json:"details,omitempty"`
	Err        error    `json:"-"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func New(httpStatus int, code, message string) *AppError {
	return &AppError{
		HTTPStatus: httpStatus,
		Code:       code,
		Message:    message,
	}
}

func Wrap(err error, httpStatus int, code, message string) *AppError {
	return &AppError{
		HTTPStatus: httpStatus,
		Code:       code,
		Message:    message,
		Err:        err,
	}
}

func Validation(message string, details ...Detail) *AppError {
	return &AppError{
		HTTPStatus: http.StatusBadRequest,
		Code:       CodeValidationFailed,
		Message:    message,
		Details:    details,
	}
}

func BadRequest(message string) *AppError {
	return New(http.StatusBadRequest, CodeBadRequest, message)
}

func InvalidState(message string) *AppError {
	return New(http.StatusBadRequest, CodeInvalidStateTransition, message)
}

func Unauthenticated(message string) *AppError {
	return New(http.StatusUnauthorized, CodeUnauthenticated, message)
}

func InvalidCredentials(message string) *AppError {
	return New(http.StatusUnauthorized, CodeInvalidCredentials, message)
}

func TokenExpired(message string) *AppError {
	return New(http.StatusUnauthorized, CodeTokenExpired, message)
}

func Forbidden(message string) *AppError {
	return New(http.StatusForbidden, CodeForbidden, message)
}

func NotFound(entity, id string) *AppError {
	return New(http.StatusNotFound, CodeNotFound, fmt.Sprintf("%s with id '%s' not found", entity, id))
}

func Conflict(message string) *AppError {
	return New(http.StatusConflict, CodeConflict, message)
}

func VersionConflict(message string) *AppError {
	return New(http.StatusConflict, CodeVersionConflict, message)
}

func Duplicate(message string) *AppError {
	return New(http.StatusConflict, CodeDuplicate, message)
}

func Internal(err error) *AppError {
	return Wrap(err, http.StatusInternalServerError, CodeInternal, "an unexpected error occurred")
}

func AsAppError(err error) (*AppError, bool) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}
