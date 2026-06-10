package web

import (
	"net/http"

	"github.com/ktb/hexagonal-shop/internal/application"
)

type ProductHandler struct {
	listByCategory *application.ListProductsByCategory
}

func NewProductHandler(listByCategory *application.ListProductsByCategory) *ProductHandler {
	return &ProductHandler{listByCategory: listByCategory}
}

// GET /api/products/category/{categoryId}
// An unknown category returns an empty array (200), not 404.
func (h *ProductHandler) ByCategory(w http.ResponseWriter, r *http.Request) {
	products, err := h.listByCategory.Handle(r.Context(), r.PathValue("categoryId"))
	if err != nil {
		writeError(w, err)
		return
	}
	views := make([]ProductView, 0, len(products))
	for _, p := range products {
		views = append(views, ProductView{
			ID:         p.ID.String(),
			CategoryID: p.CategoryID.String(),
			Name:       p.Name,
			PriceCents: p.PriceCents,
		})
	}
	writeJSON(w, http.StatusOK, views)
}
