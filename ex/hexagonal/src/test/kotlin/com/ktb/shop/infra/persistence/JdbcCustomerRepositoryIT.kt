package com.ktb.shop.infra.persistence

import com.ktb.shop.PostgresSupport
import com.ktb.shop.domain.Customer
import com.ktb.shop.domain.CustomerId
import com.ktb.shop.domain.Email
import com.ktb.shop.domain.port.CustomerRepository
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import jakarta.inject.Inject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

// Integration test: the real adapter against a real Postgres (Testcontainers).
@MicronautTest(transactional = false)
class JdbcCustomerRepositoryIT : PostgresSupport() {

    @Inject
    lateinit var repo: CustomerRepository

    @Test
    fun `saves and finds a customer`() {
        val c = Customer(CustomerId("itc1"), Email("it@shop.com"), "IT User")
        repo.save(c)
        assertEquals(c, repo.findByEmail(Email("it@shop.com")))
    }

    @Test
    fun `returns null for an unknown email`() {
        assertNull(repo.findByEmail(Email("missing@shop.com")))
    }
}
