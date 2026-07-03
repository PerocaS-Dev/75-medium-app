package com.medium75.repository

import com.medium75.model.AudienceType
import com.medium75.model.JournalEntry
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface JournalEntryRepository : JpaRepository<JournalEntry, UUID> {

    @Query("SELECT e FROM JournalEntry e WHERE e.userId = :userId AND e.deletedAt IS NULL ORDER BY e.entryDate DESC")
    fun findAllByUserIdNotDeleted(@Param("userId") userId: UUID): List<JournalEntry>

    @Query("""
        SELECT e FROM JournalEntry e
        WHERE e.userId = :userId
          AND e.audienceType = :audienceType
          AND e.deletedAt IS NULL
        ORDER BY e.entryDate DESC
    """)
    fun findVisibleByUserId(
        @Param("userId") userId: UUID,
        @Param("audienceType") audienceType: AudienceType
    ): List<JournalEntry>

    @Query("SELECT e FROM JournalEntry e WHERE e.id = :id AND e.deletedAt IS NULL")
    fun findActiveById(@Param("id") id: UUID): JournalEntry?
}
