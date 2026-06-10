package persistence

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ktb/clean-shop/internal/entities"
)

// INTERFACE ADAPTER: implements the CustomerGateway output port. The DB shape
// (row scan) lives here and never crosses into the use-case layer. All queries
// are parameterized — no string concatenation.
type PostgresCustomerGateway struct {
	pool *pgxpool.Pool
}

func NewPostgresCustomerGateway(pool *pgxpool.Pool) *PostgresCustomerGateway {
	return &PostgresCustomerGateway{pool: pool}
}

func (g *PostgresCustomerGateway) FindByEmail(ctx context.Context, email entities.Email) (*entities.Customer, error) {
	var id, em, name string
	err := g.pool.QueryRow(ctx,
		`SELECT id, email, name FROM customers WHERE email = $1`, email.String()).
		Scan(&id, &em, &name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find customer by email: %w", err)
	}
	c, err := rowToEntity(id, em, name)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (g *PostgresCustomerGateway) Save(ctx context.Context, customer entities.Customer) error {
	_, err := g.pool.Exec(ctx,
		`INSERT INTO customers (id, email, name) VALUES ($1, $2, $3)`,
		customer.ID.String(), customer.Email.String(), customer.Name)
	// The UNIQUE(email) constraint closes the check-then-insert race: a
	// concurrent duplicate surfaces as 23505 and maps back to the domain error.
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return &entities.EmailAlreadyUsedError{Email: customer.Email.String()}
	}
	if err != nil {
		return fmt.Errorf("save customer: %w", err)
	}
	return nil
}

// Map row -> entity at the boundary (same role as CustomerRow.toEntity()).
func rowToEntity(id, email, name string) (entities.Customer, error) {
	cid, err := entities.NewCustomerID(id)
	if err != nil {
		return entities.Customer{}, err
	}
	em, err := entities.NewEmail(email)
	if err != nil {
		return entities.Customer{}, err
	}
	return entities.NewCustomer(cid, em, name)
}
