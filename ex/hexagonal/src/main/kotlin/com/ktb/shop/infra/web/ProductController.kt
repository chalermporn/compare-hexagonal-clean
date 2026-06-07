package com.ktb.shop.infra.web

import com.ktb.shop.application.ListProductsByCategory
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.PathVariable
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.media.ArraySchema
import io.swagger.v3.oas.annotations.media.Content
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.responses.ApiResponse
import io.swagger.v3.oas.annotations.responses.ApiResponses
import io.swagger.v3.oas.annotations.tags.Tag

@Controller("/api/products")
@Tag(name = "Products")
class ProductController(private val listByCategory: ListProductsByCategory) {

    @Get("/category/{categoryId}")
    @Operation(
        summary = "ดูสินค้าตามหมวดหมู่",
        description = "คืนรายการสินค้าในหมวดที่ระบุ เสิร์ฟจาก cached adapter (ทั้ง catalog ~1K รายการอยู่ในแรม). " +
            "หมวดที่ไม่มีสินค้าจะคืน array ว่าง (200) ไม่ใช่ 404",
    )
    @ApiResponses(
        ApiResponse(
            responseCode = "200",
            description = "รายการสินค้า (อาจว่างได้)",
            content = [Content(
                mediaType = MediaType.APPLICATION_JSON,
                array = ArraySchema(schema = Schema(implementation = ProductView::class)),
            )],
        ),
        ApiResponse(
            responseCode = "429",
            description = "เรียกถี่เกิน rate limit (100 req/นาที ต่อ IP)",
            content = [Content(mediaType = MediaType.APPLICATION_JSON, schema = Schema(implementation = ApiError::class))],
        ),
    )
    fun byCategory(
        @Parameter(description = "รหัสหมวดหมู่", example = "c1", required = true)
        @PathVariable categoryId: String,
    ): List<ProductView> =
        listByCategory.handle(categoryId)
            .map { ProductView(it.id.value, it.categoryId.value, it.name, it.priceCents) }
}
