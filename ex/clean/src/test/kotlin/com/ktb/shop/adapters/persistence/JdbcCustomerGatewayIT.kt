package com.ktb.shop.adapters.persistence

import com.ktb.shop.PostgresSupport
import com.ktb.shop.entities.Customer
import com.ktb.shop.entities.CustomerId
import com.ktb.shop.entities.Email
import com.ktb.shop.usecases.port.CustomerGateway
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import jakarta.inject.Inject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

// Integration test: the real gateway against a real Postgres (Testcontainers).
@MicronautTest(transactional = false)
class JdbcCustomerGatewayIT : PostgresSupport() {

    @Inject
    lateinit var gateway: CustomerGateway

    @Test
    fun `saves and finds a customer`() {
        val c = Customer(CustomerId("itc1"), Email("it@shop.com"), "IT User")
        gateway.save(c)
        assertEquals(c, gateway.findByEmail(Email("it@shop.com")))
    }

    @Test
    fun `returns null for an unknown email`() {
        assertNull(gateway.findByEmail(Email("missing@shop.com")))
    }
}
