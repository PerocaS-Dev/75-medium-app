package com.medium75.repository

import com.medium75.model.Friendship
import com.medium75.model.FriendshipStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface FriendshipRepository : JpaRepository<Friendship, UUID> {

    @Query("""
        SELECT f FROM Friendship f
        WHERE (f.requesterId = :a AND f.addresseeId = :b)
           OR (f.requesterId = :b AND f.addresseeId = :a)
    """)
    fun findBetween(@Param("a") a: UUID, @Param("b") b: UUID): Friendship?

    @Query("""
        SELECT f FROM Friendship f
        WHERE f.status = :status
          AND (f.requesterId = :userId OR f.addresseeId = :userId)
    """)
    fun findAllByUserAndStatus(
        @Param("userId") userId: UUID,
        @Param("status") status: FriendshipStatus
    ): List<Friendship>

    fun findAllByAddresseeIdAndStatus(addresseeId: UUID, status: FriendshipStatus): List<Friendship>

    fun findAllByRequesterIdAndStatus(requesterId: UUID, status: FriendshipStatus): List<Friendship>
}
