package com.fittrainer.data.auth

import com.fittrainer.data.session.Role
import com.google.crypto.tink.Aead
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.security.GeneralSecurityException
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test

/** "Cifra" invirtiendo los bytes con un prefijo; decrypt falla si el prefijo no está. */
private class FakeAead : Aead {
    private val prefix = "ENC:".encodeToByteArray()
    override fun encrypt(plaintext: ByteArray, associatedData: ByteArray): ByteArray =
        prefix + plaintext.reversedArray()
    override fun decrypt(ciphertext: ByteArray, associatedData: ByteArray): ByteArray {
        if (ciphertext.size < prefix.size || !ciphertext.copyOfRange(0, prefix.size).contentEquals(prefix)) {
            throw GeneralSecurityException("decryption failed")
        }
        return ciphertext.copyOfRange(prefix.size, ciphertext.size).reversedArray()
    }
}

class EncryptedAuthSerializerTest {

    private val serializer = EncryptedAuthSerializer { FakeAead() }
    private val state = AuthState("access-1", "refresh-1", AuthUser("u1", "Ana", "ana@test.com", Role.STUDENT), "session-1")

    private suspend fun write(file: AuthFile): ByteArray =
        ByteArrayOutputStream().also { serializer.writeTo(file, it) }.toByteArray()

    @Test fun `ida y vuelta conserva la sesion`() = runTest {
        val bytes = write(AuthFile(state))
        assertEquals(AuthFile(state), serializer.readFrom(ByteArrayInputStream(bytes)))
    }

    @Test fun `lo escrito no contiene el token en texto plano`() = runTest {
        val bytes = write(AuthFile(state))
        assertFalse(bytes.decodeToString().contains("access-1"))
    }

    @Test fun `archivo vacio es sesion vacia`() = runTest {
        assertNull(serializer.readFrom(ByteArrayInputStream(ByteArray(0))).auth)
    }

    @Test fun `archivo corrupto es sesion vacia sin excepcion`() = runTest {
        val garbage = "basura".encodeToByteArray()
        assertNull(serializer.readFrom(ByteArrayInputStream(garbage)).auth)
    }

    @Test fun `si no se puede crear el Aead la lectura es sesion vacia`() = runTest {
        val broken = EncryptedAuthSerializer { throw GeneralSecurityException("keystore roto") }
        assertNull(broken.readFrom(ByteArrayInputStream("x".encodeToByteArray())).auth)
    }

    // Codex P1: sin Keystore AuthCrypto lanza; la escritura falla sin dejar nada en el archivo.
    @Test fun `si no se puede crear el Aead la escritura lanza y no escribe nada`() = runTest {
        val broken = EncryptedAuthSerializer { throw GeneralSecurityException("Android Keystore no disponible") }
        val out = ByteArrayOutputStream()
        assertThrows(GeneralSecurityException::class.java) { runBlocking { broken.writeTo(AuthFile(state), out) } }
        assertEquals(0, out.size())
    }
}
