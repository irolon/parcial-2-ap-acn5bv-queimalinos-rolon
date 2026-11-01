package com.fittrainer.ui.progress

/** Pedido de abrir Progreso en una solapa (al tocar un aviso). Lo consume [ProgressScreen] una sola vez. */
sealed interface ProgressOpen {
    data object History : ProgressOpen
    /** Gráficos → Cargas con ese ejercicio, si está en el desplegable. */
    data class Charts(val exerciseId: String) : ProgressOpen
}
