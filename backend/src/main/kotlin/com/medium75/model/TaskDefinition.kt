package com.medium75.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "task_definitions")
class TaskDefinition(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "challenge_id", nullable = false) val challengeId: UUID,
    @Column(nullable = false) var label: String,
    @Column(name = "sort_order", nullable = false) var sortOrder: Int = 0,
    @Column(nullable = false) var locked: Boolean = false,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now()
)
