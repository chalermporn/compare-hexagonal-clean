package web

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// The API surface is locked down hard; the docs paths (spec + viewer) need a
// looser CSP, so they get their own policy — same split as the Kotlin Filters.kt.
func isDocsPath(path string) bool {
	return strings.HasPrefix(path, "/swagger") || strings.HasPrefix(path, "/docs")
}

// SecurityHeaders adds hardening headers on every response (pentest baseline).
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		if isDocsPath(r.URL.Path) {
			// Strict 'none' breaks the docs viewer (inline boot script), so
			// docs get self + inline; the API keeps the locked-down default.
			h.Set("Content-Security-Policy",
				"default-src 'self'; script-src 'self' 'unsafe-inline'; "+
					"style-src 'self' 'unsafe-inline'; img-src 'self' data:; "+
					"font-src 'self' data:; worker-src 'self' blob:; frame-ancestors 'none'")
		} else {
			h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
			// Cache only matters for static doc assets; API responses stay uncached.
			h.Set("Cache-Control", "no-store")
		}
		h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		next.ServeHTTP(w, r)
	})
}

// RateLimiter is a sample-grade fixed-window limiter per client IP.
// In production, do this at the gateway / with Redis — this is per-instance
// and in-memory.
type RateLimiter struct {
	mu          sync.Mutex
	hits        map[string]int
	windowStart time.Time
	limit       int
	window      time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		hits:        map[string]int{},
		windowStart: time.Now(),
		limit:       limit,
		window:      window,
	}
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Don't let browsing the docs burn the API budget.
		if isDocsPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = "unknown"
		}

		rl.mu.Lock()
		if time.Since(rl.windowStart) > rl.window {
			rl.hits = map[string]int{}
			rl.windowStart = time.Now()
		}
		rl.hits[ip]++
		over := rl.hits[ip] > rl.limit
		rl.mu.Unlock()

		if over {
			writeJSON(w, http.StatusTooManyRequests,
				APIError{Code: "rate_limited", Message: "too many requests"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// MaxBody caps request bodies to blunt oversized-payload abuse (pentest).
func MaxBody(limit int64, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, limit)
		next.ServeHTTP(w, r)
	})
}
