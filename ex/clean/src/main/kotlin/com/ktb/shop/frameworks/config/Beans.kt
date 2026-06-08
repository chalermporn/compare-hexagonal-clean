package com.ktb.shop.frameworks.config

import com.ktb.shop.usecases.port.CustomerGateway
import com.ktb.shop.usecases.port.Notifier
import com.ktb.shop.usecases.port.ProductGateway
import com.ktb.shop.usecases.products.ListProductsByCategory
import com.ktb.shop.usecases.products.ListProductsByCategoryInteractor
import com.ktb.shop.usecases.register.RegisterCustomer
import com.ktb.shop.usecases.register.RegisterCustomerInteractor
import io.micronaut.context.annotation.Factory
import jakarta.inject.Singleton

// Composition root (frameworks layer): the single place that wires framework-free
// interactors to their gateways and exposes them by their INPUT boundary type.
// Keeps the entities/use-case layers completely annotation-free.
@Factory
class Beans {

    @Singleton
    fun registerCustomer(customers: CustomerGateway, notifier: Notifier): RegisterCustomer =
        RegisterCustomerInteractor(customers, notifier)

    @Singleton
    fun listProductsByCategory(catalog: ProductGateway): ListProductsByCategory =
        ListProductsByCategoryInteractor(catalog)
}
