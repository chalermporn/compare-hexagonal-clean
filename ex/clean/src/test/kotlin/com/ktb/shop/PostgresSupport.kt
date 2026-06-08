package com.ktb.shop

import io.micronaut.test.support.TestPropertyProvider
import org.testcontainers.containers.PostgreSQLContainer

// Spins up a real Postgres in Docker for integration tests, and feeds its
// connection details into the Micronaut context. Flyway then migrates the schema.
abstract class PostgresSupport : TestPropertyProvider {

    override fun getProperties(): Map<String, String> {
        if (!PG.isRunning) PG.start()
        return mapOf(
            "datasources.default.url" to PG.jdbcUrl,
            "datasources.default.username" to PG.username,
            "datasources.default.password" to PG.password,
        )
    }

    companion object {
        @JvmStatic
        val PG: PostgreSQLContainer<*> =
            PostgreSQLContainer("postgres:16-alpine").withDatabaseName("shop")
    }
}
