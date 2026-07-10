package com.medium75

import com.jayway.jsonpath.JsonPath
import com.medium75.model.AudienceType
import com.medium75.model.Challenge
import com.medium75.model.ChallengeStatus
import com.medium75.model.Friendship
import com.medium75.model.FriendshipStatus
import com.medium75.model.JournalEntry
import com.medium75.model.Photo
import com.medium75.model.TaskDefinition
import com.medium75.model.User
import com.medium75.repository.ChallengeRepository
import com.medium75.repository.FriendshipRepository
import com.medium75.repository.JournalEntryRepository
import com.medium75.repository.PhotoRepository
import com.medium75.repository.TaskDefinitionRepository
import com.medium75.service.StorageService
import com.medium75.service.UserService
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.not
import org.junit.jupiter.api.Test
import org.mockito.Mockito.verify
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpSession
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.UUID

/**
 * Integration tests for the security-critical privacy + auth gates (v1 / POPIA).
 *
 * Infra: real Spring Security filter chain + real local Postgres (Flyway-migrated),
 * each test @Transactional and rolled back. StorageService is mocked so no real R2
 * calls happen and the delete call can be verified. Auth is exercised through the
 * real POST /api/auth/login (session captured + replayed).
 *
 * These tests exercise the ACTUAL endpoints as an authenticated caller; they assert
 * behaviour, they do not adjust it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PrivacyAndAuthGatesTest {

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userService: UserService
    @Autowired lateinit var challengeRepo: ChallengeRepository
    @Autowired lateinit var taskDefRepo: TaskDefinitionRepository
    @Autowired lateinit var friendshipRepo: FriendshipRepository
    @Autowired lateinit var journalRepo: JournalEntryRepository
    @Autowired lateinit var photoRepo: PhotoRepository

    @MockitoBean lateinit var storageService: StorageService

    // ── helpers ────────────────────────────────────────────────────────────────

    private val password = "password123"

    private fun newUser(consent: Boolean = false): User {
        val user = userService.register("u-${UUID.randomUUID()}@itest.local", password, "Test User", "UTC")
        if (consent) userService.recordPopiaConsent(user.email)
        return user
    }

    /** Log in through the real endpoint and return the session to replay on later requests. */
    private fun login(email: String): MockHttpSession {
        val result = mockMvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"email":"$email","password":"$password"}""")
        ).andExpect(status().isOk).andReturn()
        return result.request.getSession(false) as MockHttpSession
    }

    private fun challengeFor(userId: UUID): Challenge =
        challengeRepo.save(Challenge(userId = userId, startDate = LocalDate.now(), status = ChallengeStatus.ACTIVE))

    private fun taskFor(challengeId: UUID): TaskDefinition =
        taskDefRepo.save(TaskDefinition(challengeId = challengeId, label = "Workout", sortOrder = 0, locked = true))

    private fun befriend(a: UUID, b: UUID) =
        friendshipRepo.save(Friendship(requesterId = a, addresseeId = b, status = FriendshipStatus.ACCEPTED))

    private fun journal(userId: UUID, audience: AudienceType): JournalEntry =
        journalRepo.save(JournalEntry(userId = userId, body = "entry", entryDate = LocalDate.now(), audienceType = audience))

    private fun photo(userId: UUID, audience: AudienceType): Photo =
        photoRepo.save(
            Photo(
                userId = userId,
                objectKey = "photos/$userId/${UUID.randomUUID()}.jpg",
                contentType = "image/jpeg",
                audienceType = audience,
            )
        )

    private fun jpg() = MockMultipartFile("file", "photo.jpg", "image/jpeg", byteArrayOf(1, 2, 3, 4))

    // ── 1–4: visibility gate — authenticated NON-friend gets 403, not data ──────

    @Test
    fun `non-friend cannot read another user's progress`() {
        val target = newUser()
        challengeFor(target.id)
        val session = login(newUser().email)

        mockMvc.perform(get("/api/users/${target.id}/progress").session(session))
            .andExpect(status().isForbidden)
    }

    @Test
    fun `non-friend cannot read another user's tasks`() {
        val target = newUser()
        val challenge = challengeFor(target.id)
        taskFor(challenge.id)
        val session = login(newUser().email)

        mockMvc.perform(get("/api/challenges/${challenge.id}/tasks").session(session))
            .andExpect(status().isForbidden)
    }

    @Test
    fun `non-friend cannot read another user's journals`() {
        val target = newUser()
        journal(target.id, AudienceType.FRIENDS)
        val session = login(newUser().email)

        mockMvc.perform(get("/api/users/${target.id}/journals").session(session))
            .andExpect(status().isForbidden)
    }

    @Test
    fun `non-friend cannot read another user's photos`() {
        val target = newUser()
        photo(target.id, AudienceType.FRIENDS)
        val session = login(newUser().email)

        mockMvc.perform(get("/api/users/${target.id}/photos").session(session))
            .andExpect(status().isForbidden)
    }

    // ── 5–8: composed privacy — friendship alone is not enough ──────────────────

    @Test
    fun `friend sees public journal entry but not the private one`() {
        val target = newUser()
        val pub = journal(target.id, AudienceType.FRIENDS)
        val priv = journal(target.id, AudienceType.SELF)
        val friend = newUser()
        befriend(target.id, friend.id)
        val session = login(friend.email)

        mockMvc.perform(get("/api/users/${target.id}/journals").session(session))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[*].id", hasItem(pub.id.toString())))
            .andExpect(jsonPath("$[*].id", not(hasItem(priv.id.toString()))))
    }

    @Test
    fun `friend cannot react to a private journal entry`() {
        val target = newUser()
        val priv = journal(target.id, AudienceType.SELF)
        val friend = newUser()
        befriend(target.id, friend.id)
        val session = login(friend.email)

        mockMvc.perform(
            post("/api/journals/${priv.id}/reactions").session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"type":"LIKE"}""")
        ).andExpect(status().isForbidden)
    }

    @Test
    fun `friend sees public photo but not the private one`() {
        val target = newUser()
        val pub = photo(target.id, AudienceType.FRIENDS)
        val priv = photo(target.id, AudienceType.SELF)
        val friend = newUser()
        befriend(target.id, friend.id)
        val session = login(friend.email)

        mockMvc.perform(get("/api/users/${target.id}/photos").session(session))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[*].id", hasItem(pub.id.toString())))
            .andExpect(jsonPath("$[*].id", not(hasItem(priv.id.toString()))))
    }

    @Test
    fun `friend cannot get a signed URL for a private photo`() {
        val target = newUser()
        val priv = photo(target.id, AudienceType.SELF)
        val friend = newUser()
        befriend(target.id, friend.id)
        val session = login(friend.email)

        mockMvc.perform(get("/api/photos/${priv.id}/url").session(session))
            .andExpect(status().isForbidden)
    }

    // ── 9: photo delete removes the object from storage + makes it inaccessible ──
    // NOTE: the app soft-deletes (sets deleted_at); the DB row is retained. We assert
    // the storage object is deleted AND the photo is no longer served/listed.

    @Test
    fun `deleting a photo calls storage delete and makes it inaccessible`() {
        val owner = newUser(consent = true)
        val session = login(owner.email)

        val uploadJson = mockMvc.perform(multipart("/api/photos").file(jpg()).session(session))
            .andExpect(status().isCreated)
            .andReturn().response.contentAsString
        val id: String = JsonPath.read(uploadJson, "$.id")
        val objectKey = photoRepo.findById(UUID.fromString(id)).get().objectKey

        mockMvc.perform(delete("/api/photos/$id").session(session))
            .andExpect(status().isNoContent)

        // the storage object is actually removed
        verify(storageService).delete(objectKey)

        // and the photo is no longer served or listed
        mockMvc.perform(get("/api/photos/$id/url").session(session))
            .andExpect(status().isNotFound)
        mockMvc.perform(get("/api/photos").session(session))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[*].id", not(hasItem(id))))
    }

    // ── 10–11: POPIA consent gate ────────────────────────────────────────────────

    @Test
    fun `uploading without POPIA consent is forbidden`() {
        val owner = newUser(consent = false)
        val session = login(owner.email)

        mockMvc.perform(multipart("/api/photos").file(jpg()).session(session))
            .andExpect(status().isForbidden)
    }

    @Test
    fun `uploading succeeds after POPIA consent is recorded`() {
        val owner = newUser(consent = false)
        val session = login(owner.email)

        mockMvc.perform(post("/api/auth/popia-consent").session(session))
            .andExpect(status().isOk)

        mockMvc.perform(multipart("/api/photos").file(jpg()).session(session))
            .andExpect(status().isCreated)
    }

    // ── 12–14: auth — unauthenticated requests to protected endpoints rejected ───

    @Test
    fun `unauthenticated progress request is rejected`() {
        val target = newUser()
        mockMvc.perform(get("/api/users/${target.id}/progress"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `unauthenticated photo upload is rejected`() {
        mockMvc.perform(multipart("/api/photos").file(jpg()))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `unauthenticated journal list is rejected`() {
        mockMvc.perform(get("/api/journals"))
            .andExpect(status().isUnauthorized)
    }
}
