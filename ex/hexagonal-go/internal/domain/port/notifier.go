package port

import (
	"context"

	"github.com/ktb/hexagonal-shop/internal/domain"
)

// Notifier is a DRIVEN port.
type Notifier interface {
	Welcome(ctx context.Context, customer domain.Customer)
}
