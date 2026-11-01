package com.fittrainer.ui.progress.charts

/** Claves del SavedStateHandle y de los refrescos de Progreso → Gráficos. Funciones puras del ViewModel. */
internal object ChartsKeys {
    const val VIEW = "view"
    const val EXERCISE_ID = "exerciseId"
    const val METRIC = "metric"
    const val RANGE = "range"
    const val BODY_FIELD = "bodyField"
    private const val BODY_KEY = "body"

    /** La lista de ejercicios entrenados (overview): un refresco aparte del ejercicio elegido. */
    const val LIST_KEY = "exercises"

    /** Un refresco por vista: medidas comparten una clave; cada ejercicio, la suya. */
    fun refreshKey(view: ChartsView, exerciseId: String?): String? =
        if (view == ChartsView.BODY) BODY_KEY else exerciseId?.let { "ex:$it" }
}

internal inline fun <reified E : Enum<E>> enumOrNull(name: String?): E? = name?.let { n -> enumValues<E>().firstOrNull { it.name == n } }

internal inline fun <reified E : Enum<E>> enumOr(name: String?, default: E): E = enumOrNull<E>(name) ?: default
