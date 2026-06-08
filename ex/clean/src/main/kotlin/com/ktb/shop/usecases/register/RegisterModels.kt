package com.ktb.shop.usecases.register

// Request/response models that cross the use-case boundary. They are plain data owned by
// the use-case layer — deliberately SEPARATE from the web DTOs (which live in adapters/web
// and carry validation/Swagger annotations). The controller maps DTO <-> these models.
data class RegisterInput(val id: String, val email: String, val name: String)

data class RegisterOutput(val id: String, val email: String, val name: String)
