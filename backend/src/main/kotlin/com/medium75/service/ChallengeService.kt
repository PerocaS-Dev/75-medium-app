package com.medium75.service

import com.medium75.model.Challenge
import com.medium75.model.ChallengeStatus
import com.medium75.model.TaskDefinition
import com.medium75.repository.ChallengeRepository
import com.medium75.repository.TaskDefinitionRepository
import com.medium75.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

@Service
class ChallengeService(
    private val challengeRepo: ChallengeRepository,
    private val taskDefRepo: TaskDefinitionRepository,
    private val userRepo: UserRepository
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

    /**
     * Locks the challenge's tasks and activates it. [startDate] chooses Day 1 — it must be
     * "today" or "tomorrow" in the user's own time zone (null defaults to today). A future
     * start date puts the challenge in a "Scheduled" state: it is ACTIVE and locked, but the
     * daily-close engine and check-off both no-op until Day 1 arrives (see DailyCheckOffService
     * and DailyCloseService, both of which key off startDate).
     */
    @Transactional
    fun startChallenge(challengeId: UUID, userId: UUID, startDate: LocalDate? = null): Challenge {
        val challenge = requireOwned(challengeId, userId)
        require(challenge.status == ChallengeStatus.PENDING) { "Challenge is not in PENDING state" }
        val tasks = taskDefRepo.findByChallengeIdOrderBySortOrder(challengeId)
        require(tasks.isNotEmpty()) { "Add at least one task before starting" }

        val today = todayFor(userId)
        val chosen = startDate ?: today
        require(chosen == today || chosen == today.plusDays(1)) {
            "Start date must be today or tomorrow"
        }

        tasks.forEach { it.locked = true; it.updatedAt = Instant.now() }
        taskDefRepo.saveAll(tasks)

        challenge.startDate = chosen
        challenge.status = ChallengeStatus.ACTIVE
        challenge.updatedAt = Instant.now()
        return challengeRepo.save(challenge)
    }

    private fun todayFor(userId: UUID): LocalDate {
        val tz = userRepo.findById(userId).map { it.timeZone }.orElse("UTC")
        val zone = runCatching { ZoneId.of(tz) }.getOrDefault(ZoneId.of("UTC"))
        return LocalDate.now(zone)
    }

    fun getById(challengeId: UUID): Challenge =
        challengeRepo.findById(challengeId).orElseThrow { NoSuchElementException("Challenge not found") }

    fun requireOwned(challengeId: UUID, userId: UUID): Challenge {
        val c = getById(challengeId)
        require(c.userId == userId) { "Not your challenge" }
        return c
    }
}
