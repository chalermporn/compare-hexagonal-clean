package port

import (
	"context"

	"github.com/ktb/clean-shop/internal/entities"
)

// ProductGateway is an OUTPUT port. With ~1K products it has both a DB-backed
// gateway and a cached one.
type ProductGateway interface {
	ByCategory(ctx context.Context, category entities.CategoryID) ([]entities.Product, error)
	ByID(ctx context.Context, id entities.ProductID) (*entities.Product, error)
	All(ctx context.Context) ([]entities.Product, error)
}
