package register

import (
	"context"

	"github.com/ktb/clean-shop/internal/entities"
	"github.com/ktb/clean-shop/internal/usecases/port"
)

// Interactor — Application Business Rules. Orchestrates entities + output ports.
// No framework, no DB, no web: it is wired up in the frameworks layer
// (cmd/server/main.go, the Kotlin version's Beans.kt).
type Interactor struct {
	customers port.CustomerGateway
	notifier  port.Notifier
}

// The interactor must satisfy the input boundary — checked at compile time.
var _ RegisterCustomer = (*Interactor)(nil)

func NewInteractor(customers port.CustomerGateway, notifier port.Notifier) *Interactor {
	return &Interactor{customers: customers, notifier: notifier}
}

func (uc *Interactor) Register(ctx context.Context, input RegisterInput) (RegisterOutput, error) {
	email, err := entities.NewEmail(input.Email)
	if err != nil {
		return RegisterOutput{}, err
	}

	existing, err := uc.customers.FindByEmail(ctx, email)
	if err != nil {
		return RegisterOutput{}, err
	}
	if existing != nil {
		return RegisterOutput{}, &entities.EmailAlreadyUsedError{Email: input.Email}
	}

	id, err := entities.NewCustomerID(input.ID)
	if err != nil {
		return RegisterOutput{}, err
	}
	customer, err := entities.NewCustomer(id, email, input.Name)
	if err != nil {
		return RegisterOutput{}, err
	}

	if err := uc.customers.Save(ctx, customer); err != nil {
		return RegisterOutput{}, err
	}
	uc.notifier.Welcome(ctx, customer)

	// Map entity -> the use-case's own output model: entities never cross the boundary.
	return RegisterOutput{
		ID:    customer.ID.String(),
		Email: customer.Email.String(),
		Name:  customer.Name,
	}, nil
}
