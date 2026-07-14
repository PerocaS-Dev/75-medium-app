package com.medium75.controller

import com.medium75.model.StateChangeReason
import com.medium75.service.ChallengeService
import com.medium75.service.DailyCheckOffService
import com.medium75.service.FriendshipService
import com.medium75.service.StreakEngine
import com.medium75.service.UserService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class UserProfileResponse(
    val id: UUID,
    val displayName: String
)

data class UserProgressResponse(
    val userId: UUID,
    val displayName: String,
    val currentStreak: Int,
    val currentTier: Int,
    val missBufferRemaining: Int,
    val bestStreak: Int,
    val lastStateChangeReason: String?,
    val challengeStatus: String,
    val startDate: LocalDate,
    // The day the friend is on = completed days + 1 (a simple counter, capped at 75).
    val dayNumber: Int,
    // Today snapshot — counts only, never which task (privacy by design)
    val todayDoneCount: Int,
    val todayTaskTotal: Int,
    val lastActivityAt: Instant?
)

@RestController
@RequestMapping("/api/users")
class UserProgressController(
    private val friendshipService: FriendshipService,
    private val challengeService: ChallengeService,
    private val dailyCheckOffService: DailyCheckOffService,
    private val userService: UserService
) {
    private fun me(principal: UserDetails): UUID =
        userService.findByEmail(principal.username)?.id
            ?: throw NoSuchElementException("User not found")

    @GetMapping("/lookup")
    fun lookupByEmail(
        @RequestParam email: String,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<UserProfileResponse> {
        val user = userService.findByEmail(email.trim().lowercase())
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(UserProfileResponse(id = user.id, displayName = user.displayName))
    }

    @GetMapping("/{userId}/profile")
    fun getProfile(
        @PathVariable userId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<UserProfileResponse> {
        val user = userService.findById(userId)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(UserProfileResponse(id = user.id, displayName = user.displayName))
    }

    @GetMapping("/{userId}/progress")
    fun getProgress(
        @PathVariable userId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<UserProgressResponse> {
        val viewerId = me(principal)
        friendshipService.assertCanView(viewerId, userId)

        val user = userService.findById(userId)
            ?: return ResponseEntity.notFound().build()
        val challenge = challengeService.getActiveChallenge(userId)
            ?: return ResponseEntity.notFound().build()

        val today = dailyCheckOffService.todaySnapshotFor(challenge)
        val dayNumber = (challenge.currentStreak + 1).coerceAtMost(75)

        return ResponseEntity.ok(UserProgressResponse(
            userId                = userId,
            displayName           = user.displayName,
            currentStreak         = challenge.currentStreak,
            currentTier           = StreakEngine.currentTier(challenge.currentStreak),
            missBufferRemaining   = challenge.missBufferRemaining,
            bestStreak            = challenge.bestStreak,
            lastStateChangeReason = challenge.lastStateChangeReason?.name,
            challengeStatus       = challenge.status.name,
            startDate             = challenge.startDate,
            dayNumber             = dayNumber,
            todayDoneCount        = today.doneCount,
            todayTaskTotal        = today.totalCount,
            lastActivityAt        = today.lastActivityAt
        ))
    }
}
