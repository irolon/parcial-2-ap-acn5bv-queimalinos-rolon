package com.fittrainer.ui.gamification.celebration

import com.fittrainer.data.gamification.Celebration

/** Qué diálogo mostrar. codes: lo que se marca como visto al tocar "Seguir". */
sealed interface CelebrationDialogUi {
    val codes: List<String>

    data class Single(val item: Celebration) : CelebrationDialogUi {
        override val codes get() = listOf(item.code)
    }

    data class Group(val items: List<Celebration>) : CelebrationDialogUi {
        override val codes get() = items.map { it.code }
        val title get() = "Desbloqueaste ${items.size} logros"
    }
}

/** Contra el exceso (spec §4.4): nunca durante la sesión activa; 1 o 2 de a uno; 3 o más en un solo diálogo. */
fun celebrationDialog(pending: List<Celebration>, onWorkout: Boolean): CelebrationDialogUi? = when {
    onWorkout || pending.isEmpty() -> null
    pending.size >= 3 -> CelebrationDialogUi.Group(pending)
    else -> CelebrationDialogUi.Single(pending.first())
}
