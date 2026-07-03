package com.medium75.service

import com.medium75.model.User
import com.medium75.repository.UserRepository
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class UserService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) : UserDetailsService {

    @Transactional
    fun register(email: String, password: String, displayName: String, timeZone: String): User {
        if (userRepository.existsByEmail(email)) {
            throw IllegalArgumentException("Email already registered")
        }
        return userRepository.save(
            User(
                email = email.lowercase().trim(),
                passwordHash = passwordEncoder.encode(password)!!,
                displayName = displayName.trim(),
                timeZone = timeZone
            )
        )
    }

    override fun loadUserByUsername(email: String): UserDetails {
        val user = userRepository.findByEmail(email.lowercase().trim())
            ?: throw UsernameNotFoundException("No user with email: $email")
        return org.springframework.security.core.userdetails.User(
            user.email,
            user.passwordHash,
            listOf(SimpleGrantedAuthority("ROLE_USER"))
        )
    }

    fun findByEmail(email: String): User? = userRepository.findByEmail(email.lowercase().trim())

    fun findById(id: java.util.UUID): User? = userRepository.findById(id).orElse(null)

    @Transactional
    fun recordPopiaConsent(email: String): User {
        val user = userRepository.findByEmail(email.lowercase().trim())
            ?: throw NoSuchElementException("User not found")
        if (user.popiaConsentAt == null) {
            user.popiaConsentAt = java.time.Instant.now()
            user.updatedAt = java.time.Instant.now()
            userRepository.save(user)
        }
        return user
    }
}
