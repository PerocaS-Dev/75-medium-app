package com.medium75.controller

import com.medium75.model.DailyLog
import com.medium75.model.DailyTaskCheck
import com.medium75.model.TaskDefinition
import com.medium75.service.ChallengeService
import com.medium75.service.DailyCheckOffService
import com.medium75.service.FriendshipService
import com.medium75.service.TaskService
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class TaskResponse(val id: UUID, val label: String, val sortOrder: Int, val locked: Boolean)
data class AddTaskRequest(val label: String)
data class ReorderRequest(val orderedIds: List<UUID>)
data class DailyLogResponse(
    val id: UUID,
    val logDate: LocalDate,
    val status: String,
    val tasksCompletedCount: Int,
    val tasksTotalCount: Int
)
data class DailyTaskCheckResponse(val taskDefinitionId: UUID, val checkedAt: Instant)

private fun TaskDefinition.toResponse() = TaskResponse(id, label, sortOrder, locked)
private fun DailyLog.toResponse()       = DailyLogResponse(id, logDate, status.name, tasksCompletedCount, tasksTotalCount)
private fun DailyTaskCheck.toResponse() = DailyTaskCheckResponse(taskDefinitionId, checkedAt)

@RestController
@RequestMapping("/api/challenges/{challengeId}")
class TaskController(
    private val taskService: TaskService,
    private val checkOffService: DailyCheckOffService,
    private val userService: com.medium75.service.UserService,
    private val challengeService: ChallengeService,
    private val friendshipService: FriendshipService
) {
    private fun currentUserId(principal: UserDetails): UUID =
        userService.findByEmail(principal.username)?.id
            ?: throw NoSuchElementException("User not found")

    // ── task definitions ─────────────────────────────────────────────────────

    @GetMapping("/tasks")
    fun listTasks(
        @PathVariable challengeId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): List<TaskResponse> {
        val viewerId = currentUserId(principal)
        val challenge = challengeService.getById(challengeId)
        friendshipService.assertCanView(viewerId, challenge.userId)
        return taskService.listTasks(challengeId).map { it.toResponse() }
    }

    @PostMapping("/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    fun addTask(
        @PathVariable challengeId: UUID,
        @RequestBody body: AddTaskRequest,
        @AuthenticationPrincipal principal: UserDetails
    ): TaskResponse {
        val userId = currentUserId(principal)
        return taskService.addTask(challengeId, userId, body.label).toResponse()
    }

    @DeleteMapping("/tasks/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteTask(
        @PathVariable challengeId: UUID,
        @PathVariable taskId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ) {
        taskService.deleteTask(taskId, currentUserId(principal))
    }

    @PutMapping("/tasks/reorder")
    fun reorderTasks(
        @PathVariable challengeId: UUID,
        @RequestBody body: ReorderRequest,
        @AuthenticationPrincipal principal: UserDetails
    ) {
        taskService.reorderTasks(challengeId, currentUserId(principal), body.orderedIds)
    }

    // ── daily check-off ──────────────────────────────────────────────────────

    @GetMapping("/today")
    fun getToday(
        @PathVariable challengeId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): DailyLogResponse {
        return checkOffService.getTodayLog(challengeId, currentUserId(principal)).toResponse()
    }

    @GetMapping("/today/checks")
    fun getTodayChecks(
        @PathVariable challengeId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): List<DailyTaskCheckResponse> {
        return checkOffService.getTodayChecks(challengeId, currentUserId(principal))
            .map { it.toResponse() }
    }

    @PostMapping("/today/tasks/{taskId}/check")
    fun checkTask(
        @PathVariable challengeId: UUID,
        @PathVariable taskId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): DailyLogResponse {
        return checkOffService.checkTask(challengeId, taskId, currentUserId(principal)).toResponse()
    }

    @DeleteMapping("/today/tasks/{taskId}/check")
    fun uncheckTask(
        @PathVariable challengeId: UUID,
        @PathVariable taskId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): DailyLogResponse {
        return checkOffService.uncheckTask(challengeId, taskId, currentUserId(principal)).toResponse()
    }
}
