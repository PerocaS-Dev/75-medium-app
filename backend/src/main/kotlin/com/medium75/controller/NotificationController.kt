package com.medium75.controller

import com.medium75.model.Notification
import com.medium75.service.NotificationService
import com.medium75.service.UserService
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID

data class NotificationResponse(
    val id: UUID,
    val type: String,
    val actorId: UUID,
    val actorDisplayName: String,
    val reactionType: String?,
    val targetId: UUID?,
    val preview: String?,
    val read: Boolean,
    val createdAt: Instant,
)

data class UnreadCountResponse(val count: Long)

@RestController
class NotificationController(
    private val notificationService: NotificationService,
    private val userService: UserService,
) {
    private fun me(principal: UserDetails): UUID =
        userService.findByEmail(principal.username)?.id ?: throw NoSuchElementException("User not found")

    private fun nameOf(userId: UUID): String =
        userService.findById(userId)?.displayName ?: "Unknown"

    private fun Notification.toResponse() = NotificationResponse(
        id               = id,
        type             = type.name,
        actorId          = actorId,
        actorDisplayName = nameOf(actorId),
        reactionType     = reactionType?.name,
        targetId         = targetId,
        preview          = preview,
        read             = readAt != null,
        createdAt        = createdAt,
    )

    @GetMapping("/api/notifications")
    fun list(@AuthenticationPrincipal principal: UserDetails): List<NotificationResponse> =
        notificationService.listFor(me(principal)).map { it.toResponse() }

    @GetMapping("/api/notifications/unread-count")
    fun unreadCount(@AuthenticationPrincipal principal: UserDetails): UnreadCountResponse =
        UnreadCountResponse(notificationService.unreadCount(me(principal)))

    @PostMapping("/api/notifications/mark-read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun markRead(@AuthenticationPrincipal principal: UserDetails) {
        notificationService.markAllRead(me(principal))
    }
}
