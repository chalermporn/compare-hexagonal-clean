package com.ktb.shop.entities

// ① Enterprise Business Rules (Clean's innermost circle).
// Pure Kotlin — no Micronaut, no DB, no web. Nothing here may depend on an outer layer.

@JvmInline
value class CustomerId(val value: String) {
    init { require(value.isNotBlank()) { "customer id is required" } }
}

@JvmInline
value class Email(val value: String) {
    init { require(EMAIL.matches(value)) { "invalid email: $value" } }

    companion object {
        private val EMAIL = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
    }
}

data class Customer(
    val id: CustomerId,
    val email: Email,
    val name: String,
) {
    init { require(name.isNotBlank()) { "name is required" } }
}
