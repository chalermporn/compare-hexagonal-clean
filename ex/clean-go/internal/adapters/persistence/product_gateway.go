package persistence

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ktb/clean-shop/internal/entities"
)

// GATEWAY A — the database-backed catalog.
type DBProductGateway struct {
	pool *pgxpool.Pool
}

func NewDBProductGateway(pool *pgxpool.Pool) *DBProductGateway {
	return &DBProductGateway{pool: pool}
}

func (g *DBProductGateway) ByCategory(ctx context.Context, category entities.CategoryID) ([]entities.Product, error) {
	return g.query(ctx,
		`SELECT id, category_id, name, price_cents FROM products WHERE category_id = $1`,
		category.String())
}

func (g *DBProductGateway) ByID(ctx context.Context, id entities.ProductID) (*entities.Product, error) {
	var pid, cat, name string
	var price int64
	err := g.pool.QueryRow(ctx,
		`SELECT id, category_id, name, price_cents FROM products WHERE id = $1`, id.String()).
		Scan(&pid, &cat, &name, &price)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find product by id: %w", err)
	}
	p, err := entities.NewProduct(entities.NewProductID(pid), entities.NewCategoryID(cat), name, price)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (g *DBProductGateway) All(ctx context.Context) ([]entities.Product, error) {
	return g.query(ctx, `SELECT id, category_id, name, price_cents FROM products`)
}

func (g *DBProductGateway) query(ctx context.Context, sql string, args ...any) ([]entities.Product, error) {
	rows, err := g.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("query products: %w", err)
	}
	defer rows.Close()

	var out []entities.Product
	for rows.Next() {
		var id, cat, name string
		var price int64
		if err := rows.Scan(&id, &cat, &name, &price); err != nil {
			return nil, err
		}
		p, err := entities.NewProduct(entities.NewProductID(id), entities.NewCategoryID(cat), name, price)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
