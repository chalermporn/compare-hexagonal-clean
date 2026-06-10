package entities

// ① Enterprise Business Rules (Clean's innermost circle).
// Pure Go — no framework, no DB, no web. Nothing here may depend on an outer layer.

import (
	"fmt"
	"regexp"
	"strings"
)

var emailPattern = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

// CustomerID is a value object: the unexported field forces construction
// through NewCustomerID, so an invalid id cannot exist (same role as the
// Kotlin value class init block).
type CustomerID struct{ value string }

func NewCustomerID(v string) (CustomerID, error) {
	if strings.TrimSpace(v) == "" {
		return CustomerID{}, fmt.Errorf("%w: customer id is required", ErrInvalid)
	}
	return CustomerID{value: v}, nil
}

func (id CustomerID) String() string { return id.value }

// Email is a value object — invalid emails cannot be constructed.
type Email struct{ value string }

func NewEmail(v string) (Email, error) {
	if !emailPattern.MatchString(v) {
		return Email{}, fmt.Errorf("%w: invalid email: %s", ErrInvalid, v)
	}
	return Email{value: v}, nil
}

func (e Email) String() string { return e.value }

type Customer struct {
	ID    CustomerID
	Email Email
	Name  string
}

func NewCustomer(id CustomerID, email Email, name string) (Customer, error) {
	if strings.TrimSpace(name) == "" {
		return Customer{}, fmt.Errorf("%w: name is required", ErrInvalid)
	}
	return Customer{ID: id, Email: email, Name: name}, nil
}
