package com.medium75

import com.medium75.model.Challenge
import com.medium75.model.ChallengeStatus
import com.medium75.model.TaskDefinition
import com.medium75.model.User
import com.medium75.repository.ChallengeRepository
import com.medium75.repository.DailyLogRepository
import com.medium75.repository.TaskDefinitionRepository
import com.medium75.service.UserService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
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
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.UUID

/**
 * The "Scheduled" state (v2): a challenge can be locked (ACTIVE) with a start date in the future.
 * Until Day 1 arrives it must accrue no streak activity — critically, the check-off flow must
 * refuse, so no orphan pre-start DailyLog is ever created for the daily-close engine to trip over.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ScheduledStartTest {

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userService: UserService
    @Autowired lateinit var challengeRepo: ChallengeRepository
    @Autowired lateinit var taskDefRepo: TaskDefinitionRepository
    @Autowired lateinit var dailyLogRepo: DailyLogRepository

    // StorageService is mocked purely so the full application context loads without R2 config.
    @MockitoBean lateinit var storageService: com.medium75.service.StorageService

    private val password = "password123"

    private fun newUser(): User =
        userService.register("u-${UUID.randomUUID()}@itest.local", password, "Test User", "UTC")

    private fun login(email: String): MockHttpSession {
        val result = mockMvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"email":"$email","password":"$password"}""")
        ).andExpect(status().isOk).andReturn()
        return result.request.getSession(false) as MockHttpSession
    }

    private fun activeChallenge(userId: UUID, startDate: LocalDate): Challenge =
        challengeRepo.save(Challenge(userId = userId, startDate = startDate, status = ChallengeStatus.ACTIVE))

    private fun lockedTask(challengeId: UUID): TaskDefinition =
        taskDefRepo.save(TaskDefinition(challengeId = challengeId, label = "Workout", sortOrder = 0, locked = true))

    @Test
    fun `scheduled-tomorrow challenge rejects check-off and creates no daily log`() {
        val user = newUser()
        // "UTC" user, so the server's notion of today is LocalDate.now(UTC); tomorrow is in the future.
        val challenge = activeChallenge(user.id, LocalDate.now().plusDays(1))
        val task = lockedTask(challenge.id)
        val session = login(user.email)

        mockMvc.perform(
            post("/api/challenges/${challenge.id}/today/tasks/${task.id}/check").session(session)
        ).andExpect(status().isBadRequest)

        // The guard must not have created a pre-start DailyLog — that's the streak-protecting invariant.
        assertNull(dailyLogRepo.findByChallengeIdAndLogDate(challenge.id, LocalDate.now()))
    }

    @Test
    fun `start-today challenge accepts check-off`() {
        val user = newUser()
        val challenge = activeChallenge(user.id, LocalDate.now())
        val task = lockedTask(challenge.id)
        val session = login(user.email)

        mockMvc.perform(
            post("/api/challenges/${challenge.id}/today/tasks/${task.id}/check").session(session)
        ).andExpect(status().isOk)

        val log = dailyLogRepo.findByChallengeIdAndLogDate(challenge.id, LocalDate.now())
        assertEquals(1, log?.tasksCompletedCount)
    }

    @Test
    fun `today checks endpoint is rejected for a scheduled challenge`() {
        val user = newUser()
        val challenge = activeChallenge(user.id, LocalDate.now().plusDays(2))
        lockedTask(challenge.id)
        val session = login(user.email)

        mockMvc.perform(get("/api/challenges/${challenge.id}/today/checks").session(session))
            .andExpect(status().isBadRequest)
    }
}
