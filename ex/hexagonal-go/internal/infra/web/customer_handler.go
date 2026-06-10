package web

import (
	"encoding/json"
	"net/http"

	"github.com/ktb/hexagonal-shop/internal/application"
)

// DRIVING adapter. Translates HTTP <-> the use case. No business rules here.
type CustomerHandler struct {
	registerCustomer *application.RegisterCustomer
}

func NewCustomerHandler(registerCustomer *application.RegisterCustomer) *CustomerHandler {
	return &CustomerHandler{registerCustomer: registerCustomer}
}

// POST /api/customers
func (h *CustomerHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIError{Code: "bad_request", Message: "invalid input"})
		return
	}
	if err := req.Validate(); err != nil {
		writeJSON(w, http.StatusBadRequest, APIError{Code: "bad_request", Message: "invalid input"})
		return
	}

	c, err := h.registerCustomer.Handle(r.Context(), application.RegisterCommand{
		ID:    req.ID,
		Email: req.Email,
		Name:  req.Name,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, CustomerView{
		ID:    c.ID.String(),
		Email: c.Email.String(),
		Name:  c.Name,
	})
}
