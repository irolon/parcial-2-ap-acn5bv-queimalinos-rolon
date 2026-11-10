# Asistente IA para armar rutinas (E15) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desde la ficha del alumno, el entrenador pide una rutina a la IA, la revisa y con "Guardar y asignar" la deja asignada (una rutina por bloque) para ajustarla en el editor E8.

**Architecture:** `TrainerAiApi` (Retrofit, timeout 40 s) + `TrainerAiRepository` (sin Room) para generar y guardar. `AiAssignController` orquesta guardar → `instantiate` por bloque → pausar las anteriores → `refreshList`, con el progreso en el `SavedStateHandle` para reintentar sin duplicar. `AiRoutineViewModel` maneja formulario y propuesta (también en el `SavedStateHandle`); `AiRoutineScreen` muestra los dos pasos.

**Tech Stack:** Kotlin, Jetpack Compose (Material 3), Hilt, Retrofit + kotlinx.serialization, coroutines; tests JUnit4 + kotlinx-coroutines-test con fakes en memoria.

**Spec:** `docs/superpowers/specs/2026-11-09-asistente-ia-rutinas-entrenador-design.md`

## Global Constraints

- Ningún archivo de código (tests incluidos) pasa de **200 líneas físicas** (`gradlew checkFileLength`); orden capa → módulo → archivo; los tests copian el árbol.
- **No toca Room**: sin entidades, DAOs ni migraciones nuevas. La propuesta, el formulario y el progreso viven en el `SavedStateHandle` (excepción justificada en la spec).
- Timeout del cliente del asistente: **40 s** (`callTimeout` y `readTimeout`).
- Todas las llamadas de `TrainerAiApi` llevan `@Tag owner: RequiredUser`.
- Textos en español rioplatense; aviso de datos personales: "No pongas datos personales (nombre, documento, contacto): este texto se le manda a la IA."
- Nombre de plantilla 1–120; con varios bloques "<nombre> · <bloque>" cortado a 120 (igual que `templateNameFor` del backend).
- Toque mínimo 44 dp (`Spacing.minTouchTarget`), tema oscuro con `FtColors`.
- Sin commits ni push: Igna commitea. (Los pasos de "commit" del plan se reemplazan por correr los tests de la tarea.)
- Comando de verificación: `cd mobile && ./gradlew checkFileLength assembleDebug testDebugUnitTest`.

## Review Focus

1. **Android mata el proceso a mitad de "Guardar y asignar"** → al volver, el progreso se restaura y "Reintentar" no vuelve a guardar ni duplica rutinas (test en Task 3: controlador nuevo con el mismo `SavedStateHandle`).
2. **Doble toque en "Guardar y asignar" o en "Generar propuesta"** → un solo `save-as-template` / un solo `generate-routine` (tests en Task 3 y Task 4).
3. **Nombre de plantilla largo con varios bloques** → la recuperación del 409 busca el nombre cortado a 120 como el backend (test de `aiTemplateName` en Task 2 y de recuperación en Task 3).
4. **Ficha sin objetivo ni nivel** → errores en los campos y ninguna request (test en Task 4).
5. **Se corta la red mientras genera** → el formulario queda igual, aviso de conexión, se puede volver a generar (test en Task 4).

---

### Task 1: API, DTOs, timeout y errores del asistente

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/api/trainerai/TrainerAiDtos.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/api/trainerai/TrainerAiApi.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/di/trainerai/TrainerAiModule.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/trainerai/TrainerAiErrors.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/api/trainerai/TrainerAiDtosTest.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/trainerai/TrainerAiErrorsTest.kt`

**Interfaces:**
- Produces: `GenerateRoutineRequest`, `GenerateRoutineResponse(data: GeneratedRoutineDto)`, `GeneratedRoutineDto(generationId, proposal: RoutineProposalDto)`, `RoutineProposalDto(routines: List<ProposalBlockDto>, rationale)`, `ProposalBlockDto(name, days, exercises)`, `ProposalExerciseDto(exerciseId, exerciseName?, sets, reps, restSeconds, suggestedKg?, notes?)`, `SaveAsTemplateRequest(generationId, templateName)`, `SaveAsTemplateResponse(data: SavedTemplatesDto)`, `SavedTemplatesDto(generationId, templates: List<SavedTemplateDto>)`, `SavedTemplateDto(id, name, days)`.
- Produces: `interface TrainerAiApi { suspend fun generate(@Tag owner: RequiredUser, @Body body: GenerateRoutineRequest): GenerateRoutineResponse; suspend fun save(@Tag owner: RequiredUser, @Body body: SaveAsTemplateRequest): SaveAsTemplateResponse }`, `const val TRAINER_AI_TIMEOUT_SECONDS = 40L`.
- Produces: `sealed interface TrainerAiError` (Offline, Timeout, TooManyAttempts(message, retryAfterSeconds), Unavailable(message), InvalidResponse(message), Validation(fields, message), StudentGone, GenerationGone, AlreadySaved, ExercisesUnavailable(message), Unknown), `class TrainerAiException(val error: TrainerAiError, cause)`, `fun trainerAiHttpError(code: Int, body: String?, retryAfter: String?): TrainerAiError`, `fun Throwable.toTrainerAiError(): TrainerAiError`.

- [ ] **Step 1: Write the failing tests**

`TrainerAiDtosTest.kt`:
```kotlin
package com.fittrainer.data.api.trainerai

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** E15: el contrato de /trainer-ai con el Json de la app (ignoreUnknownKeys, sin defaults). */
class TrainerAiDtosTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test fun `el equipamiento sin tocar no viaja y las lesiones vacias viajan como null`() {
        val body = json.encodeToString(GenerateRoutineRequest("s1", "strength", "beginner", 3, 60, null, null))
        assertFalse(body.contains("available_equipment"))
        assertTrue(body.contains("\"injuries\":null"))
        assertFalse(body.contains("preferences"))
    }

    @Test fun `una lista vacia de equipamiento viaja vacia`() {
        val body = json.encodeToString(GenerateRoutineRequest("s1", "strength", "beginner", 3, 60, emptyList(), "Rodilla"))
        assertTrue(body.contains("\"available_equipment\":[]"))
        assertTrue(body.contains("\"injuries\":\"Rodilla\""))
    }

    @Test fun `lee una propuesta de varios bloques`() {
        val raw = """{"data":{"generation_id":"g1","routine_proposal":{"rationale":"Split","routines":[
            {"name":"Pecho","days":["monday"],"exercises":[{"exercise_id":"e1","exercise_name":"Press","sets":4,"reps":8,
            "rest_seconds":90,"suggested_kg":null,"notes":null,"extra":1}]},
            {"name":"Piernas","days":["friday","wednesday"],"exercises":[{"exercise_id":"e2","sets":3,"reps":10,"rest_seconds":60}]}]}}}"""
        val dto = json.decodeFromString<GenerateRoutineResponse>(raw).data
        assertEquals("g1", dto.generationId)
        assertEquals(listOf("Pecho", "Piernas"), dto.proposal.routines.map { it.name })
        assertEquals("Press", dto.proposal.routines[0].exercises[0].exerciseName)
        assertNull(dto.proposal.routines[1].exercises[0].exerciseName)
    }

    @Test fun `lee las plantillas guardadas`() {
        val raw = """{"data":{"generation_id":"g1","templates":[{"id":"t1","name":"IA · Pecho","days":["monday"]}]}}"""
        assertEquals("t1", json.decodeFromString<SaveAsTemplateResponse>(raw).data.templates.single().id)
    }
}
```

`TrainerAiErrorsTest.kt`:
```kotlin
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && ./gradlew testDebugUnitTest --tests "com.fittrainer.data.api.trainerai.*" --tests "com.fittrainer.data.trainerai.TrainerAiErrorsTest"`
Expected: FAIL de compilación (`GenerateRoutineRequest`, `trainerAiHttpError` no existen).

- [ ] **Step 3: Write the implementation**

`TrainerAiDtos.kt`:
```kotlin
package com.fittrainer.data.api.trainerai

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Body de POST /trainer-ai/generate-routine (E15). available_equipment null = no viaja (el backend usa la ficha);
 * injuries no tiene default: viaja siempre (null = sin lesiones). preferences null no viaja.
 */
@Serializable
data class GenerateRoutineRequest(
    @SerialName("student_id") val studentId: String,
    val goal: String,
    val level: String,
    @SerialName("frequency_per_week") val frequencyPerWeek: Int,
    @SerialName("session_duration_min") val sessionDurationMin: Int,
    @SerialName("available_equipment") val availableEquipment: List<String>? = null,
    val injuries: String?,
    val preferences: String? = null,
)

@Serializable
data class GenerateRoutineResponse(val data: GeneratedRoutineDto)

@Serializable
data class GeneratedRoutineDto(
    @SerialName("generation_id") val generationId: String,
    @SerialName("routine_proposal") val proposal: RoutineProposalDto,
)

@Serializable
data class RoutineProposalDto(val routines: List<ProposalBlockDto>, val rationale: String)

@Serializable
data class ProposalBlockDto(val name: String, val days: List<String>, val exercises: List<ProposalExerciseDto>)

@Serializable
data class ProposalExerciseDto(
    @SerialName("exercise_id") val exerciseId: String,
    @SerialName("exercise_name") val exerciseName: String? = null,
    val sets: Int,
    val reps: Int,
    @SerialName("rest_seconds") val restSeconds: Int,
    @SerialName("suggested_kg") val suggestedKg: Double? = null,
    val notes: String? = null,
)

@Serializable
data class SaveAsTemplateRequest(
    @SerialName("generation_id") val generationId: String,
    @SerialName("template_name") val templateName: String,
)

@Serializable
data class SaveAsTemplateResponse(val data: SavedTemplatesDto)

@Serializable
data class SavedTemplatesDto(
    @SerialName("generation_id") val generationId: String,
    val templates: List<SavedTemplateDto>,
)

@Serializable
data class SavedTemplateDto(val id: String, val name: String, val days: List<String> = emptyList())
```

`TrainerAiApi.kt`:
```kotlin
package com.fittrainer.data.api.trainerai

import com.fittrainer.data.auth.RequiredUser
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Tag

/**
 * Asistente IA del entrenador (E15). La IA propone y el backend guarda una plantilla por bloque; nunca asigna.
 * Las dos llevan [RequiredUser]: lo que pidió una cuenta nunca sale con el JWT de otra.
 */
interface TrainerAiApi {
    @POST("trainer-ai/generate-routine")
    suspend fun generate(@Tag owner: RequiredUser, @Body body: GenerateRoutineRequest): GenerateRoutineResponse

    @POST("trainer-ai/save-as-template")
    suspend fun save(@Tag owner: RequiredUser, @Body body: SaveAsTemplateRequest): SaveAsTemplateResponse
}
```

`TrainerAiModule.kt`:
```kotlin
package com.fittrainer.di.trainerai

import com.fittrainer.BuildConfig
import com.fittrainer.data.api.trainerai.TrainerAiApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** Lo que espera el celular una propuesta (el backend le da 30 s a n8n). */
const val TRAINER_AI_TIMEOUT_SECONDS = 40L

/** Asistente IA del entrenador (E15): el mismo cliente con Bearer y refresh, con un tope de 40 s por llamada. */
@Module
@InstallIn(SingletonComponent::class)
object TrainerAiModule {

    @Provides
    @Singleton
    fun provideTrainerAiApi(client: OkHttpClient, json: Json): TrainerAiApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(
            client.newBuilder()
                .callTimeout(TRAINER_AI_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .readTimeout(TRAINER_AI_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .build(),
        )
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(TrainerAiApi::class.java)
}
```

`TrainerAiErrors.kt`:
```kotlin
package com.fittrainer.data.trainerai

import com.fittrainer.data.api.ErrorBody
import java.io.IOException
import java.io.InterruptedIOException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException

/** Lo que puede salir mal con el asistente del entrenador (E15). Los mensajes del backend se muestran tal cual. */
sealed interface TrainerAiError {
    data object Offline : TrainerAiError
    data object Timeout : TrainerAiError
    data class TooManyAttempts(val message: String?, val retryAfterSeconds: Long?) : TrainerAiError
    data class Unavailable(val message: String?) : TrainerAiError
    data class InvalidResponse(val message: String?) : TrainerAiError
    data class Validation(val fields: Map<String, String>, val message: String?) : TrainerAiError
    data object StudentGone : TrainerAiError
    data object GenerationGone : TrainerAiError
    data object AlreadySaved : TrainerAiError
    data class ExercisesUnavailable(val message: String?) : TrainerAiError
    data object Unknown : TrainerAiError
}

class TrainerAiException(val error: TrainerAiError, cause: Throwable? = null) : Exception(error.toString(), cause)

@Serializable
private data class Envelope(val error: ErrorBody? = null)

private val errorJson = Json { ignoreUnknownKeys = true }

/** Un error HTTP de /trainer-ai: [body] es el JSON del backend y [retryAfter] el header Retry-After. */
fun trainerAiHttpError(code: Int, body: String?, retryAfter: String?): TrainerAiError {
    val error = body?.let { runCatching { errorJson.decodeFromString<Envelope>(it).error }.getOrNull() }
    val message = error?.message?.takeIf { it.isNotBlank() }
    return when {
        code == 429 -> TrainerAiError.TooManyAttempts(message, retryAfter?.trim()?.toLongOrNull())
        code == 503 -> TrainerAiError.Unavailable(message)
        code == 502 -> TrainerAiError.InvalidResponse(message)
        code == 409 && error?.code == "GENERATION_ALREADY_SAVED" -> TrainerAiError.AlreadySaved
        code == 404 && error?.code == "GENERATION_NOT_FOUND" -> TrainerAiError.GenerationGone
        code == 404 || code == 403 -> TrainerAiError.StudentGone
        code == 400 && error?.code == "TEMPLATE_EXERCISES_UNAVAILABLE" -> TrainerAiError.ExercisesUnavailable(message)
        code == 400 && error != null -> TrainerAiError.Validation(
            error.details.mapNotNull { d -> d.field?.let { it to d.message.orEmpty() } }.toMap(),
            message,
        )
        else -> TrainerAiError.Unknown
    }
}

/** El timeout de OkHttp (InterruptedIOException) se distingue de la falta de red (IOException). */
fun Throwable.toTrainerAiError(): TrainerAiError = when (this) {
    is TrainerAiException -> error
    is HttpException -> trainerAiHttpError(code(), response()?.errorBody()?.string(), response()?.headers()?.get("Retry-After"))
    is InterruptedIOException -> TrainerAiError.Timeout
    is IOException -> TrainerAiError.Offline
    else -> TrainerAiError.Unknown
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && ./gradlew testDebugUnitTest --tests "com.fittrainer.data.api.trainerai.*" --tests "com.fittrainer.data.trainerai.TrainerAiErrorsTest"`
Expected: PASS (10 tests).

---

### Task 2: Dominio, mapper y `TrainerAiRepository`

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/trainerai/AiRoutineProposal.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/trainerai/TrainerAiMapper.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/trainerai/TrainerAiRepository.kt`
- Create: `mobile/app/src/test/java/com/fittrainer/testing/fakes/trainerai/FakeTrainerAiApi.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/trainerai/TrainerAiRepositoryTest.kt`

**Interfaces:**
- Consumes: Task 1 (DTOs, `TrainerAiApi`, `TrainerAiException`, `toTrainerAiError`); `WEEK_DAYS` de `data/routines/trainer/RoutinePatch.kt`.
- Produces: `@Serializable AiProposalExercise(exerciseId, name, sets, reps, restSeconds, suggestedKg?, notes?)`, `@Serializable AiProposalBlock(name, days, exercises)`, `@Serializable AiRoutineProposal(generationId, blocks, rationale)`, `@Serializable AiSavedTemplate(id, name)`, `AiRoutineParams(studentId, goal, level, frequencyPerWeek, sessionDurationMin, equipment: List<String>?, injuries: String?, preferences: String?)`, `const val MAX_TEMPLATE_NAME = 120`, `fun aiTemplateName(templateName: String, blockName: String, blockCount: Int): String`.
- Produces: `TrainerAiRepository.generate(trainerId: String, params: AiRoutineParams): Result<AiRoutineProposal>`, `TrainerAiRepository.save(trainerId: String, generationId: String, templateName: String): Result<List<AiSavedTemplate>>` (fallas como `TrainerAiException`).
- Produces (test): `FakeTrainerAiApi` con `generated`, `generateErrors: ArrayDeque<Throwable>`, `saveErrors: ArrayDeque<Throwable>`, `generateGate`, `saveGate`, `requests`, `saves`, `savedTemplates`; `fun proposalDto(blocks: Int = 1): GeneratedRoutineDto`.

- [ ] **Step 1: Write the fake and the failing test**

`FakeTrainerAiApi.kt`:
```kotlin
package com.fittrainer.testing.fakes.trainerai

import com.fittrainer.data.api.trainerai.GenerateRoutineRequest
import com.fittrainer.data.api.trainerai.GenerateRoutineResponse
import com.fittrainer.data.api.trainerai.GeneratedRoutineDto
import com.fittrainer.data.api.trainerai.ProposalBlockDto
import com.fittrainer.data.api.trainerai.ProposalExerciseDto
import com.fittrainer.data.api.trainerai.RoutineProposalDto
import com.fittrainer.data.api.trainerai.SaveAsTemplateRequest
import com.fittrainer.data.api.trainerai.SaveAsTemplateResponse
import com.fittrainer.data.api.trainerai.SavedTemplateDto
import com.fittrainer.data.api.trainerai.SavedTemplatesDto
import com.fittrainer.data.api.trainerai.TrainerAiApi
import com.fittrainer.data.auth.RequiredUser
import kotlinx.coroutines.CompletableDeferred

private val BLOCKS = listOf(
    ProposalBlockDto("Pecho y tríceps", listOf("monday"), listOf(ProposalExerciseDto("e1", "Press de banca", 4, 8, 90, 60.0, "Controlá la bajada"))),
    ProposalBlockDto("Espalda y bíceps", listOf("wednesday"), listOf(ProposalExerciseDto("e2", "Remo", 4, 10, 90))),
    ProposalBlockDto("Piernas", listOf("friday"), listOf(ProposalExerciseDto("e3", "Sentadilla", 4, 6, 120, 80.0))),
)

/** Propuesta de [blocks] bloques (1 a 3); con 1, "Pecho y tríceps" los lunes. */
fun proposalDto(blocks: Int = 1) = GeneratedRoutineDto("g1", RoutineProposalDto(BLOCKS.take(blocks), "Porque sí"))

/** Backend de /trainer-ai en memoria. Las colas de errores fallan la próxima llamada; los gates la demoran. */
class FakeTrainerAiApi : TrainerAiApi {
    var generated = proposalDto()
    val generateErrors = ArrayDeque<Throwable>()
    val saveErrors = ArrayDeque<Throwable>()
    var generateGate: CompletableDeferred<Unit>? = null
    var saveGate: CompletableDeferred<Unit>? = null
    val requests = mutableListOf<GenerateRoutineRequest>()
    val saves = mutableListOf<SaveAsTemplateRequest>()
    val owners = mutableListOf<String>()

    /** Lo que devuelve save: una plantilla por bloque, "tpl-<i>". */
    fun savedTemplates(name: String) = generated.proposal.routines.mapIndexed { i, b ->
        SavedTemplateDto("tpl-$i", if (generated.proposal.routines.size == 1) name else "$name · ${b.name}", b.days)
    }

    override suspend fun generate(owner: RequiredUser, body: GenerateRoutineRequest): GenerateRoutineResponse {
        owners += owner.userId
        requests += body
        generateGate?.await()
        generateErrors.removeFirstOrNull()?.let { throw it }
        return GenerateRoutineResponse(generated)
    }

    override suspend fun save(owner: RequiredUser, body: SaveAsTemplateRequest): SaveAsTemplateResponse {
        owners += owner.userId
        saves += body
        saveGate?.await()
        saveErrors.removeFirstOrNull()?.let { throw it }
        return SaveAsTemplateResponse(SavedTemplatesDto(body.generationId, savedTemplates(body.templateName)))
    }
}
```

`TrainerAiRepositoryTest.kt`:
```kotlin
package com.fittrainer.data.trainerai

import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.trainerai.FakeTrainerAiApi
import com.fittrainer.testing.fakes.trainerai.proposalDto
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** E15: generar y guardar contra el backend, sin Room. */
class TrainerAiRepositoryTest {
    private val api = FakeTrainerAiApi()
    private val repo = TrainerAiRepository(api)
    private val params = AiRoutineParams("s1", "strength", "beginner", 3, 60, null, "  ", " Sin saltos ")

    @Test fun `genera con la cuenta y limpia los textos`() = runTest {
        api.generated = proposalDto(3)
        val proposal = repo.generate("t1", params).getOrThrow()
        val sent = api.requests.single()
        assertEquals("t1", api.owners.single())
        assertNull(sent.availableEquipment)
        assertNull(sent.injuries)
        assertEquals("Sin saltos", sent.preferences)
        assertEquals("g1", proposal.generationId)
        assertEquals(listOf("Pecho y tríceps", "Espalda y bíceps", "Piernas"), proposal.blocks.map { it.name })
        assertEquals("Press de banca", proposal.blocks[0].exercises[0].name)
    }

    @Test fun `los dias quedan en orden de la semana y un ejercicio sin nombre tiene uno`() = runTest {
        api.generated = proposalDto(1).let { g ->
            val b = g.proposal.routines[0]
            g.copy(proposal = g.proposal.copy(routines = listOf(b.copy(days = listOf("friday", "monday"), exercises = b.exercises.map { it.copy(exerciseName = null) }))))
        }
        val block = repo.generate("t1", params).getOrThrow().blocks.single()
        assertEquals(listOf("monday", "friday"), block.days)
        assertEquals(UNKNOWN_EXERCISE, block.exercises.single().name)
    }

    @Test fun `una falla vuelve como TrainerAiException`() = runTest {
        api.generateErrors += apiError(503, "AI_UNAVAILABLE")
        assertEquals(TrainerAiError.Unavailable("x"), (repo.generate("t1", params).exceptionOrNull() as TrainerAiException).error)
        api.generateErrors += IOException()
        assertEquals(TrainerAiError.Offline, (repo.generate("t1", params).exceptionOrNull() as TrainerAiException).error)
    }

    @Test fun `guardar recorta el nombre y devuelve una plantilla por bloque`() = runTest {
        api.generated = proposalDto(2)
        val saved = repo.save("t1", "g1", "  IA · Fuerza  ").getOrThrow()
        assertEquals("IA · Fuerza", api.saves.single().templateName)
        assertEquals(listOf("tpl-0", "tpl-1"), saved.map { it.id })
    }

    @Test fun `el nombre de cada plantilla copia al backend`() {
        assertEquals("IA", aiTemplateName("IA", "Piernas", 1))
        assertEquals("IA · Piernas", aiTemplateName("IA", "Piernas", 2))
        assertEquals(MAX_TEMPLATE_NAME, aiTemplateName("x".repeat(118), "Piernas", 3).length)
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd mobile && ./gradlew testDebugUnitTest --tests "com.fittrainer.data.trainerai.TrainerAiRepositoryTest"`
Expected: FAIL de compilación (`TrainerAiRepository`, `AiRoutineParams` no existen).

- [ ] **Step 3: Write the implementation**

`AiRoutineProposal.kt`:
```kotlin
package com.fittrainer.data.trainerai

import kotlinx.serialization.Serializable

/** Un ejercicio de la propuesta, con el nombre de la biblioteca. Serializable: vive en el SavedStateHandle. */
@Serializable
data class AiProposalExercise(
    val exerciseId: String,
    val name: String,
    val sets: Int,
    val reps: Int,
    val restSeconds: Int,
    val suggestedKg: Double? = null,
    val notes: String? = null,
)

/** Un bloque: una rutina con sus días (en orden de la semana). Los bloques no repiten días. */
@Serializable
data class AiProposalBlock(val name: String, val days: List<String>, val exercises: List<AiProposalExercise>)

/** La propuesta de la IA (E15). Solo se puede guardar entera: save-as-template recibe el generationId. */
@Serializable
data class AiRoutineProposal(val generationId: String, val blocks: List<AiProposalBlock>, val rationale: String)

/** Una plantilla que creó save-as-template, en el orden de los bloques. */
@Serializable
data class AiSavedTemplate(val id: String, val name: String)

/** Lo que pide el entrenador. equipment null = el de la ficha (no viaja); vacío = solo peso corporal. */
data class AiRoutineParams(
    val studentId: String,
    val goal: String,
    val level: String,
    val frequencyPerWeek: Int,
    val sessionDurationMin: Int,
    val equipment: List<String>?,
    val injuries: String?,
    val preferences: String?,
)

const val MAX_TEMPLATE_NAME = 120

/** El nombre que le pone el backend a la plantilla de un bloque (templateNameFor de ai-generation.model.js). */
fun aiTemplateName(templateName: String, blockName: String, blockCount: Int): String =
    if (blockCount == 1) templateName else "$templateName · $blockName".take(MAX_TEMPLATE_NAME)
```

`TrainerAiMapper.kt`:
```kotlin
package com.fittrainer.data.trainerai

import com.fittrainer.data.api.trainerai.GenerateRoutineRequest
import com.fittrainer.data.api.trainerai.GeneratedRoutineDto
import com.fittrainer.data.routines.trainer.WEEK_DAYS

/** Si el backend no mandara el nombre (no debería: sale de la biblioteca), la tarjeta igual muestra algo. */
const val UNKNOWN_EXERCISE = "Ejercicio"

/** Lesiones o preferencias en blanco viajan como null ("sin lesiones" / nada). */
fun AiRoutineParams.toRequest() = GenerateRoutineRequest(
    studentId = studentId,
    goal = goal,
    level = level,
    frequencyPerWeek = frequencyPerWeek,
    sessionDurationMin = sessionDurationMin,
    availableEquipment = equipment,
    injuries = injuries?.trim()?.ifEmpty { null },
    preferences = preferences?.trim()?.ifEmpty { null },
)

fun GeneratedRoutineDto.toDomain() = AiRoutineProposal(
    generationId = generationId,
    blocks = proposal.routines.map { block ->
        AiProposalBlock(
            name = block.name,
            days = WEEK_DAYS.filter { it in block.days },
            exercises = block.exercises.map { e ->
                AiProposalExercise(e.exerciseId, e.exerciseName ?: UNKNOWN_EXERCISE, e.sets, e.reps, e.restSeconds, e.suggestedKg, e.notes)
            },
        )
    },
    rationale = proposal.rationale,
)
```

`TrainerAiRepository.kt`:
```kotlin
package com.fittrainer.data.trainerai

import com.fittrainer.data.api.trainerai.SaveAsTemplateRequest
import com.fittrainer.data.api.trainerai.TrainerAiApi
import com.fittrainer.data.auth.RequiredUser
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException

/**
 * Asistente IA del entrenador (E15), solo online y sin Room: la propuesta es el borrador de una escritura y el
 * backend no tiene un GET para releerla (la guarda el ViewModel en su SavedStateHandle). Las rutinas que salen
 * de ahí entran a Room por TrainerTemplatesRepository.instantiate y TrainerRoutinesRepository.refreshList.
 */
@Singleton
class TrainerAiRepository @Inject constructor(private val api: TrainerAiApi) {

    suspend fun generate(trainerId: String, params: AiRoutineParams): Result<AiRoutineProposal> = call {
        api.generate(RequiredUser(trainerId), params.toRequest()).data.toDomain()
    }

    /** Una plantilla por bloque, en orden. El nombre va recortado (el backend también lo recorta). */
    suspend fun save(trainerId: String, generationId: String, templateName: String): Result<List<AiSavedTemplate>> = call {
        api.save(RequiredUser(trainerId), SaveAsTemplateRequest(generationId, templateName.trim()))
            .data.templates.map { AiSavedTemplate(it.id, it.name) }
    }

    private suspend fun <T> call(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(TrainerAiException(e.toTrainerAiError(), e))
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd mobile && ./gradlew testDebugUnitTest --tests "com.fittrainer.data.trainerai.*"`
Expected: PASS (5 + 6 tests).

---

### Task 3: `AiAssignController`: guardar, asignar por bloque, pausar y reintentar

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/routines/trainer/ai/assign/AiAssignProgress.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/routines/trainer/ai/assign/AiAssignController.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/routines/trainer/ai/assign/AiAssignControllerTest.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/routines/trainer/ai/assign/AiAssignRecoveryTest.kt`

**Interfaces:**
- Consumes: Task 2 (`TrainerAiRepository`, `AiRoutineProposal`, `AiSavedTemplate`, `aiTemplateName`), `TrainerTemplatesRepository.instantiate/refreshList/observeList`, `TrainerRoutinesRepository.refreshList/observeStudentRoutines`, `deactivateOthers`, `assignMessage()` (`ui/templates/trainer/assign/AssignState.kt`).
- Produces: `@Serializable AiAssignProgress(studentId, templateName, deactivateIds, existingIds, templates: List<AiSavedTemplate>? = null, assigned: List<String?> = emptyList(), attempted: Set<Int> = emptySet(), done: Boolean = false)`, `AiAssignState(running, assigned, total, message, canRetry)`, `enum AiAssignStop { GENERATION_GONE, EXERCISES_UNAVAILABLE }`, `AiAssignDone(warning: String?)`.
- Produces: `class AiAssignController(ai, templates, routines, saved: SavedStateHandle, scope, trainerId: suspend () -> String, onStop: (AiAssignStop, String) -> Unit)` con `state: StateFlow<AiAssignState>`, `done: StateFlow<AiAssignDone?>`, `progress: AiAssignProgress?`, `start(proposal, progress)`, `retry(proposal)`, `restore(proposal)`, `consumeDone()`.
- Produces (textos): `ASSIGN_NOT_RECOVERED`, `PROPOSAL_GONE`, `EXERCISES_GONE`, `AI_SAVE_FAILED`, `NEEDS_NETWORK_OR_RETRY`, `fun assignedOf(k: Int, n: Int): String`, `fun pauseFailed(names: List<String>): String`.

- [ ] **Step 1: Write the failing tests**

`AiAssignControllerTest.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai.assign

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.AiRoutineProposal
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.data.trainerai.toDomain
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.testing.fakes.trainerai.FakeTrainerAiApi
import com.fittrainer.testing.fakes.trainerai.proposalDto
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** E15: "Guardar y asignar". El alumno s1 tiene la rutina r1 activa (la de los fakes). */
@OptIn(ExperimentalCoroutinesApi::class)
class AiAssignControllerTest {
    @get:Rule val main = MainDispatcherRule()

    val aiApi = FakeTrainerAiApi().apply { generated = proposalDto(3) }
    val templatesApi = FakeTrainerTemplatesApi()
    val routinesApi = FakeTrainerRoutinesApi()
    val routines = TrainerRoutinesRepository(routinesApi, FakeTrainerRoutinesDao(), Clock.systemUTC())
    val templates = TrainerTemplatesRepository(templatesApi, FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    val saved = SavedStateHandle()
    val proposal: AiRoutineProposal = proposalDto(3).toDomain()
    val stops = mutableListOf<AiAssignStop>()
    private fun progress(deactivate: List<String> = emptyList()) = AiAssignProgress("s1", "IA · Fuerza", deactivate, existingIds = listOf("r1"))
    private fun TestScope.controller() =
        AiAssignController(TrainerAiRepository(aiApi), templates, routines, saved, this, { "t1" }) { stop, _ -> stops += stop }

    @Test fun `guarda una vez y asigna cada bloque con su nombre y sus dias`() = runTest {
        val c = controller()
        c.start(proposal, progress())
        advanceUntilIdle()
        assertEquals(1, aiApi.saves.size)
        assertEquals(listOf("tpl-0", "tpl-1", "tpl-2"), templatesApi.instantiates.map { it.first })
        assertEquals(listOf("Pecho y tríceps", "Espalda y bíceps", "Piernas"), templatesApi.instantiates.map { it.second.name })
        assertEquals(listOf("friday"), templatesApi.instantiates[2].second.days)
        assertNull(c.done.value!!.warning)
        assertTrue(c.progress!!.done)
    }

    @Test fun `un doble toque no guarda dos veces`() = runTest {
        aiApi.saveGate = CompletableDeferred()
        val c = controller()
        c.start(proposal, progress())
        c.start(proposal, progress())
        aiApi.saveGate!!.complete(Unit)
        advanceUntilIdle()
        assertEquals(1, aiApi.saves.size)
        assertEquals(3, templatesApi.instantiates.size)
    }

    @Test fun `pausa las rutinas activas de antes y no las nuevas`() = runTest {
        val c = controller()
        c.start(proposal, progress(deactivate = listOf("r1")))
        advanceUntilIdle()
        assertEquals(false, routinesApi.server.getValue("r1").active)
        assertNull(c.done.value!!.warning)
    }

    @Test fun `si no puede pausar avisa sin deshacer la asignacion`() = runTest {
        routinesApi.updateError = IOException()
        val c = controller()
        c.start(proposal, progress(deactivate = listOf("r1")))
        advanceUntilIdle()
        assertEquals(pauseFailed(listOf("Push")), c.done.value!!.warning)
        assertEquals(3, templatesApi.instantiates.size)
    }

    @Test fun `con la red cortada al guardar avisa y deja reintentar`() = runTest {
        aiApi.saveErrors += IOException()
        val c = controller()
        c.start(proposal, progress())
        advanceUntilIdle()
        assertTrue(c.state.value.canRetry)
        assertNotNull(c.state.value.message)
        assertTrue(templatesApi.instantiates.isEmpty())
        c.retry(proposal)
        advanceUntilIdle()
        assertEquals(2, aiApi.saves.size)
        assertNotNull(c.done.value)
    }

    @Test fun `la propuesta que ya no existe corta el flujo`() = runTest {
        aiApi.saveErrors += com.fittrainer.testing.fakes.auth.apiError(404, "GENERATION_NOT_FOUND")
        val c = controller()
        c.start(proposal, progress())
        advanceUntilIdle()
        assertEquals(listOf(AiAssignStop.GENERATION_GONE), stops)
        assertNull(c.progress)
    }
}
```

`AiAssignRecoveryTest.kt` (fallas a mitad de camino y recuperación):
```kotlin
package com.fittrainer.ui.routines.trainer.ai.assign

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.data.trainerai.toDomain
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.routines.routineDto
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.testing.fakes.templates.templateDto
import com.fittrainer.testing.fakes.trainerai.FakeTrainerAiApi
import com.fittrainer.testing.fakes.trainerai.proposalDto
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** E15: respuestas perdidas, fallas en un bloque y Android que mata el proceso a mitad de camino. */
@OptIn(ExperimentalCoroutinesApi::class)
class AiAssignRecoveryTest {
    @get:Rule val main = MainDispatcherRule()

    private val aiApi = FakeTrainerAiApi().apply { generated = proposalDto(3) }
    private val templatesApi = FakeTrainerTemplatesApi()
    private val routinesApi = FakeTrainerRoutinesApi()
    private val routines = TrainerRoutinesRepository(routinesApi, FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val templates = TrainerTemplatesRepository(templatesApi, FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    private val saved = SavedStateHandle()
    private val proposal = proposalDto(3).toDomain()
    private val progress = AiAssignProgress("s1", "IA · Fuerza", emptyList(), existingIds = listOf("r1"))
    private fun TestScope.controller() = AiAssignController(TrainerAiRepository(aiApi), templates, routines, saved, this, { "t1" }) { _, _ -> }

    /** Arranca con las fallas que el test cargó en instantiateFailures (una entrada por llamada). */
    private suspend fun TestScope.failSecondBlock(c: AiAssignController) {
        c.start(proposal, progress)
        advanceUntilIdle()
    }

    @Test fun `si falla el bloque 2 reintentar sigue desde ahi sin volver a guardar`() = runTest {
        templatesApi.instantiateFailures += listOf(null, IOException())
        val c = controller()
        failSecondBlock(c)
        assertEquals(1, c.state.value.assigned)
        assertTrue(c.state.value.canRetry)
        assertTrue(c.state.value.message!!.contains(assignedOf(1, 3)))
        c.retry(proposal)
        advanceUntilIdle()
        assertEquals(1, aiApi.saves.size)
        assertEquals(listOf("tpl-0", "tpl-1", "tpl-1", "tpl-2"), templatesApi.instantiates.map { it.first })
        assertNotNull(c.done.value)
    }

    @Test fun `un bloque que se creo aunque no llego la respuesta no se duplica`() = runTest {
        templatesApi.instantiateFailures += listOf(null, IOException())
        val c = controller()
        failSecondBlock(c)
        // El POST del bloque 2 había llegado al backend: la rutina existe aunque el celular no se enteró.
        routinesApi.server["rt-lost"] = routineDto("rt-lost", "s1").copy(name = "Espalda y bíceps", days = listOf("wednesday"))
        c.retry(proposal)
        advanceUntilIdle()
        assertEquals(listOf("tpl-0", "tpl-1", "tpl-2"), templatesApi.instantiates.map { it.first })
        assertEquals("rt-lost", c.progress!!.assigned[1])
    }

    @Test fun `el 409 de guardar se recupera con las plantillas de la lista`() = runTest {
        aiApi.saveErrors += apiError(409, "GENERATION_ALREADY_SAVED")
        listOf("Pecho y tríceps", "Espalda y bíceps", "Piernas").forEachIndexed { i, b ->
            templatesApi.server["ai-$i"] = templateDto("ai-$i", "IA · Fuerza · $b")
        }
        val c = controller()
        c.start(proposal, progress)
        advanceUntilIdle()
        assertEquals(listOf("ai-0", "ai-1", "ai-2"), templatesApi.instantiates.map { it.first })
        assertNotNull(c.done.value)
    }

    @Test fun `un 409 sin las plantillas en la lista no se puede recuperar`() = runTest {
        aiApi.saveErrors += apiError(409, "GENERATION_ALREADY_SAVED")
        val c = controller()
        c.start(proposal, progress)
        advanceUntilIdle()
        assertEquals(ASSIGN_NOT_RECOVERED, c.state.value.message)
        assertFalse(c.state.value.canRetry)
        assertTrue(templatesApi.instantiates.isEmpty())
    }

    @Test fun `con el proceso muerto a mitad de camino el progreso vuelve y no se guarda de nuevo`() = runTest {
        templatesApi.instantiateFailures += listOf(null, IOException())
        failSecondBlock(controller())
        val revived = controller()
        revived.restore(proposal)
        assertEquals(1, revived.state.value.assigned)
        assertTrue(revived.state.value.canRetry)
        revived.retry(proposal)
        advanceUntilIdle()
        assertEquals(1, aiApi.saves.size)
        assertNotNull(revived.done.value)
    }

    @Test fun `restore sin progreso no hace nada`() = runTest {
        val c = controller()
        c.restore(proposal)
        assertNull(c.progress)
        assertFalse(c.state.value.canRetry)
    }
}
```

Agregar a `FakeTrainerTemplatesApi` (en `testing/fakes/templates/FakeTrainerTemplates.kt`) una cola de fallas por llamada, sin romper a los que usan `instantiateError`:
```kotlin
    /** Una entrada por llamada a instantiate: null = sale bien, un Throwable = falla esa llamada. */
    val instantiateFailures = ArrayDeque<Throwable?>()
```
y en `instantiate`, después de `instantiateError?.let { throw it }`:
```kotlin
        instantiateFailures.removeFirstOrNull()?.let { throw it }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd mobile && ./gradlew testDebugUnitTest --tests "com.fittrainer.ui.routines.trainer.ai.assign.*"`
Expected: FAIL de compilación (`AiAssignController`, `AiAssignProgress` no existen).

- [ ] **Step 3: Write the implementation**

`AiAssignProgress.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai.assign

import com.fittrainer.data.trainerai.AiSavedTemplate
import kotlinx.serialization.Serializable

/**
 * Por dónde va "Guardar y asignar" (E15). Vive en el SavedStateHandle: si Android mata el proceso, "Reintentar"
 * sigue desde acá sin volver a guardar ni duplicar rutinas.
 * - existingIds: las rutinas que el alumno tenía antes (para reconocer una creada cuya respuesta se perdió).
 * - assigned: el id de la rutina de cada bloque, o null si falta. attempted: bloques cuyo POST ya salió alguna vez.
 */
@Serializable
data class AiAssignProgress(
    val studentId: String,
    val templateName: String,
    val deactivateIds: List<String>,
    val existingIds: List<String>,
    val templates: List<AiSavedTemplate>? = null,
    val assigned: List<String?> = emptyList(),
    val attempted: Set<Int> = emptySet(),
    val done: Boolean = false,
)

data class AiAssignState(
    val running: Boolean = false,
    val assigned: Int = 0,
    val total: Int = 0,
    val message: String? = null,
    val canRetry: Boolean = false,
)

/** Fallas que no se arreglan reintentando: vuelve al formulario. */
enum class AiAssignStop { GENERATION_GONE, EXERCISES_UNAVAILABLE }

data class AiAssignDone(val warning: String?)

const val AI_SAVE_FAILED = "No pudimos guardar la propuesta. Probá de nuevo."
const val NEEDS_NETWORK_OR_RETRY = "Sin conexión: no se pudo guardar. Probá de nuevo."
const val PROPOSAL_GONE = "La propuesta ya no existe. Generá otra."
const val EXERCISES_GONE = "Un ejercicio dejó de estar disponible. Generá otra."
const val ASSIGN_NOT_RECOVERED = "No se pudo recuperar lo guardado: asigná las plantillas desde «Desde plantilla»."

fun assignedOf(k: Int, n: Int) = "Se asignaron $k de $n"

fun pauseFailed(names: List<String>) = "Las rutinas se asignaron, pero no se pudo pausar ${names.joinToString(" y ")}"
```

`AiAssignController.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai.assign

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.routines.trainer.deactivateOthers
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.AiProposalBlock
import com.fittrainer.data.trainerai.AiRoutineProposal
import com.fittrainer.data.trainerai.AiSavedTemplate
import com.fittrainer.data.trainerai.TrainerAiError
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.data.trainerai.aiTemplateName
import com.fittrainer.data.trainerai.toTrainerAiError
import com.fittrainer.ui.templates.trainer.assign.assignMessage
import java.time.Instant
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val KEY = "ai_assign_progress"
private val json = Json { ignoreUnknownKeys = true }

/**
 * "Guardar y asignar" de la E15: save-as-template (una plantilla por bloque) → instantiate de cada bloque con su
 * nombre y sus días → pausar las rutinas activas de antes → refrescar la ficha. Un solo recorrido a la vez.
 */
class AiAssignController(
    private val ai: TrainerAiRepository,
    private val templates: TrainerTemplatesRepository,
    private val routines: TrainerRoutinesRepository,
    private val saved: SavedStateHandle,
    private val scope: CoroutineScope,
    private val trainerId: suspend () -> String,
    private val onStop: (AiAssignStop, String) -> Unit,
) {
    private val _state = MutableStateFlow(AiAssignState())
    val state: StateFlow<AiAssignState> = _state
    private val _done = MutableStateFlow<AiAssignDone?>(null)
    val done: StateFlow<AiAssignDone?> = _done
    private var job: Job? = null

    val progress: AiAssignProgress? get() = saved.get<String>(KEY)?.let { json.decodeFromString<AiAssignProgress>(it) }
    private fun store(p: AiAssignProgress?) { saved[KEY] = p?.let { json.encodeToString(it) } }

    fun start(proposal: AiRoutineProposal, initial: AiAssignProgress) {
        if (job?.isActive == true || progress != null) return
        store(initial)
        run(proposal)
    }

    fun retry(proposal: AiRoutineProposal) {
        if (job?.isActive == true || !_state.value.canRetry) return
        run(proposal)
    }

    /** Después de que Android mató el proceso: muestra por dónde iba, sin seguir solo. */
    fun restore(proposal: AiRoutineProposal) {
        val p = progress ?: return
        if (p.done) return
        val k = p.assigned.count { it != null }
        _state.value = AiAssignState(assigned = k, total = proposal.blocks.size, message = assignedOf(k, proposal.blocks.size), canRetry = true)
    }

    fun consumeDone() { _done.value = null }

    private fun run(proposal: AiRoutineProposal) {
        val total = proposal.blocks.size
        _state.update { it.copy(running = true, total = total, message = null, canRetry = false) }
        job = scope.launch { execute(trainerId(), proposal, total) }
    }

    /** null = salió bien; si no, el progreso queda guardado y la falla en el estado. */
    private suspend fun saveTemplates(t: String, proposal: AiRoutineProposal, p: AiAssignProgress, total: Int): List<AiSavedTemplate>? =
        ai.save(t, proposal.generationId, p.templateName).getOrElse { e ->
            when (val error = e.toTrainerAiError()) {
                TrainerAiError.AlreadySaved -> recoverSaved(t, proposal, p, total)
                TrainerAiError.GenerationGone -> null.also { stop(AiAssignStop.GENERATION_GONE, PROPOSAL_GONE) }
                is TrainerAiError.ExercisesUnavailable -> null.also { stop(AiAssignStop.EXERCISES_UNAVAILABLE, error.message ?: EXERCISES_GONE) }
                TrainerAiError.Offline, TrainerAiError.Timeout -> null.also { failed(NEEDS_NETWORK_OR_RETRY, canRetry = true) }
                else -> null.also { failed(AI_SAVE_FAILED, canRetry = true) }
            }
        }

    /**
     * El guardado llegó pero la respuesta no (409 al reintentar): las plantillas están en la lista con los nombres
     * que les pone el backend. Se toma la más nueva de cada nombre; si falta alguna, no se puede seguir.
     */
    private suspend fun recoverSaved(t: String, proposal: AiRoutineProposal, p: AiAssignProgress, total: Int): List<AiSavedTemplate>? {
        val list = templates.refreshList(t).getOrNull()?.let { templates.observeList(t).first()?.templates }.orEmpty()
        val found = proposal.blocks.map { b ->
            val name = aiTemplateName(p.templateName, b.name, total)
            list.filter { it.name == name }.maxByOrNull { it.createdAt ?: Instant.MIN }?.let { AiSavedTemplate(it.id, it.name) }
        }
        if (found.any { it == null }) return null.also { failed(ASSIGN_NOT_RECOVERED, canRetry = false) }
        return found.filterNotNull()
    }

    private fun failed(message: String, canRetry: Boolean) =
        _state.update { it.copy(running = false, message = message, canRetry = canRetry) }

    private suspend fun execute(t: String, proposal: AiRoutineProposal, total: Int) {
        var p = progress ?: return
        if (p.templates == null) {
            val list = saveTemplates(t, proposal, p, total) ?: return
            p = p.copy(templates = list, assigned = List(total) { null }).also(::store)
        }
        for ((i, block) in proposal.blocks.withIndex()) {
            if (p.assigned[i] != null) continue
            val found = if (i in p.attempted) findCreated(t, p, block).getOrElse { e -> return assignFailed(e, p, total) } else null
            val id = found ?: run {
                p = p.copy(attempted = p.attempted + i).also(::store)
                templates.instantiate(t, p.templates!![i].id, p.studentId, block.name, block.days).getOrElse { e -> return assignFailed(e, p, total) }
            }
            p = p.copy(assigned = p.assigned.toMutableList().also { it[i] = id }).also(::store)
            _state.update { it.copy(assigned = p.assigned.count { a -> a != null }) }
        }
        val failed = pausePrevious(t, p)
        routines.refreshList(t, p.studentId)
        store(p.copy(done = true))
        _state.update { it.copy(running = false) }
        _done.value = AiAssignDone(failed.takeIf { it.isNotEmpty() }?.let(::pauseFailed))
    }

    private fun stop(reason: AiAssignStop, text: String) {
        store(null)
        _state.value = AiAssignState()
        onStop(reason, text)
    }

    private fun assignFailed(e: Throwable, p: AiAssignProgress, total: Int) {
        val k = p.assigned.count { it != null }
        _state.update { it.copy(running = false, assigned = k, message = "${e.assignMessage()} · ${assignedOf(k, total)}", canRetry = true) }
    }

    /** Una rutina del alumno que no estaba antes, con el nombre y los días del bloque: el POST había llegado. */
    private suspend fun findCreated(t: String, p: AiAssignProgress, block: AiProposalBlock): Result<String?> =
        routines.refreshList(t, p.studentId).map {
            routines.observeStudentRoutines(t, p.studentId).first()?.routines.orEmpty().firstOrNull {
                it.id !in p.existingIds && it.id !in p.assigned && it.name == block.name && it.days.toSet() == block.days.toSet()
            }?.id
        }

    private suspend fun pausePrevious(t: String, p: AiAssignProgress): List<String> {
        if (p.deactivateIds.isEmpty()) return emptyList()
        val previous = routines.observeStudentRoutines(t, p.studentId).first()?.routines.orEmpty().filter { it.id in p.deactivateIds }
        return routines.deactivateOthers(t, previous, keepId = "")
    }
}
```

Si `AiAssignController.kt` pasa de 200 líneas, mové `findCreated` y `pausePrevious` a `AiAssignSteps.kt` (mismo paquete) como funciones `internal` que reciben `routines` (ruling al ledger).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd mobile && ./gradlew testDebugUnitTest --tests "com.fittrainer.ui.routines.trainer.ai.assign.*" --tests "com.fittrainer.ui.templates.trainer.*"`
Expected: PASS (6 + 6 tests nuevos; los de plantillas siguen verdes con el campo nuevo del fake).

---

### Task 4: Formulario, textos y `AiRoutineViewModel`

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/routines/trainer/ai/AiRoutineForm.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/routines/trainer/ai/AiRoutineTexts.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/routines/trainer/ai/AiRoutineUiState.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/routines/trainer/ai/AiRoutineViewModel.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/routines/trainer/ai/AiRoutineFormTest.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/routines/trainer/ai/AiRoutineViewModelTest.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/routines/trainer/ai/AiRoutineSaveTest.kt`

**Interfaces:**
- Consumes: Tasks 2–3; `TrainerStudentDetailRepository.observe(trainerId, id): Flow<StudentDetailCache?>`; `TrainerRoutinesRepository.refreshList/observeStudentRoutines`; `SessionRepository`; `ConnectivityObserver`; `Clock`; `STUDENT_ID_ARG`; `goalLabel` (`ui/join/InvitationMessages.kt`), `LEVELS` (`ui/templates/trainer/TemplatesTexts.kt`), `PREVIOUS_UNKNOWN` (`ui/routines/trainer/create/NewRoutineUiState.kt`).
- Produces: `@Serializable AiRoutineForm(goal?, level?, daysPerWeek=3, durationMin=60, equipment: List<String>?=null, injuries="", preferences="", prefilled=false)`, `enum AiField`, `GOALS`, `DURATIONS`, `fun AiRoutineForm.prefill(detail: StudentDetail)`, `fun AiRoutineForm.errors(): Map<AiField, String>`, `fun AiRoutineForm.toParams(studentId)`, `fun aiFieldOf(backendField: String): AiField?`.
- Produces: `AiRoutineUiState` (form, profileEquipment, proposal, generating, notice, fieldErrors, offerManual, offline, confirmDiscard, savedTemplates, sheet: AiSaveSheet?, activeRoutines, previousKnown, assign: AiAssignState, done: AiAssignDone?, gone), `AiSaveSheet(name, deactivate, nameError)`.
- Produces: `AiRoutineViewModel` con `onGoal, onLevel, onDays, onDuration, onChangeEquipment, onToggleEquipment, onUseProfileEquipment, onInjuries, onPreferences, onGenerate, onGenerateAnother, onBack(): Boolean, onConfirmDiscard, onCancelDiscard, onOpenSave, onTemplateName, onToggleDeactivate, onDismissSave, onSaveAndAssign, onRetryAssign, dismissNotice, consumeDone, consumeGone` y `discarded: StateFlow<Boolean>`.

- [ ] **Step 1: Write the failing tests**

`AiRoutineFormTest.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai

import com.fittrainer.data.students.detail.ActiveRoutine
import com.fittrainer.data.students.detail.StudentDetail
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** E15: el formulario precargado de la ficha y lo que viaja. */
class AiRoutineFormTest {
    private fun detail(goal: String? = "strength", level: String? = "beginner", days: List<String>? = listOf("monday", "thursday"), injuries: String? = "Rodilla") =
        StudentDetail("s1", "Ana", "a@b.c", goal, level, null, true, listOf("Mancuernas"), injuries, Instant.EPOCH, null, null, days?.let { ActiveRoutine("Push", it) })

    @Test fun `precarga objetivo, nivel, dias de la rutina activa y lesiones`() {
        val f = AiRoutineForm().prefill(detail())
        assertEquals("strength", f.goal)
        assertEquals("beginner", f.level)
        assertEquals(2, f.daysPerWeek)
        assertEquals("Rodilla", f.injuries)
        assertNull(f.equipment)
        assertTrue(f.prefilled)
    }

    @Test fun `sin rutina activa son 3 dias y un objetivo desconocido queda sin elegir`() {
        val f = AiRoutineForm().prefill(detail(goal = "otro", level = null, days = null, injuries = null))
        assertNull(f.goal)
        assertNull(f.level)
        assertEquals(DEFAULT_DAYS, f.daysPerWeek)
        assertEquals("", f.injuries)
    }

    @Test fun `sin objetivo ni nivel hay errores en esos campos`() {
        assertEquals(setOf(AiField.GOAL, AiField.LEVEL), AiRoutineForm().errors().keys)
    }

    @Test fun `los parametros llevan el equipamiento tal cual`() {
        val base = AiRoutineForm(goal = "strength", level = "beginner")
        assertNull(base.toParams("s1").equipment)
        assertEquals(emptyList<String>(), base.copy(equipment = emptyList()).toParams("s1").equipment)
        assertEquals(listOf("barbell"), base.copy(equipment = listOf("barbell")).toParams("s1").equipment)
    }

    @Test fun `los campos del backend van a su campo`() {
        assertEquals(AiField.DAYS, aiFieldOf("frequency_per_week"))
        assertEquals(AiField.EQUIPMENT, aiFieldOf("available_equipment"))
        assertNull(aiFieldOf("student_id"))
    }
}
```

`AiRoutineViewModelTest.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.students.FakeStudentDetailApi
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerStudentDetailDao
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.testing.fakes.trainerai.FakeTrainerAiApi
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import java.io.IOException
import java.time.Clock
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** E15: el formulario y la propuesta. La ficha de s1 (fake): fuerza, principiante, lunes y jueves, "Lumbalgia". */
@OptIn(ExperimentalCoroutinesApi::class)
class AiRoutineViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    val aiApi = FakeTrainerAiApi()
    val connectivity = FakeConnectivityObserver()
    val detailApi = FakeStudentDetailApi()
    val details = TrainerStudentDetailRepository(detailApi, FakeTrainerStudentDetailDao(), Clock.systemUTC())
    val routines = TrainerRoutinesRepository(FakeTrainerRoutinesApi(), FakeTrainerRoutinesDao(), Clock.systemUTC())
    val templates = TrainerTemplatesRepository(FakeTrainerTemplatesApi(), FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    val saved = SavedStateHandle(mapOf(STUDENT_ID_ARG to "s1"))

    suspend fun TestScope.vm(handle: SavedStateHandle = saved): AiRoutineViewModel {
        details.refresh("t1", "s1")
        return AiRoutineViewModel(TrainerAiRepository(aiApi), templates, routines, details, FakeTrainerSession(), connectivity, Clock.systemUTC(), handle)
            .also { advanceUntilIdle() }
    }

    @Test fun `precarga la ficha`() = runTest {
        val s = vm().uiState.value
        assertEquals("strength", s.form.goal)
        assertEquals(2, s.form.daysPerWeek)
        assertEquals("Lumbalgia", s.form.injuries)
        assertEquals("Mancuernas, Banco", s.profileEquipment)
    }

    @Test fun `genera y muestra la propuesta`() = runTest {
        val vm = vm()
        vm.onGenerate()
        advanceUntilIdle()
        assertEquals("s1", aiApi.requests.single().studentId)
        assertEquals("Lumbalgia", aiApi.requests.single().injuries)
        assertNotNull(vm.uiState.value.proposal)
        assertFalse(vm.uiState.value.generating)
    }

    @Test fun `un doble toque genera una sola vez`() = runTest {
        aiApi.generateGate = CompletableDeferred()
        val vm = vm()
        vm.onGenerate()
        vm.onGenerate()
        aiApi.generateGate!!.complete(Unit)
        advanceUntilIdle()
        assertEquals(1, aiApi.requests.size)
    }

    @Test fun `sin objetivo ni nivel marca los campos y no pide nada`() = runTest {
        detailApi.detail = detailApi.detail.copy(goal = null, level = null)
        val vm = vm()
        vm.onGenerate()
        advanceUntilIdle()
        assertEquals(setOf(AiField.GOAL, AiField.LEVEL), vm.uiState.value.fieldErrors.keys)
        assertTrue(aiApi.requests.isEmpty())
    }

    @Test fun `si se corta la red el formulario queda y avisa`() = runTest {
        aiApi.generateErrors += IOException()
        val vm = vm()
        vm.onInjuries("Hombro")
        vm.onGenerate()
        advanceUntilIdle()
        assertEquals(AI_NEEDS_NETWORK, vm.uiState.value.notice)
        assertEquals("Hombro", vm.uiState.value.form.injuries)
        assertNull(vm.uiState.value.proposal)
    }

    @Test fun `el 503 ofrece armarla a mano y el 404 del alumno sale`() = runTest {
        aiApi.generateErrors += apiError(503, "AI_UNAVAILABLE")
        val vm = vm()
        vm.onGenerate()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.offerManual)
        aiApi.generateErrors += apiError(404, "STUDENT_NOT_FOUND")
        vm.onGenerate()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.gone)
    }

    @Test fun `el equipamiento cambiado viaja y usar el del perfil lo saca`() = runTest {
        val vm = vm()
        vm.onChangeEquipment()
        vm.onToggleEquipment("barbell")
        vm.onGenerate()
        advanceUntilIdle()
        assertEquals(listOf("barbell"), aiApi.requests.last().availableEquipment)
        vm.onGenerateAnother()
        vm.onUseProfileEquipment()
        vm.onGenerate()
        advanceUntilIdle()
        assertNull(aiApi.requests.last().availableEquipment)
    }

    @Test fun `la propuesta y el formulario vuelven si Android mata el proceso`() = runTest {
        val first = vm()
        first.onPreferences("Sin saltos")
        first.onGenerate()
        advanceUntilIdle()
        val revived = vm(saved)
        assertNotNull(revived.uiState.value.proposal)
        assertEquals("Sin saltos", revived.uiState.value.form.preferences)
    }

    @Test fun `atras con propuesta pide confirmar y descartar sale`() = runTest {
        val vm = vm()
        assertFalse(vm.onBack())
        vm.onGenerate()
        advanceUntilIdle()
        assertTrue(vm.onBack())
        assertTrue(vm.uiState.value.confirmDiscard)
        vm.onConfirmDiscard()
        assertTrue(vm.discarded.value)
    }

    @Test fun `sin red no se genera`() = runTest {
        connectivity.state.value = false
        val vm = vm()
        vm.onGenerate()
        advanceUntilIdle()
        assertTrue(aiApi.requests.isEmpty())
        assertEquals(AI_NEEDS_NETWORK, vm.uiState.value.notice)
    }
}
```

`AiRoutineSaveTest.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.apiError
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesApi
import com.fittrainer.testing.fakes.routines.FakeTrainerRoutinesDao
import com.fittrainer.testing.fakes.students.FakeStudentDetailApi
import com.fittrainer.testing.fakes.students.FakeTrainerSession
import com.fittrainer.testing.fakes.students.FakeTrainerStudentDetailDao
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesApi
import com.fittrainer.testing.fakes.templates.FakeTrainerTemplatesDao
import com.fittrainer.testing.fakes.trainerai.FakeTrainerAiApi
import com.fittrainer.testing.fakes.trainerai.proposalDto
import com.fittrainer.ui.routines.trainer.ai.assign.PROPOSAL_GONE
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import java.time.Clock
import java.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** E15: la hoja "Guardar y asignar". s1 tiene la rutina r1 ("Push") activa. Hoy: 09/11/2026. */
@OptIn(ExperimentalCoroutinesApi::class)
class AiRoutineSaveTest {
    @get:Rule val main = MainDispatcherRule()

    private val aiApi = FakeTrainerAiApi().apply { generated = proposalDto(3) }
    private val templatesApi = FakeTrainerTemplatesApi()
    private val routinesApi = FakeTrainerRoutinesApi()
    private val details = TrainerStudentDetailRepository(FakeStudentDetailApi(), FakeTrainerStudentDetailDao(), Clock.systemUTC())
    private val routines = TrainerRoutinesRepository(routinesApi, FakeTrainerRoutinesDao(), Clock.systemUTC())
    private val templates = TrainerTemplatesRepository(templatesApi, FakeTrainerTemplatesDao(), routines, Clock.systemUTC())
    private val clock = MutableClock(Instant.parse("2026-11-09T15:00:00Z").toEpochMilli())

    private suspend fun TestScope.withProposal(): AiRoutineViewModel {
        details.refresh("t1", "s1")
        val vm = AiRoutineViewModel(TrainerAiRepository(aiApi), templates, routines, details, FakeTrainerSession(), FakeConnectivityObserver(), clock, SavedStateHandle(mapOf(STUDENT_ID_ARG to "s1")))
        advanceUntilIdle()
        vm.onGenerate()
        advanceUntilIdle()
        vm.onOpenSave()
        return vm
    }

    @Test fun `la hoja propone un nombre y ofrece pausar la rutina activa`() = runTest {
        val sheet = withProposal().uiState.value.sheet!!
        assertEquals("IA · Ganar fuerza · 09/11", sheet.name)
        assertTrue(sheet.deactivate)
    }

    @Test fun `guardar y asignar pausa la anterior y termina`() = runTest {
        val vm = withProposal()
        vm.onSaveAndAssign()
        advanceUntilIdle()
        assertEquals("IA · Ganar fuerza · 09/11", aiApi.saves.single().templateName)
        assertEquals(3, templatesApi.instantiates.size)
        assertEquals(false, routinesApi.server.getValue("r1").active)
        assertNotNull(vm.uiState.value.done)
    }

    @Test fun `un nombre vacio no guarda`() = runTest {
        val vm = withProposal()
        vm.onTemplateName("   ")
        vm.onSaveAndAssign()
        advanceUntilIdle()
        assertNotNull(vm.uiState.value.sheet!!.nameError)
        assertTrue(aiApi.saves.isEmpty())
    }

    @Test fun `la propuesta que ya no existe vuelve al formulario con el aviso`() = runTest {
        aiApi.saveErrors += apiError(404, "GENERATION_NOT_FOUND")
        val vm = withProposal()
        vm.onSaveAndAssign()
        advanceUntilIdle()
        assertNull(vm.uiState.value.proposal)
        assertNull(vm.uiState.value.sheet)
        assertEquals(PROPOSAL_GONE, vm.uiState.value.notice)
    }

    @Test fun `con plantillas ya guardadas descartar avisa que quedan en Plantillas`() = runTest {
        templatesApi.instantiateFailures += listOf(java.io.IOException())
        val vm = withProposal()
        vm.onSaveAndAssign()
        advanceUntilIdle()
        vm.onDismissSave()
        assertTrue(vm.onBack())
        assertTrue(vm.uiState.value.savedTemplates)
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd mobile && ./gradlew testDebugUnitTest --tests "com.fittrainer.ui.routines.trainer.ai.*"`
Expected: FAIL de compilación (`AiRoutineForm`, `AiRoutineViewModel` no existen).

- [ ] **Step 3: Write the implementation**

`AiRoutineForm.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai

import com.fittrainer.data.students.detail.StudentDetail
import com.fittrainer.data.trainerai.AiRoutineParams
import com.fittrainer.ui.templates.trainer.LEVELS
import kotlinx.serialization.Serializable

const val DEFAULT_DAYS = 3
const val DEFAULT_DURATION = 60
const val MAX_TEXT = 500
val DURATIONS = listOf(30, 45, 60, 75, 90)
/** En el orden de ROUTINE_GOALS del backend. */
val GOALS = listOf("hypertrophy", "strength", "weight_loss", "tonify")

/**
 * El formulario del asistente (E15). Serializable: vive en el SavedStateHandle.
 * equipment null = el de la ficha (no viaja); una lista = lo que marcó con "Cambiar" (vacía = solo peso corporal).
 */
@Serializable
data class AiRoutineForm(
    val goal: String? = null,
    val level: String? = null,
    val daysPerWeek: Int = DEFAULT_DAYS,
    val durationMin: Int = DEFAULT_DURATION,
    val equipment: List<String>? = null,
    val injuries: String = "",
    val preferences: String = "",
    val prefilled: Boolean = false,
)

enum class AiField { GOAL, LEVEL, DAYS, DURATION, EQUIPMENT, INJURIES, PREFERENCES }

/** Lo de la ficha; un objetivo o nivel que el backend no acepta queda sin elegir. Días: los de la rutina activa o 3. */
fun AiRoutineForm.prefill(d: StudentDetail) = copy(
    goal = d.goal?.takeIf { it in GOALS },
    level = d.level?.takeIf { it in LEVELS },
    daysPerWeek = d.activeRoutine?.days?.size?.takeIf { it in 1..7 } ?: DEFAULT_DAYS,
    injuries = d.injuries.orEmpty().take(MAX_TEXT),
    prefilled = true,
)

fun AiRoutineForm.errors(): Map<AiField, String> = buildMap {
    if (goal == null) put(AiField.GOAL, PICK_GOAL)
    if (level == null) put(AiField.LEVEL, PICK_LEVEL)
}

/** Solo con [errors] vacío. Las lesiones viajan siempre (vacías = "sin lesiones"). */
fun AiRoutineForm.toParams(studentId: String) = AiRoutineParams(
    studentId, checkNotNull(goal), checkNotNull(level), daysPerWeek, durationMin, equipment, injuries, preferences,
)

fun aiFieldOf(backendField: String): AiField? = when (backendField) {
    "goal" -> AiField.GOAL
    "level" -> AiField.LEVEL
    "frequency_per_week" -> AiField.DAYS
    "session_duration_min" -> AiField.DURATION
    "available_equipment" -> AiField.EQUIPMENT
    "injuries" -> AiField.INJURIES
    "preferences" -> AiField.PREFERENCES
    else -> null
}
```

`AiRoutineTexts.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai

import com.fittrainer.data.trainerai.TrainerAiError
import com.fittrainer.ui.join.goalLabel
import java.time.LocalDate
import java.time.format.DateTimeFormatter

const val AI_TITLE = "Rutina con IA"
const val AI_WITH_AI = "Con IA ✦"
const val AI_GENERATE = "Generar propuesta"
const val AI_GENERATING = "Armando la rutina… puede tardar hasta 30 s"
const val AI_GENERATE_ANOTHER = "Generar otra"
const val AI_SAVE_ASSIGN = "Guardar y asignar"
const val AI_RATIONALE = "Por qué la armó así"
const val AI_PRIVACY = "No pongas datos personales (nombre, documento, contacto): este texto se le manda a la IA."
const val AI_NEEDS_NETWORK = "Necesitás conexión para usar el asistente."
const val AI_TIMEOUT = "La IA tardó demasiado. Probá de nuevo."
const val AI_UNKNOWN = "Algo salió mal. Probá de nuevo."
const val AI_TOO_MANY = "Hiciste muchas propuestas seguidas."
const val AI_MANUAL = "Armar a mano"
const val AI_DISCARD_TITLE = "¿Descartar la propuesta?"
const val AI_DISCARD_SAVED = "Las plantillas ya se guardaron: las podés asignar desde «Desde plantilla»."
const val AI_DISCARD = "Descartar"
const val AI_KEEP = "Seguir revisando"
const val AI_ASSIGNED = "Rutina asignada: ajustala desde Rutinas"
const val AI_PROFILE_EQUIPMENT = "Del perfil"
const val AI_NO_EQUIPMENT = "Sin cargar"
const val AI_CHANGE = "Cambiar"
const val AI_USE_PROFILE = "Usar el del perfil"
const val AI_TEMPLATE_NAME = "Nombre de la plantilla"
const val AI_NAME_REQUIRED = "Poné un nombre de 1 a 120 caracteres"
const val PICK_GOAL = "Elegí un objetivo"
const val PICK_LEVEL = "Elegí un nivel"

private val DAY_MONTH = DateTimeFormatter.ofPattern("dd/MM")

/** "IA · Ganar fuerza · 09/11". */
fun defaultTemplateName(goal: String?, today: LocalDate) = "IA · ${goalLabel(goal)} · ${today.format(DAY_MONTH)}"

fun blocksNameHint(name: String) = "Con varios bloques, cada plantilla se llama «${name.trim()} · <bloque>»."

fun durationLabel(min: Int) = "$min min"

/** El aviso de una falla al generar; los mensajes del backend se muestran tal cual. */
fun generateMessage(error: TrainerAiError): String = when (error) {
    TrainerAiError.Offline -> AI_NEEDS_NETWORK
    TrainerAiError.Timeout -> AI_TIMEOUT
    is TrainerAiError.TooManyAttempts -> listOfNotNull(
        error.message ?: AI_TOO_MANY,
        error.retryAfterSeconds?.let { "Podés volver a pedir en ${(it + 59) / 60} min." },
    ).joinToString(" ")
    is TrainerAiError.Unavailable -> error.message ?: AI_UNKNOWN
    is TrainerAiError.InvalidResponse -> error.message ?: AI_UNKNOWN
    is TrainerAiError.Validation -> error.message ?: AI_UNKNOWN
    else -> AI_UNKNOWN
}
```

`AiRoutineUiState.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai

import com.fittrainer.data.routines.trainer.TrainerRoutineSummary
import com.fittrainer.data.trainerai.AiRoutineProposal
import com.fittrainer.ui.routines.trainer.ai.assign.AiAssignDone
import com.fittrainer.ui.routines.trainer.ai.assign.AiAssignState

/** La hoja "Guardar y asignar". deactivate: pausar las rutinas activas de antes. */
data class AiSaveSheet(val name: String, val deactivate: Boolean = true, val nameError: String? = null)

/** Lo que vive solo en memoria del ViewModel (lo demás está en el SavedStateHandle). */
data class AiRoutineLocal(
    val generating: Boolean = false,
    val notice: String? = null,
    val fieldErrors: Map<AiField, String> = emptyMap(),
    val offerManual: Boolean = false,
    val confirmDiscard: Boolean = false,
    val sheet: AiSaveSheet? = null,
    val gone: Boolean = false,
)

/**
 * Pantalla "Rutina con IA" (E15): con [proposal] null es el formulario; si no, la propuesta.
 * previousKnown: ya se sabe qué rutinas tiene el alumno (sin eso no se asigna, como en "Desde plantilla").
 */
data class AiRoutineUiState(
    val form: AiRoutineForm = AiRoutineForm(),
    val profileEquipment: String? = null,
    val proposal: AiRoutineProposal? = null,
    val generating: Boolean = false,
    val notice: String? = null,
    val fieldErrors: Map<AiField, String> = emptyMap(),
    val offerManual: Boolean = false,
    val offline: Boolean = false,
    val confirmDiscard: Boolean = false,
    val savedTemplates: Boolean = false,
    val sheet: AiSaveSheet? = null,
    val activeRoutines: List<TrainerRoutineSummary> = emptyList(),
    val previousKnown: Boolean = false,
    /** Todas las rutinas del alumno antes de asignar: para reconocer una creada cuya respuesta se perdió. */
    val allRoutineIds: List<String> = emptyList(),
    val assign: AiAssignState = AiAssignState(),
    val done: AiAssignDone? = null,
    val gone: Boolean = false,
) {
    val canGenerate get() = !generating && !offline && proposal == null
}
```

`AiRoutineViewModel.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.routines.trainer.StudentRoutinesCache
import com.fittrainer.data.routines.trainer.TrainerRoutinesRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.students.detail.TrainerStudentDetailRepository
import com.fittrainer.data.templates.trainer.TrainerTemplatesRepository
import com.fittrainer.data.trainerai.AiRoutineProposal
import com.fittrainer.data.trainerai.MAX_TEMPLATE_NAME
import com.fittrainer.data.trainerai.TrainerAiError
import com.fittrainer.data.trainerai.TrainerAiRepository
import com.fittrainer.data.trainerai.toTrainerAiError
import com.fittrainer.ui.routines.trainer.ai.assign.AiAssignController
import com.fittrainer.ui.routines.trainer.ai.assign.AiAssignProgress
import com.fittrainer.ui.students.detail.STUDENT_ID_ARG
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import java.time.LocalDate
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val FORM_KEY = "ai_form"
private const val PROPOSAL_KEY = "ai_proposal"
private val json = Json { ignoreUnknownKeys = true }

/** "Rutina con IA" (E15): formulario precargado de la ficha → propuesta → "Guardar y asignar". */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class AiRoutineViewModel @Inject constructor(
    private val ai: TrainerAiRepository,
    templates: TrainerTemplatesRepository,
    private val routines: TrainerRoutinesRepository,
    details: TrainerStudentDetailRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
    private val saved: SavedStateHandle,
) : ViewModel() {
    private val studentId: String = checkNotNull(saved[STUDENT_ID_ARG])
    private val trainerId = sessionRepository.session.map { (it as? Session.Trainer)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private suspend fun trainer() = trainerId.filterNotNull().first()

    private val form = MutableStateFlow(saved.get<String>(FORM_KEY)?.let { json.decodeFromString<AiRoutineForm>(it) } ?: AiRoutineForm())
    private val proposal = MutableStateFlow(saved.get<String>(PROPOSAL_KEY)?.let { json.decodeFromString<AiRoutineProposal>(it) })
    private val local = MutableStateFlow(AiRoutineLocal())
    private val _discarded = MutableStateFlow(false)
    val discarded: StateFlow<Boolean> = _discarded

    val assign = AiAssignController(ai, templates, routines, saved, viewModelScope, ::trainer) { _, text ->
        setProposal(null)
        local.update { it.copy(sheet = null, notice = text) }
    }

    private val student = trainerId.filterNotNull().flatMapLatest { details.observe(it, studentId) }.map { it?.detail }
    private val studentRoutines = trainerId.filterNotNull().flatMapLatest { routines.observeStudentRoutines(it, studentId) }

    private val content = combine(form, proposal, local, student, studentRoutines) { f, p, l, d, r -> Content(f, p, l, d?.gymEquipment, r) }

    val uiState: StateFlow<AiRoutineUiState> =
        combine(content, connectivity.isOnline, assign.state, assign.done) { c, online, a, done -> c.toUiState(!online, a, done) }
            .stateIn(viewModelScope, SharingStarted.Eagerly, AiRoutineUiState())

    init {
        proposal.value?.let(assign::restore)
        viewModelScope.launch {
            val d = student.filterNotNull().first()
            if (!form.value.prefilled) setForm(form.value.prefill(d))
        }
        viewModelScope.launch { routines.refreshList(trainer(), studentId) }
    }

    fun onGoal(goal: String) = editForm(AiField.GOAL) { it.copy(goal = goal) }
    fun onLevel(level: String) = editForm(AiField.LEVEL) { it.copy(level = level) }
    fun onDays(days: Int) = editForm(AiField.DAYS) { it.copy(daysPerWeek = days.coerceIn(1, 7)) }
    fun onDuration(min: Int) = editForm(AiField.DURATION) { it.copy(durationMin = min) }
    fun onChangeEquipment() = editForm(AiField.EQUIPMENT) { it.copy(equipment = emptyList()) }
    fun onToggleEquipment(code: String) = editForm(AiField.EQUIPMENT) { f ->
        val now = f.equipment.orEmpty()
        f.copy(equipment = if (code in now) now - code else now + code)
    }
    fun onUseProfileEquipment() = editForm(AiField.EQUIPMENT) { it.copy(equipment = null) }
    fun onInjuries(text: String) = editForm(AiField.INJURIES) { it.copy(injuries = text.take(MAX_TEXT)) }
    fun onPreferences(text: String) = editForm(AiField.PREFERENCES) { it.copy(preferences = text.take(MAX_TEXT)) }
    fun dismissNotice() = local.update { it.copy(notice = null, offerManual = false) }
    fun consumeGone() = local.update { it.copy(gone = false) }
    fun consumeDone() = assign.consumeDone()

    fun onGenerate() {
        val s = uiState.value
        if (s.generating || s.proposal != null) return
        if (s.offline) return local.update { it.copy(notice = AI_NEEDS_NETWORK) }
        val errors = form.value.errors()
        if (errors.isNotEmpty()) return local.update { it.copy(fieldErrors = errors) }
        val params = form.value.toParams(studentId)
        local.update { it.copy(generating = true, notice = null, offerManual = false, fieldErrors = emptyMap()) }
        viewModelScope.launch {
            ai.generate(trainer(), params)
                .onSuccess { p -> setProposal(p); local.update { it.copy(generating = false) } }
                .onFailure { e -> onGenerateFailed(e.toTrainerAiError()) }
        }
    }

    private fun onGenerateFailed(error: TrainerAiError) = local.update {
        val fields = (error as? TrainerAiError.Validation)?.fields.orEmpty().mapNotNull { (k, v) -> aiFieldOf(k)?.let { f -> f to v } }.toMap()
        it.copy(
            generating = false, gone = error == TrainerAiError.StudentGone, fieldErrors = fields,
            notice = if (fields.isEmpty()) generateMessage(error) else null, offerManual = error is TrainerAiError.Unavailable,
        )
    }

    /** "Generar otra": vuelve al formulario con los mismos datos. Una propuesta ya guardada no se descarta así. */
    fun onGenerateAnother() {
        if (assign.progress != null) return
        setProposal(null)
    }

    /** true si la pantalla se queda (confirma o está asignando); false = puede salir. */
    fun onBack(): Boolean {
        if (uiState.value.assign.running) return true
        if (proposal.value == null || uiState.value.done != null) return false
        local.update { it.copy(confirmDiscard = true, sheet = null) }
        return true
    }

    fun onConfirmDiscard() {
        local.update { it.copy(confirmDiscard = false) }
        _discarded.value = true
    }

    fun onCancelDiscard() = local.update { it.copy(confirmDiscard = false) }

    fun onOpenSave() {
        if (proposal.value == null) return
        val name = assign.progress?.templateName ?: defaultTemplateName(form.value.goal, LocalDate.now(clock))
        local.update { it.copy(sheet = AiSaveSheet(name)) }
    }

    fun onTemplateName(name: String) = local.update { it.copy(sheet = it.sheet?.copy(name = name.take(MAX_TEMPLATE_NAME), nameError = null)) }
    fun onToggleDeactivate(on: Boolean) = local.update { it.copy(sheet = it.sheet?.copy(deactivate = on)) }
    fun onDismissSave() = local.update { if (uiState.value.assign.running) it else it.copy(sheet = null) }

    fun onSaveAndAssign() {
        val s = uiState.value
        val p = s.proposal ?: return
        val sheet = s.sheet ?: return
        if (s.assign.running) return
        if (assign.progress != null) return assign.retry(p)
        val name = sheet.name.trim()
        if (name.isEmpty()) return local.update { it.copy(sheet = sheet.copy(nameError = AI_NAME_REQUIRED)) }
        if (s.offline) return local.update { it.copy(notice = AI_NEEDS_NETWORK) }
        if (!s.previousKnown) {
            // Sin saber qué rutinas tiene no se asigna "a ciegas" (como en "Desde plantilla"): se vuelve a pedir.
            local.update { it.copy(notice = PREVIOUS_UNKNOWN) }
            viewModelScope.launch { routines.refreshList(trainer(), studentId) }
            return
        }
        val deactivate = if (sheet.deactivate) s.activeRoutines.map { it.id } else emptyList()
        assign.start(p, AiAssignProgress(studentId, name, deactivate, existingIds = s.allRoutineIds))
    }

    fun onRetryAssign() = proposal.value?.let(assign::retry)

    private fun editForm(field: AiField, change: (AiRoutineForm) -> AiRoutineForm) {
        if (local.value.generating || proposal.value != null) return
        setForm(change(form.value))
        local.update { it.copy(fieldErrors = it.fieldErrors - field) }
    }

    private fun setForm(f: AiRoutineForm) {
        form.value = f
        saved[FORM_KEY] = json.encodeToString(f)
    }

    private fun setProposal(p: AiRoutineProposal?) {
        proposal.value = p
        saved[PROPOSAL_KEY] = p?.let { json.encodeToString(it) }
    }

    private data class Content(
        val form: AiRoutineForm, val proposal: AiRoutineProposal?, val local: AiRoutineLocal,
        val equipment: List<String>?, val routines: StudentRoutinesCache?,
    )

    private fun Content.toUiState(offline: Boolean, a: AiAssignState, done: AiAssignDone?) = AiRoutineUiState(
        form = form, profileEquipment = equipment?.takeIf { it.isNotEmpty() }?.joinToString(", "), proposal = proposal,
        generating = local.generating, notice = local.notice, fieldErrors = local.fieldErrors, offerManual = local.offerManual,
        offline = offline, confirmDiscard = local.confirmDiscard, savedTemplates = assign.progress?.templates != null,
        sheet = local.sheet, activeRoutines = routines?.routines.orEmpty().filter { it.active }, previousKnown = routines != null,
        allRoutineIds = routines?.routines.orEmpty().map { it.id }, assign = a, done = done, gone = local.gone,
    )
}
```

Imports que faltan en el bloque de arriba: `com.fittrainer.ui.routines.trainer.ai.assign.AiAssignState`, `com.fittrainer.ui.routines.trainer.ai.assign.AiAssignDone` y `com.fittrainer.ui.routines.trainer.create.PREVIOUS_UNKNOWN`. Si `AiRoutineViewModel.kt` pasa de 200 líneas, mové `Content`, `toUiState` y `onGenerateFailed` a `AiRoutineState.kt` (mismo paquete, `internal`), ruling al ledger. `Clock` ya lo provee Hilt (`DatabaseModule.provideClock`).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd mobile && ./gradlew testDebugUnitTest --tests "com.fittrainer.ui.routines.trainer.ai.*"`
Expected: PASS (5 + 10 + 5 tests).

---

### Task 5: Pantalla, componentes, navegación y entrada desde la ficha

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/routines/trainer/ai/AiRoutineScreen.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/routines/trainer/ai/components/AiFormContent.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/routines/trainer/ai/components/EquipmentField.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/routines/trainer/ai/components/ProposalContent.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/routines/trainer/ai/components/AiSaveSheet.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/routines/trainer/section/AssignChoiceSheet.kt` (tercer botón)
- Modify: `mobile/app/src/main/java/com/fittrainer/navigation/trainer/TrainerRoutineRoutes.kt` (ruta nueva)
- Modify: `mobile/app/src/main/java/com/fittrainer/navigation/trainer/TrainerStudentRoutes.kt` (`onWithAi` y el aviso)

**Interfaces:**
- Consumes: Task 4 (`AiRoutineViewModel`, `AiRoutineUiState`, textos), `NoticeBanner(message, onDismiss)`, `routineDaysLabel`, `prescription`, `goalLabel`, `levelLabel` (`ui/templates/trainer`), `equipmentLabel`, `EQUIPMENT_ORDER`, `CheckRow`, `deactivateLabel`.
- Produces: `const val TRAINER_AI_ROUTINE_ROUTE = "trainer/students/{studentId}/routines/ai"`, `fun trainerAiRoutineRoute(studentId: String)`, `const val AI_ROUTINE_NOTICE_KEY = "ai_routine_notice"`, `AssignRoutineAction(enabled, onNew, onFromTemplate, onWithAi)`.

- [ ] **Step 1: Entrada en "Asignar rutina"**

En `AssignChoiceSheet.kt`, `AssignRoutineAction` y `AssignChoiceSheet` reciben `onWithAi: () -> Unit` y la hoja suma, debajo de "Desde plantilla":
```kotlin
            OutlinedButton(onClick = onWithAi, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(AI_WITH_AI) }
```
con `onWithAi = { open = false; onWithAi() }` en `AssignRoutineAction` y el import de `com.fittrainer.ui.routines.trainer.ai.AI_WITH_AI`. Actualizá el KDoc: "(E8 + E9 + E15)".

- [ ] **Step 2: Ruta y vuelta a la ficha con el aviso**

En `TrainerRoutineRoutes.kt`:
```kotlin
const val TRAINER_AI_ROUTINE_ROUTE = "trainer/students/{studentId}/routines/ai"
fun trainerAiRoutineRoute(studentId: String) = "trainer/students/$studentId/routines/ai"
/** El aviso que deja "Guardar y asignar" en la ficha (lo lee TrainerStudentRoutes). */
const val AI_ROUTINE_NOTICE_KEY = "ai_routine_notice"
```
y dentro de `trainerRoutineRoutes`:
```kotlin
    composable(TRAINER_AI_ROUTINE_ROUTE) { entry ->
        val studentId = entry.arguments?.getString("studentId").orEmpty()
        AiRoutineScreen(
            onBack = { navController.popBackStack() },
            // Solo si sigue arriba: un segundo disparo no saca también la ficha.
            onDone = { notice ->
                if (navController.currentBackStackEntry?.id == entry.id) {
                    navController.previousBackStackEntry?.savedStateHandle?.set(AI_ROUTINE_NOTICE_KEY, notice)
                    navController.popBackStack()
                }
            },
            onManual = {
                navController.navigate(trainerNewRoutineRoute(studentId)) {
                    popUpTo(TRAINER_AI_ROUTINE_ROUTE) { inclusive = true }
                    launchSingleTop = true
                }
            },
            onGone = { navController.popBackStack(TRAINER_STUDENTS_ROUTE, inclusive = false) },
        )
    }
```
(import `com.fittrainer.navigation.TRAINER_STUDENTS_ROUTE` y `com.fittrainer.ui.routines.trainer.ai.AiRoutineScreen`).

En `TrainerStudentRoutes.kt`, dentro de `composable(TRAINER_STUDENT_DETAIL_ROUTE) { entry ->`:
```kotlin
        // El handle de la entrada no es el del ViewModel: el aviso de "Guardar y asignar" se lee acá.
        val aiNotice by entry.savedStateHandle.getStateFlow<String?>(AI_ROUTINE_NOTICE_KEY, null).collectAsStateWithLifecycle()
```
en `AssignRoutineAction(...)` agregá `onWithAi = { navController.navigate(trainerAiRoutineRoute(id)) { launchSingleTop = true } }`, y como primer `item` de `topSections`:
```kotlin
                aiNotice?.let { notice -> item { NoticeBanner(notice) { entry.savedStateHandle[AI_ROUTINE_NOTICE_KEY] = null } } }
```
(imports: `androidx.compose.runtime.getValue`, `androidx.lifecycle.compose.collectAsStateWithLifecycle`, `com.fittrainer.ui.components.NoticeBanner`).

- [ ] **Step 3: Componentes**

`components/EquipmentField.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import com.fittrainer.ui.components.exercise.EQUIPMENT_ORDER
import com.fittrainer.ui.components.exercise.equipmentLabel
import com.fittrainer.ui.routines.trainer.ai.AI_CHANGE
import com.fittrainer.ui.routines.trainer.ai.AI_NO_EQUIPMENT
import com.fittrainer.ui.routines.trainer.ai.AI_PROFILE_EQUIPMENT
import com.fittrainer.ui.routines.trainer.ai.AI_USE_PROFILE
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Equipamiento (E15): sin tocar, el texto de la ficha; con "Cambiar", los 7 del catálogo (ninguno = peso corporal). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EquipmentField(
    profile: String?,
    selected: List<String>?,
    enabled: Boolean,
    onChange: () -> Unit,
    onToggle: (String) -> Unit,
    onUseProfile: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text("Equipamiento", style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
        if (selected == null) {
            Text("$AI_PROFILE_EQUIPMENT: ${profile ?: AI_NO_EQUIPMENT}", color = FtColors.TextSecondary)
            TextButton(onClick = onChange, enabled = enabled) { Text(AI_CHANGE) }
        } else {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                EQUIPMENT_ORDER.forEach { code ->
                    FilterChip(selected = code in selected, onClick = { onToggle(code) }, enabled = enabled, label = { Text(equipmentLabel(code)) })
                }
            }
            TextButton(onClick = onUseProfile, enabled = enabled) { Text(AI_USE_PROFILE) }
        }
    }
}
```

`components/AiFormContent.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.routines.trainer.ai.AI_PRIVACY
import com.fittrainer.ui.routines.trainer.ai.AiField
import com.fittrainer.ui.routines.trainer.ai.AiRoutineUiState
import com.fittrainer.ui.routines.trainer.ai.AiRoutineViewModel
import com.fittrainer.ui.routines.trainer.ai.DURATIONS
import com.fittrainer.ui.routines.trainer.ai.GOALS
import com.fittrainer.ui.routines.trainer.ai.MAX_TEXT
import com.fittrainer.ui.routines.trainer.ai.durationLabel
import com.fittrainer.ui.templates.trainer.LEVELS
import com.fittrainer.ui.templates.trainer.levelLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** El formulario del asistente (E15). Bloqueado mientras genera. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AiFormContent(state: AiRoutineUiState, vm: AiRoutineViewModel) {
    val on = !state.generating
    val f = state.form
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        ChipGroup("Objetivo", GOALS, f.goal, ::goalLabel, state.fieldErrors[AiField.GOAL], on, vm::onGoal)
        ChipGroup("Nivel", LEVELS, f.level, { levelLabel(it).orEmpty() }, state.fieldErrors[AiField.LEVEL], on, vm::onLevel)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text("Días por semana", color = FtColors.TextPrimary, modifier = Modifier.weight(1f))
            OutlinedButton(onClick = { vm.onDays(f.daysPerWeek - 1) }, enabled = on && f.daysPerWeek > 1) { Text("−") }
            Text("${f.daysPerWeek}", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            OutlinedButton(onClick = { vm.onDays(f.daysPerWeek + 1) }, enabled = on && f.daysPerWeek < 7) { Text("+") }
        }
        state.fieldErrors[AiField.DAYS]?.let { Text(it, color = FtColors.Coral) }
        ChipGroup("Duración", DURATIONS, f.durationMin, ::durationLabel, state.fieldErrors[AiField.DURATION], on, vm::onDuration)
        EquipmentField(state.profileEquipment, f.equipment, on, vm::onChangeEquipment, vm::onToggleEquipment, vm::onUseProfileEquipment)
        state.fieldErrors[AiField.EQUIPMENT]?.let { Text(it, color = FtColors.Coral) }
        TextBox("Lesiones", f.injuries, state.fieldErrors[AiField.INJURIES], on, vm::onInjuries)
        TextBox("Preferencias (opcional)", f.preferences, state.fieldErrors[AiField.PREFERENCES], on, vm::onPreferences)
        Text(AI_PRIVACY, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun <T> ChipGroup(title: String, options: List<T>, selected: T?, label: (T) -> String, error: String?, enabled: Boolean, onPick: (T) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text(title, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            options.forEach { o -> FilterChip(selected = o == selected, onClick = { onPick(o) }, enabled = enabled, label = { Text(label(o)) }) }
        }
        error?.let { Text(it, color = FtColors.Coral) }
    }
}

@Composable
private fun TextBox(label: String, value: String, error: String?, enabled: Boolean, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value, onValueChange = onChange, enabled = enabled, label = { Text(label) }, isError = error != null,
        supportingText = { Text(error ?: "${value.length}/$MAX_TEXT") }, modifier = Modifier.fillMaxWidth(), minLines = 2,
    )
}
```

`components/ProposalContent.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import com.fittrainer.data.trainerai.AiProposalBlock
import com.fittrainer.data.trainerai.AiRoutineProposal
import com.fittrainer.ui.routines.trainer.ai.AI_RATIONALE
import com.fittrainer.ui.routines.trainer.prescription
import com.fittrainer.ui.routines.trainer.routineDaysLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** La propuesta (E15): el porqué plegable y una tarjeta por bloque. */
@Composable
fun ProposalContent(proposal: AiRoutineProposal) {
    var open by rememberSaveable { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        Column(Modifier.fillMaxWidth().clickable(role = Role.Button) { open = !open }.padding(vertical = Spacing.xs)) {
            Text("$AI_RATIONALE ${if (open) "▴" else "▾"}", style = MaterialTheme.typography.titleSmall, color = FtColors.Brand)
            if (open) Text(proposal.rationale, color = FtColors.TextSecondary)
        }
        proposal.blocks.forEach { BlockCard(it) }
    }
}

@Composable
private fun BlockCard(block: AiProposalBlock) {
    Card(colors = CardDefaults.cardColors(containerColor = FtColors.Surface), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(Spacing.md), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text(block.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            Text(routineDaysLabel(block.days), style = MaterialTheme.typography.labelMedium, color = FtColors.Brand)
            block.exercises.forEach { e ->
                Text(e.name, color = FtColors.TextPrimary)
                Text(prescription(e.sets, e.reps, e.restSeconds, e.suggestedKg), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
                e.notes?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary) }
            }
        }
    }
}
```

`components/AiSaveSheet.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.routines.trainer.ai.AI_SAVE_ASSIGN
import com.fittrainer.ui.routines.trainer.ai.AI_TEMPLATE_NAME
import com.fittrainer.ui.routines.trainer.ai.AiRoutineUiState
import com.fittrainer.ui.routines.trainer.ai.AiRoutineViewModel
import com.fittrainer.ui.routines.trainer.ai.blocksNameHint
import com.fittrainer.ui.routines.trainer.components.CheckRow
import com.fittrainer.ui.routines.trainer.create.deactivateLabel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** "Guardar y asignar" (E15): nombre de la plantilla, pausar las de antes, progreso y "Reintentar". */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiSaveSheet(state: AiRoutineUiState, vm: AiRoutineViewModel) {
    val sheet = state.sheet ?: return
    val a = state.assign
    val locked = a.running || state.savedTemplates
    ModalBottomSheet(onDismissRequest = vm::onDismissSave) {
        Column(Modifier.fillMaxWidth().padding(Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(AI_SAVE_ASSIGN, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            OutlinedTextField(
                value = sheet.name, onValueChange = vm::onTemplateName, enabled = !locked, label = { Text(AI_TEMPLATE_NAME) },
                isError = sheet.nameError != null, supportingText = sheet.nameError?.let { { Text(it) } }, modifier = Modifier.fillMaxWidth(),
            )
            if ((state.proposal?.blocks?.size ?: 0) > 1) Text(blocksNameHint(sheet.name), style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
            if (state.activeRoutines.isNotEmpty()) {
                CheckRow(deactivateLabel(state.activeRoutines.map { it.name }), sheet.deactivate, enabled = !locked, onChange = vm::onToggleDeactivate)
            }
            if (a.running) Text("Asignando… ${a.assigned} de ${a.total}", color = FtColors.TextSecondary)
            a.message?.let { Text(it, color = FtColors.Coral) }
            val label = if (a.canRetry) "Reintentar" else AI_SAVE_ASSIGN
            Button(
                onClick = vm::onSaveAndAssign, enabled = !a.running && (a.canRetry || a.message == null),
                modifier = Modifier.fillMaxWidth().height(52.dp), colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
            ) { Text(label) }
        }
    }
}
```

- [ ] **Step 4: La pantalla**

`AiRoutineScreen.kt`:
```kotlin
package com.fittrainer.ui.routines.trainer.ai

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.routines.trainer.ai.components.AiFormContent
import com.fittrainer.ui.routines.trainer.ai.components.AiSaveSheet
import com.fittrainer.ui.routines.trainer.ai.components.ProposalContent
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** "Rutina con IA" (E15): formulario → propuesta → "Guardar y asignar". [onDone] recibe el aviso para la ficha. */
@Composable
fun AiRoutineScreen(
    onBack: () -> Unit,
    onDone: (String) -> Unit,
    onManual: () -> Unit,
    onGone: () -> Unit,
    viewModel: AiRoutineViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val discarded by viewModel.discarded.collectAsStateWithLifecycle()
    val back = { if (!viewModel.onBack()) onBack() }
    BackHandler(onBack = back)
    LaunchedEffect(discarded) { if (discarded) onBack() }
    LaunchedEffect(state.gone) { if (state.gone) { viewModel.consumeGone(); onGone() } }
    LaunchedEffect(state.done) { state.done?.let { viewModel.consumeDone(); onDone(it.warning ?: AI_ASSIGNED) } }
    if (state.confirmDiscard) {
        AlertDialog(
            onDismissRequest = viewModel::onCancelDiscard,
            title = { Text(AI_DISCARD_TITLE) },
            text = if (state.savedTemplates) ({ Text(AI_DISCARD_SAVED) }) else null,
            confirmButton = { TextButton(onClick = viewModel::onConfirmDiscard) { Text(AI_DISCARD, color = FtColors.Coral) } },
            dismissButton = { TextButton(onClick = viewModel::onCancelDiscard) { Text(AI_KEEP) } },
        )
    }
    AiSaveSheet(state, viewModel)
    val proposal = state.proposal
    LazyColumn(
        Modifier.fillMaxSize().background(FtColors.Background),
        contentPadding = PaddingValues(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                IconButton(onClick = back, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                }
                Text(AI_TITLE, style = MaterialTheme.typography.titleLarge, color = FtColors.TextPrimary)
            }
        }
        state.notice?.let { item { NoticeBanner(it, viewModel::dismissNotice) } }
        if (state.offerManual) item { OutlinedButton(onClick = onManual, modifier = Modifier.fillMaxWidth()) { Text(AI_MANUAL) } }
        if (proposal == null) {
            item { AiFormContent(state, viewModel) }
            item {
                if (state.generating) Text(AI_GENERATING, color = FtColors.TextSecondary)
                Button(
                    onClick = viewModel::onGenerate, enabled = state.canGenerate,
                    modifier = Modifier.fillMaxWidth().height(52.dp), colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
                ) { Text(AI_GENERATE) }
            }
        } else {
            item { ProposalContent(proposal) }
            item {
                Button(
                    onClick = viewModel::onOpenSave, enabled = !state.offline,
                    modifier = Modifier.fillMaxWidth().height(52.dp), colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
                ) { Text(AI_SAVE_ASSIGN) }
            }
            if (!state.savedTemplates) {
                item { OutlinedButton(onClick = viewModel::onGenerateAnother, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(AI_GENERATE_ANOTHER) } }
            }
        }
    }
}
```

- [ ] **Step 5: Compilar y correr todo**

Run: `cd mobile && ./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL; todos los tests verdes; ningún archivo de más de 200 líneas. Si un componente usa un token de `FtColors`/`Spacing` que no existe (`Surface`, `xs`), usá el equivalente que ya usan los otros componentes de `ui/routines/trainer/` (ruling al ledger).

---

### Task 6: Prueba manual de punta a punta y entrega a Codex

**Files:** ninguno de código (solo el ledger y Trello).

- [ ] **Step 1: Levantar backend y n8n** — el backend de `fittrainer-ia-rag` en `:3002` con `N8N_TRAINER_AI_WEBHOOK_URL` apuntando a `localhost` (el `.env` usa `n8n:5678`), y `mobile/.env` del worktree con `API_BASE_URL=http://10.0.2.2:3002/api`. Prender **un** emulador (Pixel_10_Pro) por la memoria de la máquina.

- [ ] **Step 2: Recorrido feliz** — profe.card8 → ficha de alumna.card8 → "Asignar rutina" → "Con IA ✦" → 3 días, "Cambiar" equipamiento (barra, mancuernas, máquina) → "Generar propuesta" → propuesta con bloques → "Guardar y asignar" (pausar la activa) → vuelve a la ficha con "Rutina asignada…" y las rutinas nuevas en Rutinas → abrir una en el editor E8 y cambiar series. Capturas en el ledger.

- [ ] **Step 3: Errores** — n8n pausado → 503 con "Armar a mano" (abre "Rutina nueva"); modo avión → "Con IA ✦" deshabilitado; con la propuesta en pantalla, rotar el emulador → sigue ahí; "atrás" → "¿Descartar la propuesta?". KIMI admite 3 req/min: de a una.

- [ ] **Step 4: Verificación final** — `cd mobile && ./gradlew checkFileLength assembleDebug testDebugUnitTest` verde; revisión final de la rama; mover la tarjeta E15 a 🔍 AUDITORÍA CODEX con el comentario `🛠️ CLAUDE · Lista para auditar`.
