package persistence

import (
	"context"
	"log/slog"
	"sync/atomic"
	"time"

	"github.com/ktb/clean-shop/internal/entities"
	"github.com/ktb/clean-shop/internal/usecases/port"
)

// GATEWAY B — the WHOLE catalog kept in memory (only ~1K products / 100 categories).
// The composition root wires THIS one into the interactor; the use case never knows.
// (Same role as the Kotlin @Primary CachedProductGateway.)
type CachedProductGateway struct {
	source   port.ProductGateway
	snapshot atomic.Pointer[catalogSnapshot]
}

type catalogSnapshot struct {
	all   []entities.Product
	byID  map[entities.ProductID]entities.Product
	byCat map[entities.CategoryID][]entities.Product
}

func NewCachedProductGateway(source port.ProductGateway) *CachedProductGateway {
	g := &CachedProductGateway{source: source}
	g.snapshot.Store(&catalogSnapshot{
		byID:  map[entities.ProductID]entities.Product{},
		byCat: map[entities.CategoryID][]entities.Product{},
	})
	return g
}

// Warm loads the first snapshot; call it once at startup (the @PostConstruct
// equivalent) so the catalog is never served empty.
func (g *CachedProductGateway) Warm(ctx context.Context) error {
	return g.reload(ctx)
}

// StartReload refreshes the snapshot on a fixed interval (the @Scheduled
// equivalent) until ctx is cancelled.
func (g *CachedProductGateway) StartReload(ctx context.Context, every time.Duration) {
	go func() {
		ticker := time.NewTicker(every)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := g.reload(ctx); err != nil {
					slog.Warn("catalog reload failed; serving the previous snapshot", "error", err)
				}
			}
		}
	}()
}

func (g *CachedProductGateway) reload(ctx context.Context) error {
	all, err := g.source.All(ctx)
	if err != nil {
		return err
	}
	snap := &catalogSnapshot{
		all:   all,
		byID:  make(map[entities.ProductID]entities.Product, len(all)),
		byCat: make(map[entities.CategoryID][]entities.Product),
	}
	for _, p := range all {
		snap.byID[p.ID] = p
		snap.byCat[p.CategoryID] = append(snap.byCat[p.CategoryID], p)
	}
	g.snapshot.Store(snap)
	return nil
}

func (g *CachedProductGateway) ByCategory(_ context.Context, category entities.CategoryID) ([]entities.Product, error) {
	return g.snapshot.Load().byCat[category], nil
}

func (g *CachedProductGateway) ByID(_ context.Context, id entities.ProductID) (*entities.Product, error) {
	if p, ok := g.snapshot.Load().byID[id]; ok {
		return &p, nil
	}
	return nil, nil
}

func (g *CachedProductGateway) All(_ context.Context) ([]entities.Product, error) {
	return g.snapshot.Load().all, nil
}
