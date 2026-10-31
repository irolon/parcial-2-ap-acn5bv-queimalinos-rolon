package com.fittrainer.data.sync

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.api.SessionSetDto
import com.fittrainer.data.api.SessionSetsRequest
import com.fittrainer.data.api.SessionSetsResult
import com.fittrainer.data.api.UpdateSessionRequest
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.auth.RequiredUser
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

    /** Entró otra cuenta: la request no salió (AuthInterceptor). Lo pendiente espera a su dueño. */
    ACCOUNT_CHANGED,
}

/** Series que el servidor ya resolvió, con los ids locales: subidas y fallidas (id → code). */
data class SetResults(val synced: List<String> = emptyList(), val failed: Map<String, String> = emptyMap()) {
    operator fun plus(other: SetResults) = SetResults(synced + other.synced, failed + other.failed)
}

/**
 * stop == null: la sesión y todas las series que se mandaron tuvieron respuesta.
 * created: el servidor tiene la sesión (POST /sessions respondió bien).
 */
data class UploadResult(val sets: SetResults, val stop: StopReason? = null, val created: Boolean = true)

/** Respuesta de un request: el valor, o por qué se corta la subida. */
private sealed interface Outcome<out T> {
    data class Ok<T>(val value: T) : Outcome<T>
    data class Stop(val reason: StopReason) : Outcome<Nothing>
}

/** Qué pasó con el PATCH del feedback (spec §5 de la tarjeta 12). */
enum class FeedbackOutcome { SENT, REJECTED, RETRY, UNAUTHORIZED, KEEP }

/** Sube UNA sesión terminada y sus series, en lotes. No toca Room: devuelve qué pasó con cada serie. */
class SessionUploader @Inject constructor(private val api: SessionApi) {

    /** [owner]: dueño de la sesión. Cada request sale solo si sigue siendo la cuenta logueada. */
    suspend fun upload(owner: String, session: WorkoutSessionEntity, sets: List<WorkoutSetEntity>): UploadResult {
        val tag = RequiredUser(owner)
        val create = attempt { api.create(tag, session.toRequest()) }
        if (create is Outcome.Stop) return UploadResult(SetResults(), create.reason, created = false)
        var results = SetResults()
        for (batch in sets.chunked(SETS_PER_BATCH)) {
            when (val sent = attempt { api.addSets(tag, session.id, SessionSetsRequest(batch.map { it.toDto() })).data }) {
                is Outcome.Stop -> return UploadResult(results, sent.reason)
                is Outcome.Ok -> results += sent.value.resolve(batch)
            }
        }
        return UploadResult(results)
    }

    /** PATCH /sessions/:id con el RPE y la nota de una sesión que ya subió. */
    suspend fun sendFeedback(owner: String, session: WorkoutSessionEntity): FeedbackOutcome = try {
        api.update(RequiredUser(owner), session.id, UpdateSessionRequest(session.rpe, session.notes))
        FeedbackOutcome.SENT
    } catch (e: AccountChangedException) {
        FeedbackOutcome.KEEP
    } catch (e: HttpException) {
        when (e.code()) {
            400, 404 -> FeedbackOutcome.REJECTED
            401 -> FeedbackOutcome.UNAUTHORIZED
            403 -> FeedbackOutcome.KEEP
            else -> FeedbackOutcome.RETRY
        }
    } catch (e: IOException) {
        FeedbackOutcome.RETRY
    } catch (e: SerializationException) {
        FeedbackOutcome.RETRY
    }

    private suspend fun <T> attempt(block: suspend () -> T): Outcome<T> = try {
        Outcome.Ok(block())
    } catch (e: AccountChangedException) {
        Outcome.Stop(StopReason.ACCOUNT_CHANGED)
    } catch (e: HttpException) {
        Outcome.Stop(stopFor(e.code()))
    } catch (e: IOException) {
        Outcome.Stop(StopReason.RETRY)
    } catch (e: SerializationException) {
        Outcome.Stop(StopReason.RETRY) // respuesta ilegible (portal cautivo, proxy): se reintenta
    }

    private fun stopFor(code: Int): StopReason = when (code) {
        401 -> StopReason.UNAUTHORIZED
        403 -> StopReason.FORBIDDEN
        400, 409 -> StopReason.SESSION_REJECTED
        else -> StopReason.RETRY
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
    CreateSessionRequest(id, routineId, iso(startedAt), finishedAt?.let { iso(maxOf(it, startedAt)) }, rpe, notes)

private fun WorkoutSetEntity.toDto() = SessionSetDto(
    id, exerciseId, originalExerciseId, routineExerciseId, setNumber, actualReps, actualKg, iso(executedAt),
)

private fun iso(millis: Long): String = Instant.ofEpochMilli(millis).toString()
