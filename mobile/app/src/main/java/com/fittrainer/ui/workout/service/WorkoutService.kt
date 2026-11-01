package com.fittrainer.ui.workout.service

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.fittrainer.data.notifications.notificationsAllowed
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.Load
import com.fittrainer.data.workout.Workout
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.data.workout.exercise
import com.fittrainer.data.workout.isPaused
import com.fittrainer.data.workout.preload
import com.fittrainer.data.workout.remainingMs
import com.fittrainer.data.workout.restJustEnded
import dagger.hilt.android.AndroidEntryPoint
import java.time.Clock
import java.time.Instant
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/**
 * Foreground service mientras hay una sesión abierta (spec §5): mantiene viva la app con la notificación
 * fija y avisa el fin del descanso aunque el celular esté bloqueado. No guarda estado propio: todo sale de
 * Room. Si Android lo mata, al reabrir la app se retoma desde Room (START_NOT_STICKY).
 */
@AndroidEntryPoint
class WorkoutService : Service() {

    @Inject lateinit var repository: WorkoutRepository
    @Inject lateinit var sessionRepository: SessionRepository
    @Inject lateinit var clock: Clock

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var observing = false
    /** Fin del descanso que estaba corriendo en la emisión anterior. */
    private var runningRestEnd: Instant? = null
    /** Última sesión vista: un start() repetido repone esta notificación y no la genérica. */
    private var lastWorkout: Workout? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        WorkoutNotifications.createChannels(this)
        // Android exige startForeground enseguida: primero la notificación genérica, después la real.
        ServiceCompat.startForeground(
            this, WorkoutNotifications.ID_ONGOING,
            lastWorkout?.let { WorkoutNotifications.ongoing(this, it) } ?: WorkoutNotifications.starting(this),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
        )
        if (!observing) {
            observing = true
            scope.launch { observe() }
        }
        return START_NOT_STICKY
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    private suspend fun observe() {
        sessionRepository.session
            .map { (it as? Session.Student)?.user?.id }
            .distinctUntilChanged()
            .flatMapLatest { owner -> if (owner == null) flowOf(null) else repository.observeActive(owner) }
            .collectLatest { workout -> onWorkout(workout) }
    }

    private suspend fun onWorkout(workout: Workout?) {
        if (workout == null) {
            WorkoutNotifications.cancelRestDone(this)
            stopSelf()
            return
        }
        lastWorkout = workout
        val now = clock.instant()
        val running = workout.rest?.takeUnless { it.isPaused }?.endsAt
        // La pantalla cerró el descanso al llegar a 0 antes que el service: igual hay que avisar.
        // Si una emisión nueva cancela nextLoad, runningRestEnd sigue sin tocar y la siguiente vuelve a avisar.
        val ended = runningRestEnd
        if (ended != null && restJustEnded(ended, running, now)) WorkoutNotifications.notifyRestDone(this, nextLoad(workout), ended)
        // Arrancó otro descanso: el aviso del anterior ya no corresponde.
        if (running != null && running != runningRestEnd) WorkoutNotifications.cancelRestDone(this)
        runningRestEnd = running
        updateOngoing(workout)
        if (running == null) return releaseWakeLock()
        // Con la pantalla apagada la CPU duerme y el delay se atrasa: un wake lock parcial hasta el fin.
        val left = workout.rest!!.remainingMs(now)
        acquireWakeLock(left + 10_000)
        try {
            awaitRestEnd(
                left,
                prepare = { nextLoad(workout) },
                notify = { WorkoutNotifications.notifyRestDone(this, it, running) },
                ended = { runningRestEnd = null },
            )
            repository.endRestIfOver(workout.ownerId)
        } finally {
            releaseWakeLock()
        }
    }

    /** Sin permiso de notificaciones no se actualiza el texto; el foreground sigue igual. */
    private fun updateOngoing(workout: Workout) {
        if (!notificationsAllowed(this)) return
        try {
            NotificationManagerCompat.from(this).notify(WorkoutNotifications.ID_ONGOING, WorkoutNotifications.ongoing(this, workout))
        } catch (e: SecurityException) {
            // El permiso se revocó recién: el timer en pantalla sigue andando.
        }
    }

    /** El cursor ya está en la próxima serie: misma precarga que la pantalla (con el historial). */
    private suspend fun nextLoad(workout: Workout): Load {
        val exerciseId = workout.exercise(workout.cursor.position).exerciseId
        val last = historyOrNull { repository.lastSetFor(workout.ownerId, exerciseId) }
        return workout.preload(workout.cursor, last)
    }

    private fun acquireWakeLock(timeoutMs: Long) {
        releaseWakeLock()
        val power = getSystemService(PowerManager::class.java)
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "FitTrainer:rest").apply { acquire(timeoutMs) }
    }

    private fun releaseWakeLock() {
        wakeLock?.takeIf { it.isHeld }?.release()
        wakeLock = null
    }

    override fun onDestroy() {
        releaseWakeLock()
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        /** Se llama desde la pantalla de la sesión (app al frente): Android permite arrancarlo. */
        fun start(context: Context) {
            ContextCompat.startForegroundService(context, Intent(context, WorkoutService::class.java))
        }
    }
}
