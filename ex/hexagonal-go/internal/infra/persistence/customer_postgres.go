package persistence

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ktb/hexagonal-shop/internal/domain"
)

// ADAPTER: implements the CustomerRepository port. The DB shape (row scan)
// lives here and never crosses into the core. All queries are parameterized —
// no string concatenation.
type PostgresCustomerRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresCustomerRepository(pool *pgxpool.Pool) *PostgresCustomerRepository {
	return &PostgresCustomerRepository{pool: pool}
}

func (r *PostgresCustomerRepository) FindByEmail(ctx context.Context, email domain.Email) (*domain.Customer, error) {
	var id, em, name string
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, name FROM customers WHERE email = $1`, email.String()).
		Scan(&id, &em, &name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find customer by email: %w", err)
	}
	c, err := rowToDomain(id, em, name)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *PostgresCustomerRepository) Save(ctx context.Context, customer domain.Customer) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO customers (id, email, name) VALUES ($1, $2, $3)`,
		customer.ID.String(), customer.Email.String(), customer.Name)
	// The UNIQUE(email) constraint closes the check-then-insert race: a
	// concurrent duplicate surfaces as 23505 and maps back to the domain error.
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return &domain.EmailAlreadyUsedError{Email: customer.Email.String()}
	}
	if err != nil {
		return fmt.Errorf("save customer: %w", err)
	}
	return nil
}

// Map row -> domain at the boundary (same role as CustomerRow.toDomain()).
func rowToDomain(id, email, name string) (domain.Customer, error) {
	cid, err := domain.NewCustomerID(id)
	if err != nil {
		return domain.Customer{}, err
	}
	em, err := domain.NewEmail(email)
	if err != nil {
		return domain.Customer{}, err
	}
	return domain.NewCustomer(cid, em, name)
}
