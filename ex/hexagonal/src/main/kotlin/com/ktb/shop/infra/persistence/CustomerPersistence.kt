package com.ktb.shop.infra.persistence

import com.ktb.shop.domain.Customer
import com.ktb.shop.domain.CustomerId
import com.ktb.shop.domain.Email
import com.ktb.shop.domain.port.CustomerRepository
import io.micronaut.data.annotation.Id
import io.micronaut.data.annotation.MappedEntity
import io.micronaut.data.jdbc.annotation.JdbcRepository
import io.micronaut.data.model.query.builder.sql.Dialect
import io.micronaut.data.repository.CrudRepository
import jakarta.inject.Singleton

// DB shape — lives in infra, never crosses into the core.
@MappedEntity("customers")
data class CustomerRow(
    @field:Id val id: String,
    val email: String,
    val name: String,
)

// Micronaut Data generates the SQL (parameterized — no string concatenation).
@JdbcRepository(dialect = Dialect.POSTGRES)
interface CustomerData : CrudRepository<CustomerRow, String> {
    fun findByEmail(email: String): CustomerRow?
}

// ADAPTER: implements the port, maps row <-> domain at the boundary.
@Singleton
class JdbcCustomerRepository(private val data: CustomerData) : CustomerRepository {

    override fun findByEmail(email: Email): Customer? =
        data.findByEmail(email.value)?.toDomain()

    override fun save(customer: Customer) {
        data.save(CustomerRow(customer.id.value, customer.email.value, customer.name))
    }

    private fun CustomerRow.toDomain() = Customer(CustomerId(id), Email(email), name)
}
