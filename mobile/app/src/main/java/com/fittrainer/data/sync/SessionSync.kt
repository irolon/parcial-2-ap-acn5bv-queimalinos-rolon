package com.fittrainer.data.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.WorkRequest
import androidx.work.await
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull

const val SYNC_WORK_NAME = "sync-sessions"

/** La cola de subida vista desde la app (spec §4). El estado de cada sesión se lee de Room, no de acá. */
interface SessionSync {
    /**
     * Pide una pasada. Si hay una corriendo, la nueva queda a continuación; si solo hay una esperando
     * red o backoff, la nueva la reemplaza (lo recién terminado no espera el backoff, RNF-03).
     */
    suspend fun enqueue()

    /**
     * Fuerza una pasada nueva aunque haya otra esperando backoff, y espera a que esa pasada termine.
     * false si no terminó en [timeoutMs].
     */
    suspend fun syncNow(timeoutMs: Long): Boolean
}

@Singleton
class WorkManagerSessionSync @Inject constructor(@ApplicationContext private val context: Context) : SessionSync {

    private val workManager get() = WorkManager.getInstance(context)

    private fun request() = OneTimeWorkRequestBuilder<SyncSessionsWorker>()
        .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, WorkRequest.MIN_BACKOFF_MILLIS, TimeUnit.MILLISECONDS)
        .build()

    override suspend fun enqueue() {
        val running = workManager.getWorkInfosForUniqueWorkFlow(SYNC_WORK_NAME).first()
            .any { it.state == WorkInfo.State.RUNNING }
        // Con una pasada corriendo, APPEND_OR_REPLACE: esa sigue y lo recién terminado se sube en la siguiente.
        // Si no, REPLACE: lo que esperaba backoff o red se reemplaza. Es seguro porque todo es idempotente
        // (UUID del cliente) y la nueva igual espera la red.
        val policy = if (running) ExistingWorkPolicy.APPEND_OR_REPLACE else ExistingWorkPolicy.REPLACE
        workManager.enqueueUniqueWork(SYNC_WORK_NAME, policy, request()).await()
    }

    override suspend fun syncNow(timeoutMs: Long): Boolean {
        val request = request()
        // REPLACE es seguro: la subida es idempotente (UUID del cliente) y el worker propaga la cancelación.
        workManager.enqueueUniqueWork(SYNC_WORK_NAME, ExistingWorkPolicy.REPLACE, request).await()
        return withTimeoutOrNull(timeoutMs) {
            workManager.getWorkInfoByIdFlow(request.id).first { it?.state?.isFinished == true }
        } != null
    }
}
