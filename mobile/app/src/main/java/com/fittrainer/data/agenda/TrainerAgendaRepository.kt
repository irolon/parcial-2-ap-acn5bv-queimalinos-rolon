package com.fittrainer.data.agenda

import com.fittrainer.data.api.agenda.AgendaApi
import com.fittrainer.data.api.agenda.UpdateAppointmentRequest
import com.fittrainer.data.api.errorEnvelope
import com.fittrainer.data.db.agenda.TrainerAgendaDao
import com.fittrainer.data.db.agenda.TrainerAgendaWeekEntity
import com.fittrainer.data.db.agenda.TrainerAvailabilitySyncEntity
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import retrofit2.HttpException

private const val INVALID_TRANSITION = "INVALID_STATUS_TRANSITION"
private const val APPOINTMENT_PAST = "APPOINTMENT_PAST"
private const val CONFLICT_FALLBACK = "No se puede pasar el turno a ese estado"

/**
 * Agenda del entrenador (E13), offline-first: la semana y la disponibilidad salen de Room y se refrescan desde
 * la API. Confirmar y cancelar son solo online (como las demás ediciones del PT) y guardan lo que devuelve el
 * servidor, así la lista lo muestra enseguida.
 */
@Singleton
class TrainerAgendaRepository @Inject constructor(
    private val api: AgendaApi,
    private val dao: TrainerAgendaDao,
    private val clock: Clock,
) : UserDataCleaner {

    /** null = esa semana nunca se bajó. */
    fun observeWeek(trainerId: String, weekStart: LocalDate): Flow<AgendaWeekCache?> {
        val bounds = weekBounds(weekStart)
        return combine(dao.observeRange(trainerId, bounds.from, bounds.to), dao.observeWeek(trainerId, weekStart.toString())) { rows, week ->
            week?.let { AgendaWeekCache(rows.map { it.toDomain() }, Instant.ofEpochMilli(it.fetchedAt)) }
        }.distinctUntilChanged()
    }

    /** null = la disponibilidad nunca se bajó. */
    fun observeAvailability(trainerId: String): Flow<AvailabilityCache?> =
        combine(dao.observeAvailability(trainerId), dao.observeAvailabilitySync(trainerId)) { rows, sync ->
            sync?.let { AvailabilityCache(rows.map { it.toDomain() }, Instant.ofEpochMilli(it.fetchedAt)) }
        }.distinctUntilChanged()

    /** Un solo GET de lunes a domingo; reemplaza en Room solo los turnos de esa semana. */
    suspend fun refreshWeek(trainerId: String, weekStart: LocalDate): Result<Unit> = call(trainerId, null) { save ->
        val rows = api.appointments(weekStart.toString(), weekEnd(weekStart).toString()).data.map { it.toEntity(trainerId) }
        val bounds = weekBounds(weekStart)
        save { dao.replaceWeek(TrainerAgendaWeekEntity(trainerId, weekStart.toString(), clock.millis()), bounds.from, bounds.to, rows) }
    }

    suspend fun refreshAvailability(trainerId: String): Result<Unit> = call(trainerId, null) { save ->
        val rows = api.availability().data.map { it.toEntity(trainerId) }
        save { dao.replaceAvailability(TrainerAvailabilitySyncEntity(trainerId, clock.millis()), rows) }
    }

    /**
     * Confirma o cancela. 409 → AppointmentConflictException con el mensaje del backend (la pantalla refresca la
     * semana); 403 → el turno sale de Room y AppointmentGoneException.
     */
    suspend fun updateStatus(trainerId: String, appointmentId: String, status: AppointmentStatus): Result<Unit> =
        call(trainerId, appointmentId) { save ->
            val updated = api.updateStatus(appointmentId, UpdateAppointmentRequest(status.wire)).data
            save { dao.upsertAppointments(listOf(updated.toEntity(trainerId))) }
        }

    // Un Mutex por entrenador, que abarca la red y Room: un GET que salió antes de confirmar o cancelar no
    // pisa el estado nuevo al guardar su foto vieja (lo que Codex encontró en los ejercicios de E10).
    private val locks = ConcurrentHashMap<String, Mutex>()

    // Cerrar sesión no espera a la red: sube la generación y borra. Un pedido que salió antes guarda solo si la
    // generación sigue igual, y el chequeo y la escritura van bajo el mismo lock que el borrado (hallazgo de Codex
    // en E13: un GET que volvía después del cierre repoblaba Room con los datos del entrenador).
    private val generation = AtomicLong()
    private val writeLock = Mutex()

    private suspend fun guarded(started: Long, write: suspend () -> Unit) = writeLock.withLock {
        if (generation.get() != started) throw StaleWriteException()
        write()
    }

    private suspend fun <T> call(
        trainerId: String,
        appointmentId: String?,
        block: suspend (save: suspend (suspend () -> Unit) -> Unit) -> T,
    ): Result<T> {
        val started = generation.get()
        return try {
            Result.success(locks.getOrPut(trainerId) { Mutex() }.withLock { block { guarded(started, it) } })
        } catch (e: CancellationException) {
            throw e
        } catch (e: HttpException) {
            val env = e.errorEnvelope()
            Result.failure(
                when {
                    appointmentId != null && e.code() == 409 && (env?.code == INVALID_TRANSITION || env?.code == APPOINTMENT_PAST) ->
                        AppointmentConflictException(env?.message ?: CONFLICT_FALLBACK)
                    appointmentId != null && e.code() == 403 -> {
                        try {
                            guarded(started) { dao.forgetAppointment(trainerId, appointmentId) }
                        } catch (ignored: StaleWriteException) {
                            // Se cerró la sesión en el medio: no hay nada que borrar.
                        }
                        AppointmentGoneException()
                    }
                    else -> DataException(e.toDataError(), e)
                },
            )
        } catch (e: Exception) {
            Result.failure(DataException(e.toDataError(), e))
        }
    }

    override suspend fun clearUserData(ownerId: String?) = writeLock.withLock {
        generation.incrementAndGet()
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }
}

/** Un pedido que salió antes de cerrar sesión: lo que trae ya no se guarda. */
private class StaleWriteException : Exception()
