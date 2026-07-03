package com.medium75.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

enum class FriendshipStatus { PENDING, ACCEPTED, BLOCKED }

@Entity
@Table(name = "friendships")
class Friendship(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "requester_id", nullable = false) val requesterId: UUID,
    @Column(name = "addressee_id", nullable = false) val addresseeId: UUID,
    @Enumerated(EnumType.STRING) @Column(nullable = false) var status: FriendshipStatus = FriendshipStatus.PENDING,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now()
)
