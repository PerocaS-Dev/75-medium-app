package com.medium75.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.S3Configuration
import java.net.URI

@Configuration
class StorageConfig(
    @Value("\${storage.endpoint:}") private val endpoint: String,
    @Value("\${storage.access-key:}") private val accessKey: String,
    @Value("\${storage.secret-key:}") private val secretKey: String,
) {
    @Bean
    fun s3Client(): S3Client {
        val builder = S3Client.builder()
            .region(Region.US_EAST_1)
            .credentialsProvider(
                StaticCredentialsProvider.create(AwsBasicCredentials.create(
                    accessKey.ifBlank { "placeholder" },
                    secretKey.ifBlank { "placeholder" }
                ))
            )
            .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
            .httpClient(UrlConnectionHttpClient.builder().build())

        if (endpoint.isNotBlank()) builder.endpointOverride(URI.create(endpoint))

        return builder.build()
    }
}
