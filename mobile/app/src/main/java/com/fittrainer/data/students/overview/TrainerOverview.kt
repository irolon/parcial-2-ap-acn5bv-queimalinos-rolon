package com.fittrainer.data.students.overview

import com.fittrainer.data.api.students.AttentionDto
import com.fittrainer.data.api.students.OverviewDto
import com.fittrainer.data.api.students.RecentDto
import java.time.Instant
import java.time.OffsetDateTime

/** El Inicio del entrenador, listo para mostrar. adherencePct/adherenceDelta == null: nadie tiene plan. */
data class TrainerOverview(
    val activeStudents: Int,
    val new7d: Int,
    val sessionsDone: Int,
    val sessionsExpected: Int,
    val adherencePct: Int?,
    val adherenceDelta: Int?,
    val atRisk: Int,
    val attention: List<AttentionItem>,
    val recent: List<RecentItem>,
)

sealed interface AttentionItem {
    val studentId: String
    val name: String

    data class AtRisk(override val studentId: String, override val name: String, val days: Int, val neverTrained: Boolean) : AttentionItem

    data class FeedbackPending(
        override val studentId: String,
        override val name: String,
        val sessionId: String,
        val routineName: String?,
        val finishedAt: Instant,
    ) : AttentionItem
}

data class RecentItem(val studentId: String, val name: String, val sessionId: String, val routineName: String?, val rpe: Int?, val finishedAt: Instant)

data class OverviewCache(val overview: TrainerOverview, val fetchedAt: Instant)

private fun parse(iso: String): Instant = OffsetDateTime.parse(iso).toInstant()

/** Las filas que no se pueden mostrar (un aviso sin sesión) se descartan en vez de romper la pantalla. */
private fun AttentionDto.toDomain(): AttentionItem? = when (kind) {
    "inactive" -> AttentionItem.AtRisk(studentId, name.orEmpty(), days ?: 0, neverTrained)
    "feedback_pending" -> if (sessionId != null && finishedAt != null) {
        AttentionItem.FeedbackPending(studentId, name.orEmpty(), sessionId, routineName, parse(finishedAt))
    } else {
        null
    }
    else -> null
}

private fun RecentDto.toDomain() = RecentItem(studentId, name.orEmpty(), sessionId, routineName, rpe, parse(finishedAt))

fun OverviewDto.toDomain() = TrainerOverview(
    activeStudents = activeStudents.count,
    new7d = activeStudents.new7d,
    sessionsDone = sessionsToday.done,
    sessionsExpected = sessionsToday.expected,
    adherencePct = adherence.pct,
    adherenceDelta = adherence.delta,
    atRisk = atRisk,
    attention = attention.mapNotNull { it.toDomain() },
    recent = recent.map { it.toDomain() },
)
