package com.medium75.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

enum class ReactionType { LIKE, FIRE, STRONG, LAUGH, CELEBRATE, SAD }

@Entity
@Table(name = "reactions")
class Reaction(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "journal_entry_id", nullable = false) val journalEntryId: UUID,
    @Column(name = "user_id", nullable = false) val userId: UUID,
    @Enumerated(EnumType.STRING) @Column(nullable = false) var type: ReactionType,
    @Column(name = "reply_body", columnDefinition = "TEXT") var replyBody: String? = null,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now()
)
