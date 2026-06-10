package port

import (
	"context"

	"github.com/ktb/hexagonal-shop/internal/domain"
)

// CustomerRepository is a DRIVEN port: the core calls outward through this contract.
// A nil *Customer with a nil error means "not found".
type CustomerRepository interface {
	FindByEmail(ctx context.Context, email domain.Email) (*domain.Customer, error)
	Save(ctx context.Context, customer domain.Customer) error
}
