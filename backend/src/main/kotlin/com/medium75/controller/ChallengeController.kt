package com.medium75.controller

import com.medium75.model.Challenge
import com.medium75.model.ChallengeStatus
import com.medium75.service.ChallengeService
import com.medium75.service.StreakEngine
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.time.LocalDate
import java.util.UUID

data class ChallengeResponse(
    val id: UUID,
    val startDate: LocalDate,
    val status: String,
    val currentStreak: Int,
    val currentTier: Int,
    val missBufferRemaining: Int,
    val bestStreak: Int,
    val lastStateChangeReason: String?
)

data class StartChallengeRequest(
    val startDate: LocalDate? = null
)

@RestController
@RequestMapping("/api/challenges")
class ChallengeController(
    private val challengeService: ChallengeService,
    private val userService: com.medium75.service.UserService
) {
    private fun currentUserId(principal: UserDetails): UUID =
        userService.findByEmail(principal.username)?.id
            ?: throw NoSuchElementException("User not found")

    private fun Challenge.toResponse() = ChallengeResponse(
        id                    = id,
        startDate             = startDate,
        status                = status.name,
        currentStreak         = currentStreak,
        currentTier           = StreakEngine.currentTier(currentStreak),
        missBufferRemaining   = missBufferRemaining,
        bestStreak            = bestStreak,
        lastStateChangeReason = lastStateChangeReason?.name
    )

    @GetMapping("/active")
    fun getActive(@AuthenticationPrincipal principal: UserDetails): ChallengeResponse? {
        val userId = currentUserId(principal)
        return challengeService.getActiveChallenge(userId)?.toResponse()
    }

    @GetMapping("/history")
    fun getHistory(@AuthenticationPrincipal principal: UserDetails): List<ChallengeResponse> {
        val userId = currentUserId(principal)
        return challengeService.getChallengeHistory(userId).map { it.toResponse() }
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@AuthenticationPrincipal principal: UserDetails): ChallengeResponse {
        val userId = currentUserId(principal)
        return challengeService.createChallenge(userId).toResponse()
    }

    @PostMapping("/{id}/start")
    fun start(
        @PathVariable id: UUID,
        @RequestBody(required = false) body: StartChallengeRequest?,
        @AuthenticationPrincipal principal: UserDetails
    ): ChallengeResponse {
        val userId = currentUserId(principal)
        return challengeService.startChallenge(id, userId, body?.startDate).toResponse()
    }
}
