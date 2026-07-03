package com.medium75.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "daily_task_checks")
class DailyTaskCheck(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "daily_log_id", nullable = false) val dailyLogId: UUID,
    @Column(name = "task_definition_id", nullable = false) val taskDefinitionId: UUID,
    @Column(name = "checked_at", nullable = false) val checkedAt: Instant = Instant.now()
)
