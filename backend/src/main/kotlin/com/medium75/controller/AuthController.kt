package com.medium75.controller

import com.medium75.service.UserService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.context.HttpSessionSecurityContextRepository
import org.springframework.web.bind.annotation.*

data class RegisterRequest(
    val email: String,
    val password: String,
    val displayName: String,
    val timeZone: String = "UTC"
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class UserResponse(
    val id: String,
    val email: String,
    val displayName: String,
    val timeZone: String,
    val popiaConsentAt: String?
)

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userService: UserService,
    private val authenticationManager: AuthenticationManager
) {

    private val emailRegex = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")

    private fun validateRegistration(req: RegisterRequest) {
        require(emailRegex.matches(req.email.trim())) { "Enter a valid email address." }
        val pw = req.password
        require(
            pw.length >= 8 &&
                pw.any { it.isUpperCase() } &&
                pw.any { it.isDigit() } &&
                pw.any { !it.isLetterOrDigit() }
        ) {
            "Password must be at least 8 characters and include an uppercase letter, a number, and a special character."
        }
    }

    @PostMapping("/register")
    fun register(@RequestBody req: RegisterRequest): ResponseEntity<UserResponse> {
        // Field validation → IllegalArgumentException → 400 with message (GlobalExceptionHandler).
        // Runs before the duplicate-email check below, which stays a 409.
        validateRegistration(req)

        val user = try {
            userService.register(req.email, req.password, req.displayName, req.timeZone)
        } catch (e: IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build()
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(
            UserResponse(
                id = user.id.toString(),
                email = user.email,
                displayName = user.displayName,
                timeZone = user.timeZone,
                popiaConsentAt = user.popiaConsentAt?.toString()
            )
        )
    }

    @PostMapping("/login")
    fun login(@RequestBody req: LoginRequest, request: HttpServletRequest): ResponseEntity<UserResponse> {
        val auth = try {
            authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken(req.email, req.password)
            )
        } catch (e: BadCredentialsException) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }
        val context = SecurityContextHolder.createEmptyContext()
        context.authentication = auth
        SecurityContextHolder.setContext(context)
        request.getSession(true)
            .setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context)

        val user = userService.findByEmail(req.email)!!
        return ResponseEntity.ok(
            UserResponse(
                id = user.id.toString(),
                email = user.email,
                displayName = user.displayName,
                timeZone = user.timeZone,
                popiaConsentAt = user.popiaConsentAt?.toString()
            )
        )
    }

    @PostMapping("/popia-consent")
    fun recordPopiaConsent(@AuthenticationPrincipal principal: UserDetails): ResponseEntity<UserResponse> {
        val user = userService.recordPopiaConsent(principal.username)
        return ResponseEntity.ok(
            UserResponse(
                id = user.id.toString(),
                email = user.email,
                displayName = user.displayName,
                timeZone = user.timeZone,
                popiaConsentAt = user.popiaConsentAt?.toString()
            )
        )
    }

    @GetMapping("/me")
    fun me(): ResponseEntity<UserResponse> {
        val email = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val user = userService.findByEmail(email)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        return ResponseEntity.ok(
            UserResponse(
                id = user.id.toString(),
                email = user.email,
                displayName = user.displayName,
                timeZone = user.timeZone,
                popiaConsentAt = user.popiaConsentAt?.toString()
            )
        )
    }
}
