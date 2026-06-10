package register

import "context"

// RegisterCustomer is the INPUT boundary: the contract a driving adapter (the
// controller) calls. The interactor implements it. Controllers depend on THIS
// interface, never on the concrete interactor — that inward-pointing dependency
// is the Clean Architecture "Dependency Rule".
type RegisterCustomer interface {
	Register(ctx context.Context, input RegisterInput) (RegisterOutput, error)
}

// Request/response models that cross the use-case boundary. They are plain data
// owned by the use-case layer — deliberately SEPARATE from the web DTOs (which
// live in adapters/web and carry JSON tags + validation). The controller maps
// DTO <-> these models.
type RegisterInput struct {
	ID    string
	Email string
	Name  string
}

type RegisterOutput struct {
	ID    string
	Email string
	Name  string
}
