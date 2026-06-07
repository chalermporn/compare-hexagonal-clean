package com.ktb.shop.infra.persistence

import com.ktb.shop.domain.CategoryId
import com.ktb.shop.domain.Product
import com.ktb.shop.domain.ProductId
import com.ktb.shop.domain.port.ProductCatalog
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

private fun ProductRow.toDomain() =
    Product(ProductId(id), CategoryId(categoryId), name, priceCents)

// ADAPTER A — the database-backed catalog.
@Singleton
@Named("db")
class DbProductCatalog(private val data: ProductData) : ProductCatalog {
    override fun byCategory(category: CategoryId) =
        data.findByCategoryId(category.value).map { it.toDomain() }

    override fun byId(id: ProductId) =
        data.findById(id.value).orElse(null)?.toDomain()

    override fun all() = data.findAll().map { it.toDomain() }
}

// ADAPTER B — the WHOLE catalog kept in memory (only ~1K products / 100 categories).
// @Primary: everything that needs a ProductCatalog gets THIS one. The core never knows.
@Singleton
@Primary
class CachedProductCatalog(
    @param:Named("db") private val source: ProductCatalog,
) : ProductCatalog {

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
