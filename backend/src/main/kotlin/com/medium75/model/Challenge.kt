package com.medium75.model

import jakarta.persistence.*
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

enum class ChallengeStatus { PENDING, ACTIVE, COMPLETED, FAILED, ABANDONED }

enum class StateChangeReason {
    MET, MISS_WITHIN_BUFFER, RESET_TO_0, FELL_BACK_TO_20, FELL_BACK_TO_40
}

@Entity
@Table(name = "challenges")
class Challenge(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "user_id", nullable = false) val userId: UUID,
    @Column(name = "start_date", nullable = false) val startDate: LocalDate,
    @Enumerated(EnumType.STRING) @Column(nullable = false) var status: ChallengeStatus = ChallengeStatus.PENDING,
    @Column(name = "current_streak", nullable = false) var currentStreak: Int = 0,
    @Column(name = "best_streak", nullable = false) var bestStreak: Int = 0,
    @Column(name = "miss_buffer_remaining", nullable = false) var missBufferRemaining: Int = 0,
    @Enumerated(EnumType.STRING) @Column(name = "last_state_change_reason") var lastStateChangeReason: StateChangeReason? = null,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now()
)
