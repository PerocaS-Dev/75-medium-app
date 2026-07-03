package com.medium75.service

import java.io.InputStream

interface StorageService {
    fun upload(key: String, bytes: ByteArray, contentType: String)
    fun download(key: String): ByteArray
    fun delete(key: String)
}
