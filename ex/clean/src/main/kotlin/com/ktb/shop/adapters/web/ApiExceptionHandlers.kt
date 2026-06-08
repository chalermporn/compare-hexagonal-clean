package com.ktb.shop.adapters.web

import com.ktb.shop.entities.EmailAlreadyUsed
import io.micronaut.context.annotation.Requires
import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpResponse
import io.micronaut.http.HttpStatus
import io.micronaut.http.server.exceptions.ExceptionHandler
import jakarta.inject.Singleton

// Map domain/validation failures to safe responses — never leak stack traces (pentest).

@Singleton
@Requires(classes = [EmailAlreadyUsed::class, ExceptionHandler::class])
class EmailAlreadyUsedHandler :
    ExceptionHandler<EmailAlreadyUsed, HttpResponse<ApiError>> {
    override fun handle(request: HttpRequest<*>, exception: EmailAlreadyUsed) =
        HttpResponse.status<ApiError>(HttpStatus.CONFLICT)
            .body(ApiError("email_conflict", "email already registered"))
}

@Singleton
@Requires(classes = [IllegalArgumentException::class, ExceptionHandler::class])
class IllegalArgumentHandler :
    ExceptionHandler<IllegalArgumentException, HttpResponse<ApiError>> {
    override fun handle(request: HttpRequest<*>, exception: IllegalArgumentException) =
        HttpResponse.badRequest(ApiError("bad_request", "invalid input"))
}
