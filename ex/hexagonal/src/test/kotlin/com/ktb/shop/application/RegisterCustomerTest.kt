package com.ktb.shop.application

import com.ktb.shop.domain.Customer
import com.ktb.shop.domain.CustomerId
import com.ktb.shop.domain.Email
import com.ktb.shop.domain.EmailAlreadyUsed
import com.ktb.shop.domain.port.CustomerRepository
import com.ktb.shop.domain.port.Notifier
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

// Pure unit tests — no Micronaut, no DB. Milliseconds. This is the TDD inner loop.

private class InMemoryCustomers : CustomerRepository {
    val saved = mutableListOf<Customer>()
    override fun findByEmail(email: Email) = saved.find { it.email == email }
    override fun save(customer: Customer) { saved += customer }
}

private class RecordingNotifier : Notifier {
    var welcomed: Customer? = null
    override fun welcome(customer: Customer) { welcomed = customer }
}

class RegisterCustomerTest {

    @Test
    fun `registers a new customer and welcomes them`() {
        val customers = InMemoryCustomers()
        val notifier = RecordingNotifier()

        val c = RegisterCustomer(customers, notifier)
            .handle(RegisterCommand("c1", "bird@shop.com", "Bird"))

        assertEquals(1, customers.saved.size)
        assertEquals(c, notifier.welcomed)
    }

    @Test
    fun `rejects a duplicate email`() {
        val customers = InMemoryCustomers().apply {
            save(Customer(CustomerId("c0"), Email("bird@shop.com"), "Bird"))
        }

        assertThrows<EmailAlreadyUsed> {
            RegisterCustomer(customers, RecordingNotifier())
                .handle(RegisterCommand("c1", "bird@shop.com", "Bird"))
        }
    }

    @Test
    fun `rejects an invalid email without touching the repository`() {
        val customers = InMemoryCustomers()

        assertThrows<IllegalArgumentException> {
            RegisterCustomer(customers, RecordingNotifier())
                .handle(RegisterCommand("c1", "not-an-email", "Bird"))
        }
        assertEquals(0, customers.saved.size)
    }
}
