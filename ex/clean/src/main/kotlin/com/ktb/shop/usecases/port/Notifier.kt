package com.ktb.shop.usecases.port

import com.ktb.shop.entities.Customer

// OUTPUT port.
interface Notifier {
    fun welcome(customer: Customer)
}
