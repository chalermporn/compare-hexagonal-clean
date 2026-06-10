package port

import (
	"context"

	"github.com/ktb/hexagonal-shop/internal/domain"
)

// ProductCatalog is a DRIVEN port. With ~1K products it has both a DB adapter
// and a cached one.
type ProductCatalog interface {
	ByCategory(ctx context.Context, category domain.CategoryID) ([]domain.Product, error)
	ByID(ctx context.Context, id domain.ProductID) (*domain.Product, error)
	All(ctx context.Context) ([]domain.Product, error)
}
