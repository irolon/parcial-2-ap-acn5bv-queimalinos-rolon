package com.fittrainer.data.auth.tokenstore

import android.content.Context
import androidx.datastore.core.DataStoreFactory
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.auth.AuthCrypto
import com.fittrainer.data.auth.AuthState
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.auth.EncryptedAuthSerializer
import com.fittrainer.data.auth.SharedPrefsSessionTombstones
import com.fittrainer.data.session.Role
import java.io.File
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DataStoreTokenStoreTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private val state = AuthState("access-123", "refresh-456", AuthUser("u1", "Ana", "ana@test.com", Role.STUDENT), "session-1")
    private lateinit var file: File
    private lateinit var scope: CoroutineScope

    @Before fun setUp() {
        file = File(context.cacheDir, "auth-test-${UUID.randomUUID()}.pb")
        scope = CoroutineScope(Dispatchers.IO + Job())
    }

    @After fun tearDown() {
        scope.cancel()
        file.delete()
        context.deleteSharedPreferences(TOMBSTONES_PREFS)
    }

    private fun store() = DataStoreTokenStore(
        DataStoreFactory.create(
            serializer = EncryptedAuthSerializer { AuthCrypto.aead(context, "test_keyset", "test_keyset_prefs") },
            scope = scope,
            produceFile = { file },
        ),
        SharedPrefsSessionTombstones(context, TOMBSTONES_PREFS),
    )

    @Test fun sinDatosCurrentEsNull() = runTest {
        assertNull(store().current())
    }

    @Test fun saveYCurrentDevuelvenLoGuardado() = runTest {
        val store = store()
        store.save(state)
        assertEquals(state, store.current())
    }

    @Test fun updateAccessTokenCambiaSoloElAccess() = runTest {
        val store = store()
        store.save(state)
        store.updateAccessToken("session-1", "access-nuevo")
        assertEquals(state.copy(accessToken = "access-nuevo"), store.current())
    }

    @Test fun clearDejaLaSesionVacia() = runTest {
        val store = store()
        store.save(state)
        store.clear()
        assertNull(store.current())
    }

    @Test fun elArchivoNoTieneElTokenEnTextoPlano() = runTest {
        store().save(state)
        val bytes = file.readBytes()
        assertTrue(bytes.isNotEmpty())
        assertFalse(bytes.decodeToString().contains("access-123"))
        assertFalse(bytes.decodeToString().contains("refresh-456"))
    }

    @Test fun archivoCorruptoSeLeeComoSinSesion() = runTest {
        file.writeBytes("no es un archivo cifrado".encodeToByteArray())
        assertNull(store().current())
    }

    @Test fun lasMarcasDeSesionCerradaSobrevivenAOtraInstancia() {
        SharedPrefsSessionTombstones(context, TOMBSTONES_PREFS).close("session-1")
        assertEquals(setOf("session-1"), SharedPrefsSessionTombstones(context, TOMBSTONES_PREFS).closed())

        assertTrue(SharedPrefsSessionTombstones(context, TOMBSTONES_PREFS).reset())
        assertTrue(SharedPrefsSessionTombstones(context, TOMBSTONES_PREFS).closed().isEmpty())
    }

    private companion object {
        const val TOMBSTONES_PREFS = "test_auth_closed"
    }
}
