package com.fittrainer

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.fittrainer.data.auth.logout.LogoutRetryQueue
import com.fittrainer.data.notifications.push.PushChannel
import com.fittrainer.data.notifications.push.PushTokenRegistry
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.sync.SyncTrigger
import com.fittrainer.di.ApplicationScope
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

@HiltAndroidApp
class FitTrainerApp : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    @Inject lateinit var syncTrigger: SyncTrigger

    @Inject lateinit var sessionRepository: SessionRepository

    @Inject lateinit var pushTokens: PushTokenRegistry

    @Inject lateinit var logoutRetry: LogoutRetryQueue

    /**
     * El único scope del proceso (el mismo del servicio de push y del leído de un aviso tocado): acá corren el
     * disparador de la subida de sesiones (tarjeta 11) y el alta del token.
     */
    @Inject @ApplicationScope lateinit var appScope: CoroutineScope

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder().setWorkerFactory(workerFactory).build()

    override fun onCreate() {
        super.onCreate()
        PushChannel.create(this)
        syncTrigger.start(appScope)
        // Un solo disparador del alta del token: cada vez que la sesión pasa a ser de un alumno nuevo
        // (arranque con sesión guardada o login). Los errores los traga el registro.
        appScope.launch { pushTokens.registerOnSessions(sessionRepository.session) }
        // Un logout guardado cuya pasada no llegó a programarse (el proceso murió en el medio): se programa ahora.
        appScope.launch { logoutRetry.resume() }
    }
}
