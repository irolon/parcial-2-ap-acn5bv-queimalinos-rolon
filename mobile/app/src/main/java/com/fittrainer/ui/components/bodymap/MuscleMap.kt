package com.fittrainer.ui.components.bodymap

/** Partes del dibujo que nunca se pintan: no son músculo. */
val NEUTRAL_PARTS: Set<String> = setOf("head", "hair", "hands", "feet", "ankles", "knees")

/** Todas las partes musculares de las dos vistas (lo que pinta "cuerpo completo"). */
val ALL_MUSCLE_PARTS: Set<String> = setOf(
    "chest", "obliques", "abs", "biceps", "triceps", "neck", "trapezius", "deltoids",
    "adductors", "quadriceps", "tibialis", "calves", "forearm", "upper-back", "lower-back",
    "gluteal", "hamstring",
)

/** Grupo muscular del backend -> partes del dibujo que pinta. */
private val GROUP_PARTS: Map<String, Set<String>> = mapOf(
    "chest" to setOf("chest"),
    "back" to setOf("upper-back", "lower-back", "trapezius"),
    "shoulders" to setOf("deltoids"),
    "legs" to setOf("quadriceps", "hamstring", "adductors"),
    "glutes" to setOf("gluteal"),
    "biceps" to setOf("biceps"),
    "triceps" to setOf("triceps"),
    "core" to setOf("abs", "obliques"),
    "calves" to setOf("calves"),
    "full_body" to ALL_MUSCLE_PARTS,
)

/** Cardio, nulo o un grupo desconocido no pintan nada. */
fun partsFor(group: String?): Set<String> = GROUP_PARTS[group].orEmpty()

fun paints(group: String?): Boolean = partsFor(group).isNotEmpty()

/** La vista con más partes pintadas presentes; si empatan, el frente. */
fun busiestView(data: BodyMapData, painted: Set<String>): BodyView {
    fun count(v: BodyView) = data.view(v).parts.count { it.slug in painted }
    return if (count(BodyView.BACK) > count(BodyView.FRONT)) BodyView.BACK else BodyView.FRONT
}
