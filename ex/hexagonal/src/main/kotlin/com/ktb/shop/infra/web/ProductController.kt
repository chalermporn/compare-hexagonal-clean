package com.ktb.shop.infra.web

import com.ktb.shop.application.ListProductsByCategory
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.PathVariable

@Controller("/api/products")
class ProductController(private val listByCategory: ListProductsByCategory) {

    @Get("/category/{categoryId}")
    fun byCategory(@PathVariable categoryId: String): List<ProductView> =
        listByCategory.handle(categoryId)
            .map { ProductView(it.id.value, it.categoryId.value, it.name, it.priceCents) }
}
