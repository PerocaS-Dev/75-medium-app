package com.medium75.service

import com.medium75.model.Notification
import com.medium75.model.NotificationType
import com.medium75.model.ReactionType
import com.medium75.repository.NotificationRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/**
 * Generates and reads in-app notifications. Generation methods are called from within the existing
 * event flows (reactions, comments, friendships), inside their transaction. Self-actions
 * (recipient == actor) never produce a notification.
 */
@Service
class NotificationService(
    private val notificationRepo: NotificationRepository
) {
    companion object {
        private const val PREVIEW_MAX = 140
    }

    fun listFor(recipientId: UUID): List<Notification> =
        notificationRepo.findTop50ByRecipientIdOrderByCreatedAtDesc(recipientId)

    fun unreadCount(recipientId: UUID): Long =
        notificationRepo.countByRecipientIdAndReadAtIsNull(recipientId)

    @Transactional
    fun markAllRead(recipientId: UUID): Int {
        val unread = notificationRepo.findAllByRecipientIdAndReadAtIsNull(recipientId)
        val now = Instant.now()
        unread.forEach { it.readAt = now }
        notificationRepo.saveAll(unread)
        return unread.size
    }

    // ── generation ─────────────────────────────────────────────────────────────

    fun journalReaction(recipientId: UUID, actorId: UUID, entryId: UUID, type: ReactionType) =
        create(recipientId, actorId, NotificationType.JOURNAL_REACTION, reactionType = type, targetId = entryId)

    fun journalComment(recipientId: UUID, actorId: UUID, entryId: UUID, replyBody: String) =
        create(recipientId, actorId, NotificationType.JOURNAL_COMMENT, targetId = entryId, preview = replyBody.trim().take(PREVIEW_MAX))

    fun photoReaction(recipientId: UUID, actorId: UUID, photoId: UUID, type: ReactionType) =
        create(recipientId, actorId, NotificationType.PHOTO_REACTION, reactionType = type, targetId = photoId)

    fun friendRequest(recipientId: UUID, actorId: UUID, friendshipId: UUID) =
        create(recipientId, actorId, NotificationType.FRIEND_REQUEST, targetId = friendshipId)

    fun friendAccept(recipientId: UUID, actorId: UUID) =
        create(recipientId, actorId, NotificationType.FRIEND_ACCEPT, targetId = actorId)

    private fun create(
        recipientId: UUID,
        actorId: UUID,
        type: NotificationType,
        reactionType: ReactionType? = null,
        targetId: UUID? = null,
        preview: String? = null,
    ) {
        if (recipientId == actorId) return  // never notify yourself
        notificationRepo.save(
            Notification(
                recipientId = recipientId,
                actorId = actorId,
                type = type,
                reactionType = reactionType,
                targetId = targetId,
                preview = preview,
            )
        )
    }
}
