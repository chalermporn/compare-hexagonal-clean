package entities

import (
	"errors"
	"fmt"
)

// ErrInvalid marks a violated entity invariant (the Kotlin version's
// IllegalArgumentException). The interface adapters map it to 400 at the boundary.
var ErrInvalid = errors.New("invalid")

// EmailAlreadyUsedError is the domain failure for a duplicate registration
// (the Kotlin version's EmailAlreadyUsed). Adapters map it to 409.
type EmailAlreadyUsedError struct{ Email string }

func (e *EmailAlreadyUsedError) Error() string {
	return fmt.Sprintf("email already registered: %s", e.Email)
}
