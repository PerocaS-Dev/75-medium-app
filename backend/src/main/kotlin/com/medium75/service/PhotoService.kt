package com.medium75.service

import com.medium75.model.AudienceType
import com.medium75.model.Photo
import com.medium75.model.PhotoReaction
import com.medium75.model.ReactionType
import com.medium75.repository.PhotoReactionRepository
import com.medium75.repository.PhotoRepository
import com.medium75.repository.UserRepository
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.time.Instant
import java.util.UUID

@Service
class PhotoService(
    private val photoRepo: PhotoRepository,
    private val photoReactionRepo: PhotoReactionRepository,
    private val storageService: StorageService,
    private val friendshipService: FriendshipService,
    private val signingService: PhotoSigningService,
    private val watermarkService: WatermarkService,
    private val userRepo: UserRepository
) {
    private val allowedContentTypes = setOf("image/jpeg", "image/jpg", "image/png")

    // ── POPIA ────────────────────────────────────────────────────────────────

    private fun requirePopiaConsent(userId: UUID) {
        val user = userRepo.findById(userId).orElseThrow { NoSuchElementException("User not found") }
        if (user.popiaConsentAt == null)
            throw AccessDeniedException("POPIA_CONSENT_REQUIRED")
    }

    // ── upload ───────────────────────────────────────────────────────────────

    @Transactional
    fun upload(userId: UUID, file: MultipartFile, caption: String?, audienceType: AudienceType): Photo {
        requirePopiaConsent(userId)

        val contentType = file.contentType?.lowercase() ?: "application/octet-stream"
        require(contentType in allowedContentTypes) { "Only JPEG and PNG images are accepted" }
        require(file.size > 0) { "File is empty" }

        val ext = if (contentType.contains("png")) "png" else "jpg"
        val key = "photos/$userId/${UUID.randomUUID()}.$ext"

        storageService.upload(key, file.bytes, contentType)

        return photoRepo.save(
            Photo(userId = userId, objectKey = key, contentType = contentType, caption = caption, audienceType = audienceType)
        )
    }

    // ── list ─────────────────────────────────────────────────────────────────

    fun listMine(userId: UUID): List<Photo> =
        photoRepo.findAllByUserIdNotDeleted(userId)

    fun listFriendPhotos(viewerId: UUID, targetUserId: UUID): List<Photo> {
        friendshipService.assertCanView(viewerId, targetUserId)   // layer 1
        return photoRepo.findVisibleByUserId(targetUserId, AudienceType.FRIENDS)  // layer 2 baked in
    }

    // ── signed URL ───────────────────────────────────────────────────────────

    fun getSignedUrl(photoId: UUID, viewerId: UUID, baseUrl: String): String {
        val photo = requireActive(photoId)
        val viewer = userRepo.findById(viewerId).orElseThrow { NoSuchElementException("User not found") }

        friendshipService.assertCanView(viewerId, photo.userId)   // layer 1
        requirePhotoVisible(viewerId, photo)                       // layer 2

        val token = signingService.generateToken(photoId, viewerId, viewer.displayName)
        return "$baseUrl/api/photos/$photoId/image?token=$token"
    }

    // ── serve (called from controller, no auth required) ─────────────────────

    fun serveImage(photoId: UUID, token: String): Pair<ByteArray, String> {
        val payload = signingService.validateToken(token)
            ?: throw AccessDeniedException("Invalid or expired token")

        require(payload.photoId == photoId) { "Token does not match photo" }

        val photo = requireActive(photoId)
        val bytes = storageService.download(photo.objectKey)

        val isOwner = payload.viewerId == photo.userId
        val watermarked = if (!isOwner && photo.audienceType == AudienceType.FRIENDS) {
            watermarkService.apply(bytes, photo.contentType, payload.viewerDisplayName)
        } else {
            bytes
        }

        return Pair(watermarked, photo.contentType)
    }

    // ── delete ───────────────────────────────────────────────────────────────

    @Transactional
    fun delete(photoId: UUID, userId: UUID) {
        val photo = requireActive(photoId)
        require(photo.userId == userId) { "Not your photo" }

        // Delete from object storage FIRST — if this fails the transaction rolls back
        storageService.delete(photo.objectKey)

        photo.deletedAt = Instant.now()
        photo.updatedAt = Instant.now()
        photoRepo.save(photo)
    }

    // ── reactions ──────────────────────────────────────────────────────────────
    // Same two-layer gate as photo viewing: must be friends AND the photo must be
    // FRIENDS-visible (or your own). Upserts one reaction per user per photo.

    @Transactional
    fun addReaction(actorId: UUID, photoId: UUID, type: ReactionType): PhotoReaction {
        val photo = requireActive(photoId)
        friendshipService.assertCanView(actorId, photo.userId)
        requirePhotoVisible(actorId, photo)

        val existing = photoReactionRepo.findByPhotoIdAndUserId(photoId, actorId)
        return if (existing != null) {
            existing.type = type
            existing.updatedAt = Instant.now()
            photoReactionRepo.save(existing)
        } else {
            photoReactionRepo.save(PhotoReaction(photoId = photoId, userId = actorId, type = type))
        }
    }

    @Transactional
    fun removeReaction(actorId: UUID, photoId: UUID) {
        val photo = requireActive(photoId)
        friendshipService.assertCanView(actorId, photo.userId)
        requirePhotoVisible(actorId, photo)
        val reaction = photoReactionRepo.findByPhotoIdAndUserId(photoId, actorId)
            ?: throw NoSuchElementException("Reaction not found")
        photoReactionRepo.delete(reaction)
    }

    fun listReactions(viewerId: UUID, photoId: UUID): List<PhotoReaction> {
        val photo = requireActive(photoId)
        if (viewerId != photo.userId) {
            friendshipService.assertCanView(viewerId, photo.userId)
            requirePhotoVisible(viewerId, photo)
        }
        return photoReactionRepo.findAllByPhotoId(photoId)
    }

    // ── internal ─────────────────────────────────────────────────────────────

    private fun requireActive(id: UUID): Photo =
        photoRepo.findActiveById(id) ?: throw NoSuchElementException("Photo not found")

    private fun requirePhotoVisible(viewerId: UUID, photo: Photo) {
        if (viewerId != photo.userId && photo.audienceType != AudienceType.FRIENDS)
            throw AccessDeniedException("Forbidden")
    }
}
