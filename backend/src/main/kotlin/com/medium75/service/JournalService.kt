package com.medium75.service

import com.medium75.model.*
import com.medium75.repository.JournalEntryRepository
import com.medium75.repository.ReactionRepository
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Service
class JournalService(
    private val journalRepo: JournalEntryRepository,
    private val reactionRepo: ReactionRepository,
    private val friendshipService: FriendshipService
) {
    // ── visibility helpers ───────────────────────────────────────────────────

    fun isEntryVisible(viewerId: UUID, entry: JournalEntry): Boolean =
        viewerId == entry.userId || entry.audienceType == AudienceType.FRIENDS

    private fun requireVisible(viewerId: UUID, entry: JournalEntry) {
        if (!isEntryVisible(viewerId, entry)) throw AccessDeniedException("Forbidden")
    }

    private fun requireActive(id: UUID): JournalEntry =
        journalRepo.findActiveById(id) ?: throw NoSuchElementException("Journal entry not found")

    // ── own entries ──────────────────────────────────────────────────────────

    @Transactional
    fun create(userId: UUID, body: String, entryDate: LocalDate, audienceType: AudienceType): JournalEntry {
        require(body.isNotBlank()) { "Body cannot be empty" }
        return journalRepo.save(
            JournalEntry(userId = userId, body = body.trim(), entryDate = entryDate, audienceType = audienceType)
        )
    }

    fun listMine(userId: UUID): List<JournalEntry> =
        journalRepo.findAllByUserIdNotDeleted(userId)

    @Transactional
    fun update(entryId: UUID, userId: UUID, body: String?, audienceType: AudienceType?): JournalEntry {
        val entry = requireActive(entryId)
        require(entry.userId == userId) { "Not your entry" }
        body?.let { require(it.isNotBlank()) { "Body cannot be empty" }; entry.body = it.trim() }
        audienceType?.let { entry.audienceType = it }
        entry.updatedAt = Instant.now()
        return journalRepo.save(entry)
    }

    @Transactional
    fun delete(entryId: UUID, userId: UUID) {
        val entry = requireActive(entryId)
        require(entry.userId == userId) { "Not your entry" }
        entry.deletedAt = Instant.now()
        entry.updatedAt = Instant.now()
        journalRepo.save(entry)
    }

    // ── friend's entries ─────────────────────────────────────────────────────

    fun listFriendEntries(viewerId: UUID, targetUserId: UUID): List<JournalEntry> {
        friendshipService.assertCanView(viewerId, targetUserId)   // layer 1: must be friends
        return journalRepo.findVisibleByUserId(targetUserId, AudienceType.FRIENDS)  // layer 2: FRIENDS-scoped only
    }

    // ── reactions ────────────────────────────────────────────────────────────

    @Transactional
    fun addReaction(actorId: UUID, entryId: UUID, type: ReactionType, replyBody: String?): Reaction {
        val entry = requireActive(entryId)
        friendshipService.assertCanView(actorId, entry.userId)  // layer 1
        requireVisible(actorId, entry)                           // layer 2

        val existing = reactionRepo.findByJournalEntryIdAndUserId(entryId, actorId)
        return if (existing != null) {
            existing.type      = type
            existing.replyBody = replyBody
            existing.updatedAt = Instant.now()
            reactionRepo.save(existing)
        } else {
            reactionRepo.save(Reaction(journalEntryId = entryId, userId = actorId, type = type, replyBody = replyBody))
        }
    }

    @Transactional
    fun removeReaction(actorId: UUID, entryId: UUID) {
        val entry = requireActive(entryId)
        friendshipService.assertCanView(actorId, entry.userId)
        requireVisible(actorId, entry)
        val reaction = reactionRepo.findByJournalEntryIdAndUserId(entryId, actorId)
            ?: throw NoSuchElementException("Reaction not found")
        reactionRepo.delete(reaction)
    }

    fun listReactions(viewerId: UUID, entryId: UUID): List<Reaction> {
        val entry = requireActive(entryId)
        // Author always sees reactions on own entry; friends see reactions on FRIENDS-scoped entries
        if (viewerId != entry.userId) {
            friendshipService.assertCanView(viewerId, entry.userId)
            requireVisible(viewerId, entry)
        }
        return reactionRepo.findAllByJournalEntryId(entryId)
    }
}
