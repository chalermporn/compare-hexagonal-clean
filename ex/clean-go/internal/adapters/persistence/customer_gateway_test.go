package persistence_test

import (
	"context"
	"errors"
	"testing"

	"github.com/ktb/clean-shop/internal/adapters/persistence"
	"github.com/ktb/clean-shop/internal/entities"
	"github.com/ktb/clean-shop/internal/testsupport"
)

// Integration test: the real gateway against a real Postgres (Testcontainers).

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

func TestPostgresCustomerGateway(t *testing.T) {
	pool := testsupport.StartPostgres(t)
	gateway := persistence.NewPostgresCustomerGateway(pool)
	ctx := context.Background()

	t.Run("saves and finds a customer", func(t *testing.T) {
		c := mustCustomer(t, "itc1", "it@shop.com", "IT User")
		if err := gateway.Save(ctx, c); err != nil {
			t.Fatalf("save: %v", err)
		}
		email, _ := entities.NewEmail("it@shop.com")
		got, err := gateway.FindByEmail(ctx, email)
		if err != nil {
			t.Fatalf("find: %v", err)
		}
		if got == nil || *got != c {
			t.Fatalf("expected %v, got %v", c, got)
		}
	})

	t.Run("returns nil for an unknown email", func(t *testing.T) {
		email, _ := entities.NewEmail("missing@shop.com")
		got, err := gateway.FindByEmail(ctx, email)
		if err != nil {
			t.Fatalf("find: %v", err)
		}
		if got != nil {
			t.Fatalf("expected nil, got %v", got)
		}
	})

	t.Run("maps a unique violation to EmailAlreadyUsedError", func(t *testing.T) {
		first := mustCustomer(t, "itc2", "dup@shop.com", "First")
		if err := gateway.Save(ctx, first); err != nil {
			t.Fatalf("save: %v", err)
		}
		err := gateway.Save(ctx, mustCustomer(t, "itc3", "dup@shop.com", "Second"))
		var dup *entities.EmailAlreadyUsedError
		if !errors.As(err, &dup) {
			t.Fatalf("expected EmailAlreadyUsedError, got %v", err)
		}
	})
}
