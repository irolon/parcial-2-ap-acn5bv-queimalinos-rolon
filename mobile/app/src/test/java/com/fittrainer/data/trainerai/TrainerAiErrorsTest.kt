package com.fittrainer.data.trainerai

import com.fittrainer.testing.fakes.auth.httpError
import java.io.IOException
import java.net.SocketTimeoutException
import org.junit.Assert.assertEquals
import org.junit.Test

/** E15: cada respuesta del backend de /trainer-ai a su error. */
class TrainerAiErrorsTest {
    private fun body(code: String, message: String = "m", details: String = "[]") =
        """{"error":{"code":"$code","message":"$message","details":$details}}"""

    @Test fun `429 trae el mensaje y el Retry-After`() {
        assertEquals(TrainerAiError.TooManyAttempts("m", 120), trainerAiHttpError(429, body("RATE_LIMIT_EXCEEDED"), "120"))
        assertEquals(TrainerAiError.TooManyAttempts("m", null), trainerAiHttpError(429, body("RATE_LIMIT_EXCEEDED"), null))
    }

    @Test fun `503 y 502 con el mensaje del backend`() {
        assertEquals(TrainerAiError.Unavailable("caído"), trainerAiHttpError(503, body("AI_UNAVAILABLE", "caído"), null))
        assertEquals(TrainerAiError.InvalidResponse("mala"), trainerAiHttpError(502, body("AI_INVALID_RESPONSE", "mala"), null))
    }

    @Test fun `400 de validacion por campo`() {
        val details = """[{"field":"goal","message":"goal es obligatorio"}]"""
        assertEquals(
            TrainerAiError.Validation(mapOf("goal" to "goal es obligatorio"), "Error de validación"),
            trainerAiHttpError(400, body("VALIDATION_ERROR", "Error de validación", details), null),
        )
    }

    @Test fun `los errores de guardar`() {
        assertEquals(TrainerAiError.AlreadySaved, trainerAiHttpError(409, body("GENERATION_ALREADY_SAVED"), null))
        assertEquals(TrainerAiError.GenerationGone, trainerAiHttpError(404, body("GENERATION_NOT_FOUND"), null))
        assertEquals(TrainerAiError.ExercisesUnavailable("m"), trainerAiHttpError(400, body("TEMPLATE_EXERCISES_UNAVAILABLE"), null))
    }

    @Test fun `404 del alumno o 403 es alumno que ya no esta`() {
        assertEquals(TrainerAiError.StudentGone, trainerAiHttpError(404, body("STUDENT_NOT_FOUND"), null))
        assertEquals(TrainerAiError.StudentGone, trainerAiHttpError(403, body("FORBIDDEN"), null))
    }

    @Test fun `red, timeout y lo desconocido`() {
        assertEquals(TrainerAiError.Timeout, SocketTimeoutException().toTrainerAiError())
        assertEquals(TrainerAiError.Offline, IOException().toTrainerAiError())
        assertEquals(TrainerAiError.Unknown, IllegalStateException().toTrainerAiError())
        assertEquals(TrainerAiError.Unknown, trainerAiHttpError(500, "no json", null))
        assertEquals(TrainerAiError.Unavailable("m"), httpError(503, body("AI_UNAVAILABLE")).toTrainerAiError())
    }
}
