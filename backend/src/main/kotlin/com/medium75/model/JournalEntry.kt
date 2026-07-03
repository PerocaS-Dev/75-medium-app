package com.medium75.model

import jakarta.persistence.*
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

enum class AudienceType { SELF, FRIENDS, GROUP }

@Entity
@Table(name = "journal_entries")
class JournalEntry(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "user_id", nullable = false) val userId: UUID,
    @Column(nullable = false, columnDefinition = "TEXT") var body: String,
    @Column(name = "entry_date", nullable = false) var entryDate: LocalDate,
    @Enumerated(EnumType.STRING) @Column(name = "audience_type", nullable = false) var audienceType: AudienceType = AudienceType.SELF,
    @Column(name = "audience_id") var audienceId: UUID? = null,
    @Column(name = "deleted_at") var deletedAt: Instant? = null,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now()
)
