package com.ktb.shop.entities

sealed class DomainException(message: String) : RuntimeException(message)

class EmailAlreadyUsed(email: String) :
    DomainException("email already registered: $email")
