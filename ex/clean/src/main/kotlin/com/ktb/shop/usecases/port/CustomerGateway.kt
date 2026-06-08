package com.ktb.shop.usecases.port

import com.ktb.shop.entities.Customer
import com.ktb.shop.entities.Email

// OUTPUT port (a "gateway" in Clean terms): the use-case layer owns this contract and
// calls outward through it. The implementation lives in the adapters layer.
interface CustomerGateway {
    fun findByEmail(email: Email): Customer?
    fun save(customer: Customer)
}
