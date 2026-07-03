package com.medium75.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectRequest

@Service
class R2StorageService(
    private val s3Client: S3Client,
    @Value("\${storage.bucket:}") private val bucket: String
) : StorageService {

    private fun requireBucket() {
        check(bucket.isNotBlank()) { "Object storage is not configured (storage.bucket is empty)" }
    }

    override fun upload(key: String, bytes: ByteArray, contentType: String) {
        requireBucket()
        s3Client.putObject(
            PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .build(),
            RequestBody.fromBytes(bytes)
        )
    }

    override fun download(key: String): ByteArray {
        requireBucket()
        return s3Client.getObjectAsBytes(
            GetObjectRequest.builder().bucket(bucket).key(key).build()
        ).asByteArray()
    }

    override fun delete(key: String) {
        requireBucket()
        s3Client.deleteObject(
            DeleteObjectRequest.builder().bucket(bucket).key(key).build()
        )
    }
}
