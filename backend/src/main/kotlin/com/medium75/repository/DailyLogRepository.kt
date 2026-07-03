package com.medium75.repository

import com.medium75.model.DailyLog
import com.medium75.model.DailyLogStatus
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate
import java.util.UUID

interface DailyLogRepository : JpaRepository<DailyLog, UUID> {
    fun findByChallengeIdAndLogDate(challengeId: UUID, logDate: LocalDate): DailyLog?
    fun findAllByChallengeIdAndStatusOrderByLogDate(challengeId: UUID, status: DailyLogStatus): List<DailyLog>
    fun findAllByChallengeIdOrderByLogDate(challengeId: UUID): List<DailyLog>
}
