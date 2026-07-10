package com.medium75.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "photo_reactions")
class PhotoReaction(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "photo_id", nullable = false) val photoId: UUID,
    @Column(name = "user_id", nullable = false) val userId: UUID,
    @Enumerated(EnumType.STRING) @Column(nullable = false) var type: ReactionType,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now()
)
