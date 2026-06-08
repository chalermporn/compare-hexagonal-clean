package com.ktb.shop.adapters.notification

import com.ktb.shop.entities.Customer
import com.ktb.shop.usecases.port.Notifier
import jakarta.inject.Singleton
import org.slf4j.LoggerFactory

// GATEWAY for the Notifier port. Swap for a real SMTP/SendGrid adapter later —
// the interactor (RegisterCustomerInteractor) does not change.
@Singleton
class LogNotifier : Notifier {
    private val log = LoggerFactory.getLogger(javaClass)

    override fun welcome(customer: Customer) {
        log.info("welcome email -> {} ({})", customer.email.value, customer.name)
    }
}
