package application

import (
	"context"
	"testing"

	"github.com/ktb/hexagonal-shop/internal/domain"
)

type fixedCatalog struct {
	products []domain.Product
}

func (c *fixedCatalog) ByCategory(_ context.Context, category domain.CategoryID) ([]domain.Product, error) {
	var out []domain.Product
	for _, p := range c.products {
		if p.CategoryID == category {
			out = append(out, p)
		}
	}
	return out, nil
}

func (c *fixedCatalog) ByID(_ context.Context, id domain.ProductID) (*domain.Product, error) {
	for i := range c.products {
		if c.products[i].ID == id {
			return &c.products[i], nil
		}
	}
	return nil, nil
}

func (c *fixedCatalog) All(_ context.Context) ([]domain.Product, error) {
	return c.products, nil
}

func TestReturnsTheProductsInACategory(t *testing.T) {
	mug, err := domain.NewProduct(domain.NewProductID("p1"), domain.NewCategoryID("c1"), "Mug", 19900)
	if err != nil {
		t.Fatal(err)
	}
	uc := NewListProductsByCategory(&fixedCatalog{products: []domain.Product{mug}})

	got, err := uc.Handle(context.Background(), "c1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0] != mug {
		t.Fatalf("expected [mug], got %v", got)
	}

	empty, err := uc.Handle(context.Background(), "c-empty")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(empty) != 0 {
		t.Fatalf("expected empty list, got %v", empty)
	}
}
