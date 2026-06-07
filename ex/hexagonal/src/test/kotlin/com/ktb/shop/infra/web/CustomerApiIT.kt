package com.ktb.shop.infra.web

import com.ktb.shop.PostgresSupport
import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpStatus
import io.micronaut.http.client.HttpClient
import io.micronaut.http.client.annotation.Client
import io.micronaut.http.client.exceptions.HttpClientResponseException
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import jakarta.inject.Inject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

// End-to-end through the HTTP layer, real DB behind it.
@MicronautTest(transactional = false)
class CustomerApiIT : PostgresSupport() {

    @Inject
    @field:Client("/")
    lateinit var client: HttpClient

    @Test
    fun `registers a customer over HTTP`() {
        val body = mapOf("id" to "api1", "email" to "api@shop.com", "name" to "Api User")
        val resp = client.toBlocking()
            .exchange(HttpRequest.POST("/api/customers", body), Map::class.java)
        assertEquals(HttpStatus.CREATED, resp.status)
    }

    @Test
    fun `rejects an invalid email with 400`() {
        val body = mapOf("id" to "api2", "email" to "nope", "name" to "Api User")
        val ex = assertThrows<HttpClientResponseException> {
            client.toBlocking()
                .exchange(HttpRequest.POST("/api/customers", body), Map::class.java)
        }
        assertEquals(HttpStatus.BAD_REQUEST, ex.status)
    }

    @Test
    fun `serves the seeded catalog and sets security headers`() {
        val resp = client.toBlocking()
            .exchange(HttpRequest.GET<Any>("/api/products/category/c1"), List::class.java)
        assertEquals(HttpStatus.OK, resp.status)
        assertEquals("nosniff", resp.header("X-Content-Type-Options"))
    }
}
