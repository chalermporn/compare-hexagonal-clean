package com.ktb.shop.infra.config

import com.ktb.shop.application.ListProductsByCategory
import com.ktb.shop.application.RegisterCustomer
import com.ktb.shop.domain.port.CustomerRepository
import com.ktb.shop.domain.port.Notifier
import com.ktb.shop.domain.port.ProductCatalog
import io.micronaut.context.annotation.Factory
import jakarta.inject.Singleton

// Composition root: the single place that builds the framework-free use cases
// from their adapters. Keeps the application layer annotation-free.
@Factory
class UseCaseFactory {

    @Singleton
    fun registerCustomer(customers: CustomerRepository, notifier: Notifier): RegisterCustomer =
        RegisterCustomer(customers, notifier)

    @Singleton
    fun listProductsByCategory(catalog: ProductCatalog): ListProductsByCategory =
        ListProductsByCategory(catalog)
}
