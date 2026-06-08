package com.ktb.shop.usecases.products

import com.ktb.shop.entities.CategoryId
import com.ktb.shop.entities.Product
import com.ktb.shop.entities.ProductId
import com.ktb.shop.usecases.port.ProductGateway
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ListProductsByCategoryInteractorTest {

    @Test
    fun `returns the products in a category as output models`() {
        val mug = Product(ProductId("p1"), CategoryId("c1"), "Mug", 19900)
        val catalog = object : ProductGateway {
            override fun byCategory(category: CategoryId) =
                if (category == CategoryId("c1")) listOf(mug) else emptyList()
            override fun byId(id: ProductId): Product? = null
            override fun all() = listOf(mug)
        }

        val out = ListProductsByCategoryInteractor(catalog).byCategory("c1")

        assertEquals(listOf(ProductOutput("p1", "c1", "Mug", 19900)), out)
    }
}
