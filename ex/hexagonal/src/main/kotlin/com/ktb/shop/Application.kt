package com.ktb.shop

import io.micronaut.runtime.Micronaut.run
import io.swagger.v3.oas.annotations.OpenAPIDefinition
import io.swagger.v3.oas.annotations.info.Contact
import io.swagger.v3.oas.annotations.info.Info
import io.swagger.v3.oas.annotations.info.License
import io.swagger.v3.oas.annotations.servers.Server
import io.swagger.v3.oas.annotations.tags.Tag

// API-wide OpenAPI metadata. The micronaut-openapi processor reads this at build time and
// renders it into META-INF/swagger/{title}-{version}.yml — served at /swagger/** and shown
// by the Swagger UI / ReDoc / RapiDoc views.
@OpenAPIDefinition(
    info = Info(
        title = "Hexagonal Shop API",
        version = "0.1.0",
        description = "ตัวอย่าง e-commerce + สมาชิก ที่สาธิต Hexagonal Architecture " +
            "(Ports & Adapters) ด้วย Micronaut 4 + Kotlin ต่อ PostgreSQL. " +
            "REST controller เป็น *driving adapter* — แปลง HTTP ↔ use case โดยไม่มี business rule.",
        contact = Contact(name = "KTB KM", email = "chalermporn.po@gmail.com"),
        license = License(name = "MIT", url = "https://opensource.org/licenses/MIT"),
    ),
    servers = [
        Server(url = "http://localhost:9000", description = "Local dev (./gradlew run)"),
        Server(url = "http://localhost:8080", description = "Docker Compose (docker compose up)"),
    ],
    tags = [
        Tag(name = "Customers", description = "สมัครสมาชิก (register customer)"),
        Tag(name = "Products", description = "ดูสินค้าตามหมวดหมู่ (เสิร์ฟจาก cached adapter)"),
    ],
)
// @OpenAPIDefinition targets a TYPE (not a function), so it hangs on this marker object.
object ApiInfo

fun main(args: Array<String>) {
    run(*args)
}
