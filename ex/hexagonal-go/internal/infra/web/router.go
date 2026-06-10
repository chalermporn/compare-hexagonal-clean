package web

import (
	"context"
	"net/http"
	"time"
)

// Pinger reports backend liveness for /health (the pgx pool satisfies it).
type Pinger interface {
	Ping(ctx context.Context) error
}

// NewRouter wires the driving adapters onto Go 1.22+ method-aware routes and
// wraps everything in the hardening middleware.
func NewRouter(customers *CustomerHandler, products *ProductHandler, db Pinger) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/customers", customers.Register)
	mux.HandleFunc("GET /api/products/category/{categoryId}", products.ByCategory)

	// Keep the management surface tiny: only health, only non-sensitive details.
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := db.Ping(ctx); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "DOWN"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "UP"})
	})

	// API docs: the OpenAPI 3 spec is hand-authored and embedded in the binary
	// (no CDN, works offline) — see openapi.go.
	mux.HandleFunc("GET /swagger/openapi.yml", serveOpenAPISpec)
	mux.HandleFunc("GET /docs", serveDocsPage)
	mux.Handle("GET /swagger-ui/", swaggerUIHandler())

	rateLimit := NewRateLimiter(100, time.Minute)
	return SecurityHeaders(rateLimit.Middleware(MaxBody(512*1024, mux)))
}
