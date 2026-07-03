package com.medium75.controller

import com.medium75.model.AudienceType
import com.medium75.model.Photo
import com.medium75.service.PhotoService
import com.medium75.service.UserService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class PhotoResponse(
    val id: UUID,
    val caption: String?,
    val audienceType: String,
    val contentType: String,
    val createdAt: Instant
)

data class SignedUrlResponse(val url: String, val expiresInMinutes: Long = 15)

private fun Photo.toResponse() = PhotoResponse(id, caption, audienceType.name, contentType, createdAt)

@RestController
class PhotoController(
    private val photoService: PhotoService,
    private val userService: UserService
) {
    private fun me(principal: UserDetails): UUID =
        userService.findByEmail(principal.username)?.id ?: throw NoSuchElementException("User not found")

    // ── upload ───────────────────────────────────────────────────────────────

    @PostMapping("/api/photos", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun upload(
        @RequestPart("file") file: MultipartFile,
        @RequestPart("caption", required = false) caption: String?,
        @RequestPart("audienceType", required = false) audienceTypeStr: String?,
        @AuthenticationPrincipal principal: UserDetails
    ): PhotoResponse {
        val audience = runCatching { AudienceType.valueOf(audienceTypeStr ?: "SELF") }
            .getOrElse { throw IllegalArgumentException("Invalid audienceType. Valid: SELF, FRIENDS") }
        return photoService.upload(me(principal), file, caption, audience).toResponse()
    }

    // ── list ─────────────────────────────────────────────────────────────────

    @GetMapping("/api/photos")
    fun listMine(@AuthenticationPrincipal principal: UserDetails): List<PhotoResponse> =
        photoService.listMine(me(principal)).map { it.toResponse() }

    @GetMapping("/api/users/{userId}/photos")
    fun listFriendPhotos(
        @PathVariable userId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): List<PhotoResponse> =
        photoService.listFriendPhotos(me(principal), userId).map { it.toResponse() }

    // ── signed URL ───────────────────────────────────────────────────────────

    @GetMapping("/api/photos/{id}/url")
    fun getSignedUrl(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserDetails,
        request: HttpServletRequest
    ): SignedUrlResponse {
        val baseUrl = "${request.scheme}://${request.serverName}:${request.serverPort}"
        return SignedUrlResponse(photoService.getSignedUrl(id, me(principal), baseUrl))
    }

    // ── serve image (no auth — token validates itself) ────────────────────────

    @GetMapping("/api/photos/{id}/image")
    fun serveImage(
        @PathVariable id: UUID,
        @RequestParam token: String
    ): ResponseEntity<ByteArray> {
        val (bytes, contentType) = photoService.serveImage(id, token)
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType))
            .header("Cache-Control", "no-store")
            .header("X-Content-Type-Options", "nosniff")
            .body(bytes)
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @DeleteMapping("/api/photos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ) = photoService.delete(id, me(principal))
}
