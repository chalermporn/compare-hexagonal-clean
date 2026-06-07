package com.ktb.shop.domain

sealed class DomainException(message: String) : RuntimeException(message)

class EmailAlreadyUsed(email: String) :
    DomainException("email already registered: $email")
