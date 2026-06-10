package register

import (
	"context"
	"errors"
	"testing"

	"github.com/ktb/clean-shop/internal/entities"
)

// Pure unit tests — no HTTP, no DB. Milliseconds. This is the TDD inner loop.
// The fakes implement the OUTPUT ports (gateways) in memory.

type inMemoryCustomers struct {
	saved []entities.Customer
}

func (r *inMemoryCustomers) FindByEmail(_ context.Context, email entities.Email) (*entities.Customer, error) {
	for i := range r.saved {
		if r.saved[i].Email == email {
			return &r.saved[i], nil
		}
	}
	return nil, nil
}

func (r *inMemoryCustomers) Save(_ context.Context, c entities.Customer) error {
	r.saved = append(r.saved, c)
	return nil
}

type recordingNotifier struct {
	welcomed *entities.Customer
}

func (n *recordingNotifier) Welcome(_ context.Context, c entities.Customer) { n.welcomed = &c }

func mustCustomer(t *testing.T, id, email, name string) entities.Customer {
	t.Helper()
	cid, err := entities.NewCustomerID(id)
	if err != nil {
		t.Fatal(err)
	}
	em, err := entities.NewEmail(email)
	if err != nil {
		t.Fatal(err)
	}
	c, err := entities.NewCustomer(cid, em, name)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestRegistersANewCustomerAndWelcomesThem(t *testing.T) {
	customers := &inMemoryCustomers{}
	notifier := &recordingNotifier{}

	out, err := NewInteractor(customers, notifier).
		Register(context.Background(), RegisterInput{ID: "c1", Email: "bird@shop.com", Name: "Bird"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// The boundary returns the use-case's own output model, not the entity.
	want := RegisterOutput{ID: "c1", Email: "bird@shop.com", Name: "Bird"}
	if out != want {
		t.Fatalf("expected %v, got %v", want, out)
	}
	if len(customers.saved) != 1 {
		t.Fatalf("expected 1 saved customer, got %d", len(customers.saved))
	}
	if notifier.welcomed == nil || *notifier.welcomed != customers.saved[0] {
		t.Fatalf("expected the registered customer to be welcomed")
	}
}

func TestRejectsADuplicateEmail(t *testing.T) {
	customers := &inMemoryCustomers{}
	_ = customers.Save(context.Background(), mustCustomer(t, "c0", "bird@shop.com", "Bird"))

	_, err := NewInteractor(customers, &recordingNotifier{}).
		Register(context.Background(), RegisterInput{ID: "c1", Email: "bird@shop.com", Name: "Bird"})

	var dup *entities.EmailAlreadyUsedError
	if !errors.As(err, &dup) {
		t.Fatalf("expected EmailAlreadyUsedError, got %v", err)
	}
}

func TestRejectsAnInvalidEmailWithoutTouchingTheGateway(t *testing.T) {
	customers := &inMemoryCustomers{}

	_, err := NewInteractor(customers, &recordingNotifier{}).
		Register(context.Background(), RegisterInput{ID: "c1", Email: "not-an-email", Name: "Bird"})

	if !errors.Is(err, entities.ErrInvalid) {
		t.Fatalf("expected ErrInvalid, got %v", err)
	}
	if len(customers.saved) != 0 {
		t.Fatalf("gateway must not be touched, got %d saved", len(customers.saved))
	}
}
