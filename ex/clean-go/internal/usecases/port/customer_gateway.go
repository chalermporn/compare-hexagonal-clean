package port

import (
	"context"

	"github.com/ktb/clean-shop/internal/entities"
)

// CustomerGateway is an OUTPUT port (a "gateway" in Clean terms): the use-case
// layer owns this contract and calls outward through it. The implementation
// lives in the adapters layer. A nil *Customer with a nil error means "not found".
type CustomerGateway interface {
	FindByEmail(ctx context.Context, email entities.Email) (*entities.Customer, error)
	Save(ctx context.Context, customer entities.Customer) error
}
