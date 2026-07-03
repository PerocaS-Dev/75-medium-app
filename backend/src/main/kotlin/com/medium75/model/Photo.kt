package com.medium75.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "photos")
class Photo(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "user_id", nullable = false) val userId: UUID,
    @Column(name = "object_key", nullable = false) val objectKey: String,
    @Column(name = "content_type", nullable = false) val contentType: String = "image/jpeg",
    @Column(columnDefinition = "TEXT") var caption: String? = null,
    @Enumerated(EnumType.STRING) @Column(name = "audience_type", nullable = false) var audienceType: AudienceType = AudienceType.SELF,
    @Column(name = "audience_id") var audienceId: UUID? = null,
    @Column(name = "deleted_at") var deletedAt: Instant? = null,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now()
)
