package com.ktb.shop.application

import com.ktb.shop.domain.Customer
import com.ktb.shop.domain.CustomerId
import com.ktb.shop.domain.Email
import com.ktb.shop.domain.EmailAlreadyUsed
import com.ktb.shop.domain.port.CustomerRepository
import com.ktb.shop.domain.port.Notifier

data class RegisterCommand(val id: String, val email: String, val name: String)

// The use case — depends only on ports. No framework, no DB, no web.
class RegisterCustomer(
    private val customers: CustomerRepository,
    private val notifier: Notifier,
) {
    fun handle(command: RegisterCommand): Customer {
        val email = Email(command.email)
        if (customers.findByEmail(email) != null) throw EmailAlreadyUsed(command.email)

        val customer = Customer(CustomerId(command.id), email, command.name)
        customers.save(customer)
        notifier.welcome(customer)
        return customer
    }
}
