// ④ Frameworks & Drivers — the composition root: the single place that builds
// the framework-free interactors from their gateways and exposes them to the
// controllers by their INPUT boundary type (the Kotlin version's Beans.kt +
// Application.kt).
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

	"github.com/ktb/clean-shop/internal/adapters/notification"
	"github.com/ktb/clean-shop/internal/adapters/persistence"
	"github.com/ktb/clean-shop/internal/adapters/web"
	"github.com/ktb/clean-shop/internal/usecases/products"
	"github.com/ktb/clean-shop/internal/usecases/register"
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
	// Ports are offset from hexagonal-go (9000/5432) so both run side by side.
	dbURL := envOr("DB_URL", "postgres://shop:shop@localhost:5433/shop?sslmode=disable")
	port := envOr("PORT", "9001")

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := persistence.Migrate(ctx, pool); err != nil {
		return err
	}

	// Gateways (interface adapters, outward-facing).
	customers := persistence.NewPostgresCustomerGateway(pool)
	dbCatalog := persistence.NewDBProductGateway(pool)
	catalog := persistence.NewCachedProductGateway(dbCatalog)
	if err := catalog.Warm(ctx); err != nil {
		return err
	}
	catalog.StartReload(ctx, 5*time.Minute)
	notifier := notification.NewLogNotifier()

	// Interactors — wired from output ports only; they never see pgx or net/http.
	// The variables are typed as the INPUT boundaries: from here on, nothing can
	// reach the concrete interactors (what @Factory + @Singleton enforce in Kotlin).
	var registerCustomer register.RegisterCustomer = register.NewInteractor(customers, notifier)
	var listProducts products.ListProductsByCategory = products.NewInteractor(catalog)

	// Controllers (interface adapters, inward-facing) — depend on the boundaries.
	router := web.NewRouter(
		web.NewCustomerController(registerCustomer),
		web.NewProductController(listProducts),
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
