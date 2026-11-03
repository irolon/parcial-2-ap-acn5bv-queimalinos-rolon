package com.fittrainer.ui.students

import com.fittrainer.data.students.StudentFilter
import com.fittrainer.data.students.StudentStatus
import com.fittrainer.data.students.StudentsCache
import com.fittrainer.data.students.TrainerStudent
import com.fittrainer.data.students.matches
import com.fittrainer.data.students.matchesQuery
import com.fittrainer.data.students.status
import java.time.Instant
import java.time.LocalDate

/** Una fila ya armada para la pantalla. adherencePct == null: sin plan (o el backend no la mandó). */
data class StudentRowUi(
    val id: String,
    val name: String,
    val initials: String,
    val subtitle: String,
    val status: StudentStatus,
    val statusLabel: String,
    val lastTraining: String,
    val adherencePct: Int?,
)

data class Counts(val active: Int = 0, val atRisk: Int = 0)

/**
 * loaded == false: todavía no se leyó Room. everSynced == false: nunca se bajó la lista para este entrenador.
 * error: el último refresh falló (con lista guardada se muestra como aviso; sin lista, como pantalla de error).
 */
data class StudentsUiState(
    val loaded: Boolean = false,
    val everSynced: Boolean = false,
    val hasStudents: Boolean = false,
    val students: List<StudentRowUi> = emptyList(),
    val filter: StudentFilter = StudentFilter.ALL,
    val query: String = "",
    val counts: Counts = Counts(),
    val syncedLabel: String? = null,
    val refreshing: Boolean = false,
    val error: String? = null,
    val offline: Boolean = false,
) {
    val showErrorScreen: Boolean get() = loaded && !everSynced && error != null && !refreshing
}

/** Orden: en riesgo primero, después el último entreno más reciente (nunca entrenó al final), después nombre. */
private fun sortKey(today: LocalDate) = compareBy<TrainerStudent> { it.status(today) != StudentStatus.INACTIVE }
    .thenByDescending { it.lastSessionAt ?: Instant.MIN }
    .thenBy { it.name.lowercase() }

fun TrainerStudent.toRow(today: LocalDate): StudentRowUi {
    val status = status(today)
    return StudentRowUi(
        id = id,
        name = name,
        initials = initials(name),
        subtitle = studentSubtitle(goal, daysPerWeek),
        status = status,
        statusLabel = statusLabel(status),
        lastTraining = lastTrainingLabel(lastSessionAt, today),
        adherencePct = adherence?.pct,
    )
}

/** cache == null: Room todavía no respondió. */
@Suppress("LongParameterList")
fun studentsUiState(
    cache: StudentsCache?,
    filter: StudentFilter,
    query: String,
    today: LocalDate,
    now: Instant,
    online: Boolean,
    refreshing: Boolean,
    error: String?,
): StudentsUiState {
    if (cache == null) {
        return StudentsUiState(filter = filter, query = query, refreshing = refreshing, error = error, offline = !online)
    }
    val all = cache.students
    val visible = all.filter { it.matches(filter, today) && it.matchesQuery(query) }.sortedWith(sortKey(today))
    return StudentsUiState(
        loaded = true,
        everSynced = cache.lastSyncedAt != null,
        hasStudents = all.isNotEmpty(),
        students = visible.map { it.toRow(today) },
        filter = filter,
        query = query,
        counts = Counts(
            active = all.count { it.active },
            atRisk = all.count { it.status(today) == StudentStatus.INACTIVE },
        ),
        syncedLabel = cache.lastSyncedAt?.let { syncedAgo(it, now) },
        refreshing = refreshing,
        error = error,
        offline = !online,
    )
}
