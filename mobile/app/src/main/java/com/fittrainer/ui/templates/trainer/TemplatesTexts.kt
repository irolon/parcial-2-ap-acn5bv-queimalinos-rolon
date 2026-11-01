package com.fittrainer.ui.templates.trainer

import com.fittrainer.data.templates.trainer.TemplateSummary
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.routines.trainer.routineDaysLabel

const val TEMPLATES_TITLE = "Plantillas"
const val TEMPLATES_EMPTY = "Todavía no tenés plantillas. Creálas en la web o guardá una rutina como plantilla."
const val TEMPLATES_NOT_LOADED = "Todavía no se bajaron tus plantillas. Conectate para verlas."
const val TEMPLATES_REFRESH_FAILED = "No pudimos actualizar las plantillas"
const val TEMPLATE_NOT_LOADED = "Conectate para ver la plantilla"
const val TEMPLATE_GONE = "La plantilla ya no existe"
const val ASSIGN_TO_STUDENT = "Asignar a un alumno"
const val PICK_STUDENT = "Elegí un alumno"
const val STUDENT_GONE = "Ese alumno ya no está en tu lista"
const val NO_ACTIVE_STUDENTS = "No tenés alumnos activos"
const val SAVED_AS_TEMPLATE = "Guardada como plantilla"
const val PREVIOUS_FAILED = "No pudimos ver sus rutinas actuales. Reintentá para poder asignar."
const val PREVIOUS_LOADING = "Buscando sus rutinas actuales…"

fun assignTo(studentName: String) = "Asignar a $studentName"
fun templatesFor(studentName: String) = "Plantillas · para $studentName"

/** Etiquetas de los niveles del backend (models/routine-templates TEMPLATE_LEVELS). */
fun levelLabel(level: String?): String? = when (level) {
    null -> null
    "beginner" -> "Principiante"
    "intermediate" -> "Intermedio"
    "advanced" -> "Avanzado"
    else -> level
}

val LEVELS = listOf("beginner", "intermediate", "advanced")

/** "Ganar fuerza · Intermedio". */
fun templateGoalLine(t: TemplateSummary): String =
    listOfNotNull(t.goal?.let(::goalLabel), levelLabel(t.level)).joinToString(" · ")

/** "LUN · VIE · 6 ejercicios". */
fun templateDaysLine(t: TemplateSummary): String = listOf(
    routineDaysLabel(t.days),
    if (t.exerciseCount == 1) "1 ejercicio" else "${t.exerciseCount} ejercicios",
).filter { it.isNotEmpty() }.joinToString(" · ")
