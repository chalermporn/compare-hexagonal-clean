package email

import (
	"context"
	"log/slog"

	"github.com/ktb/hexagonal-shop/internal/domain"
)

// ADAPTER for the Notifier port. Swap for a real SMTP/SendGrid adapter later —
// the core (RegisterCustomer) does not change.
type LogNotifier struct{}

func NewLogNotifier() *LogNotifier { return &LogNotifier{} }

func (n *LogNotifier) Welcome(_ context.Context, customer domain.Customer) {
	slog.Info("welcome email", "to", customer.Email.String(), "name", customer.Name)
}
