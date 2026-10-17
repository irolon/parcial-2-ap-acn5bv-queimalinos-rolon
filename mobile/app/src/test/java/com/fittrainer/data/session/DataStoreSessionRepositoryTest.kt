package com.fittrainer.data.session

import androidx.datastore.core.DataStore
import androidx.datastore.core.DataStoreFactory
import androidx.datastore.core.okio.OkioStorage
import androidx.datastore.preferences.core.PreferencesSerializer
import androidx.datastore.preferences.core.Preferences
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import okio.FileSystem
import okio.Path.Companion.toPath
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class DataStoreSessionRepositoryTest {

    @get:Rule val tmp = TemporaryFolder()

    private val scopes = mutableListOf<CoroutineScope>()

    @After fun tearDown() = scopes.forEach { it.cancel() }

    private fun dataStore(): DataStore<Preferences> {
        val scope = CoroutineScope(UnconfinedTestDispatcher() + Job()).also { scopes += it }
        // OkioStorage (no FileStorage): su atomicMove reemplaza el destino también en Windows.
        return DataStoreFactory.create(
            storage = OkioStorage(FileSystem.SYSTEM, PreferencesSerializer) {
                File(tmp.root, "session.preferences_pb").absolutePath.toPath()
            },
            scope = scope,
        )
    }

    @Test fun `arranca sin sesion`() = runTest {
        val repo = DataStoreSessionRepository(dataStore())
        assertEquals(Session.LoggedOut, repo.session.first())
    }

    @Test fun `signInAs alumno emite Student`() = runTest {
        val repo = DataStoreSessionRepository(dataStore())
        repo.signInAs(Role.STUDENT)
        assertEquals(Session.Student, repo.session.first())
    }

    @Test fun `signInAs entrenador emite Trainer`() = runTest {
        val repo = DataStoreSessionRepository(dataStore())
        repo.signInAs(Role.TRAINER)
        assertEquals(Session.Trainer, repo.session.first())
    }

    @Test fun `signOut vuelve a LoggedOut`() = runTest {
        val repo = DataStoreSessionRepository(dataStore())
        repo.signInAs(Role.TRAINER)
        repo.signOut()
        assertEquals(Session.LoggedOut, repo.session.first())
    }

    // Review Focus 4: el rol sobrevive a cerrar y reabrir la app (otra instancia sobre el mismo archivo).
    @Test fun `el rol persiste entre instancias`() = runTest {
        DataStoreSessionRepository(dataStore()).signInAs(Role.STUDENT)
        scopes.forEach { it.coroutineContext[Job]!!.cancelAndJoin() } // "cierra la app": libera el archivo
        val reopened = DataStoreSessionRepository(dataStore())
        assertEquals(Session.Student, reopened.session.first())
    }
}
