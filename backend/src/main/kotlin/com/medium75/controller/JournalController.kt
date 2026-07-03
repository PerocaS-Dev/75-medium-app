package com.medium75.controller

import com.medium75.model.AudienceType
import com.medium75.model.JournalEntry
import com.medium75.model.Reaction
import com.medium75.model.ReactionType
import com.medium75.service.JournalService
import com.medium75.service.UserService
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class JournalEntryResponse(
    val id: UUID,
    val userId: UUID,
    val body: String,
    val entryDate: LocalDate,
    val audienceType: String,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class ReactionResponse(
    val id: UUID,
    val userId: UUID,
    val type: String,
    val replyBody: String?,
    val createdAt: Instant
)

data class CreateJournalRequest(
    val body: String,
    val entryDate: LocalDate,
    val audienceType: String = "SELF"
)

data class UpdateJournalRequest(
    val body: String? = null,
    val audienceType: String? = null
)

data class AddReactionRequest(
    val type: String,
    val replyBody: String? = null
)

private fun JournalEntry.toResponse() = JournalEntryResponse(id, userId, body, entryDate, audienceType.name, createdAt, updatedAt)
private fun Reaction.toResponse()     = ReactionResponse(id, userId, type.name, replyBody, createdAt)

@RestController
class JournalController(
    private val journalService: JournalService,
    private val userService: UserService
) {
    private fun me(principal: UserDetails): UUID =
        userService.findByEmail(principal.username)?.id ?: throw NoSuchElementException("User not found")

    // ── own entries ──────────────────────────────────────────────────────────

    @PostMapping("/api/journals")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @RequestBody body: CreateJournalRequest,
        @AuthenticationPrincipal principal: UserDetails
    ): JournalEntryResponse {
        val audience = runCatching { AudienceType.valueOf(body.audienceType) }
            .getOrElse { throw IllegalArgumentException("Invalid audienceType: ${body.audienceType}") }
        return journalService.create(me(principal), body.body, body.entryDate, audience).toResponse()
    }

    @GetMapping("/api/journals")
    fun listMine(@AuthenticationPrincipal principal: UserDetails): List<JournalEntryResponse> =
        journalService.listMine(me(principal)).map { it.toResponse() }

    @PutMapping("/api/journals/{id}")
    fun update(
        @PathVariable id: UUID,
        @RequestBody body: UpdateJournalRequest,
        @AuthenticationPrincipal principal: UserDetails
    ): JournalEntryResponse {
        val audience = body.audienceType?.let {
            runCatching { AudienceType.valueOf(it) }
                .getOrElse { throw IllegalArgumentException("Invalid audienceType: $it") }
        }
        return journalService.update(id, me(principal), body.body, audience).toResponse()
    }

    @DeleteMapping("/api/journals/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ) = journalService.delete(id, me(principal))

    // ── friend's entries ─────────────────────────────────────────────────────

    @GetMapping("/api/users/{userId}/journals")
    fun listFriendEntries(
        @PathVariable userId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): List<JournalEntryResponse> =
        journalService.listFriendEntries(me(principal), userId).map { it.toResponse() }

    // ── reactions ────────────────────────────────────────────────────────────

    @PostMapping("/api/journals/{id}/reactions")
    @ResponseStatus(HttpStatus.CREATED)
    fun addReaction(
        @PathVariable id: UUID,
        @RequestBody body: AddReactionRequest,
        @AuthenticationPrincipal principal: UserDetails
    ): ReactionResponse {
        val type = runCatching { ReactionType.valueOf(body.type) }
            .getOrElse { throw IllegalArgumentException("Invalid reaction type: ${body.type}. Valid: ${ReactionType.entries.joinToString()}") }
        return journalService.addReaction(me(principal), id, type, body.replyBody).toResponse()
    }

    @DeleteMapping("/api/journals/{id}/reactions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun removeReaction(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ) = journalService.removeReaction(me(principal), id)

    @GetMapping("/api/journals/{id}/reactions")
    fun listReactions(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): List<ReactionResponse> =
        journalService.listReactions(me(principal), id).map { it.toResponse() }
}
