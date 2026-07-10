package com.medium75.service

import com.medium75.model.*
import com.medium75.repository.*
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

data class TodaySnapshot(
    val doneCount: Int,
    val totalCount: Int,
    val lastActivityAt: Instant?
)

@Service
class DailyCheckOffService(
    private val taskDefRepo: TaskDefinitionRepository,
    private val dailyLogRepo: DailyLogRepository,
    private val dailyTaskCheckRepo: DailyTaskCheckRepository,
    private val challengeService: ChallengeService,
    private val userRepo: com.medium75.repository.UserRepository
) {
    fun getTodayLog(challengeId: UUID, userId: UUID): DailyLog {
        val challenge = challengeService.requireOwned(challengeId, userId)
        require(challenge.status == ChallengeStatus.ACTIVE) { "Challenge is not active" }
        val today = todayFor(challenge)
        return getOrCreateLog(challenge, today)
    }

    fun getTodayChecks(challengeId: UUID, userId: UUID): List<DailyTaskCheck> {
        val log = getTodayLog(challengeId, userId)
        return dailyTaskCheckRepo.findAllByDailyLogId(log.id)
    }

    /**
     * Read-only snapshot of a challenge's *today* — done/total task counts and the
     * last activity timestamp. Exposes only counts (never which task), so it is safe
     * to surface to friends. Does not require ownership.
     */
    fun todaySnapshotFor(challenge: Challenge): TodaySnapshot {
        val today = todayFor(challenge)
        val log = dailyLogRepo.findByChallengeIdAndLogDate(challenge.id, today)
        val total = log?.tasksTotalCount ?: taskDefRepo.countByChallengeId(challenge.id).toInt()
        return TodaySnapshot(
            doneCount      = log?.tasksCompletedCount ?: 0,
            totalCount     = total,
            lastActivityAt = log?.updatedAt ?: challenge.updatedAt
        )
    }

    @Transactional
    fun checkTask(challengeId: UUID, taskId: UUID, userId: UUID): DailyLog {
        val challenge = challengeService.requireOwned(challengeId, userId)
        require(challenge.status == ChallengeStatus.ACTIVE) { "Challenge is not active" }

        val task = taskDefRepo.findById(taskId).orElseThrow { NoSuchElementException("Task not found") }
        require(task.challengeId == challengeId) { "Task does not belong to this challenge" }
        require(task.locked) { "Task is not locked — challenge has not started" }

        val today = todayFor(challenge)
        val log = getOrCreateLog(challenge, today)

        if (!dailyTaskCheckRepo.existsByDailyLogIdAndTaskDefinitionId(log.id, taskId)) {
            dailyTaskCheckRepo.save(DailyTaskCheck(dailyLogId = log.id, taskDefinitionId = taskId))
        }

        return refreshLogCounts(log, challengeId)
    }

    @Transactional
    fun uncheckTask(challengeId: UUID, taskId: UUID, userId: UUID): DailyLog {
        val challenge = challengeService.requireOwned(challengeId, userId)
        require(challenge.status == ChallengeStatus.ACTIVE) { "Challenge is not active" }

        val today = todayFor(challenge)
        val log = dailyLogRepo.findByChallengeIdAndLogDate(challengeId, today)
            ?: return getOrCreateLog(challenge, today)

        dailyTaskCheckRepo.deleteByDailyLogIdAndTaskDefinitionId(log.id, taskId)
        return refreshLogCounts(log, challengeId)
    }

    // ── internal helpers ─────────────────────────────────────────────────────

    fun getOrCreateLog(challenge: Challenge, date: LocalDate): DailyLog {
        dailyLogRepo.findByChallengeIdAndLogDate(challenge.id, date)?.let { return it }
        return try {
            dailyLogRepo.save(
                DailyLog(
                    challengeId     = challenge.id,
                    logDate         = date,
                    tasksTotalCount = taskDefRepo.countByChallengeId(challenge.id).toInt()
                )
            )
        } catch (e: DataIntegrityViolationException) {
            // Concurrent request already inserted the row — just fetch it
            dailyLogRepo.findByChallengeIdAndLogDate(challenge.id, date) ?: throw e
        }
    }

    private fun refreshLogCounts(log: DailyLog, challengeId: UUID): DailyLog {
        val checks = dailyTaskCheckRepo.findAllByDailyLogId(log.id)
        val total  = taskDefRepo.countByChallengeId(challengeId).toInt()
        log.tasksCompletedCount = checks.size
        log.tasksTotalCount     = total
        log.updatedAt           = Instant.now()
        return dailyLogRepo.save(log)
    }

    fun todayFor(challenge: Challenge): LocalDate {
        val tzString = userRepo.findById(challenge.userId).map { it.timeZone }.orElse("UTC")
        val tz = runCatching { ZoneId.of(tzString) }.getOrDefault(ZoneId.of("UTC"))
        return LocalDate.now(tz)
    }
}
