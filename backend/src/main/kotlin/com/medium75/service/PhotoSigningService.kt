package com.medium75.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.security.MessageDigest
import java.time.Instant
import java.util.Base64
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

data class SignedTokenPayload(
    val photoId: UUID,
    val viewerId: UUID,
    val viewerDisplayName: String
)

@Service
class PhotoSigningService(
    @Value("\${storage.signed-url-secret:changeme}") private val secret: String,
    @Value("\${storage.signed-url-expiry-minutes:15}") private val expiryMinutes: Long
) {
    private val enc = Base64.getUrlEncoder().withoutPadding()
    private val dec = Base64.getUrlDecoder()

    fun generateToken(photoId: UUID, viewerId: UUID, viewerDisplayName: String): String {
        val expiry = Instant.now().plusSeconds(expiryMinutes * 60).epochSecond
        val encodedName = enc.encodeToString(viewerDisplayName.toByteArray(Charsets.UTF_8))
        val payload = "$photoId:$viewerId:$encodedName:$expiry"
        val payloadB64 = enc.encodeToString(payload.toByteArray(Charsets.UTF_8))
        val hmac = hmac(payload)
        return "$payloadB64.$hmac"
    }

    fun validateToken(token: String): SignedTokenPayload? {
        val dot = token.lastIndexOf('.')
        if (dot < 0) return null
        val payloadB64 = token.substring(0, dot)
        val givenHmac = token.substring(dot + 1)

        val payload = runCatching { String(dec.decode(payloadB64), Charsets.UTF_8) }.getOrNull() ?: return null
        val expectedHmac = hmac(payload)

        // constant-time comparison
        if (!MessageDigest.isEqual(expectedHmac.toByteArray(), givenHmac.toByteArray())) return null

        val parts = payload.split(":")
        if (parts.size != 4) return null

        val expiry = parts[3].toLongOrNull() ?: return null
        if (Instant.now().epochSecond > expiry) return null

        val photoId  = runCatching { UUID.fromString(parts[0]) }.getOrNull() ?: return null
        val viewerId = runCatching { UUID.fromString(parts[1]) }.getOrNull() ?: return null
        val viewerDisplayName = runCatching { String(dec.decode(parts[2]), Charsets.UTF_8) }.getOrNull() ?: return null

        return SignedTokenPayload(photoId, viewerId, viewerDisplayName)
    }

    private fun hmac(data: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return enc.encodeToString(mac.doFinal(data.toByteArray(Charsets.UTF_8)))
    }
}
