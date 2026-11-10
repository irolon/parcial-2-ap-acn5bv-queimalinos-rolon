package com.fittrainer.ui.routines.trainer.ai

import com.fittrainer.data.trainerai.TrainerAiError
import org.junit.Assert.assertEquals
import org.junit.Test

/** E15: el texto del 429 sigue la tabla "Errores" de la spec. */
class AiRoutineTextsTest {
    @Test fun `el 429 con Retry-After dice en cuantos minutos`() {
        assertEquals("Hiciste muchas propuestas. Probá de nuevo en 2 min.", generateMessage(TrainerAiError.TooManyAttempts("Hiciste muchas propuestas.", 61)))
    }

    @Test fun `el 429 sin Retry-After dice mas tarde`() {
        assertEquals("Hiciste muchas propuestas. Probá de nuevo más tarde.", generateMessage(TrainerAiError.TooManyAttempts("Hiciste muchas propuestas.", null)))
    }
}
