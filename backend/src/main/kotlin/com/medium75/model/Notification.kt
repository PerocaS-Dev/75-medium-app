package com.medium75.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

/**
 * In-app notification. Generated at the point a triggering event happens (a reaction/comment on
 * the recipient's own content, or a friend request/accept). The recipient is always the owner of
 * the affected content, so a notification can never reference something the recipient may not see.
 */
enum class NotificationType {
    JOURNAL_REACTION, JOURNAL_COMMENT, PHOTO_REACTION, FRIEND_REQUEST, FRIEND_ACCEPT
}

@Entity
@Table(name = "notifications")
class Notification(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "recipient_id", nullable = false) val recipientId: UUID,
    @Column(name = "actor_id", nullable = false) val actorId: UUID,
    @Enumerated(EnumType.STRING) @Column(name = "type", nullable = false) val type: NotificationType,
    @Enumerated(EnumType.STRING) @Column(name = "reaction_type") val reactionType: ReactionType? = null,
    @Column(name = "target_id") val targetId: UUID? = null,
    @Column(name = "preview") val preview: String? = null,
    @Column(name = "read_at") var readAt: Instant? = null,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant = Instant.now()
)
