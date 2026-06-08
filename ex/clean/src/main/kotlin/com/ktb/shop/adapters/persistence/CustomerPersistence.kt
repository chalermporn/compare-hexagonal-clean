package com.ktb.shop.adapters.persistence

import com.ktb.shop.entities.Customer
import com.ktb.shop.entities.CustomerId
import com.ktb.shop.entities.Email
import com.ktb.shop.usecases.port.CustomerGateway
import io.micronaut.data.annotation.Id
import io.micronaut.data.annotation.MappedEntity
import io.micronaut.data.jdbc.annotation.JdbcRepository
import io.micronaut.data.model.query.builder.sql.Dialect
import io.micronaut.data.repository.CrudRepository
import jakarta.inject.Singleton

// DB shape — lives in the adapters layer, never crosses into entities/use-cases.
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

// GATEWAY implementation: satisfies the use-case output port, maps row <-> entity.
@Singleton
class JdbcCustomerGateway(private val data: CustomerData) : CustomerGateway {

    override fun findByEmail(email: Email): Customer? =
        data.findByEmail(email.value)?.toEntity()

    override fun save(customer: Customer) {
        data.save(CustomerRow(customer.id.value, customer.email.value, customer.name))
    }

    private fun CustomerRow.toEntity() = Customer(CustomerId(id), Email(email), name)
}
