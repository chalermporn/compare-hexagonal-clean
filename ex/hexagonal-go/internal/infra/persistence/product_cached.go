package persistence

import (
	"context"
	"log/slog"
	"sync/atomic"
	"time"

	"github.com/ktb/hexagonal-shop/internal/domain"
	"github.com/ktb/hexagonal-shop/internal/domain/port"
)

// ADAPTER B — the WHOLE catalog kept in memory (only ~1K products / 100 categories).
// The composition root wires THIS one into the use case; the core never knows.
// (Same role as the Kotlin @Primary CachedProductCatalog.)
type CachedProductCatalog struct {
	source   port.ProductCatalog
	snapshot atomic.Pointer[catalogSnapshot]
}

type catalogSnapshot struct {
	all   []domain.Product
	byID  map[domain.ProductID]domain.Product
	byCat map[domain.CategoryID][]domain.Product
}

func NewCachedProductCatalog(source port.ProductCatalog) *CachedProductCatalog {
	c := &CachedProductCatalog{source: source}
	c.snapshot.Store(&catalogSnapshot{
		byID:  map[domain.ProductID]domain.Product{},
		byCat: map[domain.CategoryID][]domain.Product{},
	})
	return c
}

// Warm loads the first snapshot; call it once at startup (the @PostConstruct
// equivalent) so the catalog is never served empty.
func (c *CachedProductCatalog) Warm(ctx context.Context) error {
	return c.reload(ctx)
}

// StartReload refreshes the snapshot on a fixed interval (the @Scheduled
// equivalent) until ctx is cancelled.
func (c *CachedProductCatalog) StartReload(ctx context.Context, every time.Duration) {
	go func() {
		ticker := time.NewTicker(every)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := c.reload(ctx); err != nil {
					slog.Warn("catalog reload failed; serving the previous snapshot", "error", err)
				}
			}
		}
	}()
}

func (c *CachedProductCatalog) reload(ctx context.Context) error {
	all, err := c.source.All(ctx)
	if err != nil {
		return err
	}
	snap := &catalogSnapshot{
		all:   all,
		byID:  make(map[domain.ProductID]domain.Product, len(all)),
		byCat: make(map[domain.CategoryID][]domain.Product),
	}
	for _, p := range all {
		snap.byID[p.ID] = p
		snap.byCat[p.CategoryID] = append(snap.byCat[p.CategoryID], p)
	}
	c.snapshot.Store(snap)
	return nil
}

func (c *CachedProductCatalog) ByCategory(_ context.Context, category domain.CategoryID) ([]domain.Product, error) {
	return c.snapshot.Load().byCat[category], nil
}

func (c *CachedProductCatalog) ByID(_ context.Context, id domain.ProductID) (*domain.Product, error) {
	if p, ok := c.snapshot.Load().byID[id]; ok {
		return &p, nil
	}
	return nil, nil
}

func (c *CachedProductCatalog) All(_ context.Context) ([]domain.Product, error) {
	return c.snapshot.Load().all, nil
}
