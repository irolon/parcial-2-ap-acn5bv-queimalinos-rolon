package com.fittrainer.di.trainerai

import org.junit.Assert.assertTrue
import org.junit.Test

class TrainerAiTimeoutTest {

    @Test
    fun elCelularEsperaMasQueElBackendConMargenParaSupabaseYElGuardado() {
        // El backend corta la llamada a n8n a los 38 s (WEBHOOK_TIMEOUT_MS) y, además, consulta Supabase antes y
        // guarda la generación después. Con menos margen el celular corta una propuesta que el backend sí guardó.
        val backendN8nTimeoutSeconds = 38L
        assertTrue(TRAINER_AI_TIMEOUT_SECONDS >= backendN8nTimeoutSeconds + 10)
        // RNF-05: la propuesta llega en menos de 60 s.
        assertTrue(TRAINER_AI_TIMEOUT_SECONDS < 60)
    }
}
