package com.ktb.shop.usecases.port

import com.ktb.shop.entities.CategoryId
import com.ktb.shop.entities.Product
import com.ktb.shop.entities.ProductId

// OUTPUT port. With ~1K products it has both a DB-backed gateway and a cached one.
interface ProductGateway {
    fun byCategory(category: CategoryId): List<Product>
    fun byId(id: ProductId): Product?
    fun all(): List<Product>
}
