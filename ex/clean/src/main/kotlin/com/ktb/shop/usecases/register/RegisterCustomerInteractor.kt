package com.ktb.shop.usecases.register

import com.ktb.shop.entities.Customer
import com.ktb.shop.entities.CustomerId
import com.ktb.shop.entities.Email
import com.ktb.shop.entities.EmailAlreadyUsed
import com.ktb.shop.usecases.port.CustomerGateway
import com.ktb.shop.usecases.port.Notifier

// The interactor — Application Business Rules. Orchestrates entities + output ports.
// No framework, no DB, no web: it is wired up in the frameworks layer (Beans.kt).
class RegisterCustomerInteractor(
    private val customers: CustomerGateway,
    private val notifier: Notifier,
) : RegisterCustomer {

    override fun register(input: RegisterInput): RegisterOutput {
        val email = Email(input.email)
        if (customers.findByEmail(email) != null) throw EmailAlreadyUsed(input.email)

        val customer = Customer(CustomerId(input.id), email, input.name)
        customers.save(customer)
        notifier.welcome(customer)
        return RegisterOutput(customer.id.value, customer.email.value, customer.name)
    }
}
