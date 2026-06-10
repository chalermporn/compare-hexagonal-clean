// Composition root: the single place that builds the framework-free use cases
// from their adapters (the Kotlin version's UseCaseFactory + Application.kt).
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ktb/hexagonal-shop/internal/application"
	"github.com/ktb/hexagonal-shop/internal/infra/email"
	"github.com/ktb/hexagonal-shop/internal/infra/persistence"
	"github.com/ktb/hexagonal-shop/internal/infra/web"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	if err := run(); err != nil {
		slog.Error("fatal", "error", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// 12-factor: all config from env, no hardcoded secrets.
	dbURL := envOr("DB_URL", "postgres://shop:shop@localhost:5432/shop?sslmode=disable")
	port := envOr("PORT", "9000")

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := persistence.Migrate(ctx, pool); err != nil {
		return err
	}

	// Driven adapters.
	customers := persistence.NewPostgresCustomerRepository(pool)
	dbCatalog := persistence.NewDBProductCatalog(pool)
	catalog := persistence.NewCachedProductCatalog(dbCatalog)
	if err := catalog.Warm(ctx); err != nil {
		return err
	}
	catalog.StartReload(ctx, 5*time.Minute)
	notifier := email.NewLogNotifier()

	// Use cases — wired from ports only; they never see pgx or net/http.
	registerCustomer := application.NewRegisterCustomer(customers, notifier)
	listProducts := application.NewListProductsByCategory(catalog)

	// Driving adapters.
	router := web.NewRouter(
		web.NewCustomerHandler(registerCustomer),
		web.NewProductHandler(listProducts),
		pool,
	)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("listening", "port", port)
		errCh <- server.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		slog.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
