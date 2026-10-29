package com.fittrainer.data.sync

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlin.coroutines.cancellation.CancellationException

/** Una pasada de subida (trabajo único `sync-sessions`, solo con red). */
@HiltWorker
class SyncSessionsWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val pass: UploadPass,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = try {
        when (pass.run()) {
            PassResult.DONE -> Result.success()
            PassResult.RETRY -> Result.retry()
        }
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        // Room o una respuesta ilegible: lo resuelto ya quedó guardado.
        Log.w(TAG, "Falló la subida de sesiones", e)
        if (runAttemptCount >= MAX_UNEXPECTED_ATTEMPTS) Result.failure() else Result.retry()
    }

    companion object {
        private const val TAG = "SyncSessionsWorker"

        /** Spec §5: solo red/timeout/5xx son reintentables; un error inesperado se corta y la próxima apertura o login vuelve a encolar. */
        const val MAX_UNEXPECTED_ATTEMPTS = 5
    }
}
