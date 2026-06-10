package products

import (
	"context"
	"testing"

	"github.com/ktb/clean-shop/internal/entities"
)

type fixedCatalog struct {
	products []entities.Product
}

func (c *fixedCatalog) ByCategory(_ context.Context, category entities.CategoryID) ([]entities.Product, error) {
	var out []entities.Product
	for _, p := range c.products {
		if p.CategoryID == category {
			out = append(out, p)
		}
	}
	return out, nil
}

func (c *fixedCatalog) ByID(_ context.Context, id entities.ProductID) (*entities.Product, error) {
	for i := range c.products {
		if c.products[i].ID == id {
			return &c.products[i], nil
		}
	}
	return nil, nil
}

func (c *fixedCatalog) All(_ context.Context) ([]entities.Product, error) {
	return c.products, nil
}

func TestReturnsTheProductsInACategoryAsOutputModels(t *testing.T) {
	mug, err := entities.NewProduct(entities.NewProductID("p1"), entities.NewCategoryID("c1"), "Mug", 19900)
	if err != nil {
		t.Fatal(err)
	}
	uc := NewInteractor(&fixedCatalog{products: []entities.Product{mug}})

	got, err := uc.ByCategory(context.Background(), "c1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := ProductOutput{ID: "p1", CategoryID: "c1", Name: "Mug", PriceCents: 19900}
	if len(got) != 1 || got[0] != want {
		t.Fatalf("expected [%v], got %v", want, got)
	}

	empty, err := uc.ByCategory(context.Background(), "c-empty")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(empty) != 0 {
		t.Fatalf("expected empty list, got %v", empty)
	}
}
