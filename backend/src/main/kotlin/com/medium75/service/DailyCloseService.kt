package com.medium75.service

import com.medium75.model.*
import com.medium75.repository.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

@Service
class DailyCloseService(
    private val challengeRepo: ChallengeRepository,
    private val taskDefRepo: TaskDefinitionRepository,
    private val dailyLogRepo: DailyLogRepository,
    private val userRepo: UserRepository
) {
    @Transactional
    fun closeAllActiveChallenges() {
        val active = challengeRepo.findAll().filter { it.status == ChallengeStatus.ACTIVE }
        active.forEach { closeChallenge(it) }
    }

    private fun closeChallenge(challenge: Challenge) {
        val user = userRepo.findById(challenge.userId).orElse(null) ?: return
        val tz = runCatching { ZoneId.of(user.timeZone) }.getOrDefault(ZoneId.of("UTC"))
        val yesterday = LocalDate.now(tz).minusDays(1)

        // Only close yesterday's log; future dates are not yet closeable
        if (yesterday < challenge.startDate) return

        val existingLog = dailyLogRepo.findByChallengeIdAndLogDate(challenge.id, yesterday)
        val log = existingLog ?: run {
            // Gap day — user never opened the app; create a NOT_MET log
            val total = taskDefRepo.countByChallengeId(challenge.id).toInt()
            dailyLogRepo.save(
                DailyLog(
                    challengeId     = challenge.id,
                    logDate         = yesterday,
                    status          = DailyLogStatus.NOT_MET,
                    tasksCompletedCount = 0,
                    tasksTotalCount = total
                )
            )
        }

        if (log.status != DailyLogStatus.PENDING) return // already closed

        val met = log.tasksCompletedCount == log.tasksTotalCount && log.tasksTotalCount > 0
        log.status    = if (met) DailyLogStatus.MET else DailyLogStatus.NOT_MET
        log.updatedAt = Instant.now()
        dailyLogRepo.save(log)

        applyStreakLogic(challenge, met)
    }

    private fun applyStreakLogic(challenge: Challenge, met: Boolean) {
        val state = StreakState(
            currentStreak       = challenge.currentStreak,
            bestStreak          = challenge.bestStreak,
            missBufferRemaining = challenge.missBufferRemaining
        )
        val newState = StreakEngine.applyDay(state, met)

        challenge.currentStreak        = newState.currentStreak
        challenge.bestStreak           = newState.bestStreak
        challenge.missBufferRemaining  = newState.missBufferRemaining
        challenge.lastStateChangeReason = newState.lastStateChangeReason
        challenge.updatedAt             = Instant.now()

        if (challenge.currentStreak >= 75) {
            challenge.status = ChallengeStatus.COMPLETED
        }

        challengeRepo.save(challenge)
    }
}
