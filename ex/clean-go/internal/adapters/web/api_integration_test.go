package web_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ktb/clean-shop/internal/adapters/notification"
	"github.com/ktb/clean-shop/internal/adapters/persistence"
	"github.com/ktb/clean-shop/internal/adapters/web"
	"github.com/ktb/clean-shop/internal/testsupport"
	"github.com/ktb/clean-shop/internal/usecases/products"
	"github.com/ktb/clean-shop/internal/usecases/register"
)

// End-to-end through the HTTP layer, real DB behind it.

func startServer(t *testing.T) *httptest.Server {
	t.Helper()
	pool := testsupport.StartPostgres(t)

	customers := persistence.NewPostgresCustomerGateway(pool)
	catalog := persistence.NewCachedProductGateway(persistence.NewDBProductGateway(pool))
	if err := catalog.Warm(context.Background()); err != nil {
		t.Fatalf("warm catalog: %v", err)
	}

	router := web.NewRouter(
		web.NewCustomerController(register.NewInteractor(customers, notification.NewLogNotifier())),
		web.NewProductController(products.NewInteractor(catalog)),
		pool,
	)
	srv := httptest.NewServer(router)
	t.Cleanup(srv.Close)
	return srv
}

func TestCustomerAPI(t *testing.T) {
	srv := startServer(t)

	t.Run("registers a customer over HTTP", func(t *testing.T) {
		resp, err := http.Post(srv.URL+"/api/customers", "application/json",
			strings.NewReader(`{"id":"api1","email":"api@shop.com","name":"Api User"}`))
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("expected 201, got %d", resp.StatusCode)
		}
	})

	t.Run("rejects an invalid email with 400", func(t *testing.T) {
		resp, err := http.Post(srv.URL+"/api/customers", "application/json",
			strings.NewReader(`{"id":"api2","email":"nope","name":"Api User"}`))
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", resp.StatusCode)
		}
	})

	t.Run("rejects a duplicate email with 409", func(t *testing.T) {
		body := `{"id":"api3","email":"dup-api@shop.com","name":"Api User"}`
		for i, want := range []int{http.StatusCreated, http.StatusConflict} {
			resp, err := http.Post(srv.URL+"/api/customers", "application/json", strings.NewReader(body))
			if err != nil {
				t.Fatal(err)
			}
			resp.Body.Close()
			if resp.StatusCode != want {
				t.Fatalf("call %d: expected %d, got %d", i+1, want, resp.StatusCode)
			}
		}
	})

	t.Run("serves the seeded catalog and sets security headers", func(t *testing.T) {
		resp, err := http.Get(srv.URL + "/api/products/category/c1")
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", resp.StatusCode)
		}
		if got := resp.Header.Get("X-Content-Type-Options"); got != "nosniff" {
			t.Fatalf("expected nosniff header, got %q", got)
		}
		var productList []map[string]any
		if err := json.NewDecoder(resp.Body).Decode(&productList); err != nil {
			t.Fatal(err)
		}
		if len(productList) != 2 {
			t.Fatalf("expected 2 seeded products in c1, got %d", len(productList))
		}
	})
}
