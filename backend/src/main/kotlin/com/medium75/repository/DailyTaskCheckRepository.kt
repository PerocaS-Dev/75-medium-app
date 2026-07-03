package com.medium75.repository

import com.medium75.model.DailyTaskCheck
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface DailyTaskCheckRepository : JpaRepository<DailyTaskCheck, UUID> {
    fun findAllByDailyLogId(dailyLogId: UUID): List<DailyTaskCheck>
    fun existsByDailyLogIdAndTaskDefinitionId(dailyLogId: UUID, taskDefinitionId: UUID): Boolean
    fun deleteByDailyLogIdAndTaskDefinitionId(dailyLogId: UUID, taskDefinitionId: UUID)
}
