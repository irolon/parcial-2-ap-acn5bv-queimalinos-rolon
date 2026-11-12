package com.fittrainer.data.trainerai

import com.fittrainer.data.api.trainerai.GenerateRoutineRequest
import com.fittrainer.data.api.trainerai.GeneratedRoutineDto
import com.fittrainer.data.routines.trainer.WEEK_DAYS
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive

/** Si el backend no mandara el nombre (no debería: sale de la biblioteca), la tarjeta igual muestra algo. */
const val UNKNOWN_EXERCISE = "Ejercicio"

/** Lesiones en blanco viajan como null ("sin lesiones"); sin lesiones (null), no viajan. Preferencias en blanco, tampoco. */
fun AiRoutineParams.toRequest() = GenerateRoutineRequest(
    studentId = studentId,
    goal = goal,
    level = level,
    frequencyPerWeek = frequencyPerWeek,
    sessionDurationMin = sessionDurationMin,
    availableEquipment = equipment,
    injuries = injuries?.let { text -> text.trim().ifEmpty { null }?.let(::JsonPrimitive) ?: JsonNull },
    preferences = preferences?.trim()?.ifEmpty { null },
)

fun GeneratedRoutineDto.toDomain() = AiRoutineProposal(
    generationId = generationId,
    blocks = proposal.routines.map { block ->
        AiProposalBlock(
            name = block.name,
            days = WEEK_DAYS.filter { it in block.days },
            exercises = block.exercises.map { e ->
                AiProposalExercise(e.exerciseId, e.exerciseName ?: UNKNOWN_EXERCISE, e.sets, e.reps, e.restSeconds, e.suggestedKg, e.notes)
            },
        )
    },
    rationale = proposal.rationale,
)
