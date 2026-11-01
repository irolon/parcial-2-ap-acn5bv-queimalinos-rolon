package com.fittrainer

import android.app.Application
import android.util.Log
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.fittrainer.data.notifications.push.PushChannel
import com.fittrainer.data.notifications.push.PushTokenRegistry
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.sync.SyncTrigger
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@HiltAndroidApp
class FitTrainerApp : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    @Inject lateinit var syncTrigger: SyncTrigger

    @Inject lateinit var sessionRepository: SessionRepository

    @Inject lateinit var pushTokens: PushTokenRegistry

    /** Vive lo que vive el proceso: el disparador de la subida de sesiones (tarjeta 11). */
    private val appScope = CoroutineScope(
        SupervisorJob() + Dispatchers.Default +
            CoroutineExceptionHandler { _, e -> Log.e("FitTrainerApp", "Falló el disparador de subida", e) },
    )

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder().setWorkerFactory(workerFactory).build()

    override fun onCreate() {
        super.onCreate()
        PushChannel.create(this)
        syncTrigger.start(appScope)
        // Un solo disparador del alta del token: cada vez que la sesión pasa a ser de un alumno nuevo
        // (arranque con sesión guardada o login). Los errores los traga el registro.
        appScope.launch { pushTokens.registerOnStudentSessions(sessionRepository.session) }
    }
}
