package com.ktb.shop.domain.port

import com.ktb.shop.domain.Customer
import com.ktb.shop.domain.Email

// DRIVEN port: the core calls outward through this contract.
interface CustomerRepository {
    fun findByEmail(email: Email): Customer?
    fun save(customer: Customer)
}
