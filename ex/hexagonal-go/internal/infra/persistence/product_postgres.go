package persistence

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ktb/hexagonal-shop/internal/domain"
)

// ADAPTER A — the database-backed catalog.
type DBProductCatalog struct {
	pool *pgxpool.Pool
}

func NewDBProductCatalog(pool *pgxpool.Pool) *DBProductCatalog {
	return &DBProductCatalog{pool: pool}
}

func (c *DBProductCatalog) ByCategory(ctx context.Context, category domain.CategoryID) ([]domain.Product, error) {
	return c.query(ctx,
		`SELECT id, category_id, name, price_cents FROM products WHERE category_id = $1`,
		category.String())
}

func (c *DBProductCatalog) ByID(ctx context.Context, id domain.ProductID) (*domain.Product, error) {
	var pid, cat, name string
	var price int64
	err := c.pool.QueryRow(ctx,
		`SELECT id, category_id, name, price_cents FROM products WHERE id = $1`, id.String()).
		Scan(&pid, &cat, &name, &price)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find product by id: %w", err)
	}
	p, err := domain.NewProduct(domain.NewProductID(pid), domain.NewCategoryID(cat), name, price)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (c *DBProductCatalog) All(ctx context.Context) ([]domain.Product, error) {
	return c.query(ctx, `SELECT id, category_id, name, price_cents FROM products`)
}

func (c *DBProductCatalog) query(ctx context.Context, sql string, args ...any) ([]domain.Product, error) {
	rows, err := c.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("query products: %w", err)
	}
	defer rows.Close()

	var out []domain.Product
	for rows.Next() {
		var id, cat, name string
		var price int64
		if err := rows.Scan(&id, &cat, &name, &price); err != nil {
			return nil, err
		}
		p, err := domain.NewProduct(domain.NewProductID(id), domain.NewCategoryID(cat), name, price)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
