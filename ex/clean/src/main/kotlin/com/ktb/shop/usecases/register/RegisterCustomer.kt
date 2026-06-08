package com.ktb.shop.usecases.register

// INPUT boundary: the contract a driving adapter (the controller) calls. The interactor
// implements it. Controllers depend on THIS interface, never on the concrete interactor —
// that inward-pointing dependency is the Clean Architecture "Dependency Rule".
interface RegisterCustomer {
    fun register(input: RegisterInput): RegisterOutput
}
