package persistence_test

import (
	"context"
	"errors"
	"testing"

	"github.com/ktb/hexagonal-shop/internal/domain"
	"github.com/ktb/hexagonal-shop/internal/infra/persistence"
	"github.com/ktb/hexagonal-shop/internal/testsupport"
)

// Integration test: the real adapter against a real Postgres (Testcontainers).

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

func TestPostgresCustomerRepository(t *testing.T) {
	pool := testsupport.StartPostgres(t)
	repo := persistence.NewPostgresCustomerRepository(pool)
	ctx := context.Background()

	t.Run("saves and finds a customer", func(t *testing.T) {
		c := mustCustomer(t, "itc1", "it@shop.com", "IT User")
		if err := repo.Save(ctx, c); err != nil {
			t.Fatalf("save: %v", err)
		}
		email, _ := domain.NewEmail("it@shop.com")
		got, err := repo.FindByEmail(ctx, email)
		if err != nil {
			t.Fatalf("find: %v", err)
		}
		if got == nil || *got != c {
			t.Fatalf("expected %v, got %v", c, got)
		}
	})

	t.Run("returns nil for an unknown email", func(t *testing.T) {
		email, _ := domain.NewEmail("missing@shop.com")
		got, err := repo.FindByEmail(ctx, email)
		if err != nil {
			t.Fatalf("find: %v", err)
		}
		if got != nil {
			t.Fatalf("expected nil, got %v", got)
		}
	})

	t.Run("maps a unique violation to EmailAlreadyUsedError", func(t *testing.T) {
		first := mustCustomer(t, "itc2", "dup@shop.com", "First")
		if err := repo.Save(ctx, first); err != nil {
			t.Fatalf("save: %v", err)
		}
		err := repo.Save(ctx, mustCustomer(t, "itc3", "dup@shop.com", "Second"))
		var dup *domain.EmailAlreadyUsedError
		if !errors.As(err, &dup) {
			t.Fatalf("expected EmailAlreadyUsedError, got %v", err)
		}
	})
}
