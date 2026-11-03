package com.fittrainer.data.templates.trainer

import com.fittrainer.data.api.templates.TemplateDetailDto
import com.fittrainer.data.api.templates.TemplateExerciseDto
import com.fittrainer.data.api.templates.TemplateSummaryDto
import com.fittrainer.data.db.templates.trainer.TrainerTemplateEntity
import java.time.Instant
import java.time.OffsetDateTime
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true }
private val exercisesSerializer = ListSerializer(TemplateExerciseDto.serializer())

private fun millis(iso: String?): Long? = iso?.let { runCatching { OffsetDateTime.parse(it).toInstant().toEpochMilli() }.getOrNull() }

/** De la lista: sin detalle (el DAO conserva el que ya había). */
fun TemplateSummaryDto.toEntity(trainerId: String) = TrainerTemplateEntity(
    trainerId, id, name, goal, level, days.joinToString(","), exerciseCount, millis(createdAt), structureJson = null,
)

/** Del detalle: los días y la cantidad salen de la structure, como en el resumen del backend. */
fun TemplateDetailDto.toEntity(trainerId: String) = TrainerTemplateEntity(
    trainerId, id, name, goal, level, structure.days.joinToString(","), structure.exercises.size, millis(createdAt),
    structureJson = json.encodeToString(exercisesSerializer, structure.exercises.sortedBy { it.order }),
)

fun TrainerTemplateEntity.toSummary() = TemplateSummary(
    id, name, goal, level, days.split(',').filter { it.isNotBlank() }, exerciseCount, createdAt?.let(Instant::ofEpochMilli),
)

/** null si el detalle nunca se bajó (o el JSON guardado no se puede leer). */
fun TrainerTemplateEntity.toDetail(): TemplateDetail? {
    val raw = structureJson ?: return null
    val exercises = runCatching { json.decodeFromString(exercisesSerializer, raw) }.getOrNull() ?: return null
    return TemplateDetail(
        toSummary(),
        exercises.map {
            TemplateExercise(
                it.exerciseId, it.exercise?.name ?: "Ejercicio no disponible", it.exercise?.muscleGroup,
                it.sets, it.reps, it.restSeconds, it.suggestedKg, available = it.exercise != null,
            )
        },
    )
}
