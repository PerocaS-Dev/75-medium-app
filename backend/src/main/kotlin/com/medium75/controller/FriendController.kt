package com.medium75.controller

import com.medium75.model.Friendship
import com.medium75.model.FriendshipStatus
import com.medium75.service.FriendshipService
import com.medium75.service.UserService
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID

data class FriendshipResponse(
    val id: UUID,
    val requesterId: UUID,
    val addresseeId: UUID,
    val status: String,
    val createdAt: Instant
)

data class SendRequestBody(val addresseeId: UUID)

private fun Friendship.toResponse() = FriendshipResponse(id, requesterId, addresseeId, status.name, createdAt)

@RestController
@RequestMapping("/api/friends")
class FriendController(
    private val friendshipService: FriendshipService,
    private val userService: UserService
) {
    private fun me(principal: UserDetails): UUID =
        userService.findByEmail(principal.username)?.id
            ?: throw NoSuchElementException("User not found")

    @GetMapping
    fun listFriends(@AuthenticationPrincipal principal: UserDetails): List<FriendshipResponse> =
        friendshipService.listFriends(me(principal)).map { it.toResponse() }

    @GetMapping("/requests")
    fun listRequests(@AuthenticationPrincipal principal: UserDetails): List<FriendshipResponse> =
        friendshipService.listIncomingRequests(me(principal)).map { it.toResponse() }

    @PostMapping("/request")
    @ResponseStatus(HttpStatus.CREATED)
    fun sendRequest(
        @RequestBody body: SendRequestBody,
        @AuthenticationPrincipal principal: UserDetails
    ): FriendshipResponse =
        friendshipService.sendRequest(me(principal), body.addresseeId).toResponse()

    @PostMapping("/{id}/accept")
    fun accept(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): FriendshipResponse =
        friendshipService.accept(id, me(principal)).toResponse()

    @PostMapping("/{id}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun decline(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ) = friendshipService.decline(id, me(principal))

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun remove(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ) = friendshipService.remove(id, me(principal))

    @PostMapping("/{id}/block")
    fun block(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): FriendshipResponse =
        friendshipService.block(id, me(principal)).toResponse()
}
