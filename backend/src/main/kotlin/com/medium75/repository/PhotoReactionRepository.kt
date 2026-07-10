package com.medium75.repository

import com.medium75.model.PhotoReaction
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PhotoReactionRepository : JpaRepository<PhotoReaction, UUID> {
    fun findByPhotoIdAndUserId(photoId: UUID, userId: UUID): PhotoReaction?
    fun findAllByPhotoId(photoId: UUID): List<PhotoReaction>
}
