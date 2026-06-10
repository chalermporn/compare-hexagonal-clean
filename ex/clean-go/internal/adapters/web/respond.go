package web

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/ktb/clean-shop/internal/entities"
)

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// Map domain failures to safe responses — never leak internals (same role as
// the Kotlin ApiExceptionHandlers).
func writeError(w http.ResponseWriter, err error) {
	var dup *entities.EmailAlreadyUsedError
	switch {
	case errors.As(err, &dup):
		writeJSON(w, http.StatusConflict, APIError{Code: "email_conflict", Message: "email already registered"})
	case errors.Is(err, entities.ErrInvalid):
		writeJSON(w, http.StatusBadRequest, APIError{Code: "bad_request", Message: "invalid input"})
	default:
		slog.Error("unhandled error", "error", err)
		writeJSON(w, http.StatusInternalServerError, APIError{Code: "internal", Message: "internal server error"})
	}
}
