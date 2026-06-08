package com.ktb.shop.usecases.products

import com.ktb.shop.entities.CategoryId
import com.ktb.shop.usecases.port.ProductGateway

// Interactor: maps entities -> the use-case's own output model. The web layer maps that
// further into its JSON DTO, keeping the use case ignorant of how results are presented.
class ListProductsByCategoryInteractor(
    private val catalog: ProductGateway,
) : ListProductsByCategory {

    override fun byCategory(categoryId: String): List<ProductOutput> =
        catalog.byCategory(CategoryId(categoryId))
            .map { ProductOutput(it.id.value, it.categoryId.value, it.name, it.priceCents) }
}
