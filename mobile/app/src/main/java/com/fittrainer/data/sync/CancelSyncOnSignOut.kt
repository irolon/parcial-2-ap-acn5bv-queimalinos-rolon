package com.fittrainer.data.sync

import android.content.Context
import androidx.work.WorkManager
import androidx.work.await
import com.fittrainer.data.session.UserDataCleaner
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

/**
 * Al cerrar sesión cancela la pasada de subida en curso o en espera (spec: nunca se sube con la
 * cuenta de otro). No borra nada: lo pendiente queda en Room y el próximo login vuelve a encolar.
 * Cancelar el trabajo cancela su corrutina y Retrofit corta el request en vuelo; corre antes de que
 * se borre el token.
 */
class CancelSyncOnSignOut @Inject constructor(
    @ApplicationContext private val context: Context,
) : UserDataCleaner {

    override suspend fun clearUserData(ownerId: String?) {
        WorkManager.getInstance(context).cancelUniqueWork(SYNC_WORK_NAME).await()
    }
}
