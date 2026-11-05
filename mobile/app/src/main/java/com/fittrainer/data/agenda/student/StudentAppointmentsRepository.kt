package com.fittrainer.data.agenda.student

import com.fittrainer.data.agenda.Appointment
import com.fittrainer.data.agenda.AppointmentGoneException
import com.fittrainer.data.agenda.AppointmentStatus
import com.fittrainer.data.agenda.localDay
import com.fittrainer.data.api.agenda.AgendaApi
import com.fittrainer.data.api.agenda.CreateAppointmentRequest
import com.fittrainer.data.api.agenda.UpdateAppointmentRequest
import com.fittrainer.data.api.errorEnvelope
import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.data.db.agenda.student.StudentAgendaDao
import com.fittrainer.data.db.agenda.student.StudentAppointmentsSyncEntity
import com.fittrainer.data.db.agenda.student.StudentFreeSlotsSyncEntity
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
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

/**
 * Turnos del alumno (tarjeta 16). Sus turnos y los horarios libres de su PT salen de Room y se refrescan desde la
 * API. Pedir y cancelar son solo con red: el POST no acepta un id del cliente, así que reintentarlo podría duplicar
 * el turno (la misma excepción que la mensajería en AGENTS.md). Los dos guardan lo que devuelve el servidor.
 */
@Singleton
class StudentAppointmentsRepository @Inject constructor(
    private val api: AgendaApi,
    private val dao: StudentAgendaDao,
    private val clock: Clock,
) : UserDataCleaner {

    /** Los turnos desde hoy (00:00 de Argentina), por hora. null = nunca se bajaron. */
    fun observeMine(studentId: String): Flow<MyAppointmentsCache?> {
        val from = dayStartMillis(localDay(clock.instant()))
        return combine(dao.observeFrom(studentId, from), dao.observeAppointmentsSync(studentId)) { rows, sync ->
            sync?.let { MyAppointmentsCache(rows.map { it.toDomain() }, Instant.ofEpochMilli(it.fetchedAt)) }
        }.distinctUntilChanged()
    }

    /** null = nunca se bajaron. Pueden haber quedado horarios que ya empezaron: los filtra la pantalla. */
    fun observeFreeSlots(studentId: String): Flow<FreeSlotsCache?> =
        combine(dao.observeFreeSlots(studentId), dao.observeFreeSlotsSync(studentId)) { rows, sync ->
            sync?.let { FreeSlotsCache(rows.map { Instant.ofEpochMilli(it.startsAt) }, Instant.ofEpochMilli(it.fetchedAt)) }
        }.distinctUntilChanged()

    /** Un GET de hoy a hoy + 60; reemplaza en Room solo esa ventana. */
    suspend fun refreshMine(studentId: String): Result<Unit> = call(studentId, StudentAgendaOp.Mine) { save ->
        val today = localDay(clock.instant())
        val last = today.plusDays(MY_APPOINTMENTS_DAYS_AHEAD)
        val rows = api.appointments(RequiredUser(studentId), today.toString(), last.toString()).data.map { it.toStudentEntity(studentId) }
        val sync = StudentAppointmentsSyncEntity(studentId, clock.millis())
        save { dao.replaceWindow(sync, dayStartMillis(today), dayStartMillis(last.plusDays(1)), rows) }
    }

    /** Los libres de hoy a hoy + 27; reemplazan a los de la bajada anterior. 403 → NoTrainerException. */
    suspend fun refreshFreeSlots(studentId: String): Result<Unit> = call(studentId, StudentAgendaOp.Free) { save ->
        val today = localDay(clock.instant())
        val last = today.plusDays(FREE_SLOTS_DAYS_AHEAD)
        val rows = api.freeSlots(RequiredUser(studentId), today.toString(), last.toString()).data.map { it.toEntity(studentId) }
        save { dao.replaceFreeSlots(StudentFreeSlotsSyncEntity(studentId, clock.millis()), rows) }
    }

    /**
     * Pide el turno de [at] con la nota (vacía no viaja). Guarda el turno del servidor y saca el horario de los
     * libres. SLOT_TAKEN y SLOT_UNAVAILABLE también lo sacan: ese horario ya no se puede pedir.
     */
    suspend fun request(studentId: String, at: Instant, notes: String?): Result<Appointment> {
        val slot = at.toEpochMilli()
        return call(studentId, StudentAgendaOp.Request(slot)) { save ->
            val body = CreateAppointmentRequest(wireDateTime(at), notes?.trim()?.takeIf { it.isNotEmpty() })
            val row = api.create(RequiredUser(studentId), body).data.toStudentEntity(studentId)
            save { dao.saveRequested(row, slot) }
            row.toDomain()
        }
    }

    /** 409 → AppointmentConflictException con el mensaje del backend; 403 → sale de Room y AppointmentGoneException. */
    suspend fun cancel(studentId: String, appointmentId: String): Result<Unit> =
        call(studentId, StudentAgendaOp.Cancel(appointmentId)) { save ->
            val updated = api.updateStatus(RequiredUser(studentId), appointmentId, UpdateAppointmentRequest(AppointmentStatus.CANCELLED.wire)).data
            save { dao.upsertAppointments(listOf(updated.toStudentEntity(studentId))) }
        }

    // Un Mutex por alumno, que abarca la red y Room: un GET que salió antes de cancelar no pisa el estado nuevo.
    private val locks = ConcurrentHashMap<String, Mutex>()

    // Cerrar sesión no espera a la red: sube la generación y borra. Un pedido que salió antes guarda solo si la
    // generación sigue igual, con el chequeo y la escritura bajo el mismo lock que el borrado (lo de Codex en E13).
    private val generation = AtomicLong()
    private val writeLock = Mutex()

    private suspend fun guarded(started: Long, write: suspend () -> Unit) = writeLock.withLock {
        if (generation.get() != started) throw StaleWriteException()
        write()
    }

    /** Una limpieza después de un error: si se cerró la sesión en el medio, no hay nada que borrar. */
    private suspend fun forget(started: Long, write: suspend () -> Unit) {
        try {
            guarded(started, write)
        } catch (ignored: StaleWriteException) {
            // Room ya quedó vacío para este usuario.
        }
    }

    private suspend fun <T> call(
        studentId: String,
        op: StudentAgendaOp,
        block: suspend (save: suspend (suspend () -> Unit) -> Unit) -> T,
    ): Result<T> {
        val started = generation.get()
        return try {
            Result.success(locks.getOrPut(studentId) { Mutex() }.withLock { block { guarded(started, it) } })
        } catch (e: CancellationException) {
            throw e
        } catch (e: HttpException) {
            Result.failure(httpFailure(studentId, op, started, e))
        } catch (e: Exception) {
            Result.failure(DataException(e.toDataError(), e))
        }
    }

    private suspend fun httpFailure(studentId: String, op: StudentAgendaOp, started: Long, e: HttpException): Exception {
        if (op is StudentAgendaOp.Cancel && e.code() == 403) {
            forget(started) { dao.forgetAppointment(studentId, op.appointmentId) }
            return AppointmentGoneException()
        }
        val typed = typedFailure(op, e.code(), e.errorEnvelope()) ?: return DataException(e.toDataError(), e)
        if (op is StudentAgendaOp.Request && (typed is SlotTakenException || typed is SlotUnavailableException)) {
            forget(started) { dao.forgetFreeSlot(studentId, op.slot) }
        }
        return typed
    }

    override suspend fun clearUserData(ownerId: String?) = writeLock.withLock {
        generation.incrementAndGet()
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }
}

/** Un pedido que salió antes de cerrar sesión: lo que trae ya no se guarda. */
private class StaleWriteException : Exception()
