package com.fittrainer.data.auth.logout

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkRequest
import androidx.work.WorkerParameters
import androidx.work.await
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException

const val LOGOUT_RETRY_WORK_NAME = "logout-retry"

/** Reintenta los logouts pendientes (trabajo único `logout-retry`, solo con red, backoff exponencial). */
@HiltWorker
class LogoutRetryWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val pass: LogoutRetryPass,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = try {
        if (pass.run()) Result.success() else Result.retry()
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        // El archivo de pendientes falló: se reintenta con el backoff (WorkManager lo topea en 5 h).
        Log.w(TAG, "Falló el reintento del logout", e)
        Result.retry()
    }

    private companion object {
        const val TAG = "LogoutRetryWorker"
    }
}

/** Programa la pasada de reintento. Lanza si WorkManager no la pudo guardar. */
interface LogoutRetryScheduler {
    suspend fun schedule()
}

/**
 * La pasada espera [START_DELAY_SECONDS] para que el envío directo del logout (que casi siempre llega) la deje sin
 * nada que hacer. APPEND_OR_REPLACE: si ya hay una (corriendo o esperando red o backoff), la nueva va a
 * continuación, porque la que corre pudo leer la lista antes de este logout. Cada pasada lee la lista entera. Se
 * espera la [androidx.work.Operation]: recién ahí la pasada quedó guardada en la base de WorkManager.
 */
class WorkManagerLogoutRetryScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
) : LogoutRetryScheduler {

    override suspend fun schedule() {
        val request = OneTimeWorkRequestBuilder<LogoutRetryWorker>()
            .setInitialDelay(START_DELAY_SECONDS, TimeUnit.SECONDS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, WorkRequest.MIN_BACKOFF_MILLIS, TimeUnit.MILLISECONDS)
            .build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork(LOGOUT_RETRY_WORK_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
            .await()
    }

    private companion object {
        const val START_DELAY_SECONDS = 30L
    }
}
