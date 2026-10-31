package com.fittrainer.data.progress

import com.fittrainer.data.api.errorCode
import com.fittrainer.data.api.progress.ProgressApi
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.db.progress.ProgressDao
import com.fittrainer.data.db.progress.TrainedExercise
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.session.UserDataCleaner
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import retrofit2.HttpException
import java.time.Clock
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException

/** Código del backend para un ejercicio borrado (spec §3.4). */
private const val EXERCISE_NOT_FOUND = "EXERCISE_NOT_FOUND"

/** Lo guardado se considera fresco este tiempo; antes de eso solo "Reintentar" (force) vuelve a bajar. */
const val PROGRESS_FRESH_MS = 5 * 60_000L

/**
 * Gráficos de progreso (tarjeta 13). Baja el historial completo de un ejercicio o de las medidas, reemplaza el
 * caché de Room y expone Flows de Room: el ViewModel nunca ve Retrofit.
 */
@Singleton
class ProgressRepository @Inject constructor(
    private val api: ProgressApi,
    private val dao: ProgressDao,
    /** Provider: la sesión depende de los UserDataCleaner (este repositorio entre ellos) y Hilt no admite el ciclo. */
    private val sessionProvider: Provider<SessionRepository>,
    private val clock: Clock,
) : UserDataCleaner {

    /** Un pedido que arrancó antes del logout no escribe aunque el token siga (mismo patrón que el historial). */
    @Volatile private var clearGeneration = 0

    /** Por dueño: ejercicios que el servidor dijo que ya no existen (EXERCISE_NOT_FOUND); salen del desplegable hasta el logout. */
    private val notFound = MutableStateFlow<Map<String, Set<String>>>(emptyMap())

    fun observeTrainedExercises(ownerId: String): Flow<List<TrainedExercise>> =
        combine(dao.observeTrainedExercises(ownerId), notFound) { list, gone ->
            list.filterNot { it.exerciseId in gone[ownerId].orEmpty() }
        }

    fun observeExercise(ownerId: String, exerciseId: String): Flow<ExerciseChart> =
        combine(dao.observePoints(ownerId, exerciseId), dao.observeMeta(ownerId, exerciseId)) { points, meta ->
            ExerciseChart(exerciseId, points, meta)
        }

    fun observeBody(ownerId: String): Flow<BodyChart> =
        combine(dao.observeBody(ownerId), dao.observeBodyMeta(ownerId)) { points, meta -> BodyChart(points, meta?.fetchedAt) }

    /**
     * Un 404 borra el caché del ejercicio y lo saca de la lista (éxito). Cualquier otro error deja Room como estaba.
     * Fresco = menos de 5 min y el mismo marcador del historial: si entrenó el ejercicio después del pedido, se vuelve a pedir.
     */
    suspend fun refreshExercise(ownerId: String, exerciseId: String, force: Boolean = false): Result<Unit> = guard {
        val gen = clearGeneration
        val marker = dao.lastTrainedAt(ownerId, exerciseId)
        val cached = dao.meta(ownerId, exerciseId)
        if (!force && isFresh(cached?.fetchedAt) && cached?.historyMarker == marker) return@guard
        val dto = try {
            api.exercise(exerciseId).data
        } catch (e: HttpException) {
            if (e.code() != 404 || e.errorCode() != EXERCISE_NOT_FOUND) throw e
            dao.inTransaction {
                checkOwner(ownerId, gen)
                dao.deleteExercise(ownerId, exerciseId)
                notFound.update { it + (ownerId to it[ownerId].orEmpty() + exerciseId) }
            }
            return@guard
        }
        val (meta, points) = dto.toEntities(ownerId, clock.millis())
        // Chequeo y escritura en la misma transacción: clearUserData no puede colarse entre los dos.
        dao.inTransaction {
            checkOwner(ownerId, gen)
            dao.replaceExercise(meta.copy(historyMarker = marker), points)
            notFound.update { it + (ownerId to it[ownerId].orEmpty() - exerciseId) }
        }
    }

    suspend fun refreshBody(ownerId: String, force: Boolean = false): Result<Unit> = guard {
        val gen = clearGeneration
        if (!force && isFresh(dao.bodyMeta(ownerId)?.fetchedAt)) return@guard
        val dto = api.body(ownerId).data
        val rows = dto.points.map { it.toEntity(ownerId) }
        dao.inTransaction {
            checkOwner(ownerId, gen)
            dao.replaceBody(ownerId, rows, clock.millis())
        }
    }

    private fun isFresh(fetchedAt: Long?) = fetchedAt != null && clock.millis() - fetchedAt < PROGRESS_FRESH_MS

    /** Una respuesta que volaba durante el logout (o un cambio de cuenta) no escribe filas del dueño anterior. */
    private suspend fun checkOwner(ownerId: String, gen: Int) {
        val current = (sessionProvider.get().session.first() as? Session.Student)?.user?.id
        if (current != ownerId || gen != clearGeneration) throw AccountChangedException()
    }

    override suspend fun clearUserData(ownerId: String?) {
        clearGeneration++
        notFound.update { if (ownerId == null) emptyMap() else it - ownerId }
        if (ownerId == null) dao.clearAll() else dao.clear(ownerId)
    }

    private suspend fun <T> guard(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }
}
