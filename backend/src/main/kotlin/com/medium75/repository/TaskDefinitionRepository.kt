package com.medium75.repository

import com.medium75.model.TaskDefinition
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface TaskDefinitionRepository : JpaRepository<TaskDefinition, UUID> {
    fun findByChallengeIdOrderBySortOrder(challengeId: UUID): List<TaskDefinition>
    fun countByChallengeId(challengeId: UUID): Long
}
