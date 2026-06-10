package web

import (
	"fmt"
	"strings"
)

// API DTOs — the HTTP wire shape, never the domain types themselves.
// Field limits mirror the Kotlin @NotBlank/@Size constraints.

type RegisterRequest struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

func (r RegisterRequest) Validate() error {
	if err := requireMax("id", r.ID, 64); err != nil {
		return err
	}
	if err := requireMax("email", r.Email, 320); err != nil {
		return err
	}
	return requireMax("name", r.Name, 200)
}

func requireMax(field, value string, max int) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s is required", field)
	}
	if len(value) > max {
		return fmt.Errorf("%s exceeds %d characters", field, max)
	}
	return nil
}

type CustomerView struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

type ProductView struct {
	ID         string `json:"id"`
	CategoryID string `json:"categoryId"`
	Name       string `json:"name"`
	PriceCents int64  `json:"priceCents"`
}

// APIError is the standard error shape — no stack traces (pentest baseline).
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
