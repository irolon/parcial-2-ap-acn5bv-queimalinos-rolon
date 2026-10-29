package com.fittrainer.data.sync

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.ListenableWorker
import androidx.work.WorkerFactory
import androidx.work.WorkerParameters
import androidx.work.testing.TestListenableWorkerBuilder
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

/** Cómo traduce el worker el resultado de la pasada a lo que hace WorkManager (spec §5). */
@RunWith(AndroidJUnit4::class)
class SyncSessionsWorkerTest {

    private val context = ApplicationProvider.getApplicationContext<Context>()

    private fun worker(pass: UploadPass, runAttemptCount: Int = 0) =
        TestListenableWorkerBuilder<SyncSessionsWorker>(context)
            .setRunAttemptCount(runAttemptCount)
            .setWorkerFactory(object : WorkerFactory() {
                override fun createWorker(appContext: Context, workerClassName: String, params: WorkerParameters): ListenableWorker =
                    SyncSessionsWorker(appContext, params, pass)
            })
            .build()

    private val explodes = UploadPass { throw IllegalStateException("Room se rompió") }

    @Test fun pasadaTerminadaEsExito() = runBlocking {
        assertEquals(ListenableWorker.Result.success(), worker({ PassResult.DONE }).doWork())
    }

    @Test fun pasadaQuePideReintentoReintenta() = runBlocking {
        assertEquals(ListenableWorker.Result.retry(), worker({ PassResult.RETRY }).doWork())
    }

    @Test fun errorInesperadoReintentaMientrasNoSeAgotenLosIntentos() = runBlocking {
        val last = SyncSessionsWorker.MAX_UNEXPECTED_ATTEMPTS - 1
        assertEquals(ListenableWorker.Result.retry(), worker(explodes, runAttemptCount = 0).doWork())
        assertEquals(ListenableWorker.Result.retry(), worker(explodes, runAttemptCount = last).doWork())
    }

    @Test fun errorInesperadoEnElQuintoIntentoFalla() = runBlocking {
        val attempts = SyncSessionsWorker.MAX_UNEXPECTED_ATTEMPTS
        assertEquals(ListenableWorker.Result.failure(), worker(explodes, runAttemptCount = attempts).doWork())
    }
}
