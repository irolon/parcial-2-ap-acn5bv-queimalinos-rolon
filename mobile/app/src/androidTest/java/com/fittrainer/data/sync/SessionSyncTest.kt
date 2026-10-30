package com.fittrainer.data.sync

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.BackoffPolicy
import androidx.work.Configuration
import androidx.work.CoroutineWorker
import androidx.work.ListenableWorker
import androidx.work.NetworkType
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.WorkerFactory
import androidx.work.WorkRequest
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
class SessionSyncTest {

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
        WorkManagerSessionSync(context).enqueue(newWork = true)

        val infos = workManager.getWorkInfosForUniqueWork(SYNC_WORK_NAME).get()
        assertEquals(listOf(WorkInfo.State.ENQUEUED), infos.map { it.state })
        assertEquals(NetworkType.CONNECTED, infos.single().constraints.requiredNetworkType)
    }

    // Pablo #32 punto 11: backoff exponencial desde 10 s (WorkInfo no lo expone: se mira el request).
    @Test fun elRequestTieneBackoffExponencialDesde10Segundos() {
        val spec = syncWorkRequest().workSpec
        assertEquals(BackoffPolicy.EXPONENTIAL, spec.backoffPolicy)
        assertEquals(WorkRequest.MIN_BACKOFF_MILLIS, spec.backoffDelayDuration)
    }

    // Pablo #32 punto 6: sin trabajo nuevo (abrir la app, login) no se reemplaza la que espera.
    @Test fun encolarSinTrabajoNuevoRespetaLaQueEspera() = runBlocking {
        val sync = WorkManagerSessionSync(context)
        sync.enqueue(newWork = true)
        val waiting = workManager.getWorkInfosForUniqueWork(SYNC_WORK_NAME).get().single().id

        sync.enqueue(newWork = false)

        val infos = workManager.getWorkInfosForUniqueWork(SYNC_WORK_NAME).get()
        assertEquals(listOf(waiting), infos.map { it.id })
        assertEquals(WorkInfo.State.ENQUEUED, infos.single().state)
    }

    @Test fun encolarSinPasadaCorriendoReemplazaLaQueEspera() = runBlocking {
        val sync = WorkManagerSessionSync(context)

        sync.enqueue(newWork = true)
        sync.enqueue(newWork = true)

        // La que esperaba red o backoff se reemplaza: lo nuevo no queda BLOCKED detrás de ella.
        assertEquals(listOf(WorkInfo.State.ENQUEUED), states().filter { !it.isFinished })
        assertTrue(WorkInfo.State.BLOCKED !in states())
    }

    @Test fun encolarConUnaPasadaCorriendoAgregaLaSiguienteDetras() = runBlocking {
        val sync = WorkManagerSessionSync(context)
        sync.enqueue(newWork = true)
        val runningId = workManager.getWorkInfosForUniqueWork(SYNC_WORK_NAME).get().single().id
        WorkManagerTestInitHelper.getTestDriver(context)!!.setAllConstraintsMet(runningId)
        withTimeout(5_000) { workManager.getWorkInfoByIdFlow(runningId).first { it?.state == WorkInfo.State.RUNNING } }

        sync.enqueue(newWork = true)

        // La que corre sigue (no se cancela) y la nueva espera a que termine.
        assertEquals(setOf(WorkInfo.State.RUNNING, WorkInfo.State.BLOCKED), states().toSet())
        assertEquals(WorkInfo.State.RUNNING, workManager.getWorkInfoById(runningId).get()!!.state)
    }

    @Test fun syncNowSinRedDevuelveFalseAlAgotarElTope() = runBlocking {
        assertFalse(WorkManagerSessionSync(context).syncNow(500))
    }

    @Test fun syncNowReemplazaLaColaYEsperaSuPasada() = runBlocking {
        val sync = WorkManagerSessionSync(context)
        sync.enqueue(newWork = true)

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
