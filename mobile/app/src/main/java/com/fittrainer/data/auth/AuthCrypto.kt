package com.fittrainer.data.auth

import android.content.Context
import com.google.crypto.tink.Aead
import com.google.crypto.tink.BinaryKeysetReader
import com.google.crypto.tink.KeyTemplates
import com.google.crypto.tink.LegacyKeysetSerialization
import com.google.crypto.tink.RegistryConfiguration
import com.google.crypto.tink.aead.AeadConfig
import com.google.crypto.tink.integration.android.AndroidKeysetManager
import com.google.crypto.tink.integration.android.AndroidKeystoreKmsClient
import com.google.crypto.tink.subtle.Hex
import java.io.IOException
import java.security.GeneralSecurityException

/**
 * AEAD AES-256-GCM de Tink. El keyset vive en SharedPreferences, cifrado con una clave
 * maestra del Android Keystore (no sale del hardware seguro).
 */
object AuthCrypto {
    private const val KEYSET_NAME = "auth_keyset"
    private const val PREF_FILE = "fittrainer_auth_keyset"
    private const val MASTER_KEY_URI = "android-keystore://fittrainer_auth_master_key"

    fun aead(context: Context, keysetName: String = KEYSET_NAME, prefFile: String = PREF_FILE): Aead {
        AeadConfig.register()
        return try {
            build(context, keysetName, prefFile)
        } catch (e: Exception) {
            if (e !is GeneralSecurityException && e !is IOException) throw e
            // Keyset ilegible (p. ej. se copió a otro equipo sin la clave maestra del Keystore):
            // se borra y se genera uno nuevo. La sesión vieja ya no se puede descifrar y se lee
            // como "sin sesión"; el próximo login guarda con la clave nueva. Si vuelve a fallar
            // (p. ej. Keystore no disponible), lanza: leer da "sin sesión" y el login no se guarda.
            context.getSharedPreferences(prefFile, Context.MODE_PRIVATE).edit().remove(keysetName).commit()
            build(context, keysetName, prefFile)
        }
    }

    private fun build(context: Context, keysetName: String, prefFile: String): Aead {
        dropUnprotectedKeyset(context, keysetName, prefFile)
        val manager = AndroidKeysetManager.Builder()
            .withSharedPref(context, keysetName, prefFile)
            .withKeyTemplate(KeyTemplates.get("AES256_GCM"))
            .withMasterKeyUri(MASTER_KEY_URI)
            .build()
        if (!manager.isUsingKeystore) {
            // Si no puede usar el Keystore, Tink no falla: guarda el keyset en texto plano y sigue.
            // Se borra ese keyset y no se guarda ninguna sesión con una clave sin proteger.
            context.getSharedPreferences(prefFile, Context.MODE_PRIVATE).edit().remove(keysetName).commit()
            throw GeneralSecurityException("Android Keystore no disponible: no se guarda la sesión")
        }
        return manager.keysetHandle.getPrimitive(RegistryConfiguration.get(), Aead::class.java)
    }

    /**
     * Si hay un keyset guardado que la clave maestra del Keystore no descifra (texto plano, corrupto o
     * sin clave maestra), lo borra para que [build] genere uno nuevo cifrado. Hace falta porque Tink,
     * cuando no puede descifrarlo, lo lee como texto plano y aun así reporta `isUsingKeystore`.
     */
    private fun dropUnprotectedKeyset(context: Context, keysetName: String, prefFile: String) {
        val prefs = context.getSharedPreferences(prefFile, Context.MODE_PRIVATE)
        val stored = prefs.getString(keysetName, null) ?: return
        val decrypts = try {
            val masterAead = AndroidKeystoreKmsClient().getAead(MASTER_KEY_URI)
            // Mismo parseo que hace AndroidKeysetManager: hex, EncryptedKeyset binario, associated data vacía.
            LegacyKeysetSerialization.parseEncryptedKeyset(
                BinaryKeysetReader.withBytes(Hex.decode(stored)), masterAead, ByteArray(0),
            )
            true
        } catch (e: Exception) {
            false
        }
        if (!decrypts) prefs.edit().remove(keysetName).commit()
    }
}
