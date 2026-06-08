package com.ktb.shop.adapters.persistence

import com.ktb.shop.entities.CategoryId
import com.ktb.shop.entities.Product
import com.ktb.shop.entities.ProductId
import com.ktb.shop.usecases.port.ProductGateway
import io.micronaut.context.annotation.Primary
import io.micronaut.data.annotation.Id
import io.micronaut.data.annotation.MappedEntity
import io.micronaut.data.jdbc.annotation.JdbcRepository
import io.micronaut.data.model.query.builder.sql.Dialect
import io.micronaut.data.repository.CrudRepository
import io.micronaut.scheduling.annotation.Scheduled
import jakarta.annotation.PostConstruct
import jakarta.inject.Named
import jakarta.inject.Singleton
import java.util.concurrent.atomic.AtomicReference

@MappedEntity("products")
data class ProductRow(
    @field:Id val id: String,
    val categoryId: String,
    val name: String,
    val priceCents: Long,
)

@JdbcRepository(dialect = Dialect.POSTGRES)
interface ProductData : CrudRepository<ProductRow, String> {
    fun findByCategoryId(categoryId: String): List<ProductRow>
}

private fun ProductRow.toEntity() =
    Product(ProductId(id), CategoryId(categoryId), name, priceCents)

// GATEWAY A — the database-backed catalog.
@Singleton
@Named("db")
class DbProductGateway(private val data: ProductData) : ProductGateway {
    override fun byCategory(category: CategoryId) =
        data.findByCategoryId(category.value).map { it.toEntity() }

    override fun byId(id: ProductId) =
        data.findById(id.value).orElse(null)?.toEntity()

    override fun all() = data.findAll().map { it.toEntity() }
}

// GATEWAY B — the WHOLE catalog kept in memory (only ~1K products / 100 categories).
// @Primary: everything that needs a ProductGateway gets THIS one. The use cases never know.
@Singleton
@Primary
class CachedProductGateway(
    @param:Named("db") private val source: ProductGateway,
) : ProductGateway {

    private data class Snapshot(
        val all: List<Product>,
        val byId: Map<ProductId, Product>,
        val byCat: Map<CategoryId, List<Product>>,
    )

    private val snapshot = AtomicReference(Snapshot(emptyList(), emptyMap(), emptyMap()))

    @PostConstruct
    fun warm() = reload()

    @Scheduled(fixedDelay = "5m")
    fun reload() {
        val all = source.all()
        snapshot.set(
            Snapshot(
                all = all,
                byId = all.associateBy { it.id },
                byCat = all.groupBy { it.categoryId },
            ),
        )
    }

    override fun byCategory(category: CategoryId) = snapshot.get().byCat[category].orEmpty()
    override fun byId(id: ProductId) = snapshot.get().byId[id]
    override fun all() = snapshot.get().all
}
