package com.medium75.config

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.security.access.AccessDeniedException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {
    private val log = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception): ProblemDetail {
        log.error("Unhandled exception: ${ex.javaClass.simpleName} — ${ex.message}", ex)
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, ex.message ?: "Unexpected error")
    }

    @ExceptionHandler(NoSuchElementException::class)
    fun handleNotFound(ex: NoSuchElementException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.message ?: "Not found")

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleBadRequest(ex: IllegalArgumentException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.message ?: "Bad request")

    @ExceptionHandler(IllegalStateException::class)
    fun handleConflict(ex: IllegalStateException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.message ?: "Conflict")

    @ExceptionHandler(AccessDeniedException::class)
    fun handleForbidden(ex: AccessDeniedException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Forbidden")
}
