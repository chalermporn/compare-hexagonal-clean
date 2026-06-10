package web

import (
	"net/http"

	"github.com/ktb/clean-shop/internal/usecases/products"
)

// Depends only on the INPUT boundary (products.ListProductsByCategory).
type ProductController struct {
	listByCategory products.ListProductsByCategory
}

func NewProductController(listByCategory products.ListProductsByCategory) *ProductController {
	return &ProductController{listByCategory: listByCategory}
}

// GET /api/products/category/{categoryId}
// An unknown category returns an empty array (200), not 404.
func (c *ProductController) ByCategory(w http.ResponseWriter, r *http.Request) {
	outputs, err := c.listByCategory.ByCategory(r.Context(), r.PathValue("categoryId"))
	if err != nil {
		writeError(w, err)
		return
	}
	// Map the use-case output models to the JSON wire shape.
	views := make([]ProductResponse, 0, len(outputs))
	for _, p := range outputs {
		views = append(views, ProductResponse{
			ID:         p.ID,
			CategoryID: p.CategoryID,
			Name:       p.Name,
			PriceCents: p.PriceCents,
		})
	}
	writeJSON(w, http.StatusOK, views)
}
