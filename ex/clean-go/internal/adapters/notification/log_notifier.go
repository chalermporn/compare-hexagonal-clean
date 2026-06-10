package notification

import (
	"context"
	"log/slog"

	"github.com/ktb/clean-shop/internal/entities"
)

// GATEWAY implementation for the Notifier output port. Swap for a real
// SMTP/SendGrid adapter later — the interactor does not change.
type LogNotifier struct{}

func NewLogNotifier() *LogNotifier { return &LogNotifier{} }

func (n *LogNotifier) Welcome(_ context.Context, customer entities.Customer) {
	slog.Info("welcome email", "to", customer.Email.String(), "name", customer.Name)
}
