package com.fittrainer.data.sync

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.api.SessionSetDto
import com.fittrainer.data.api.SessionSetsRequest
import com.fittrainer.data.api.SessionSetsResult
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.db.workout.WorkoutSetEntity
import java.io.IOException
import java.time.Instant
import javax.inject.Inject
import kotlinx.serialization.SerializationException
import retrofit2.HttpException

const val SETS_PER_BATCH = 100

/** Por qué se cortó la subida de una sesión (spec §5). */
enum class StopReason {
    RETRY,

    /** 401: el refresh no alcanzó. Puede ser pasajero (refresh por red/5xx) o la sesión cerrada. */
    UNAUTHORIZED,

    /** 403: rol equivocado. Definitivo: reintentar da lo mismo (spec §5). */
    FORBIDDEN,
    SESSION_REJECTED,
}

/** Series que el servidor ya resolvió, con los ids locales: subidas y fallidas (id → code). */
data class SetResults(val synced: List<String> = emptyList(), val failed: Map<String, String> = emptyMap()) {
    operator fun plus(other: SetResults) = SetResults(synced + other.synced, failed + other.failed)
}

/** stop == null: la sesión y todas las series que se mandaron tuvieron respuesta. */
data class UploadResult(val sets: SetResults, val stop: StopReason? = null)

/** Sube UNA sesión terminada y sus series, en lotes. No toca Room: devuelve qué pasó con cada serie. */
class SessionUploader @Inject constructor(private val api: SessionApi) {

    suspend fun upload(session: WorkoutSessionEntity, sets: List<WorkoutSetEntity>): UploadResult {
        stopOf { api.create(session.toRequest()) }?.let { return UploadResult(SetResults(), it) }
        var results = SetResults()
        for (batch in sets.chunked(SETS_PER_BATCH)) {
            var response: SessionSetsResult? = null
            val stop = stopOf { response = api.addSets(session.id, SessionSetsRequest(batch.map { it.toDto() })).data }
            if (stop != null) return UploadResult(results, stop)
            results += response!!.resolve(batch)
        }
        return UploadResult(results)
    }

    /** null si el request anduvo; si no, cómo sigue la pasada. */
    private suspend fun stopOf(block: suspend () -> Unit): StopReason? = try {
        block()
        null
    } catch (e: HttpException) {
        when (e.code()) {
            401 -> StopReason.UNAUTHORIZED
            403 -> StopReason.FORBIDDEN
            400, 409 -> StopReason.SESSION_REJECTED
            else -> StopReason.RETRY
        }
    } catch (e: IOException) {
        StopReason.RETRY
    } catch (e: SerializationException) {
        StopReason.RETRY // respuesta ilegible (portal cautivo, proxy): se reintenta
    }
}

/** Los ids vuelven en minúscula y `index` es la posición en ESTE lote: se traducen a los ids locales. */
private fun SessionSetsResult.resolve(batch: List<WorkoutSetEntity>): SetResults {
    val local = batch.associateBy({ it.id.lowercase() }, { it.id })
    return SetResults(
        synced = saved.mapNotNull { local[it.id.lowercase()] },
        failed = failed.mapNotNull { f -> batch.getOrNull(f.index)?.let { it.id to f.code } }.toMap(),
    )
}

/** Un reloj que vuelve atrás no puede dejar finished_at antes de started_at: el backend rechazaría la sesión. */
private fun WorkoutSessionEntity.toRequest() =
    CreateSessionRequest(id, routineId, iso(startedAt), finishedAt?.let { iso(maxOf(it, startedAt)) })

private fun WorkoutSetEntity.toDto() = SessionSetDto(
    id, exerciseId, originalExerciseId, routineExerciseId, setNumber, actualReps, actualKg, iso(executedAt),
)

private fun iso(millis: Long): String = Instant.ofEpochMilli(millis).toString()
