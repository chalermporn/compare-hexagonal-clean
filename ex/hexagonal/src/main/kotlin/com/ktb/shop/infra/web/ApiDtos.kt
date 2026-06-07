package com.ktb.shop.infra.web

import io.micronaut.serde.annotation.Serdeable
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

@Serdeable
@Schema(name = "RegisterRequest", description = "ข้อมูลที่ใช้สมัครสมาชิกใหม่")
data class RegisterRequest(
    @field:NotBlank @field:Size(max = 64)
    @field:Schema(description = "รหัสลูกค้า (unique)", example = "c100", maxLength = 64, requiredMode = Schema.RequiredMode.REQUIRED)
    val id: String,
    @field:NotBlank @field:Size(max = 320)
    @field:Schema(description = "อีเมล (ต้องไม่ซ้ำ และต้องถูกรูปแบบ)", example = "bird@shop.com", maxLength = 320, requiredMode = Schema.RequiredMode.REQUIRED)
    val email: String,
    @field:NotBlank @field:Size(max = 200)
    @field:Schema(description = "ชื่อ-นามสกุลที่แสดง", example = "Bird", maxLength = 200, requiredMode = Schema.RequiredMode.REQUIRED)
    val name: String,
)

@Serdeable
@Schema(name = "CustomerView", description = "ลูกค้าที่สมัครสำเร็จ (คืนกลับใน Location ของ 201)")
data class CustomerView(
    @field:Schema(description = "รหัสลูกค้า", example = "c100")
    val id: String,
    @field:Schema(description = "อีเมลที่ลงทะเบียน", example = "bird@shop.com")
    val email: String,
    @field:Schema(description = "ชื่อที่แสดง", example = "Bird")
    val name: String,
)

@Serdeable
@Schema(name = "ProductView", description = "สินค้าหนึ่งรายการในหมวดหมู่")
data class ProductView(
    @field:Schema(description = "รหัสสินค้า", example = "p1")
    val id: String,
    @field:Schema(description = "รหัสหมวดหมู่ที่สินค้านี้สังกัด", example = "c1")
    val categoryId: String,
    @field:Schema(description = "ชื่อสินค้า", example = "Blue T-Shirt")
    val name: String,
    @field:Schema(description = "ราคาเป็นหน่วยสตางค์ (เลี่ยง floating point ของเงิน)", example = "29900")
    val priceCents: Long,
)

@Serdeable
@Schema(name = "ApiError", description = "รูปแบบ error มาตรฐาน — ไม่มี stack trace (pentest baseline)")
data class ApiError(
    @field:Schema(description = "รหัส error อ่านด้วยเครื่องได้", example = "email_conflict")
    val code: String,
    @field:Schema(description = "ข้อความ generic ที่ปลอดภัยสำหรับผู้ใช้", example = "email already registered")
    val message: String,
)
