package com.ktb.shop.application

import com.ktb.shop.domain.CategoryId
import com.ktb.shop.domain.Product
import com.ktb.shop.domain.port.ProductCatalog

class ListProductsByCategory(private val catalog: ProductCatalog) {
    fun handle(categoryId: String): List<Product> =
        catalog.byCategory(CategoryId(categoryId))
}
