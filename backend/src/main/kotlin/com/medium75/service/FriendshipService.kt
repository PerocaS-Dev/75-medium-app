package com.medium75.service

import com.medium75.model.Friendship
import com.medium75.model.FriendshipStatus
import com.medium75.repository.FriendshipRepository
import com.medium75.repository.UserRepository
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class FriendshipService(
    private val friendshipRepo: FriendshipRepository,
    private val userRepo: UserRepository,
    private val notificationService: NotificationService
) {
    // ── visibility gate ──────────────────────────────────────────────────────

    fun assertCanView(viewerId: UUID, targetId: UUID) {
        if (viewerId == targetId) return
        val f = friendshipRepo.findBetween(viewerId, targetId)
        if (f == null || f.status != FriendshipStatus.ACCEPTED)
            throw AccessDeniedException("You must be friends to view this user's data")
    }

    // ── queries ──────────────────────────────────────────────────────────────

    fun listFriends(userId: UUID): List<Friendship> =
        friendshipRepo.findAllByUserAndStatus(userId, FriendshipStatus.ACCEPTED)

    fun listIncomingRequests(userId: UUID): List<Friendship> =
        friendshipRepo.findAllByAddresseeIdAndStatus(userId, FriendshipStatus.PENDING)

    fun listOutgoingRequests(userId: UUID): List<Friendship> =
        friendshipRepo.findAllByRequesterIdAndStatus(userId, FriendshipStatus.PENDING)

    // ── mutations ────────────────────────────────────────────────────────────

    @Transactional
    fun sendRequest(requesterId: UUID, addresseeId: UUID): Friendship {
        require(requesterId != addresseeId) { "Cannot friend yourself" }
        require(userRepo.existsById(addresseeId)) { "User not found" }

        val existing = friendshipRepo.findBetween(requesterId, addresseeId)
        if (existing != null) {
            when (existing.status) {
                FriendshipStatus.ACCEPTED -> error("Already friends")
                FriendshipStatus.PENDING  -> error("Request already pending")
                FriendshipStatus.BLOCKED  -> throw AccessDeniedException("Cannot send request")
            }
        }
        val saved = friendshipRepo.save(Friendship(requesterId = requesterId, addresseeId = addresseeId))
        notificationService.friendRequest(addresseeId, requesterId, saved.id)
        return saved
    }

    @Transactional
    fun accept(friendshipId: UUID, userId: UUID): Friendship {
        val f = requireFriendship(friendshipId)
        require(f.addresseeId == userId) { "Only the recipient can accept a request" }
        require(f.status == FriendshipStatus.PENDING) { "Request is not pending" }
        f.status    = FriendshipStatus.ACCEPTED
        f.updatedAt = Instant.now()
        val saved = friendshipRepo.save(f)
        // Notify the original requester that their request was accepted.
        notificationService.friendAccept(f.requesterId, userId)
        return saved
    }

    @Transactional
    fun decline(friendshipId: UUID, userId: UUID) {
        val f = requireFriendship(friendshipId)
        require(f.addresseeId == userId) { "Only the recipient can decline a request" }
        require(f.status == FriendshipStatus.PENDING) { "Request is not pending" }
        friendshipRepo.delete(f)
    }

    @Transactional
    fun remove(friendshipId: UUID, userId: UUID) {
        val f = requireFriendship(friendshipId)
        require(f.requesterId == userId || f.addresseeId == userId) { "Not your friendship" }
        friendshipRepo.delete(f)
    }

    @Transactional
    fun block(friendshipId: UUID, userId: UUID): Friendship {
        val f = requireFriendship(friendshipId)
        require(f.requesterId == userId || f.addresseeId == userId) { "Not your friendship" }
        f.status    = FriendshipStatus.BLOCKED
        f.updatedAt = Instant.now()
        return friendshipRepo.save(f)
    }

    // ── internal ─────────────────────────────────────────────────────────────

    private fun requireFriendship(id: UUID): Friendship =
        friendshipRepo.findById(id).orElseThrow { NoSuchElementException("Friendship not found") }
}
