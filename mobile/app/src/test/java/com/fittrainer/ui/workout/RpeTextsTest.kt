package com.fittrainer.ui.workout

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RpeTextsTest {
    @Test fun lasDiezEtiquetasDelSpec() {
        assertEquals(
            listOf(
                "Muy fácil, como entrar en calor", "Fácil", "Liviano, podías seguir un rato largo", "Moderado",
                "Algo exigente, te quedaban 5 o más reps", "Exigente, te quedaban 4 reps", "Difícil, te quedaban 2-3 reps",
                "Muy difícil, te quedaban 1-2 reps", "Casi al fallo, te quedaba 1 rep", "Al fallo, no salía ni una más",
            ),
            (1..10).map(::rpeLabel),
        )
    }

    /** Un RPE inválido que venga del servidor no tira la pantalla: no se muestra etiqueta. */
    @Test fun fueraDeRangoDevuelveNull() {
        assertNull(rpeLabel(0))
        assertNull(rpeLabel(11))
    }
}
