package com.fittrainer.ui.components.exercise

/** En el mismo orden que MUSCLE_GROUPS del backend (exercise.model.js). */
private val MUSCLES = linkedMapOf(
    "chest" to "Pecho",
    "back" to "Espalda",
    "shoulders" to "Hombros",
    "legs" to "Piernas",
    "glutes" to "Glúteos",
    "biceps" to "Bíceps",
    "triceps" to "Tríceps",
    "core" to "Core",
    "calves" to "Gemelos",
    "full_body" to "Cuerpo completo",
    "cardio" to "Cardio",
)

/** Orden de los chips de la biblioteca. */
val MUSCLE_ORDER: List<String> = MUSCLES.keys.toList()

fun muscleLabel(raw: String?): String = raw?.let { MUSCLES[it] ?: it }.orEmpty()

private val EQUIPMENT = mapOf(
    "barbell" to "Barra",
    "dumbbell" to "Mancuernas",
    "machine" to "Máquina",
    "cable" to "Polea",
    "bodyweight" to "Peso corporal",
    "kettlebell" to "Kettlebell",
    "band" to "Banda",
)

fun equipmentLabel(raw: String?): String = raw?.let { EQUIPMENT[it] ?: it }.orEmpty()

/** 40.0 → "40 kg"; 2.5 → "2,5 kg" (coma decimal). */
fun formatKg(kg: Double): String =
    if (kg % 1.0 == 0.0) "${kg.toInt()} kg" else "${kg.toString().replace('.', ',')} kg"
