package com.fittrainer.data.students.detail

import com.fittrainer.data.api.errorEnvelope
import com.fittrainer.data.api.students.StudentsApi
import com.fittrainer.data.db.students.TrainerStudentDetailDao
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.JsonObject
import retrofit2.HttpException

/** El backend rechazó campos del PATCH (400): mensaje por campo. */
class StudentRejectedException(val fields: Map<EditField, String>, val messageText: String?) : Exception(messageText)

/**
 * Ficha del alumno, offline-first: la UI observa Room y refresh() la reemplaza. Las escrituras
 * (PATCH) son solo online y guardan la ficha que devuelve el servidor. Un 403/404 significa que el
 * alumno ya no es del entrenador (o no existe): se borra de la ficha y de la lista.
 */
@Singleton
class TrainerStudentDetailRepository @Inject constructor(
    private val api: StudentsApi,
    private val dao: TrainerStudentDetailDao,
    private val clock: Clock,
) : UserDataCleaner {

    fun observe(trainerId: String, id: String): Flow<StudentDetailCache?> =
        dao.observe(trainerId, id)
            .map { e -> e?.let { StudentDetailCache(it.toDomain(), Instant.ofEpochMilli(it.fetchedAt)) } }
            .distinctUntilChanged()

    suspend fun refresh(trainerId: String, id: String): Result<Unit> = write(trainerId, id) {
        dao.upsert(api.get(id).data.toEntity(trainerId, clock.millis()))
    }

    /** PATCH con [patch]; si sale bien guarda la ficha devuelta y actualiza la fila de la lista. */
    suspend fun update(trainerId: String, id: String, patch: JsonObject): Result<Unit> = write(trainerId, id) {
        dao.saveAndSyncList(api.update(id, patch).data.toEntity(trainerId, clock.millis()))
    }

    // Un Mutex por (entrenador, alumno): refresh y update no se pisan. Sin esto, un GET que salió antes
    // de un PATCH y llega después vuelve a guardar el estado viejo (por ejemplo, activo después de la baja).
    private val locks = ConcurrentHashMap<Pair<String, String>, Mutex>()

    private suspend fun write(trainerId: String, id: String, block: suspend () -> Unit): Result<Unit> = try {
        locks.getOrPut(trainerId to id) { Mutex() }.withLock { block() }
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
    } catch (e: HttpException) {
        when (e.code()) {
            403, 404 -> {
                dao.forget(trainerId, id)
                Result.failure(DataException(DataError.NotFound, e))
            }
            400 -> Result.failure(rejected(e))
            else -> Result.failure(DataException(e.toDataError(), e))
        }
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    private fun rejected(e: HttpException): Exception {
        val envelope = e.errorEnvelope() ?: return DataException(DataError.Http(400), e)
        val fields = envelope.details.mapNotNull { d -> editFieldOf(d.field)?.let { it to d.message.orEmpty() } }.toMap()
        return StudentRejectedException(fields, envelope.message.takeIf { fields.isEmpty() })
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }
}
