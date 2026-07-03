package com.medium75.service

import com.medium75.model.TaskDefinition
import com.medium75.repository.TaskDefinitionRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class TaskService(
    private val taskDefRepo: TaskDefinitionRepository,
    private val challengeService: ChallengeService
) {
    fun listTasks(challengeId: UUID): List<TaskDefinition> =
        taskDefRepo.findByChallengeIdOrderBySortOrder(challengeId)

    @Transactional
    fun addTask(challengeId: UUID, userId: UUID, label: String): TaskDefinition {
        val challenge = challengeService.requireOwned(challengeId, userId)
        require(!challenge.status.name.let { it == "COMPLETED" || it == "FAILED" || it == "ABANDONED" }) {
            "Challenge is no longer active"
        }
        val existingTasks = taskDefRepo.findByChallengeIdOrderBySortOrder(challengeId)
        require(existingTasks.none { it.locked }) { "Tasks are locked — challenge has started" }

        val nextOrder = (existingTasks.maxOfOrNull { it.sortOrder } ?: -1) + 1
        return taskDefRepo.save(
            TaskDefinition(challengeId = challengeId, label = label.trim(), sortOrder = nextOrder)
        )
    }

    @Transactional
    fun deleteTask(taskId: UUID, userId: UUID) {
        val task = taskDefRepo.findById(taskId).orElseThrow { NoSuchElementException("Task not found") }
        challengeService.requireOwned(task.challengeId, userId)
        require(!task.locked) { "Tasks are locked — challenge has started" }
        taskDefRepo.delete(task)
    }

    @Transactional
    fun reorderTasks(challengeId: UUID, userId: UUID, orderedIds: List<UUID>) {
        challengeService.requireOwned(challengeId, userId)
        val tasks = taskDefRepo.findByChallengeIdOrderBySortOrder(challengeId)
        require(tasks.none { it.locked }) { "Tasks are locked" }
        val taskMap = tasks.associateBy { it.id }
        orderedIds.forEachIndexed { index, id ->
            taskMap[id]?.let { it.sortOrder = index; it.updatedAt = Instant.now() }
        }
        taskDefRepo.saveAll(tasks)
    }
}
