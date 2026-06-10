package products

import "context"

// ListProductsByCategory is the INPUT boundary for the "list products by
// category" use case.
type ListProductsByCategory interface {
	ByCategory(ctx context.Context, categoryID string) ([]ProductOutput, error)
}

// ProductOutput is the cross-boundary response model (owned by the use-case
// layer, not the web layer).
type ProductOutput struct {
	ID         string
	CategoryID string
	Name       string
	PriceCents int64
}
