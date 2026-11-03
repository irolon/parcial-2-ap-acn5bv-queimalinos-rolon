package com.fittrainer.data.routines.trainer

import com.fittrainer.data.api.orThrow
import com.fittrainer.data.api.routines.AddExercisesRequest
import com.fittrainer.data.api.routines.CreateRoutineRequest
import com.fittrainer.data.api.routines.ReorderRequest
import com.fittrainer.data.api.routines.TrainerRoutineDetailDto
import com.fittrainer.data.api.routines.TrainerRoutinesApi
import com.fittrainer.data.db.routines.trainer.TrainerRoutinesDao
import com.fittrainer.data.db.routines.trainer.TrainerRoutinesSyncEntity
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.JsonObject

/**
 * Rutinas de los alumnos del entrenador (E8), offline-first: la UI observa Room y las escrituras
 * (solo online) guardan lo que devuelve el servidor. Un Mutex por entrenador serializa todas las
 * escrituras: un GET que salió antes de un PATCH nunca pisa el valor nuevo. Si la escritura salió bien
 * y lo que falla es el GET de después, el resultado es éxito (el cambio ya está en el servidor).
 */
@Singleton
class TrainerRoutinesRepository @Inject constructor(
    private val api: TrainerRoutinesApi,
    private val dao: TrainerRoutinesDao,
    private val clock: Clock,
) : UserDataCleaner {

    private val locks = ConcurrentHashMap<String, Mutex>()
    private val reorders = ReorderTracker()
    // Ordena las escrituras del orden en Room: arrancar un reorder (aplicar el orden local) y guardar un
    // detalle del servidor nunca se intercalan, así lo que se guarda no pisa un ↑ que llegó en el medio.
    // Nunca se toma con la red en curso, y adentro no se pide el Mutex de [write].
    private val orderLock = Mutex()

    /** null = la lista de ese alumno nunca se bajó. */
    fun observeStudentRoutines(trainerId: String, studentId: String): Flow<StudentRoutinesCache?> =
        combine(dao.observeForStudent(trainerId, studentId), dao.observeSync(trainerId, studentId)) { rows, sync ->
            sync?.let { StudentRoutinesCache(rows.map { it.toDomain() }.sortedForSection(), Instant.ofEpochMilli(it.fetchedAt)) }
        }.distinctUntilChanged()

    /** null = la rutina no está en el caché o su detalle nunca se bajó (no tiene ejercicios). */
    fun observeRoutine(trainerId: String, id: String): Flow<TrainerRoutineDetail?> =
        combine(dao.observeRoutine(trainerId, id), dao.observeExercises(trainerId, id)) { row, exercises ->
            if (row == null || exercises.isEmpty()) null else TrainerRoutineDetail(row.toDomain(), exercises.map { it.toDomain() })
        }.distinctUntilChanged()

    suspend fun refreshList(trainerId: String, studentId: String): Result<Unit> = write(trainerId, null) {
        val rows = api.list(studentId).data.filter { it.studentId == studentId }.map { it.toEntity(trainerId) }
        dao.replaceForStudent(TrainerRoutinesSyncEntity(trainerId, studentId, clock.millis()), rows)
    }

    suspend fun refreshRoutine(trainerId: String, id: String): Result<Unit> = write(trainerId, id) { fetchDetail(trainerId, id) }

    /** POST → id de la rutina nueva. */
    suspend fun create(trainerId: String, request: CreateRoutineRequest): Result<String> = write(trainerId, null) {
        val id = api.create(request).data.id
        bestEffort { fetchDetail(trainerId, id) }
        id
    }

    /** Nombre, objetivo, días o active (RoutinePatch). El PATCH devuelve la fila: se guarda sin otro GET. */
    suspend fun update(trainerId: String, id: String, patch: JsonObject): Result<Unit> = write(trainerId, id) {
        dao.upsertRoutines(listOf(api.update(id, patch).data.toEntity(trainerId)))
    }

    suspend fun updateExercise(trainerId: String, id: String, reId: String, patch: JsonObject): Result<Unit> = write(trainerId, id) {
        save(trainerId, api.updateExercise(id, reId, patch).data)
    }

    suspend fun addExercises(trainerId: String, id: String, items: List<NewRoutineExercise>): Result<Unit> = write(trainerId, id) {
        api.addExercises(id, AddExercisesRequest(items.toRequestItems())).orThrow()
        bestEffort { fetchDetail(trainerId, id) }
    }

    /** 409 si es el último ejercicio: DataError.Http(409) y el ejercicio sigue en Room. */
    suspend fun removeExercise(trainerId: String, id: String, reId: String): Result<Unit> = write(trainerId, id) {
        api.removeExercise(id, reId).orThrow()
        dao.deleteExercise(trainerId, reId)
    }

    /**
     * El orden nuevo se ve al instante (Room) y el PUT viaja con el orden completo. Solo la respuesta del
     * último reorder de la rutina se guarda (así un ↑↑↑ rápido no "salta" para atrás). Si el último falla,
     * Room vuelve a lo que diga el servidor (o, sin red, al último orden que confirmó). El ticket se cierra
     * siempre, también si se cancela (salir de la pantalla): así el tracker nunca queda con un estado viejo,
     * y al volver a entrar el editor refresca la rutina desde el servidor. Un GET que estaba en vuelo cuando
     * se tocó ↑/↓ no pisa el orden local (ver [save]).
     */
    suspend fun reorder(trainerId: String, id: String, ids: List<String>): Result<Unit> {
        // started: el ticket se abrió. Todo va dentro del try, así una cancelación durante applyOrder también
        // lo cierra (si no, el orden pendiente se impondría a cada GET aunque el PUT nunca haya salido).
        var started = false
        var ticket = 0
        try {
            orderLock.withLock {
                ticket = reorders.start(id, dao.exercises(trainerId, id).map { it.id }, ids)
                started = true
                dao.applyOrder(trainerId, ids)
            }
            val latest = { reorders.isLatest(id, ticket) }
            val result = write(trainerId, id) {
                val detail = api.reorder(id, ReorderRequest(ids)).data
                reorders.confirm(id, detail.exercises.sortedBy { it.orderIndex }.map { it.id })
                save(trainerId, detail, onlyIf = latest)
            }
            if (result.isFailure && latest()) {
                val confirmed = reorders.confirmed(id)
                // Reconciliar: acá sí va el orden del servidor, no el que se pidió y falló.
                val refreshed = write(trainerId, id) { save(trainerId, api.get(id).data, keepPendingOrder = false, onlyIf = latest) }
                if (refreshed.isFailure) orderLock.withLock { if (latest()) confirmed?.let { dao.applyOrder(trainerId, it) } }
            }
            return result
        } finally {
            if (started) reorders.finish(id)
        }
    }

    /** Guarda una rutina creada por otro camino (instanciar una plantilla, E9), así el editor la abre sin esperar. */
    suspend fun store(trainerId: String, detail: TrainerRoutineDetailDto): Result<Unit> = write(trainerId, null) { save(trainerId, detail) }

    private suspend fun fetchDetail(trainerId: String, id: String) = save(trainerId, api.get(id).data)

    /**
     * Con un reorder en vuelo, lo que viene del servidor (un GET, un PATCH) trae el orden de antes del PUT,
     * que espera el Mutex: se guarda ya con el orden pedido, en la misma transacción. Así Room nunca muestra
     * el viejo y el próximo ↑ sale del bueno. [onlyIf] se evalúa con el lock tomado.
     */
    private suspend fun save(
        trainerId: String,
        detail: TrainerRoutineDetailDto,
        keepPendingOrder: Boolean = true,
        onlyIf: () -> Boolean = { true },
    ) = orderLock.withLock {
        if (!onlyIf()) return@withLock
        val pending = if (keepPendingOrder) reorders.requested(detail.id) else null
        val exercises = detail.toExerciseEntities(trainerId).let { if (pending == null) it else it.withOrder(pending) }
        dao.replaceRoutine(detail.toEntity(trainerId), exercises)
    }

    private suspend fun bestEffort(block: suspend () -> Unit) {
        try {
            block()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // El cambio ya se guardó en el servidor; el próximo refresh trae el detalle.
        }
    }

    private suspend fun <T> write(trainerId: String, routineId: String?, block: suspend () -> T): Result<T> = try {
        Result.success(locks.getOrPut(trainerId) { Mutex() }.withLock { block() })
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(e.toRoutineFailure { routineId?.let { dao.forgetRoutine(trainerId, it) } })
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }
}
