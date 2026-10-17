package com.fittrainer.data.auth

import androidx.datastore.core.Serializer
import com.google.crypto.tink.Aead
import java.io.InputStream
import java.io.OutputStream
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.serialization.json.Json

/**
 * Serializa la sesión a JSON y la cifra completa con Tink (AEAD).
 * Si el archivo no se puede descifrar (keyset perdido, archivo corrupto), se lee
 * como sesión vacía: la app vuelve al login en vez de crashear.
 */
class EncryptedAuthSerializer(aeadProvider: () -> Aead) : Serializer<AuthFile> {

    // Lazy: el Keystore se toca recién en la primera lectura/escritura, fuera del hilo principal.
    private val aead by lazy(aeadProvider)
    private val json = Json { ignoreUnknownKeys = true }

    override val defaultValue: AuthFile = AuthFile()

    override suspend fun readFrom(input: InputStream): AuthFile {
        val bytes = input.readBytes()
        if (bytes.isEmpty()) return defaultValue
        return try {
            val plain = aead.decrypt(bytes, ASSOCIATED_DATA)
            json.decodeFromString(AuthFile.serializer(), plain.decodeToString())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            defaultValue
        }
    }

    override suspend fun writeTo(t: AuthFile, output: OutputStream) {
        val plain = json.encodeToString(AuthFile.serializer(), t).encodeToByteArray()
        output.write(aead.encrypt(plain, ASSOCIATED_DATA))
    }

    private companion object {
        val ASSOCIATED_DATA = "fittrainer-auth".encodeToByteArray()
    }
}
