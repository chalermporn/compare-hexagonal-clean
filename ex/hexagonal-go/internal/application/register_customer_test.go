package application

import (
	"context"
	"errors"
	"testing"

	"github.com/ktb/hexagonal-shop/internal/domain"
)

// Pure unit tests — no HTTP, no DB. Milliseconds. This is the TDD inner loop.

type inMemoryCustomers struct {
	saved []domain.Customer
}

func (r *inMemoryCustomers) FindByEmail(_ context.Context, email domain.Email) (*domain.Customer, error) {
	for i := range r.saved {
		if r.saved[i].Email == email {
			return &r.saved[i], nil
		}
	}
	return nil, nil
}

func (r *inMemoryCustomers) Save(_ context.Context, c domain.Customer) error {
	r.saved = append(r.saved, c)
	return nil
}

type recordingNotifier struct {
	welcomed *domain.Customer
}

func (n *recordingNotifier) Welcome(_ context.Context, c domain.Customer) { n.welcomed = &c }

func mustCustomer(t *testing.T, id, email, name string) domain.Customer {
	t.Helper()
	cid, err := domain.NewCustomerID(id)
	if err != nil {
		t.Fatal(err)
	}
	em, err := domain.NewEmail(email)
	if err != nil {
		t.Fatal(err)
	}
	c, err := domain.NewCustomer(cid, em, name)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestRegistersANewCustomerAndWelcomesThem(t *testing.T) {
	customers := &inMemoryCustomers{}
	notifier := &recordingNotifier{}

	c, err := NewRegisterCustomer(customers, notifier).
		Handle(context.Background(), RegisterCommand{ID: "c1", Email: "bird@shop.com", Name: "Bird"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(customers.saved) != 1 {
		t.Fatalf("expected 1 saved customer, got %d", len(customers.saved))
	}
	if notifier.welcomed == nil || *notifier.welcomed != c {
		t.Fatalf("expected the registered customer to be welcomed")
	}
}

func TestRejectsADuplicateEmail(t *testing.T) {
	customers := &inMemoryCustomers{}
	_ = customers.Save(context.Background(), mustCustomer(t, "c0", "bird@shop.com", "Bird"))

	_, err := NewRegisterCustomer(customers, &recordingNotifier{}).
		Handle(context.Background(), RegisterCommand{ID: "c1", Email: "bird@shop.com", Name: "Bird"})

	var dup *domain.EmailAlreadyUsedError
	if !errors.As(err, &dup) {
		t.Fatalf("expected EmailAlreadyUsedError, got %v", err)
	}
}

func TestRejectsAnInvalidEmailWithoutTouchingTheRepository(t *testing.T) {
	customers := &inMemoryCustomers{}

	_, err := NewRegisterCustomer(customers, &recordingNotifier{}).
		Handle(context.Background(), RegisterCommand{ID: "c1", Email: "not-an-email", Name: "Bird"})

	if !errors.Is(err, domain.ErrInvalid) {
		t.Fatalf("expected ErrInvalid, got %v", err)
	}
	if len(customers.saved) != 0 {
		t.Fatalf("repository must not be touched, got %d saved", len(customers.saved))
	}
}
