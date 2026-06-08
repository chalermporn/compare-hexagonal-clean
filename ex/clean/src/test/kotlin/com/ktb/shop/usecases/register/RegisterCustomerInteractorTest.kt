package com.ktb.shop.usecases.register

import com.ktb.shop.entities.Customer
import com.ktb.shop.entities.CustomerId
import com.ktb.shop.entities.Email
import com.ktb.shop.entities.EmailAlreadyUsed
import com.ktb.shop.usecases.port.CustomerGateway
import com.ktb.shop.usecases.port.Notifier
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

// Pure unit tests — no Micronaut, no DB. Milliseconds. This is the TDD inner loop:
// the interactor is testable in isolation because it depends only on output ports.

private class InMemoryCustomers : CustomerGateway {
    val saved = mutableListOf<Customer>()
    override fun findByEmail(email: Email) = saved.find { it.email == email }
    override fun save(customer: Customer) { saved += customer }
}

private class RecordingNotifier : Notifier {
    var welcomed: Customer? = null
    override fun welcome(customer: Customer) { welcomed = customer }
}

class RegisterCustomerInteractorTest {

    @Test
    fun `registers a new customer and welcomes them`() {
        val customers = InMemoryCustomers()
        val notifier = RecordingNotifier()

        val out = RegisterCustomerInteractor(customers, notifier)
            .register(RegisterInput("c1", "bird@shop.com", "Bird"))

        assertEquals(1, customers.saved.size)
        assertEquals("bird@shop.com", out.email)
        assertEquals(out.email, notifier.welcomed?.email?.value)
    }

    @Test
    fun `rejects a duplicate email`() {
        val customers = InMemoryCustomers().apply {
            save(Customer(CustomerId("c0"), Email("bird@shop.com"), "Bird"))
        }

        assertThrows<EmailAlreadyUsed> {
            RegisterCustomerInteractor(customers, RecordingNotifier())
                .register(RegisterInput("c1", "bird@shop.com", "Bird"))
        }
    }

    @Test
    fun `rejects an invalid email without touching the gateway`() {
        val customers = InMemoryCustomers()

        assertThrows<IllegalArgumentException> {
            RegisterCustomerInteractor(customers, RecordingNotifier())
                .register(RegisterInput("c1", "not-an-email", "Bird"))
        }
        assertEquals(0, customers.saved.size)
    }
}
