package com.medium75.repository

import com.medium75.model.Reaction
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ReactionRepository : JpaRepository<Reaction, UUID> {
    fun findAllByJournalEntryId(journalEntryId: UUID): List<Reaction>
    fun findByJournalEntryIdAndUserId(journalEntryId: UUID, userId: UUID): Reaction?
}
