package com.medium75.repository

import com.medium75.model.Notification
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface NotificationRepository : JpaRepository<Notification, UUID> {
    fun findTop50ByRecipientIdOrderByCreatedAtDesc(recipientId: UUID): List<Notification>
    fun countByRecipientIdAndReadAtIsNull(recipientId: UUID): Long
    fun findAllByRecipientIdAndReadAtIsNull(recipientId: UUID): List<Notification>
}
