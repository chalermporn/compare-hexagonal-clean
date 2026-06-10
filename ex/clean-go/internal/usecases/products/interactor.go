package products

import (
	"context"

	"github.com/ktb/clean-shop/internal/entities"
	"github.com/ktb/clean-shop/internal/usecases/port"
)

// Interactor: maps entities -> the use-case's own output model. The web layer
// maps that further into its JSON DTO, keeping the use case ignorant of how
// results are presented.
type Interactor struct {
	catalog port.ProductGateway
}

var _ ListProductsByCategory = (*Interactor)(nil)

func NewInteractor(catalog port.ProductGateway) *Interactor {
	return &Interactor{catalog: catalog}
}

func (uc *Interactor) ByCategory(ctx context.Context, categoryID string) ([]ProductOutput, error) {
	found, err := uc.catalog.ByCategory(ctx, entities.NewCategoryID(categoryID))
	if err != nil {
		return nil, err
	}
	out := make([]ProductOutput, 0, len(found))
	for _, p := range found {
		out = append(out, ProductOutput{
			ID:         p.ID.String(),
			CategoryID: p.CategoryID.String(),
			Name:       p.Name,
			PriceCents: p.PriceCents,
		})
	}
	return out, nil
}
