package com.fittrainer.data.auth

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.crypto.tink.Aead
import com.google.crypto.tink.BinaryKeysetWriter
import com.google.crypto.tink.CleartextKeysetHandle
import com.google.crypto.tink.KeyTemplates
import com.google.crypto.tink.KeysetHandle
import com.google.crypto.tink.RegistryConfiguration
import com.google.crypto.tink.aead.AeadConfig
import com.google.crypto.tink.subtle.Hex
import java.io.ByteArrayOutputStream
import java.security.GeneralSecurityException
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AuthCryptoTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private val keysetName = "crypto_test_keyset"
    private val prefFile = "crypto_test_keyset_prefs"

    @After fun tearDown() {
        context.deleteSharedPreferences(prefFile)
    }

    // Simula un keyset que la clave maestra del Keystore ya no puede descifrar (p. ej. transferencia a otro equipo).
    @Test fun keysetIlegibleSeRegeneraYElAeadFunciona() {
        context.getSharedPreferences(prefFile, Context.MODE_PRIVATE)
            .edit().putString(keysetName, "basura que no es un keyset").commit()

        val aead = AuthCrypto.aead(context, keysetName, prefFile)

        val plain = "hola".encodeToByteArray()
        val ad = "ad".encodeToByteArray()
        assertEquals("hola", aead.decrypt(aead.encrypt(plain, ad), ad).decodeToString())
    }

    private fun storedKeyset(): String? =
        context.getSharedPreferences(prefFile, Context.MODE_PRIVATE).getString(keysetName, null)

    // Codex P2 (ronda 2): Tink acepta un keyset guardado en texto plano aunque el Keystore funcione.
    @Test fun keysetEnTextoPlanoSeReemplazaPorUnoCifrado() {
        AeadConfig.register()
        val cleartext = KeysetHandle.generateNew(KeyTemplates.get("AES256_GCM"))
        val bytes = ByteArrayOutputStream()
        CleartextKeysetHandle.write(cleartext, BinaryKeysetWriter.withOutputStream(bytes))
        val cleartextHex = Hex.encode(bytes.toByteArray())
        context.getSharedPreferences(prefFile, Context.MODE_PRIVATE)
            .edit().putString(keysetName, cleartextHex).commit()

        val aead = AuthCrypto.aead(context, keysetName, prefFile)

        val ad = "ad".encodeToByteArray()
        val ciphertext = aead.encrypt("hola".encodeToByteArray(), ad)
        assertEquals("hola", aead.decrypt(ciphertext, ad).decodeToString())
        assertNotEquals(cleartextHex, storedKeyset())
        val oldAead = cleartext.getPrimitive(RegistryConfiguration.get(), Aead::class.java)
        assertThrows(GeneralSecurityException::class.java) { oldAead.decrypt(ciphertext, ad) }
    }

    @Test fun keysetCifradoSeConserva() {
        val first = AuthCrypto.aead(context, keysetName, prefFile)
        val stored = storedKeyset()
        val ad = "ad".encodeToByteArray()
        val ciphertext = first.encrypt("hola".encodeToByteArray(), ad)

        val second = AuthCrypto.aead(context, keysetName, prefFile)

        assertEquals(stored, storedKeyset())
        assertEquals("hola", second.decrypt(ciphertext, ad).decodeToString())
    }
}
