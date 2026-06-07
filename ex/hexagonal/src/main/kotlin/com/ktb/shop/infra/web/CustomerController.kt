package com.ktb.shop.infra.web

import com.ktb.shop.application.RegisterCommand
import com.ktb.shop.application.RegisterCustomer
import io.micronaut.http.HttpResponse
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Post
import jakarta.validation.Valid

// DRIVING adapter. Translates HTTP <-> the use case. No business rules here.
// `open` because Micronaut applies validation AOP to `register`, and KSP requires
// the advised method to be non-final (the kotlin all-open plugin runs too late for KSP).
@Controller("/api/customers")
open class CustomerController(private val registerCustomer: RegisterCustomer) {

    @Post
    open fun register(@Valid @Body req: RegisterRequest): HttpResponse<CustomerView> {
        val c = registerCustomer.handle(RegisterCommand(req.id, req.email, req.name))
        return HttpResponse.created(CustomerView(c.id.value, c.email.value, c.name))
    }
}
