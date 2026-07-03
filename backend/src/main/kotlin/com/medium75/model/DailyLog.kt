package com.medium75.model

import jakarta.persistence.*
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

enum class DailyLogStatus { PENDING, MET, NOT_MET }

@Entity
@Table(name = "daily_logs")
class DailyLog(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "challenge_id", nullable = false) val challengeId: UUID,
    @Column(name = "log_date", nullable = false) val logDate: LocalDate,
    @Enumerated(EnumType.STRING) @Column(nullable = false) var status: DailyLogStatus = DailyLogStatus.PENDING,
    @Column(name = "tasks_completed_count", nullable = false) var tasksCompletedCount: Int = 0,
    @Column(name = "tasks_total_count", nullable = false) var tasksTotalCount: Int = 0,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now()
)
