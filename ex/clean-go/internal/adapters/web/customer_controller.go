package web

import (
	"encoding/json"
	"net/http"

	"github.com/ktb/clean-shop/internal/usecases/register"
)

// INTERFACE ADAPTER (driving). Depends only on the INPUT boundary
// (register.RegisterCustomer), never on the concrete interactor. Maps web
// DTO <-> use-case models. No business rules here.
type CustomerController struct {
	registerCustomer register.RegisterCustomer
}

func NewCustomerController(registerCustomer register.RegisterCustomer) *CustomerController {
	return &CustomerController{registerCustomer: registerCustomer}
}

// POST /api/customers
func (c *CustomerController) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIError{Code: "bad_request", Message: "invalid input"})
		return
	}
	if err := req.Validate(); err != nil {
		writeJSON(w, http.StatusBadRequest, APIError{Code: "bad_request", Message: "invalid input"})
		return
	}

	out, err := c.registerCustomer.Register(r.Context(), register.RegisterInput{
		ID:    req.ID,
		Email: req.Email,
		Name:  req.Name,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, CustomerResponse{
		ID:    out.ID,
		Email: out.Email,
		Name:  out.Name,
	})
}
