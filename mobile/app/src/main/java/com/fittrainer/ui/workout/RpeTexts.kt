package com.fittrainer.ui.workout

/** Escala RPE con repeticiones en reserva (spec §6 de la tarjeta 12): un número solo no le dice nada a un principiante. */
private val RPE_LABELS = listOf(
    "Muy fácil, como entrar en calor", "Fácil", "Liviano, podías seguir un rato largo", "Moderado",
    "Algo exigente, te quedaban 5 o más reps", "Exigente, te quedaban 4 reps", "Difícil, te quedaban 2-3 reps",
    "Muy difícil, te quedaban 1-2 reps", "Casi al fallo, te quedaba 1 rep", "Al fallo, no salía ni una más",
)

/** Etiqueta del RPE 1-10; null si viene fuera de rango (un dato raro del servidor no tira la pantalla). */
fun rpeLabel(rpe: Int): String? = RPE_LABELS.getOrNull(rpe - 1)
