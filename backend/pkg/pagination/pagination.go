package pagination

import (
	"math"
	"net/http"
	"strconv"
)

type Meta struct {
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

type Paged[T any] struct {
	Data []T  `json:"data"`
	Meta Meta `json:"meta"`
}

type Params struct {
	Page     int
	PageSize int
	Q        string
	Sort     string
}

func FromRequest(r *http.Request, defaultPageSize, maxPageSize int) Params {
	p := Params{
		Page:     1,
		PageSize: defaultPageSize,
		Q:        r.URL.Query().Get("q"),
		Sort:     r.URL.Query().Get("sort"),
	}

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			p.Page = page
		}
	}

	if sizeStr := r.URL.Query().Get("pageSize"); sizeStr != "" {
		if size, err := strconv.Atoi(sizeStr); err == nil && size > 0 {
			if size > maxPageSize {
				p.PageSize = maxPageSize
			} else {
				p.PageSize = size
			}
		}
	}

	return p
}

func (p Params) Offset() int {
	return (p.Page - 1) * p.PageSize
}

func (p Params) Limit() int {
	return p.PageSize
}

func NewMeta(page, pageSize, total int) Meta {
	totalPages := 0
	if pageSize > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(pageSize)))
	}
	return Meta{
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
		TotalPages: totalPages,
	}
}

func NewPaged[T any](data []T, page, pageSize, total int) Paged[T] {
	if data == nil {
		data = []T{}
	}
	return Paged[T]{
		Data: data,
		Meta: NewMeta(page, pageSize, total),
	}
}
