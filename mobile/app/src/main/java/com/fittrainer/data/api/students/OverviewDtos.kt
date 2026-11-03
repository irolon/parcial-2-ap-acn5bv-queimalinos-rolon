package com.fittrainer.data.api.students

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** GET /students/overview: Inicio del entrenador. */
@Serializable
data class OverviewResponse(val data: OverviewDto)

@Serializable
data class OverviewDto(
    @SerialName("active_students") val activeStudents: ActiveStudentsDto = ActiveStudentsDto(),
    @SerialName("sessions_today") val sessionsToday: SessionsTodayDto = SessionsTodayDto(),
    @SerialName("adherence_7d") val adherence: OverviewAdherenceDto = OverviewAdherenceDto(),
    @SerialName("at_risk") val atRisk: Int = 0,
    val attention: List<AttentionDto> = emptyList(),
    val recent: List<RecentDto> = emptyList(),
    val lists: OverviewListsDto = OverviewListsDto(),
)

@Serializable
data class ActiveStudentsDto(val count: Int = 0, @SerialName("new_7d") val new7d: Int = 0)

@Serializable
data class SessionsTodayDto(val done: Int = 0, val expected: Int = 0)

/** pct y delta son null si ningún alumno tiene plan. */
@Serializable
data class OverviewAdherenceDto(val pct: Int? = null, val delta: Int? = null)

/** kind: "inactive" (days, never_trained) o "feedback_pending" (session_id, routine_name, finished_at). */
@Serializable
data class AttentionDto(
    val kind: String,
    @SerialName("student_id") val studentId: String,
    val name: String? = null,
    val days: Int? = null,
    @SerialName("never_trained") val neverTrained: Boolean = false,
    @SerialName("session_id") val sessionId: String? = null,
    @SerialName("routine_name") val routineName: String? = null,
    @SerialName("finished_at") val finishedAt: String? = null,
)

@Serializable
data class RecentDto(
    @SerialName("student_id") val studentId: String,
    val name: String? = null,
    @SerialName("session_id") val sessionId: String,
    @SerialName("routine_name") val routineName: String? = null,
    val rpe: Int? = null,
    @SerialName("finished_at") val finishedAt: String,
)

/** Las listas de los filtros del Inicio. Un caché viejo sin `lists` se lee con listas vacías. */
@Serializable
data class OverviewListsDto(
    val today: List<TodayDto> = emptyList(),
    @SerialName("at_risk") val atRisk: List<RiskDto> = emptyList(),
    @SerialName("feedback_pending") val feedbackPending: List<FeedbackDto> = emptyList(),
    val students: List<OverviewStudentDto> = emptyList(),
)

/** status: "done" (con los datos de la última sesión de hoy) o "pending" (campos de sesión en null). */
@Serializable
data class TodayDto(
    @SerialName("student_id") val studentId: String,
    val name: String? = null,
    val planned: Boolean = false,
    val status: String,
    @SerialName("session_id") val sessionId: String? = null,
    @SerialName("routine_name") val routineName: String? = null,
    @SerialName("finished_at") val finishedAt: String? = null,
    val rpe: Int? = null,
)

@Serializable
data class RiskDto(
    @SerialName("student_id") val studentId: String,
    val name: String? = null,
    val days: Int = 0,
    @SerialName("never_trained") val neverTrained: Boolean = false,
)

@Serializable
data class FeedbackDto(
    @SerialName("student_id") val studentId: String,
    val name: String? = null,
    @SerialName("session_id") val sessionId: String,
    @SerialName("routine_name") val routineName: String? = null,
    @SerialName("finished_at") val finishedAt: String,
    val rpe: Int? = null,
)

/** status: "active", "new" o "inactive" (las reglas de la web). adherencePct null: sin plan. */
@Serializable
data class OverviewStudentDto(
    @SerialName("student_id") val studentId: String,
    val name: String? = null,
    val status: String = "active",
    @SerialName("days_without_training") val daysWithoutTraining: Int = 0,
    @SerialName("adherence_pct") val adherencePct: Int? = null,
)
