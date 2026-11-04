package com.fittrainer.data.challenges.trainer

import com.fittrainer.data.api.challenges.AssignChallengeRequest
import com.fittrainer.data.api.challenges.BatchAssignRequest
import com.fittrainer.data.api.challenges.TrainerChallengesApi
import com.fittrainer.data.api.errorEnvelope
import com.fittrainer.data.db.challenges.trainer.TrainerChallengesDao
import com.fittrainer.data.db.challenges.trainer.TrainerChallengesSyncEntity
import com.fittrainer.data.db.challenges.trainer.TrainerStudentChallengesSyncEntity
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
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import retrofit2.HttpException

private const val ALREADY_ACTIVE = "CHALLENGE_ALREADY_ACTIVE"
private const val NOT_FOUND = "CHALLENGE_NOT_FOUND"
private const val REASON_ALREADY_ACTIVE = "already_active"

/**
 * Desafíos del entrenador (E14), offline-first: la lista y el avance de cada alumno salen de Room. Asignar
 * es solo online y guarda en Room lo que devuelve el servidor, así la ficha lo muestra enseguida.
 */
@Singleton
class TrainerChallengesRepository @Inject constructor(
    private val api: TrainerChallengesApi,
    private val dao: TrainerChallengesDao,
    private val clock: Clock,
) : UserDataCleaner {

    /** null = la lista nunca se bajó. */
    fun observeCatalog(trainerId: String): Flow<ChallengesCache?> =
        combine(dao.observeCatalog(trainerId), dao.observeCatalogSync(trainerId)) { rows, sync ->
            sync?.let { ChallengesCache(rows.map { it.toDomain() }, Instant.ofEpochMilli(it.fetchedAt)) }
        }.distinctUntilChanged()

    /**
     * null = no hay nada guardado. Sin la lista completa (fetchedAt null) igual se ven las asignaciones que el
     * servidor confirmó al asignar desde este celular: una asignación hecha no desaparece por falta de red.
     */
    fun observeStudent(trainerId: String, studentId: String): Flow<StudentChallengesCache?> =
        combine(dao.observeStudent(trainerId, studentId), dao.observeStudentSync(trainerId, studentId)) { rows, sync ->
            if (sync == null && rows.isEmpty()) null
            else StudentChallengesCache(rows.map { it.toDomain() }, sync?.let { Instant.ofEpochMilli(it.fetchedAt) })
        }.distinctUntilChanged()

    suspend fun refreshCatalog(trainerId: String): Result<Unit> = call(trainerId, null) {
        val rows = api.list().data.mapIndexed { i, dto -> dto.toEntity(trainerId, i) }
        dao.replaceCatalog(TrainerChallengesSyncEntity(trainerId, clock.millis()), rows)
    }

    suspend fun refreshStudent(trainerId: String, studentId: String): Result<Unit> = call(trainerId, null) {
        val rows = api.forStudent(studentId).data.map { it.toEntity(trainerId, studentId) }
        dao.replaceStudent(TrainerStudentChallengesSyncEntity(trainerId, studentId, clock.millis()), rows)
    }

    /** 409 → ChallengeAlreadyActiveException con el mensaje del backend. */
    suspend fun assignToStudent(trainerId: String, studentId: String, challengeId: String): Result<Unit> =
        call(trainerId, challengeId) {
            val created = api.assignToStudent(studentId, AssignChallengeRequest(challengeId)).data
            dao.upsertAssignments(listOf(created.toEntity(trainerId, studentId)))
        }

    /**
     * Asigna a varios en un solo POST. El backend no devuelve el alumno de cada asignación creada: van en
     * el orden de [studentIds], sin los salteados.
     */
    suspend fun assignMany(trainerId: String, challengeId: String, studentIds: List<String>): Result<BatchAssignResult> =
        call(trainerId, challengeId) {
            val result = api.assignMany(challengeId, BatchAssignRequest(studentIds)).data
            val skipped = result.skipped.map { it.studentId }.toSet()
            val createdIds = studentIds.filter { it !in skipped }.take(result.created.size)
            dao.upsertAssignments(createdIds.zip(result.created) { id, dto -> dto.toEntity(trainerId, id) })
            val (already, notYours) = result.skipped.partition { it.reason == REASON_ALREADY_ACTIVE }
            BatchAssignResult(createdIds, already.map { it.studentId }, notYours.map { it.studentId })
        }

    // Un Mutex por entrenador, que abarca la red y Room: un GET que salió antes de una asignación no la borra
    // al guardar su foto vieja (lo que Codex encontró en los ejercicios de E10).
    private val locks = ConcurrentHashMap<String, Mutex>()

    /** 404 CHALLENGE_NOT_FOUND → sale del caché y ChallengeGoneException. 403/404 del alumno → NotFound. */
    private suspend fun <T> call(trainerId: String, challengeId: String?, block: suspend () -> T): Result<T> = try {
        Result.success(locks.getOrPut(trainerId) { Mutex() }.withLock { block() })
    } catch (e: CancellationException) {
        throw e
    } catch (e: HttpException) {
        val env = e.errorEnvelope()
        Result.failure(
            when {
                e.code() == 409 && env?.code == ALREADY_ACTIVE ->
                    ChallengeAlreadyActiveException(env.message ?: "Ya tiene este desafío activo")
                e.code() == 404 && env?.code == NOT_FOUND -> {
                    challengeId?.let { dao.forgetChallenge(trainerId, it) }
                    ChallengeGoneException()
                }
                e.code() == 403 || e.code() == 404 -> DataException(DataError.NotFound, e)
                else -> DataException(e.toDataError(), e)
            },
        )
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }
}
