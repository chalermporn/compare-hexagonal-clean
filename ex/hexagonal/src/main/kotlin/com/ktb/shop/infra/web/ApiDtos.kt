package com.ktb.shop.infra.web

import io.micronaut.serde.annotation.Serdeable
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

@Serdeable
data class RegisterRequest(
    @field:NotBlank @field:Size(max = 64) val id: String,
    @field:NotBlank @field:Size(max = 320) val email: String,
    @field:NotBlank @field:Size(max = 200) val name: String,
)

@Serdeable
data class CustomerView(val id: String, val email: String, val name: String)

@Serdeable
data class ProductView(
    val id: String,
    val categoryId: String,
    val name: String,
    val priceCents: Long,
)

@Serdeable
data class ApiError(val code: String, val message: String)
