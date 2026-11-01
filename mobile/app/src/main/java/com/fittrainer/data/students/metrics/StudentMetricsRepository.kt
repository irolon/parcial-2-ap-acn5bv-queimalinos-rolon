package com.fittrainer.data.students.metrics

import com.fittrainer.data.api.students.CreateMetricRequest
import com.fittrainer.data.api.students.MetricDto
import com.fittrainer.data.api.students.StudentsApi
import com.fittrainer.data.db.students.metrics.TrainerStudentMetricEntity
import com.fittrainer.data.db.students.metrics.TrainerStudentMetricsDao
import com.fittrainer.data.db.students.metrics.TrainerStudentMetricsSyncEntity
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.Instant
import java.time.OffsetDateTime
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import retrofit2.HttpException

/** Una medida. recordedBy: "trainer" o "student". */
data class StudentMetric(
    val id: String,
    val recordedAt: Instant,
    val weightKg: Double?,
    val heightCm: Double?,
    val bodyFatPct: Double?,
    val waistCm: Double?,
    val hipCm: Double?,
    val chestCm: Double?,
    val bmi: Double?,
    val recordedBy: String?,
)

/** Historial cacheado (de la más nueva a la más vieja). fetchedAt == null: nunca se bajó. */
data class MetricsCache(val metrics: List<StudentMetric>, val fetchedAt: Instant?)

/**
 * Medidas de un alumno vistas por su entrenador. El historial se cachea en Room; cargar y borrar
 * son online. Todo lo de un mismo (entrenador, alumno) va de a uno (Mutex): un GET que salió antes de
 * un alta o una baja termina antes de que empiece, y no la pisa. Después de cargar o borrar se vuelve a
 * bajar el historial, porque el IMC de las otras medidas depende de la última altura y puede cambiar.
 */
@Singleton
class StudentMetricsRepository @Inject constructor(
    private val api: StudentsApi,
    private val dao: TrainerStudentMetricsDao,
    private val clock: Clock,
) : UserDataCleaner {

    fun observe(trainerId: String, studentId: String): Flow<MetricsCache> =
        combine(dao.observe(trainerId, studentId), dao.observeSync(trainerId, studentId)) { rows, sync ->
            MetricsCache(rows.map { it.toDomain() }, sync?.fetchedAt?.let(Instant::ofEpochMilli))
        }.distinctUntilChanged()

    suspend fun refresh(trainerId: String, studentId: String): Result<Unit> = guard(trainerId, studentId) {
        reload(trainerId, studentId)
    }

    /** Guarda la medida que devolvió el servidor (201, o 200 si era un reintento con el mismo id) y rebaja el historial. */
    suspend fun add(trainerId: String, studentId: String, request: CreateMetricRequest): Result<Unit> = guard(trainerId, studentId) {
        dao.upsert(listOf(api.addMetric(studentId, request).data.toEntity(trainerId, studentId)))
        reloadQuietly(trainerId, studentId)
    }

    /** 204 o 404 (ya no existía): sale del caché y se rebaja el historial. Cualquier otro resultado no toca nada. */
    suspend fun delete(trainerId: String, studentId: String, metricId: String): Result<Unit> = guard(trainerId, studentId) {
        val response = api.deleteMetric(studentId, metricId)
        if (!response.isSuccessful && response.code() != 404) throw HttpException(response)
        dao.delete(trainerId, metricId)
        reloadQuietly(trainerId, studentId)
    }

    private suspend fun reload(trainerId: String, studentId: String) {
        val rows = api.metrics(studentId).data.map { it.toEntity(trainerId, studentId) }
        dao.replaceStudent(TrainerStudentMetricsSyncEntity(trainerId, studentId, clock.millis()), rows)
    }

    /** La escritura ya salió bien: si falla rebajar el historial, queda lo que hay (se corrige en el próximo refresh). */
    private suspend fun reloadQuietly(trainerId: String, studentId: String) {
        try {
            reload(trainerId, studentId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Unit
        }
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }

    private val locks = ConcurrentHashMap<Pair<String, String>, Mutex>()

    private suspend fun guard(trainerId: String, studentId: String, block: suspend () -> Unit): Result<Unit> = try {
        locks.getOrPut(trainerId to studentId) { Mutex() }.withLock { block() }
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
    } catch (e: HttpException) {
        Result.failure(DataException(if (e.code() == 403) DataError.NotFound else e.toDataError(), e))
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    private fun MetricDto.toEntity(trainerId: String, studentId: String) = TrainerStudentMetricEntity(
        trainerId, id, studentId, OffsetDateTime.parse(recordedAt).toInstant().toEpochMilli(),
        weightKg, heightCm, bodyFatPct, waistCm, hipCm, chestCm, bmi, recordedBy,
    )

    private fun TrainerStudentMetricEntity.toDomain() = StudentMetric(
        id, Instant.ofEpochMilli(recordedAt), weightKg, heightCm, bodyFatPct, waistCm, hipCm, chestCm, bmi, recordedBy,
    )
}
