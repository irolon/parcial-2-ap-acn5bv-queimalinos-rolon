package com.fittrainer.testing.fakes.students

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryExerciseDto
import com.fittrainer.data.api.history.HistoryMetaDto
import com.fittrainer.data.api.history.HistoryPageDto
import com.fittrainer.data.api.history.HistorySetDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.api.history.NamedRefDto
import com.fittrainer.data.api.history.PlannedDto
import com.fittrainer.data.db.students.sessions.TrainerSessionEntity
import com.fittrainer.data.db.students.sessions.TrainerSessionsDao
import com.fittrainer.data.db.students.sessions.TrainerSessionsSyncEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map

fun sessionSummary(id: String, comment: String? = null, sets: Int = 2, at: String = "2026-11-01T15:00:00Z") =
    HistorySummaryDto(id, at, "2026-11-01T16:00:00Z", 60, NamedRefDto("r1", "Push"), 8, null, comment, true, sets, 800.0, false)

/** Página con sesiones en días decrecientes según el número del id ("a1" el 30/10, "a2" el 29/10…). */
fun sessionPage(vararg ids: String, totalPages: Int = 1, page: Int = 1) =
    HistoryPageDto(ids.map { sessionSummary(it, at = dayOf(it)) }, HistoryMetaDto(ids.size, page, 20, totalPages))

private fun dayOf(id: String) = "2026-10-%02dT15:00:00Z".format(31 - (id.filter(Char::isDigit).toIntOrNull() ?: 0))

/** Detalle con una sustitución (Press inclinado en lugar de Press banca) y descanso real vs plan. */
fun sessionDetail(id: String, comment: String? = null) = HistoryDetailDto(
    id, "2026-11-01T15:00:00Z", "2026-11-01T16:00:00Z", 60, NamedRefDto("r1", "Push"), 8, "Bien", comment, true, 2, 800.0, false,
    exercises = listOf(
        HistoryExerciseDto(
            exercise = NamedRefDto("e2", "Press inclinado"),
            originalExercise = NamedRefDto("e1", "Press banca"),
            planned = PlannedDto(sets = 2, reps = 10, suggestedKg = 40.0, restSeconds = 30),
            sets = listOf(
                HistorySetDto("x2", 2, 10, 40.0, "2026-11-01T15:10:00Z", null),
                HistorySetDto("x1", 1, 10, 40.0, "2026-11-01T15:05:00Z", 19),
            ),
        ),
    ),
)

/** DAO falso en memoria. replaceLatest, appendPage, clearOwner y clear son los del DAO real. */
class FakeTrainerSessionsDao : TrainerSessionsDao() {
    val rows = MutableStateFlow<Map<Pair<String, String>, TrainerSessionEntity>>(emptyMap())
    val syncs = MutableStateFlow<Map<Pair<String, String>, TrainerSessionsSyncEntity>>(emptyMap())
    /** Orden en que se escribieron las filas (id, comentario), para ver quién gana. */
    val writes = mutableListOf<Pair<String, String?>>()

    override fun observeListed(trainerId: String, studentId: String): Flow<List<TrainerSessionEntity>> = rows.map { m ->
        m.values.filter { it.trainerId == trainerId && it.studentId == studentId && it.listed }
            .sortedWith(compareByDescending<TrainerSessionEntity> { it.startedAt }.thenByDescending { it.id })
    }
    override fun observeSync(trainerId: String, studentId: String) = syncs.map { it[trainerId to studentId] }
    override suspend fun getSync(trainerId: String, studentId: String) = syncs.value[trainerId to studentId]
    override fun observeSession(trainerId: String, id: String) = rows.map { it[trainerId to id] }
    override suspend fun getSession(trainerId: String, id: String) = rows.value[trainerId to id]
    override suspend fun getStudentSessions(trainerId: String, studentId: String) =
        rows.value.values.filter { it.trainerId == trainerId && it.studentId == studentId }
    override suspend fun upsertSessions(sessions: List<TrainerSessionEntity>) {
        sessions.forEach { writes += it.id to it.trainerComment }
        rows.value = rows.value + sessions.associateBy { it.trainerId to it.id }
    }
    override suspend fun upsertSync(sync: TrainerSessionsSyncEntity) {
        syncs.value = syncs.value + ((sync.trainerId to sync.studentId) to sync)
    }
    override suspend fun deleteStale(trainerId: String, studentId: String) {
        rows.value = rows.value.filterValues { !(it.trainerId == trainerId && it.studentId == studentId && !it.listed && it.exercisesJson == null) }
    }
    override suspend fun unlist(trainerId: String, studentId: String) {
        rows.value = rows.value.mapValues { (_, r) -> if (r.trainerId == trainerId && r.studentId == studentId) r.copy(listed = false) else r }
    }
    override suspend fun deleteSession(trainerId: String, id: String) {
        rows.value = rows.value - (trainerId to id)
    }
    override suspend fun clearOwnerSessions(trainerId: String) {
        rows.value = rows.value.filterValues { it.trainerId != trainerId }
    }
    override suspend fun clearOwnerSync(trainerId: String) {
        syncs.value = syncs.value.filterKeys { it.first != trainerId }
    }
    override suspend fun clearSessions() {
        rows.value = emptyMap()
    }
    override suspend fun clearSync() {
        syncs.value = emptyMap()
    }
}
