package com.fittrainer.data.sync

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.Configuration
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.SynchronousExecutor
import androidx.work.testing.WorkManagerTestInitHelper
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Pablo #32 punto 11: la pieza que corta la subida al cerrar sesión (spec §5). */
@RunWith(AndroidJUnit4::class)
class CancelSyncOnSignOutTest {

    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val workManager get() = WorkManager.getInstance(context)

    @Before fun setUp() {
        WorkManagerTestInitHelper.initializeTestWorkManager(
            context,
            Configuration.Builder().setExecutor(SynchronousExecutor()).build(),
        )
    }

    private fun states() = workManager.getWorkInfosForUniqueWork(SYNC_WORK_NAME).get().map { it.state }

    @Test fun alCerrarSesionCancelaLaPasadaEnEspera() = runBlocking {
        // Sin red simulada queda ENQUEUED, como una pasada esperando red o backoff.
        WorkManagerSessionSync(context).enqueue(newWork = true)
        assertEquals(listOf(WorkInfo.State.ENQUEUED), states())

        CancelSyncOnSignOut(context).clearUserData("u1")

        assertEquals(listOf(WorkInfo.State.CANCELLED), states())
    }

    @Test fun sinPasadaEncoladaNoFalla() = runBlocking {
        CancelSyncOnSignOut(context).clearUserData(null)

        assertEquals(emptyList<WorkInfo.State>(), states())
    }
}
