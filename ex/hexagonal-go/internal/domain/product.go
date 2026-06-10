package domain

import (
	"fmt"
	"strings"
)

type ProductID struct{ value string }

func NewProductID(v string) ProductID { return ProductID{value: v} }

func (id ProductID) String() string { return id.value }

type CategoryID struct{ value string }

func NewCategoryID(v string) CategoryID { return CategoryID{value: v} }

func (id CategoryID) String() string { return id.value }

type Product struct {
	ID         ProductID
	CategoryID CategoryID
	Name       string
	PriceCents int64
}

func NewProduct(id ProductID, categoryID CategoryID, name string, priceCents int64) (Product, error) {
	if strings.TrimSpace(name) == "" {
		return Product{}, fmt.Errorf("%w: name is required", ErrInvalid)
	}
	if priceCents < 0 {
		return Product{}, fmt.Errorf("%w: price must be >= 0", ErrInvalid)
	}
	return Product{ID: id, CategoryID: categoryID, Name: name, PriceCents: priceCents}, nil
}
