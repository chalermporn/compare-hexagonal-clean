package com.ktb.shop.infra.web

import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpResponse
import io.micronaut.http.HttpStatus
import io.micronaut.http.MutableHttpResponse
import io.micronaut.http.annotation.RequestFilter
import io.micronaut.http.annotation.ResponseFilter
import io.micronaut.http.annotation.ServerFilter
import io.micronaut.http.annotation.ServerFilter.MATCH_ALL_PATTERN
import jakarta.inject.Singleton
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

// Hardening headers on every response (pentest baseline).
@Singleton
@ServerFilter(MATCH_ALL_PATTERN)
class SecurityHeadersFilter {
    @ResponseFilter
    fun applyHeaders(response: MutableHttpResponse<*>) {
        response.headers.apply {
            add("X-Content-Type-Options", "nosniff")
            add("X-Frame-Options", "DENY")
            add("Referrer-Policy", "no-referrer")
            add("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
            add("Cache-Control", "no-store")
            add("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        }
    }
}

// Sample-grade fixed-window rate limiter per client IP.
// In production, do this at the gateway / with Redis — this is per-instance and in-memory.
@Singleton
@ServerFilter(MATCH_ALL_PATTERN)
class RateLimitFilter {
    private val hits = ConcurrentHashMap<String, AtomicInteger>()

    @Volatile
    private var windowStart = System.currentTimeMillis()

    @RequestFilter
    fun limit(request: HttpRequest<*>): HttpResponse<*>? {
        val now = System.currentTimeMillis()
        if (now - windowStart > WINDOW_MS) {
            hits.clear()
            windowStart = now
        }
        val ip = request.remoteAddress?.address?.hostAddress ?: "unknown"
        val count = hits.computeIfAbsent(ip) { AtomicInteger(0) }.incrementAndGet()
        return if (count > LIMIT) {
            HttpResponse.status<Any>(HttpStatus.TOO_MANY_REQUESTS)
                .body(ApiError("rate_limited", "too many requests"))
        } else {
            null
        }
    }

    companion object {
        private const val LIMIT = 100
        private const val WINDOW_MS = 60_000L
    }
}
