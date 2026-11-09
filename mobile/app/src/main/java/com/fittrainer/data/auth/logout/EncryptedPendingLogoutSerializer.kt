package com.fittrainer.data.auth.logout

import androidx.datastore.core.Serializer
import com.google.crypto.tink.Aead
import java.io.InputStream
import java.io.OutputStream
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.serialization.json.Json

/**
 * Igual que [com.fittrainer.data.auth.EncryptedAuthSerializer]: JSON cifrado entero con Tink (AEAD), con su propia
 * associated data. Un archivo ilegible se lee vacío: se pierde el reintento, no se rompe la app.
 */
class EncryptedPendingLogoutSerializer(aeadProvider: () -> Aead) : Serializer<PendingLogoutFile> {

    // Lazy: el Keystore se toca recién en la primera lectura/escritura, fuera del hilo principal.
    private val aead by lazy(aeadProvider)
    private val json = Json { ignoreUnknownKeys = true }

    override val defaultValue: PendingLogoutFile = PendingLogoutFile()

    override suspend fun readFrom(input: InputStream): PendingLogoutFile {
        val bytes = input.readBytes()
        if (bytes.isEmpty()) return defaultValue
        return try {
            val plain = aead.decrypt(bytes, ASSOCIATED_DATA)
            json.decodeFromString(PendingLogoutFile.serializer(), plain.decodeToString())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            defaultValue
        }
    }

    override suspend fun writeTo(t: PendingLogoutFile, output: OutputStream) {
        val plain = json.encodeToString(PendingLogoutFile.serializer(), t).encodeToByteArray()
        output.write(aead.encrypt(plain, ASSOCIATED_DATA))
    }

    private companion object {
        val ASSOCIATED_DATA = "fittrainer-pending-logout".encodeToByteArray()
    }
}
