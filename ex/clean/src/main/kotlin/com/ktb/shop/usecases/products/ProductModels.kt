package com.ktb.shop.usecases.products

// Cross-boundary response model (owned by the use-case layer, not the web layer).
data class ProductOutput(
    val id: String,
    val categoryId: String,
    val name: String,
    val priceCents: Long,
)
