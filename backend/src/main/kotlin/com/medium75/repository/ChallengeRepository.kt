package com.medium75.repository

import com.medium75.model.Challenge
import com.medium75.model.ChallengeStatus
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ChallengeRepository : JpaRepository<Challenge, UUID> {
    fun findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId: UUID, status: ChallengeStatus): Challenge?
    fun findAllByUserId(userId: UUID): List<Challenge>
}
