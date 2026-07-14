package com.medium75

import com.medium75.model.AudienceType
import com.medium75.model.Friendship
import com.medium75.model.FriendshipStatus
import com.medium75.model.JournalEntry
import com.medium75.model.Photo
import com.medium75.model.User
import com.medium75.repository.FriendshipRepository
import com.medium75.repository.JournalEntryRepository
import com.medium75.repository.NotificationRepository
import com.medium75.repository.PhotoRepository
import com.medium75.service.StorageService
import com.medium75.service.UserService
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.not
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpSession
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.UUID

/**
 * In-app notification generation + read state (v2-B). Drives the real reaction/friendship
 * endpoints so notifications are produced by the actual wired flows, then reads them back as the
 * recipient. Also proves self-actions don't notify and one user never sees another's feed.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NotificationsTest {

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userService: UserService
    @Autowired lateinit var journalRepo: JournalEntryRepository
    @Autowired lateinit var photoRepo: PhotoRepository
    @Autowired lateinit var friendshipRepo: FriendshipRepository
    @Autowired lateinit var notificationRepo: NotificationRepository

    @MockitoBean lateinit var storageService: StorageService

    private val password = "password123"

    private fun newUser(name: String): User =
        userService.register("u-${UUID.randomUUID()}@itest.local", password, name, "UTC")

    private fun login(email: String): MockHttpSession {
        val result = mockMvc.perform(
            post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("""{"email":"$email","password":"$password"}""")
        ).andExpect(status().is2xxSuccessful).andReturn()
        return result.request.getSession(false) as MockHttpSession
    }

    private fun befriend(a: UUID, b: UUID) =
        friendshipRepo.save(Friendship(requesterId = a, addresseeId = b, status = FriendshipStatus.ACCEPTED))

    private fun journal(userId: UUID, audience: AudienceType) =
        journalRepo.save(JournalEntry(userId = userId, body = "entry", entryDate = LocalDate.now(), audienceType = audience))

    private fun photo(userId: UUID, audience: AudienceType) =
        photoRepo.save(Photo(userId = userId, objectKey = "photos/$userId/${UUID.randomUUID()}.jpg", contentType = "image/jpeg", audienceType = audience))

    // ── reactions on the owner's content notify the owner ────────────────────────

    @Test
    fun `journal reaction notifies the owner with actor and reaction type`() {
        val owner = newUser("Bob")
        val actor = newUser("Alice")
        befriend(owner.id, actor.id)
        val entry = journal(owner.id, AudienceType.FRIENDS)

        mockMvc.perform(
            post("/api/journals/${entry.id}/reactions").session(login(actor.email))
                .contentType(MediaType.APPLICATION_JSON).content("""{"type":"FIRE"}""")
        ).andExpect(status().is2xxSuccessful)

        val bob = login(owner.email)
        mockMvc.perform(get("/api/notifications/unread-count").session(bob))
            .andExpect(status().is2xxSuccessful).andExpect(jsonPath("$.count").value(1))
        mockMvc.perform(get("/api/notifications").session(bob))
            .andExpect(status().is2xxSuccessful)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].type").value("JOURNAL_REACTION"))
            .andExpect(jsonPath("$[0].reactionType").value("FIRE"))
            .andExpect(jsonPath("$[0].actorDisplayName").value("Alice"))
            .andExpect(jsonPath("$[0].targetId").value(entry.id.toString()))
            .andExpect(jsonPath("$[0].read").value(false))
    }

    @Test
    fun `journal comment notifies the owner with a preview`() {
        val owner = newUser("Bob")
        val actor = newUser("Alice")
        befriend(owner.id, actor.id)
        val entry = journal(owner.id, AudienceType.FRIENDS)

        mockMvc.perform(
            post("/api/journals/${entry.id}/reactions").session(login(actor.email))
                .contentType(MediaType.APPLICATION_JSON).content("""{"type":"LIKE","replyBody":"keep it up!"}""")
        ).andExpect(status().is2xxSuccessful)

        mockMvc.perform(get("/api/notifications").session(login(owner.email)))
            .andExpect(jsonPath("$[0].type").value("JOURNAL_COMMENT"))
            .andExpect(jsonPath("$[0].preview").value("keep it up!"))
    }

    @Test
    fun `photo reaction notifies the owner`() {
        val owner = newUser("Bob")
        val actor = newUser("Alice")
        befriend(owner.id, actor.id)
        val p = photo(owner.id, AudienceType.FRIENDS)

        mockMvc.perform(
            post("/api/photos/${p.id}/reactions").session(login(actor.email))
                .contentType(MediaType.APPLICATION_JSON).content("""{"type":"STRONG"}""")
        ).andExpect(status().is2xxSuccessful)

        mockMvc.perform(get("/api/notifications").session(login(owner.email)))
            .andExpect(jsonPath("$[0].type").value("PHOTO_REACTION"))
            .andExpect(jsonPath("$[0].reactionType").value("STRONG"))
            .andExpect(jsonPath("$[0].targetId").value(p.id.toString()))
    }

    // ── friendships ──────────────────────────────────────────────────────────────

    @Test
    fun `friend request notifies the addressee, and accept notifies the requester`() {
        val requester = newUser("Alice")
        val addressee = newUser("Bob")

        // Alice sends the request → Bob is notified.
        val reqJson = mockMvc.perform(
            post("/api/friends/request").session(login(requester.email))
                .contentType(MediaType.APPLICATION_JSON).content("""{"addresseeId":"${addressee.id}"}""")
        ).andExpect(status().is2xxSuccessful).andReturn().response.contentAsString
        val friendshipId = com.jayway.jsonpath.JsonPath.read<String>(reqJson, "$.id")

        mockMvc.perform(get("/api/notifications").session(login(addressee.email)))
            .andExpect(jsonPath("$[0].type").value("FRIEND_REQUEST"))
            .andExpect(jsonPath("$[0].actorDisplayName").value("Alice"))

        // Bob accepts → Alice is notified.
        mockMvc.perform(post("/api/friends/$friendshipId/accept").session(login(addressee.email)))
            .andExpect(status().is2xxSuccessful)
        mockMvc.perform(get("/api/notifications").session(login(requester.email)))
            .andExpect(jsonPath("$[0].type").value("FRIEND_ACCEPT"))
            .andExpect(jsonPath("$[0].actorDisplayName").value("Bob"))
    }

    // ── guards ───────────────────────────────────────────────────────────────────

    @Test
    fun `reacting to your own entry does not notify yourself`() {
        val owner = newUser("Solo")
        val entry = journal(owner.id, AudienceType.SELF)

        mockMvc.perform(
            post("/api/journals/${entry.id}/reactions").session(login(owner.email))
                .contentType(MediaType.APPLICATION_JSON).content("""{"type":"LIKE"}""")
        ).andExpect(status().is2xxSuccessful)

        mockMvc.perform(get("/api/notifications/unread-count").session(login(owner.email)))
            .andExpect(jsonPath("$.count").value(0))
    }

    @Test
    fun `a user never sees another user's notifications and mark-read clears the count`() {
        val owner = newUser("Bob")
        val actor = newUser("Alice")
        befriend(owner.id, actor.id)
        val entry = journal(owner.id, AudienceType.FRIENDS)

        mockMvc.perform(
            post("/api/journals/${entry.id}/reactions").session(login(actor.email))
                .contentType(MediaType.APPLICATION_JSON).content("""{"type":"FIRE"}""")
        ).andExpect(status().is2xxSuccessful)

        // Alice (the actor) has no notifications of her own.
        mockMvc.perform(get("/api/notifications").session(login(actor.email)))
            .andExpect(jsonPath("$.length()").value(0))

        // Bob marks read → his unread count drops to 0 but the row remains (now read).
        val bob = login(owner.email)
        mockMvc.perform(post("/api/notifications/mark-read").session(bob)).andExpect(status().isNoContent)
        mockMvc.perform(get("/api/notifications/unread-count").session(bob))
            .andExpect(jsonPath("$.count").value(0))
        mockMvc.perform(get("/api/notifications").session(bob))
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].read").value(true))
    }

    @Test
    fun `unauthenticated notifications request is rejected`() {
        mockMvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized)
    }
}
