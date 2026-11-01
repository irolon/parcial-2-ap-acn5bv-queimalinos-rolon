package com.fittrainer.data.students.overview

import com.fittrainer.data.api.students.FeedbackDto
import com.fittrainer.data.api.students.OverviewDto
import com.fittrainer.data.api.students.OverviewStudentDto
import com.fittrainer.data.api.students.RiskDto
import com.fittrainer.data.api.students.TodayDto
import java.time.Instant
import java.time.OffsetDateTime

/**
 * El Inicio del entrenador, listo para mostrar: KPIs y una lista por filtro (Hoy, Riesgo, Feedback,
 * Activos). adherencePct/adherenceDelta == null: nadie tiene plan.
 */
data class TrainerOverview(
    val activeStudents: Int,
    val adherencePct: Int?,
    val adherenceDelta: Int?,
    val today: List<TodayItem>,
    val atRisk: List<RiskItem>,
    val feedback: List<FeedbackItem>,
    val students: List<StudentItem>,
) {
    /** Los que tienen hoy asignado (el anillo del día es plannedDone de plannedToday). */
    val plannedToday: Int get() = today.count { it.planned }
    val plannedDone: Int get() = today.count { it.planned && it.done }

    /** Los que tienen hoy asignado y todavía no entrenaron, en el orden del backend (por nombre). */
    val missingToday: List<TodayItem> get() = today.filter { it.planned && !it.done }
}

/** done: terminó una sesión hoy (sessionId, finishedAt y rpe son los de la última). planned: hoy le tocaba. */
data class TodayItem(
    val studentId: String,
    val name: String,
    val planned: Boolean,
    val done: Boolean,
    val sessionId: String?,
    val routineName: String?,
    val finishedAt: Instant?,
    val rpe: Int?,
)

data class RiskItem(val studentId: String, val name: String, val days: Int, val neverTrained: Boolean)

data class FeedbackItem(val studentId: String, val name: String, val sessionId: String, val routineName: String?, val finishedAt: Instant, val rpe: Int?)

enum class StudentStatus { ACTIVE, NEW, INACTIVE }

data class StudentItem(val studentId: String, val name: String, val status: StudentStatus, val daysWithoutTraining: Int, val adherencePct: Int?)

data class OverviewCache(val overview: TrainerOverview, val fetchedAt: Instant)

private fun parse(iso: String): Instant = OffsetDateTime.parse(iso).toInstant()

/** Un "done" sin sesión no se puede abrir: se muestra como pendiente en vez de romper la pantalla. */
private fun TodayDto.toDomain(): TodayItem {
    val done = status == "done" && sessionId != null && finishedAt != null
    return TodayItem(
        studentId, name.orEmpty(), planned, done,
        if (done) sessionId else null, routineName, if (done) finishedAt?.let(::parse) else null, rpe,
    )
}

private fun RiskDto.toDomain() = RiskItem(studentId, name.orEmpty(), days, neverTrained)

private fun FeedbackDto.toDomain() = FeedbackItem(studentId, name.orEmpty(), sessionId, routineName, parse(finishedAt), rpe)

private fun OverviewStudentDto.toDomain() = StudentItem(
    studentId,
    name.orEmpty(),
    when (status) {
        "inactive" -> StudentStatus.INACTIVE
        "new" -> StudentStatus.NEW
        else -> StudentStatus.ACTIVE
    },
    daysWithoutTraining,
    adherencePct,
)

fun OverviewDto.toDomain() = TrainerOverview(
    activeStudents = activeStudents.count,
    adherencePct = adherence.pct,
    adherenceDelta = adherence.delta,
    today = lists.today.map { it.toDomain() },
    atRisk = lists.atRisk.map { it.toDomain() },
    feedback = lists.feedbackPending.map { it.toDomain() },
    students = lists.students.map { it.toDomain() },
)
