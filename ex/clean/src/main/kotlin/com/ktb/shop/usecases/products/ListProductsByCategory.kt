package com.ktb.shop.usecases.products

// INPUT boundary for the "list products by category" use case.
interface ListProductsByCategory {
    fun byCategory(categoryId: String): List<ProductOutput>
}
