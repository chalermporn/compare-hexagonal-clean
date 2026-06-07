package com.ktb.shop.application

import com.ktb.shop.domain.CategoryId
import com.ktb.shop.domain.Product
import com.ktb.shop.domain.ProductId
import com.ktb.shop.domain.port.ProductCatalog
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ListProductsByCategoryTest {

    @Test
    fun `returns the products in a category`() {
        val mug = Product(ProductId("p1"), CategoryId("c1"), "Mug", 19900)
        val catalog = object : ProductCatalog {
            override fun byCategory(category: CategoryId) =
                if (category == CategoryId("c1")) listOf(mug) else emptyList()
            override fun byId(id: ProductId): Product? = null
            override fun all() = listOf(mug)
        }

        assertEquals(listOf(mug), ListProductsByCategory(catalog).handle("c1"))
    }
}
