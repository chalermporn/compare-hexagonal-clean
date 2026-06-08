package com.ktb.shop.entities

@JvmInline
value class ProductId(val value: String)

@JvmInline
value class CategoryId(val value: String)

data class Product(
    val id: ProductId,
    val categoryId: CategoryId,
    val name: String,
    val priceCents: Long,
) {
    init {
        require(name.isNotBlank()) { "name is required" }
        require(priceCents >= 0) { "price must be >= 0" }
    }
}
