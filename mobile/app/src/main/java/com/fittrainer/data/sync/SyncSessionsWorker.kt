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
        // Room u otro error inesperado: lo resuelto ya quedó guardado. Se reintenta siempre, con el backoff
        // exponencial (WorkManager lo topea en 5 h): con failure() nada volvería a encolar mientras viva
        // el proceso, y lo pendiente no subiría sin abrir la app (spec §5).
        Log.w(TAG, "Falló la subida de sesiones", e)
        Result.retry()
    }

    private companion object {
        const val TAG = "SyncSessionsWorker"
    }
}
