package com.ktb.shop.domain.port

import com.ktb.shop.domain.CategoryId
import com.ktb.shop.domain.Product
import com.ktb.shop.domain.ProductId

// DRIVEN port. With ~1K products it has both a DB adapter and a cached one.
interface ProductCatalog {
    fun byCategory(category: CategoryId): List<Product>
    fun byId(id: ProductId): Product?
    fun all(): List<Product>
}
