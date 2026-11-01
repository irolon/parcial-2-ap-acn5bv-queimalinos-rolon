package com.fittrainer.data.progress

import com.fittrainer.data.api.errorCode
import com.fittrainer.data.api.progress.ProgressApi
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.db.progress.ProgressDao
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.session.UserDataCleaner
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import retrofit2.HttpException
import java.time.Clock
import java.time.ZoneId
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException

/** Código del backend para un ejercicio borrado (spec §3.4). */
private const val EXERCISE_NOT_FOUND = "EXERCISE_NOT_FOUND"

/** El backend valida las fechas del overview en hora de Argentina. */
private val ARGENTINA: ZoneId = ZoneId.of("America/Argentina/Buenos_Aires")

/** Lo guardado se considera fresco este tiempo; antes de eso solo "Reintentar" (force) vuelve a bajar. */
const val PROGRESS_FRESH_MS = 5 * 60_000L

/**
 * Gráficos de progreso (tarjeta 13). Baja la lista de ejercicios entrenados (overview), el historial completo de un
 * ejercicio o el de las medidas, reemplaza el caché de Room y expone Flows de Room: el ViewModel nunca ve Retrofit.
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

    fun observeTrainedExercises(ownerId: String): Flow<TrainedExercises> =
        combine(dao.observeTrainedExercises(ownerId), dao.observeExercisesMeta(ownerId)) { list, meta ->
            TrainedExercises(list, meta?.fetchedAt)
        }

    fun observeExercise(ownerId: String, exerciseId: String): Flow<ExerciseChart> =
        combine(dao.observePoints(ownerId, exerciseId), dao.observeMeta(ownerId, exerciseId)) { points, meta ->
            ExerciseChart(exerciseId, points, meta)
        }

    fun observeBody(ownerId: String): Flow<BodyChart> =
        combine(dao.observeBody(ownerId), dao.observeBodyMeta(ownerId)) { points, meta -> BodyChart(points, meta?.fetchedAt) }

    /**
     * La lista del desplegable, de `GET /progress/overview`: todos los ejercicios entrenados, sin filtrar por rango (el
     * historial guardado solo tiene las últimas 20 sesiones). `from` = hoy para que el volumen semanal, que no se usa,
     * venga corto. Mismos 5 minutos que el resto; un error deja Room como estaba.
     */
    suspend fun refreshExercises(ownerId: String, force: Boolean = false): Result<Unit> = guard {
        val gen = clearGeneration
        if (!force && isFresh(dao.exercisesMeta(ownerId)?.fetchedAt)) return@guard
        val from = clock.instant().atZone(ARGENTINA).toLocalDate().toString()
        val rows = api.overview(from).data.exercises.map { it.toEntity(ownerId) }
        dao.inTransaction {
            checkOwner(ownerId, gen)
            dao.replaceExercises(ownerId, rows, clock.millis())
        }
    }

    /**
     * Un 404 borra el caché del ejercicio y lo saca de la lista (éxito). Cualquier otro error deja Room como estaba.
     * Fresco = menos de 5 min y el mismo marcador de la lista: si lo entrenó otro día desde el pedido, se vuelve a pedir.
     */
    suspend fun refreshExercise(ownerId: String, exerciseId: String, force: Boolean = false): Result<Unit> = guard {
        val gen = clearGeneration
        val marker = dao.trainedExercise(ownerId, exerciseId)?.marker()
        val cached = dao.meta(ownerId, exerciseId)
        if (!force && isFresh(cached?.fetchedAt) && cached?.trainedMarker == marker) return@guard
        val dto = try {
            api.exercise(exerciseId).data
        } catch (e: HttpException) {
            if (e.code() != 404 || e.errorCode() != EXERCISE_NOT_FOUND) throw e
            // Sale de la lista en Room (no en memoria): matar la app no lo vuelve a mostrar.
            dao.inTransaction {
                checkOwner(ownerId, gen)
                dao.deleteExercise(ownerId, exerciseId)
            }
            return@guard
        }
        val (meta, points) = dto.toEntities(ownerId, clock.millis())
        // Chequeo y escritura en la misma transacción: clearUserData no puede colarse entre los dos.
        dao.inTransaction {
            checkOwner(ownerId, gen)
            dao.replaceExercise(meta.copy(trainedMarker = marker), points)
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
