package com.medium75.repository

import com.medium75.model.AudienceType
import com.medium75.model.Photo
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface PhotoRepository : JpaRepository<Photo, UUID> {

    @Query("SELECT p FROM Photo p WHERE p.userId = :userId AND p.deletedAt IS NULL ORDER BY p.createdAt DESC")
    fun findAllByUserIdNotDeleted(@Param("userId") userId: UUID): List<Photo>

    @Query("""
        SELECT p FROM Photo p
        WHERE p.userId = :userId
          AND p.audienceType = :audienceType
          AND p.deletedAt IS NULL
        ORDER BY p.createdAt DESC
    """)
    fun findVisibleByUserId(
        @Param("userId") userId: UUID,
        @Param("audienceType") audienceType: AudienceType
    ): List<Photo>

    @Query("SELECT p FROM Photo p WHERE p.id = :id AND p.deletedAt IS NULL")
    fun findActiveById(@Param("id") id: UUID): Photo?
}
