package application

import (
	"context"

	"github.com/ktb/hexagonal-shop/internal/domain"
	"github.com/ktb/hexagonal-shop/internal/domain/port"
)

type RegisterCommand struct {
	ID    string
	Email string
	Name  string
}

// RegisterCustomer is the use case — depends only on ports. No framework, no DB, no web.
type RegisterCustomer struct {
	customers port.CustomerRepository
	notifier  port.Notifier
}

func NewRegisterCustomer(customers port.CustomerRepository, notifier port.Notifier) *RegisterCustomer {
	return &RegisterCustomer{customers: customers, notifier: notifier}
}

func (uc *RegisterCustomer) Handle(ctx context.Context, cmd RegisterCommand) (domain.Customer, error) {
	email, err := domain.NewEmail(cmd.Email)
	if err != nil {
		return domain.Customer{}, err
	}

	existing, err := uc.customers.FindByEmail(ctx, email)
	if err != nil {
		return domain.Customer{}, err
	}
	if existing != nil {
		return domain.Customer{}, &domain.EmailAlreadyUsedError{Email: cmd.Email}
	}

	id, err := domain.NewCustomerID(cmd.ID)
	if err != nil {
		return domain.Customer{}, err
	}
	customer, err := domain.NewCustomer(id, email, cmd.Name)
	if err != nil {
		return domain.Customer{}, err
	}

	if err := uc.customers.Save(ctx, customer); err != nil {
		return domain.Customer{}, err
	}
	uc.notifier.Welcome(ctx, customer)
	return customer, nil
}
