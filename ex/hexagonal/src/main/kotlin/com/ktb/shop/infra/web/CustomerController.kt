package com.ktb.shop.infra.web

import com.ktb.shop.application.RegisterCommand
import com.ktb.shop.application.RegisterCustomer
import io.micronaut.http.HttpResponse
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Post
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Content
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.responses.ApiResponse
import io.swagger.v3.oas.annotations.responses.ApiResponses
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid

// DRIVING adapter. Translates HTTP <-> the use case. No business rules here.
// `open` because Micronaut applies validation AOP to `register`, and KSP requires
// the advised method to be non-final (the kotlin all-open plugin runs too late for KSP).
@Controller("/api/customers")
@Tag(name = "Customers")
open class CustomerController(private val registerCustomer: RegisterCustomer) {

    @Post
    @Operation(
        summary = "สมัครสมาชิกใหม่",
        description = "สร้างลูกค้าใหม่ — value object (Email, CustomerId) ตรวจความถูกต้องที่ขอบ; " +
            "ถ้าอีเมลซ้ำจะได้ 409, ถ้า payload ผิดรูปจะได้ 400 โดยไม่แตะ DB",
    )
    @ApiResponses(
        ApiResponse(
            responseCode = "201",
            description = "สมัครสำเร็จ",
            content = [Content(mediaType = MediaType.APPLICATION_JSON, schema = Schema(implementation = CustomerView::class))],
        ),
        ApiResponse(
            responseCode = "400",
            description = "payload ผิดรูป (validation ล้มเหลว / อีเมลผิดรูปแบบ)",
            content = [Content(mediaType = MediaType.APPLICATION_JSON, schema = Schema(implementation = ApiError::class))],
        ),
        ApiResponse(
            responseCode = "409",
            description = "อีเมลถูกใช้ลงทะเบียนไปแล้ว",
            content = [Content(mediaType = MediaType.APPLICATION_JSON, schema = Schema(implementation = ApiError::class))],
        ),
        ApiResponse(
            responseCode = "429",
            description = "เรียกถี่เกิน rate limit (100 req/นาที ต่อ IP)",
            content = [Content(mediaType = MediaType.APPLICATION_JSON, schema = Schema(implementation = ApiError::class))],
        ),
    )
    open fun register(@Valid @Body req: RegisterRequest): HttpResponse<CustomerView> {
        val c = registerCustomer.handle(RegisterCommand(req.id, req.email, req.name))
        return HttpResponse.created(CustomerView(c.id.value, c.email.value, c.name))
    }
}
