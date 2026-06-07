package com.ktb.shop.domain

// Pure domain — no Micronaut, no DB, no web. The innermost layer.

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
