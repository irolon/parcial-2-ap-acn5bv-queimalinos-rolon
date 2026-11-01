package com.fittrainer.testing.fakes.challenges

import com.fittrainer.data.api.challenges.AssignChallengeRequest
import com.fittrainer.data.api.challenges.AssignmentDto
import com.fittrainer.data.api.challenges.AssignmentListResponse
import com.fittrainer.data.api.challenges.AssignmentResponse
import com.fittrainer.data.api.challenges.BatchAssignDto
import com.fittrainer.data.api.challenges.BatchAssignRequest
import com.fittrainer.data.api.challenges.BatchAssignResponse
import com.fittrainer.data.api.challenges.ChallengeDto
import com.fittrainer.data.api.challenges.ChallengeListResponse
import com.fittrainer.data.api.challenges.SkippedDto
import com.fittrainer.data.api.challenges.TrainerChallengesApi
import com.fittrainer.testing.fakes.auth.apiError
import kotlinx.coroutines.CompletableDeferred

fun challengeDto(id: String, name: String, own: Boolean = false, type: String = "sessions_count", value: Double = 12.0, days: Int? = 30) =
    ChallengeDto(id, if (own) "t1" else null, name, "Desc $name", type, value, days, null)

fun assignmentDto(id: String, challenge: ChallengeDto, status: String = "active", startedAt: String = "2026-11-01T12:00:00Z") =
    AssignmentDto(id, challenge, startedAt, "2026-12-01T12:00:00Z", 0.0, challenge.goalValue, 0.0, status)

/**
 * Backend en memoria. [assignments]: por alumno. Un alumno con una asignación activa del mismo desafío da 409;
 * los que no están en [mine] salen como not_your_student en el lote.
 */
class FakeTrainerChallengesApi : TrainerChallengesApi {
    var challenges = listOf(challengeDto("c1", "12 sesiones"), challengeDto("c2", "Racha", type = "streak", value = 14.0))
    val assignments = mutableMapOf<String, List<AssignmentDto>>()
    var mine = setOf("s1", "s2", "s3")
    var error: Throwable? = null
    var writeError: Throwable? = null
    /** El GET toma la foto del servidor ANTES de esperar: una respuesta que llega tarde. */
    var studentGate: CompletableDeferred<Unit>? = null
    var writeGate: CompletableDeferred<Unit>? = null
    val singleCalls = mutableListOf<Pair<String, String>>()
    val batchCalls = mutableListOf<Pair<String, List<String>>>()
    private var seq = 0

    override suspend fun list(): ChallengeListResponse {
        error?.let { throw it }
        return ChallengeListResponse(challenges)
    }

    override suspend fun forStudent(studentId: String): AssignmentListResponse {
        val snapshot = assignments[studentId].orEmpty()
        studentGate?.await()
        error?.let { throw it }
        return AssignmentListResponse(snapshot)
    }

    private fun create(studentId: String, challengeId: String): AssignmentDto? {
        val challenge = challenges.firstOrNull { it.id == challengeId } ?: throw apiError(404, "CHALLENGE_NOT_FOUND")
        if (assignments[studentId].orEmpty().any { it.challenge.id == challengeId && it.status == "active" }) return null
        val dto = assignmentDto("a${++seq}", challenge.copy(trainerId = null))
        assignments[studentId] = listOf(dto) + assignments[studentId].orEmpty()
        return dto
    }

    override suspend fun assignToStudent(studentId: String, body: AssignChallengeRequest): AssignmentResponse {
        singleCalls += studentId to body.challengeId
        writeGate?.await()
        writeError?.let { throw it }
        val dto = create(studentId, body.challengeId) ?: throw apiError(409, "CHALLENGE_ALREADY_ACTIVE")
        return AssignmentResponse(dto)
    }

    override suspend fun assignMany(challengeId: String, body: BatchAssignRequest): BatchAssignResponse {
        batchCalls += challengeId to body.studentIds
        writeGate?.await()
        writeError?.let { throw it }
        val created = mutableListOf<AssignmentDto>()
        val skipped = mutableListOf<SkippedDto>()
        for (id in body.studentIds) {
            if (id !in mine) {
                skipped += SkippedDto(id, "not_your_student")
                continue
            }
            create(id, challengeId)?.let { created += it } ?: run { skipped += SkippedDto(id, "already_active") }
        }
        return BatchAssignResponse(BatchAssignDto(created, skipped))
    }
}
