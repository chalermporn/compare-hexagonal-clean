package port

import (
	"context"

	"github.com/ktb/clean-shop/internal/entities"
)

// Notifier is an OUTPUT port.
type Notifier interface {
	Welcome(ctx context.Context, customer entities.Customer)
}
