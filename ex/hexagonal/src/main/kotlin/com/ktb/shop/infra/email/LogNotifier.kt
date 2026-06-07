package com.ktb.shop.infra.email

import com.ktb.shop.domain.Customer
import com.ktb.shop.domain.port.Notifier
import jakarta.inject.Singleton
import org.slf4j.LoggerFactory

// ADAPTER for the Notifier port. Swap for a real SMTP/SendGrid adapter later —
// the core (RegisterCustomer) does not change.
@Singleton
class LogNotifier : Notifier {
    private val log = LoggerFactory.getLogger(javaClass)

    override fun welcome(customer: Customer) {
        log.info("welcome email -> {} ({})", customer.email.value, customer.name)
    }
}
