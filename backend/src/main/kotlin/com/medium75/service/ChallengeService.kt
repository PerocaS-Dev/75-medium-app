package com.medium75.service

import com.medium75.model.Challenge
import com.medium75.model.ChallengeStatus
import com.medium75.model.TaskDefinition
import com.medium75.repository.ChallengeRepository
import com.medium75.repository.TaskDefinitionRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Service
class ChallengeService(
    private val challengeRepo: ChallengeRepository,
    private val taskDefRepo: TaskDefinitionRepository
) {
    fun getActiveChallenge(userId: UUID): Challenge? =
        challengeRepo.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, ChallengeStatus.ACTIVE)
            ?: challengeRepo.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, ChallengeStatus.PENDING)
            ?: challengeRepo.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, ChallengeStatus.COMPLETED)

    fun getChallengeHistory(userId: UUID): List<Challenge> =
        challengeRepo.findAllByUserId(userId)

    @Transactional
    fun createChallenge(userId: UUID): Challenge {
        val existing = challengeRepo.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, ChallengeStatus.ACTIVE)
            ?: challengeRepo.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, ChallengeStatus.PENDING)
        require(existing == null) { "User already has an active or pending challenge" }

        return challengeRepo.save(
            Challenge(userId = userId, startDate = LocalDate.now())
        )
    }

    @Transactional
    fun startChallenge(challengeId: UUID, userId: UUID): Challenge {
        val challenge = requireOwned(challengeId, userId)
        require(challenge.status == ChallengeStatus.PENDING) { "Challenge is not in PENDING state" }
        val tasks = taskDefRepo.findByChallengeIdOrderBySortOrder(challengeId)
        require(tasks.isNotEmpty()) { "Add at least one task before starting" }

        tasks.forEach { it.locked = true; it.updatedAt = Instant.now() }
        taskDefRepo.saveAll(tasks)

        challenge.status = ChallengeStatus.ACTIVE
        challenge.updatedAt = Instant.now()
        return challengeRepo.save(challenge)
    }

    fun getById(challengeId: UUID): Challenge =
        challengeRepo.findById(challengeId).orElseThrow { NoSuchElementException("Challenge not found") }

    fun requireOwned(challengeId: UUID, userId: UUID): Challenge {
        val c = getById(challengeId)
        require(c.userId == userId) { "Not your challenge" }
        return c
    }
}
