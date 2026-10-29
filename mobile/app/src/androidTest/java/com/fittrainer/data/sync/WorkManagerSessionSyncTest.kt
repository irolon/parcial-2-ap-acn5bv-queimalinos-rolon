package com.fittrainer.data.sync

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.Configuration
import androidx.work.CoroutineWorker
import androidx.work.ListenableWorker
import androidx.work.NetworkType
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.WorkerFactory
import androidx.work.WorkerParameters
import androidx.work.testing.SynchronousExecutor
import androidx.work.testing.WorkManagerTestInitHelper
import java.util.UUID
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Sin red simulada el trabajo no corre: se verifica cómo queda encolado. */
@RunWith(AndroidJUnit4::class)
class WorkManagerSessionSyncTest {

    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val workManager get() = WorkManager.getInstance(context)

    /** Con una pasada "corriendo" el worker de prueba espera esto; si no, termina enseguida. */
    private val gate = CompletableDeferred<Unit>()

    /** El worker real es de Hilt: acá se arma uno de prueba para la misma clase de trabajo. */
    private val factory = object : WorkerFactory() {
        override fun createWorker(appContext: Context, workerClassName: String, params: WorkerParameters): ListenableWorker =
            object : CoroutineWorker(appContext, params) {
                override suspend fun doWork(): Result {
                    gate.await()
                    return Result.success()
                }
            }
    }

    @Before fun setUp() {
        WorkManagerTestInitHelper.initializeTestWorkManager(
            context,
            Configuration.Builder().setExecutor(SynchronousExecutor()).setWorkerFactory(factory).build(),
        )
    }

    @After fun tearDown() {
        gate.complete(Unit)
    }

    private fun states() = workManager.getWorkInfosForUniqueWork(SYNC_WORK_NAME).get().map { it.state }

    @Test fun encolaUnTrabajoUnicoQueSoloCorreConRed() = runBlocking {
        WorkManagerSessionSync(context).enqueue()

        val infos = workManager.getWorkInfosForUniqueWork(SYNC_WORK_NAME).get()
        assertEquals(listOf(WorkInfo.State.ENQUEUED), infos.map { it.state })
        assertEquals(NetworkType.CONNECTED, infos.single().constraints.requiredNetworkType)
    }

    @Test fun encolarSinPasadaCorriendoReemplazaLaQueEspera() = runBlocking {
        val sync = WorkManagerSessionSync(context)

        sync.enqueue()
        sync.enqueue()

        // La que esperaba red o backoff se reemplaza: lo nuevo no queda BLOCKED detrás de ella.
        assertEquals(listOf(WorkInfo.State.ENQUEUED), states().filter { !it.isFinished })
        assertTrue(WorkInfo.State.BLOCKED !in states())
    }

    @Test fun encolarConUnaPasadaCorriendoAgregaLaSiguienteDetras() = runBlocking {
        val sync = WorkManagerSessionSync(context)
        sync.enqueue()
        val runningId = workManager.getWorkInfosForUniqueWork(SYNC_WORK_NAME).get().single().id
        WorkManagerTestInitHelper.getTestDriver(context)!!.setAllConstraintsMet(runningId)
        withTimeout(5_000) { workManager.getWorkInfoByIdFlow(runningId).first { it?.state == WorkInfo.State.RUNNING } }

        sync.enqueue()

        // La que corre sigue (no se cancela) y la nueva espera a que termine.
        assertEquals(setOf(WorkInfo.State.RUNNING, WorkInfo.State.BLOCKED), states().toSet())
        assertEquals(WorkInfo.State.RUNNING, workManager.getWorkInfoById(runningId).get()!!.state)
    }

    @Test fun syncNowSinRedDevuelveFalseAlAgotarElTope() = runBlocking {
        assertFalse(WorkManagerSessionSync(context).syncNow(500))
    }

    @Test fun syncNowReemplazaLaColaYEsperaSuPasada() = runBlocking {
        val sync = WorkManagerSessionSync(context)
        sync.enqueue()

        val oldIds = workManager.getWorkInfosForUniqueWork(SYNC_WORK_NAME).get().map { it.id }.toSet()
        val result = async { sync.syncNow(5_000) }
        // Con tope: si se rompe, el test falla en vez de colgarse.
        val newId: UUID = withTimeout(5_000) {
            var id: UUID? = null
            while (id == null) {
                delay(50)
                id = workManager.getWorkInfosForUniqueWork(SYNC_WORK_NAME).get()
                    .firstOrNull { it.state == WorkInfo.State.ENQUEUED && it.id !in oldIds }?.id
            }
            id
        }
        gate.complete(Unit)
        WorkManagerTestInitHelper.getTestDriver(context)!!.setAllConstraintsMet(newId)

        assertTrue(result.await())
        assertTrue(states().none { it == WorkInfo.State.BLOCKED || it == WorkInfo.State.ENQUEUED })
    }
}
