package com.ktb.shop.domain.port

import com.ktb.shop.domain.Customer

// DRIVEN port.
interface Notifier {
    fun welcome(customer: Customer)
}
