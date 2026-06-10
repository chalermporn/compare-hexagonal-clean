package application

import (
	"context"

	"github.com/ktb/hexagonal-shop/internal/domain"
	"github.com/ktb/hexagonal-shop/internal/domain/port"
)

type ListProductsByCategory struct {
	catalog port.ProductCatalog
}

func NewListProductsByCategory(catalog port.ProductCatalog) *ListProductsByCategory {
	return &ListProductsByCategory{catalog: catalog}
}

func (uc *ListProductsByCategory) Handle(ctx context.Context, categoryID string) ([]domain.Product, error) {
	return uc.catalog.ByCategory(ctx, domain.NewCategoryID(categoryID))
}
