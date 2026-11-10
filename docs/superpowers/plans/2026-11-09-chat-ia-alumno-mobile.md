# Tarjeta 14 · Chat IA del alumno en el celular — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el alumno, en plena sesión, abra el asistente IA desde «✦ IA», pregunte (chips, texto o voz), reciba la respuesta con sugerencias de reemplazo accionables y vuelva a la misma serie.

**Architecture:** capa `data/aichat` (Retrofit con cliente de 20 s + Room v25 + repositorio solo-online que guarda en Room) y `ui/workout/aichat` (hoja inferior con su ViewModel de Hilt, abierta desde `WorkoutScreen` como un `Overlay` más). La sesión no se toca: el reemplazo reusa `WorkoutViewModel.onReplace`.

**Tech Stack:** Kotlin, Jetpack Compose (Material 3), Hilt, Retrofit + kotlinx.serialization, OkHttp, Room (AutoMigration), JUnit4 + kotlinx-coroutines-test, fakes en memoria.

**Spec:** `docs/superpowers/specs/2026-11-09-chat-ia-alumno-mobile-design.md`

## Global Constraints

- Ningún archivo de código (tests incluidos) pasa de **200 líneas físicas** (`gradlew checkFileLength`). `WorkoutViewModel.kt` ya tiene 199: **no se toca**. `FitTrainerDatabase.kt` tiene 188 y `WorkoutScreen.kt` 178: sumarles lo justo.
- Todo ordenado capa → módulo → archivo; los tests copian el árbol del código.
- Room es la única fuente de verdad: la UI y los ViewModels nunca llaman a Retrofit.
- El chat IA es **solo con red**: sin cola, sin WorkManager, sin reintento automático (salvo el único reintento sin `session_id` ante `SESSION_FINISHED`).
- Timeout del cliente: **20 s** (`AI_CHAT_TIMEOUT_SECONDS = 20L`).
- Mensaje: 1 a **500** caracteres (recortado).
- Room pasa de **v24 a v25** con `AutoMigration(from = 24, to = 25)`; nunca destructiva.
- Textos visibles exactos (van en `AiChatTexts.kt`):
  - `AI_OFFLINE = "Necesitás conexión para usar el asistente. Tu sesión sigue guardándose sin red."`
  - `AI_TIMEOUT = "El asistente tardó demasiado. Seguí con tu entrenamiento y probá de nuevo."`
  - `AI_DAILY_LIMIT = "Llegaste al límite de consultas de hoy. Mañana podés seguir."`
  - `AI_IN_PROGRESS = "Esperá la respuesta anterior."`
  - `AI_UNKNOWN = "No pudimos consultar al asistente. Probá de nuevo."`
  - 502/503 muestran el mensaje del backend; si el body no se lee, `AI_UNAVAILABLE_FALLBACK_DATA = "El asistente no está disponible ahora. Seguí con tu entrenamiento."` (en `data/aichat/AiChatErrors.kt`).
  - `AI_SUGGESTION_MISSING = "Ese ejercicio no está en tu biblioteca. Probá con Reemplazar."`
  - Chips: `"¿Con qué lo reemplazo?"`, `"¿Cómo se hace?"`, `"Me duele…"`; plantilla del dolor: `"Me duele  al hacer <ejercicio>"` con el cursor en el índice 9 (entre los dos espacios).
- Diseño: tema oscuro (`FtColors`), toque mínimo `Spacing.minTouchTarget` (44 px).
- Los agentes **no commitean**: cada tarea termina con los tests en verde y el árbol listo para que Igna commitee.

## Review Focus

1. **Dos envíos seguidos** (doble toque en un chip o en Enviar mientras espera): el segundo no sale. → test en Task 4 (`un segundo envio mientras espera no sale`).
2. **Pregunta y respuesta con el mismo `created_at`** (el backend guarda el par con el mismo instante): la pregunta tiene que verse antes que la respuesta. → orden por rol en la query y en el fake, test en Task 3 (`el par se ve pregunta primero aunque tengan el mismo instante`).
3. **Cerrar sesión con una consulta en vuelo**: la respuesta no se guarda bajo el usuario que se fue. → test en Task 3 (`una respuesta que llega despues del logout no se guarda`).
4. **Sugerencia de un ejercicio que no está en la biblioteca local** (el alumno nunca abrió la biblioteca): se refresca una vez y, si sigue sin estar, aviso en vez de crash. → tests en Task 4.
5. **Respuesta de `/chat/today` con `created_at` con offset `+00:00`** (Supabase no siempre manda `Z`): se parsea igual. → test en Task 3 (`refresh acepta created_at con offset`).

---

### Task 1: API del chat y cliente de 20 s

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/api/chat/AiChatApi.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/api/chat/AiChatDtos.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/di/aichat/AiChatModule.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/api/chat/AiChatDtosTest.kt`

**Interfaces:**
- Produces:
  - `interface AiChatApi { suspend fun send(owner: RequiredUser, body: AiChatRequest): AiChatReplyResponse; suspend fun today(owner: RequiredUser): AiChatTodayResponse }`
  - `AiChatRequest(message: String, sessionId: String? = null, currentExerciseId: String? = null)`
  - `AiChatSuggestionDto(exerciseId, name, reason)`, `AiChatReplyDto(messageId, response, suggestions, remainingToday)`, `AiChatReplyResponse(data)`, `AiChatTodayMessageDto(id, role, content, createdAt: String)`, `AiChatTodayDto(messages, remainingToday)`, `AiChatTodayResponse(data)`
  - `const val AI_CHAT_TIMEOUT_SECONDS = 20L` (en `AiChatModule.kt`)

- [ ] **Step 1: Write the failing test**

```kotlin
package com.fittrainer.data.api.chat

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Test

/** Tarjeta 14: el contrato de POST /chat y GET /chat/today (backend de la #90). */
class AiChatDtosTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test fun `el pedido omite session_id y current_exercise_id cuando son null`() {
        assertEquals("""{"message":"hola"}""", json.encodeToString(AiChatRequest("hola")))
        assertEquals(
            """{"message":"hola","session_id":"s1","current_exercise_id":"e1"}""",
            json.encodeToString(AiChatRequest("hola", "s1", "e1")),
        )
    }

    @Test fun `la respuesta trae sugerencias y lo que queda hoy`() {
        val raw = """{"data":{"message_id":"m1","response":"Probá press","suggestions":[{"exercise_id":"e2","name":"Press","reason":"Mismo músculo"}],"remaining_today":19,"extra":1}}"""
        val reply = json.decodeFromString<AiChatReplyResponse>(raw).data
        assertEquals("m1", reply.messageId)
        assertEquals(listOf(AiChatSuggestionDto("e2", "Press", "Mismo músculo")), reply.suggestions)
        assertEquals(19, reply.remainingToday)
    }

    @Test fun `la conversacion del dia sin sugerencias`() {
        val raw = """{"data":{"messages":[{"id":"a","role":"user","content":"hola","created_at":"2026-11-09T15:00:00.123+00:00"}],"remaining_today":20}}"""
        val today = json.decodeFromString<AiChatTodayResponse>(raw).data
        assertEquals("user", today.messages.single().role)
        assertEquals("2026-11-09T15:00:00.123+00:00", today.messages.single().createdAt)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run (desde `mobile/`): `./gradlew testDebugUnitTest --tests "com.fittrainer.data.api.chat.AiChatDtosTest"`
Expected: FAIL de compilación (`Unresolved reference: AiChatRequest`).

- [ ] **Step 3: Write the DTOs**

`AiChatDtos.kt`:

```kotlin
package com.fittrainer.data.api.chat

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Body de POST /chat. Los null no viajan (el Json de la app no codifica los valores por defecto). */
@Serializable
data class AiChatRequest(
    val message: String,
    @SerialName("session_id") val sessionId: String? = null,
    @SerialName("current_exercise_id") val currentExerciseId: String? = null,
)

/** Un ejercicio de la biblioteca que la IA propone como reemplazo (el nombre sale de la biblioteca, no de la IA). */
@Serializable
data class AiChatSuggestionDto(
    @SerialName("exercise_id") val exerciseId: String,
    val name: String,
    val reason: String,
)

@Serializable
data class AiChatReplyDto(
    @SerialName("message_id") val messageId: String,
    val response: String,
    val suggestions: List<AiChatSuggestionDto> = emptyList(),
    @SerialName("remaining_today") val remainingToday: Int,
)

@Serializable
data class AiChatReplyResponse(val data: AiChatReplyDto)

/** role: user | assistant. created_at: ISO con Z o con offset. */
@Serializable
data class AiChatTodayMessageDto(
    val id: String,
    val role: String,
    val content: String,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class AiChatTodayDto(
    val messages: List<AiChatTodayMessageDto> = emptyList(),
    @SerialName("remaining_today") val remainingToday: Int,
)

@Serializable
data class AiChatTodayResponse(val data: AiChatTodayDto)
```

`AiChatApi.kt`:

```kotlin
package com.fittrainer.data.api.chat

import com.fittrainer.data.auth.RequiredUser
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Tag

/**
 * Chat IA del alumno (tarjeta 14), con su propio cliente de 20 s (AiChatModule): el backend corta a n8n a los 16 s.
 * POST: 429 CHAT_LIMIT_REACHED (20 por día), 429 CHAT_IN_PROGRESS, 429 RATE_LIMIT_EXCEEDED (Retry-After),
 * 503 AI_UNAVAILABLE, 502 AI_INVALID_RESPONSE, 400 SESSION_FINISHED. Un session_id desconocido se ignora.
 */
interface AiChatApi {
    @POST("chat")
    suspend fun send(@Tag owner: RequiredUser, @Body body: AiChatRequest): AiChatReplyResponse

    /** La conversación del día de Argentina (sin sugerencias) y las consultas que quedan. */
    @GET("chat/today")
    suspend fun today(@Tag owner: RequiredUser): AiChatTodayResponse
}
```

`di/aichat/AiChatModule.kt` (el binding del limpiador se suma en la Task 3):

```kotlin
package com.fittrainer.di.aichat

import com.fittrainer.BuildConfig
import com.fittrainer.data.api.chat.AiChatApi
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

/** Lo que espera el celular una respuesta del asistente (el backend corta a los 16 s). */
const val AI_CHAT_TIMEOUT_SECONDS = 20L

/**
 * Chat IA del alumno (tarjeta 14): el mismo cliente con Bearer y refresh, pero con un tope total de 20 s por llamada
 * (callTimeout) en vez del API_TIMEOUT_SECONDS general.
 */
@Module
@InstallIn(SingletonComponent::class)
object AiChatModule {

    @Provides
    @Singleton
    fun provideAiChatApi(client: OkHttpClient, json: Json): AiChatApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(
            client.newBuilder()
                .callTimeout(AI_CHAT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .readTimeout(AI_CHAT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .build(),
        )
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(AiChatApi::class.java)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.api.chat.AiChatDtosTest"`
Expected: PASS (3 tests).

- [ ] **Step 5: Dejar listo** — `./gradlew checkFileLength`; sin commitear.

---

### Task 2: Room v25 — tabla `ai_chat_messages`

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/db/aichat/AiChatMessageEntity.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/db/aichat/AiChatDao.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/data/db/FitTrainerDatabase.kt` (entidad, `version = 25`, `AutoMigration(from = 24, to = 25)`, `abstract fun aiChatDao(): AiChatDao`)
- Modify: `mobile/app/src/main/java/com/fittrainer/di/DatabaseModule.kt` (provider del DAO)
- Create (generado): `mobile/app/schemas/com.fittrainer.data.db.FitTrainerDatabase/25.json`
- Test: `mobile/app/src/androidTest/java/com/fittrainer/data/db/migration/v2x/MigrationV25Test.kt`
- Test (fake para las tareas siguientes): `mobile/app/src/test/java/com/fittrainer/testing/fakes/aichat/FakeAiChatDao.kt`

**Interfaces:**
- Produces:
  - `AiChatMessageEntity(ownerId: String, id: String, role: String, content: String, createdAt: Long, suggestionsJson: String?)`; `const val ROLE_USER = "user"`, `const val ROLE_ASSISTANT = "assistant"`
  - `abstract class AiChatDao { fun observeBetween(ownerId, from: Long, to: Long): Flow<List<AiChatMessageEntity>>; suspend fun getBetween(ownerId, from, to): List<AiChatMessageEntity>; suspend fun insert(rows); suspend fun deleteBetween(ownerId, from, to); open suspend fun replaceBetween(ownerId, from, to, rows); suspend fun clearOwner(ownerId); suspend fun clear() }`
  - `FakeAiChatDao : AiChatDao()` con `val rows: MutableStateFlow<List<AiChatMessageEntity>>`

- [ ] **Step 1: Write the entity and DAO**

`AiChatMessageEntity.kt`:

```kotlin
package com.fittrainer.data.db.aichat

import androidx.room.Entity
import androidx.room.Index

const val ROLE_USER = "user"
const val ROLE_ASSISTANT = "assistant"

/**
 * Un mensaje del chat IA del alumno (tarjeta 14). id: el del servidor; la pregunta recién enviada usa "local-<uuid>"
 * hasta el próximo refresh. createdAt en epoch millis. suggestionsJson: las sugerencias de la respuesta (JSON de
 * AiChatSuggestionDto), solo en respuestas que las trajeron; GET /chat/today no las devuelve.
 */
@Entity(
    tableName = "ai_chat_messages",
    primaryKeys = ["ownerId", "id"],
    indices = [Index(value = ["ownerId", "createdAt"])],
)
data class AiChatMessageEntity(
    val ownerId: String,
    val id: String,
    val role: String,
    val content: String,
    val createdAt: Long,
    val suggestionsJson: String?,
)
```

`AiChatDao.kt`:

```kotlin
package com.fittrainer.data.db.aichat

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

// El backend guarda pregunta y respuesta con el mismo created_at: la pregunta va primero.
private const val ORDER = "ORDER BY createdAt, CASE role WHEN 'user' THEN 0 ELSE 1 END, id"

@Dao
abstract class AiChatDao {

    /** Los mensajes del dueño con createdAt en [from, to). */
    @Query("SELECT * FROM ai_chat_messages WHERE ownerId = :ownerId AND createdAt >= :from AND createdAt < :to $ORDER")
    abstract fun observeBetween(ownerId: String, from: Long, to: Long): Flow<List<AiChatMessageEntity>>

    @Query("SELECT * FROM ai_chat_messages WHERE ownerId = :ownerId AND createdAt >= :from AND createdAt < :to $ORDER")
    abstract suspend fun getBetween(ownerId: String, from: Long, to: Long): List<AiChatMessageEntity>

    @Upsert
    abstract suspend fun insert(rows: List<AiChatMessageEntity>)

    @Query("DELETE FROM ai_chat_messages WHERE ownerId = :ownerId AND createdAt >= :from AND createdAt < :to")
    abstract suspend fun deleteBetween(ownerId: String, from: Long, to: Long)

    /** Reemplaza el rango entero (el refresh del día). */
    @Transaction
    open suspend fun replaceBetween(ownerId: String, from: Long, to: Long, rows: List<AiChatMessageEntity>) {
        deleteBetween(ownerId, from, to)
        insert(rows)
    }

    @Query("DELETE FROM ai_chat_messages WHERE ownerId = :ownerId")
    abstract suspend fun clearOwner(ownerId: String)

    @Query("DELETE FROM ai_chat_messages")
    abstract suspend fun clear()
}
```

- [ ] **Step 2: Wire the database**

En `FitTrainerDatabase.kt`:
- sumar `AiChatMessageEntity::class,` al final de `entities` (después de `StudentFreeSlotsSyncEntity::class,`) y su import `com.fittrainer.data.db.aichat.AiChatMessageEntity` / `AiChatDao`;
- `version = 24` → `version = 25`;
- después de `AutoMigration(from = 23, to = 24),` agregar:

```kotlin
        // v25: chat IA del alumno (tarjeta 14), una tabla nueva.
        AutoMigration(from = 24, to = 25),
```
- al final de los DAO: `abstract fun aiChatDao(): AiChatDao`

En `DatabaseModule.kt`, junto a `provideStudentAgendaDao`:

```kotlin
    @Provides
    fun provideAiChatDao(db: FitTrainerDatabase): AiChatDao = db.aiChatDao()
```

- [ ] **Step 3: Write the migration test**

`MigrationV25Test.kt`:

```kotlin
package com.fittrainer.data.db.migration.v2x

import androidx.room.testing.MigrationTestHelper
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.fittrainer.data.db.FitTrainerDatabase
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** v25 (tarjeta 14): suma ai_chat_messages vacía y conserva los turnos del alumno y lo pendiente de la v24. */
@RunWith(AndroidJUnit4::class)
class MigrationV25Test {

    @get:Rule
    val helper = MigrationTestHelper(InstrumentationRegistry.getInstrumentation(), FitTrainerDatabase::class.java)

    @Test fun migra24a25ConservandoLosDatos() {
        helper.createDatabase(DB, 24).apply {
            execSQL(
                "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, syncState, " +
                    "currentPosition, currentSet) VALUES ('s1', 'u1', NULL, 'Libre', 1, 2, 'FINISHED', 'PENDING', 0, 1)"
            )
            execSQL(
                "INSERT INTO student_appointments (studentId, id, trainerId, scheduledAt, status, notes, createdAt) " +
                    "VALUES ('u1', 'a1', 't1', 5, 'pending', 'hola', 1)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 25, true)

        db.query("SELECT status, notes FROM student_appointments WHERE id = 'a1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("pending", it.getString(0))
            assertEquals("hola", it.getString(1))
        }
        db.query("SELECT syncState FROM workout_sessions WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals("PENDING", it.getString(0))
        }
        db.query("SELECT COUNT(*) FROM ai_chat_messages").use {
            assertTrue(it.moveToFirst())
            assertEquals(0, it.getInt(0))
        }
    }

    private companion object {
        const val DB = "migration-v25-test.db"
    }
}
```

- [ ] **Step 4: Write the fake DAO** (`testing/fakes/aichat/FakeAiChatDao.kt`)

```kotlin
package com.fittrainer.testing.fakes.aichat

import com.fittrainer.data.db.aichat.AiChatDao
import com.fittrainer.data.db.aichat.AiChatMessageEntity
import com.fittrainer.data.db.aichat.ROLE_USER
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** Room en memoria para el chat IA (tarjeta 14), con el mismo rango y el mismo orden que las queries. */
class FakeAiChatDao : AiChatDao() {
    val rows = MutableStateFlow<List<AiChatMessageEntity>>(emptyList())

    private fun between(l: List<AiChatMessageEntity>, ownerId: String, from: Long, to: Long) =
        l.filter { it.ownerId == ownerId && it.createdAt >= from && it.createdAt < to }
            .sortedWith(compareBy({ it.createdAt }, { if (it.role == ROLE_USER) 0 else 1 }, { it.id }))

    override fun observeBetween(ownerId: String, from: Long, to: Long): Flow<List<AiChatMessageEntity>> =
        rows.map { between(it, ownerId, from, to) }

    override suspend fun getBetween(ownerId: String, from: Long, to: Long) = between(rows.value, ownerId, from, to)

    override suspend fun insert(rows: List<AiChatMessageEntity>) = this.rows.update { old ->
        val keys = rows.map { it.ownerId to it.id }.toSet()
        old.filter { (it.ownerId to it.id) !in keys } + rows
    }

    override suspend fun deleteBetween(ownerId: String, from: Long, to: Long) =
        rows.update { l -> l.filterNot { it.ownerId == ownerId && it.createdAt >= from && it.createdAt < to } }

    override suspend fun clearOwner(ownerId: String) = rows.update { l -> l.filterNot { it.ownerId == ownerId } }

    override suspend fun clear() = rows.update { emptyList() }
}
```

- [ ] **Step 5: Build, generate the schema and run the migration test**

Run: `./gradlew assembleDebug` → genera `app/schemas/com.fittrainer.data.db.FitTrainerDatabase/25.json` (verificar que existe y contiene `ai_chat_messages`).
Run (con el emulador abierto): `./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.fittrainer.data.db.migration.v2x.MigrationV25Test`
Expected: PASS. Si no hay emulador disponible, anotarlo como pendiente en el comentario de Trello.

- [ ] **Step 6: Dejar listo** — `./gradlew checkFileLength` (FitTrainerDatabase ≤ 200); sin commitear.

---

### Task 3: Repositorio `AiChatRepository`

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/aichat/AiChatMessage.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/aichat/AiChatErrors.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/aichat/AiChatMapper.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/aichat/AiChatRepository.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/di/aichat/AiChatModule.kt` (sumar el módulo del limpiador)
- Test: `mobile/app/src/test/java/com/fittrainer/testing/fakes/aichat/FakeAiChatApi.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/aichat/AiChatRepositoryTest.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/aichat/AiChatErrorsTest.kt`

**Interfaces:**
- Consumes: `AiChatApi`, DTOs (Task 1); `AiChatDao`, `AiChatMessageEntity`, `ROLE_*`, `FakeAiChatDao` (Task 2); `localDay(Instant)` de `com.fittrainer.data.agenda`, `dayStartMillis(LocalDate)` de `com.fittrainer.data.agenda.student`, `isoMillis(String)` es `internal` en otro paquete del mismo módulo (se puede usar: `com.fittrainer.data.agenda.isoMillis`).
- Produces:
  - `data class AiChatSuggestion(val exerciseId: String, val name: String, val reason: String)`
  - `data class AiChatMessage(val id: String, val fromUser: Boolean, val content: String, val createdAt: Instant, val suggestions: List<AiChatSuggestion>)`
  - `sealed interface AiChatError { Offline; Timeout; DailyLimit; InProgress; data class TooManyAttempts(val retryAfterSeconds: Long?); data class Unavailable(val message: String); Unknown }`
  - `class AiChatException(val error: AiChatError, cause: Throwable? = null) : Exception(cause)`
  - `AiChatRepository.observeToday(ownerId: String): Flow<List<AiChatMessage>>`
  - `AiChatRepository.refresh(ownerId: String): Result<Int>` (remaining_today)
  - `AiChatRepository.send(ownerId: String, message: String, sessionId: String?, exerciseId: String?): Result<Int>` (remaining_today; el error viaja como `AiChatException`)

- [ ] **Step 1: Write the fake API** (`testing/fakes/aichat/FakeAiChatApi.kt`)

```kotlin
package com.fittrainer.testing.fakes.aichat

import com.fittrainer.data.api.chat.AiChatApi
import com.fittrainer.data.api.chat.AiChatReplyDto
import com.fittrainer.data.api.chat.AiChatReplyResponse
import com.fittrainer.data.api.chat.AiChatRequest
import com.fittrainer.data.api.chat.AiChatSuggestionDto
import com.fittrainer.data.api.chat.AiChatTodayDto
import com.fittrainer.data.api.chat.AiChatTodayMessageDto
import com.fittrainer.data.api.chat.AiChatTodayResponse
import com.fittrainer.data.auth.RequiredUser
import kotlinx.coroutines.CompletableDeferred

fun replyDto(id: String = "r1", text: String = "Probá press", remaining: Int = 19, vararg suggestions: AiChatSuggestionDto) =
    AiChatReplyDto(id, text, suggestions.toList(), remaining)

fun todayMessage(id: String, role: String, content: String, at: String) = AiChatTodayMessageDto(id, role, content, at)

/** API falsa: [errors] se consumen en orden (uno por llamada a send); [gate] frena la respuesta hasta completarse. */
class FakeAiChatApi : AiChatApi {
    val sent = mutableListOf<AiChatRequest>()
    val errors = ArrayDeque<Throwable>()
    var reply: AiChatReplyDto = replyDto()
    var today = AiChatTodayDto(emptyList(), 20)
    var todayError: Throwable? = null
    var gate: CompletableDeferred<Unit>? = null

    override suspend fun send(owner: RequiredUser, body: AiChatRequest): AiChatReplyResponse {
        sent += body
        gate?.await()
        errors.removeFirstOrNull()?.let { throw it }
        return AiChatReplyResponse(reply)
    }

    override suspend fun today(owner: RequiredUser): AiChatTodayResponse {
        todayError?.let { throw it }
        return AiChatTodayResponse(today)
    }
}
```

- [ ] **Step 2: Write the failing tests**

`AiChatErrorsTest.kt`:

```kotlin
package com.fittrainer.data.aichat

import com.fittrainer.testing.fakes.auth.httpError
import java.io.IOException
import java.net.SocketTimeoutException
import java.io.InterruptedIOException
import okhttp3.Headers.Companion.headersOf
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response

class AiChatErrorsTest {
    private fun body(code: String, message: String = "m") = """{"error":{"code":"$code","message":"$message"}}"""

    @Test fun `red y timeout`() {
        assertEquals(AiChatError.Offline, IOException().toAiChatError())
        assertEquals(AiChatError.Timeout, SocketTimeoutException().toAiChatError())
        assertEquals(AiChatError.Timeout, InterruptedIOException("timeout").toAiChatError())
    }

    @Test fun `los 429 se distinguen por codigo`() {
        assertEquals(AiChatError.DailyLimit, httpError(429, body("CHAT_LIMIT_REACHED")).toAiChatError())
        assertEquals(AiChatError.InProgress, httpError(429, body("CHAT_IN_PROGRESS")).toAiChatError())
        val limited = HttpException(Response.error<Any>("{}".toResponseBody(null), okhttp3.Response.Builder()
            .code(429).message("x").protocol(okhttp3.Protocol.HTTP_1_1)
            .request(okhttp3.Request.Builder().url("http://x/").build())
            .headers(headersOf("Retry-After", "120")).build()))
        assertEquals(AiChatError.TooManyAttempts(120), limited.toAiChatError())
    }

    @Test fun `502 y 503 traen el mensaje del backend`() {
        assertEquals(AiChatError.Unavailable("Caído"), httpError(503, body("AI_UNAVAILABLE", "Caído")).toAiChatError())
        assertEquals(AiChatError.Unavailable("Raro"), httpError(502, body("AI_INVALID_RESPONSE", "Raro")).toAiChatError())
        assertEquals(AiChatError.Unavailable(AI_UNAVAILABLE_FALLBACK_DATA), httpError(503, "no-json").toAiChatError())
    }

    @Test fun `lo demas es desconocido`() {
        assertEquals(AiChatError.Unknown, httpError(500).toAiChatError())
        assertEquals(AiChatError.Unknown, IllegalStateException().toAiChatError())
    }
}
```

`AiChatRepositoryTest.kt`:

```kotlin
package com.fittrainer.data.aichat

import com.fittrainer.data.api.chat.AiChatSuggestionDto
import com.fittrainer.data.api.chat.AiChatTodayDto
import com.fittrainer.testing.fakes.aichat.FakeAiChatApi
import com.fittrainer.testing.fakes.aichat.FakeAiChatDao
import com.fittrainer.testing.fakes.aichat.replyDto
import com.fittrainer.testing.fakes.aichat.todayMessage
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import java.io.IOException
import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Tarjeta 14. Hoy es el lunes 09/11, 12:00 de Argentina (15:00 UTC). */
class AiChatRepositoryTest {
    private val api = FakeAiChatApi()
    private val dao = FakeAiChatDao()
    private val clock = MutableClock(Instant.parse("2026-11-09T15:00:00Z").toEpochMilli())
    private val repo = AiChatRepository(api, dao, clock)
    private val press = AiChatSuggestionDto("e2", "Press", "Mismo músculo")

    private suspend fun today() = repo.observeToday("u1").first()
    private fun error(e: Result<*>) = (e.exceptionOrNull() as AiChatException).error

    @Test fun `enviar guarda pregunta y respuesta con sus sugerencias`() = runTest {
        api.reply = replyDto("r1", "Probá press", 18, press)
        assertEquals(18, repo.send("u1", "¿Con qué lo reemplazo?", "s1", "e1").getOrThrow())
        assertEquals("s1", api.sent.single().sessionId)
        assertEquals("e1", api.sent.single().currentExerciseId)
        val msgs = today()
        assertEquals(listOf(true, false), msgs.map { it.fromUser })
        assertEquals("r1", msgs[1].id)
        assertEquals(listOf(AiChatSuggestion("e2", "Press", "Mismo músculo")), msgs[1].suggestions)
    }

    @Test fun `el par se ve pregunta primero aunque tengan el mismo instante`() = runTest {
        api.today = AiChatTodayDto(listOf(
            todayMessage("z-resp", "assistant", "Respuesta", "2026-11-09T14:00:00Z"),
            todayMessage("a-preg", "user", "Pregunta", "2026-11-09T14:00:00Z"),
        ), 19)
        repo.refresh("u1").getOrThrow()
        assertEquals(listOf("Pregunta", "Respuesta"), today().map { it.content })
    }

    @Test fun `un fallo no guarda nada`() = runTest {
        api.errors += IOException()
        assertEquals(AiChatError.Offline, error(repo.send("u1", "hola", null, null)))
        assertEquals(emptyList<AiChatMessage>(), today())
    }

    @Test fun `SESSION_FINISHED reintenta una sola vez sin session_id`() = runTest {
        api.errors += httpError(400, """{"error":{"code":"SESSION_FINISHED","message":"x"}}""")
        assertTrue(repo.send("u1", "hola", "s1", "e1").isSuccess)
        assertEquals(listOf("s1", null), api.sent.map { it.sessionId })
        assertEquals(listOf("e1", "e1"), api.sent.map { it.currentExerciseId })
    }

    @Test fun `SESSION_FINISHED dos veces no reintenta de nuevo`() = runTest {
        repeat(2) { api.errors += httpError(400, """{"error":{"code":"SESSION_FINISHED","message":"x"}}""") }
        assertEquals(AiChatError.Unknown, error(repo.send("u1", "hola", "s1", null)))
        assertEquals(2, api.sent.size)
    }

    @Test fun `el tope del dia llega tipado`() = runTest {
        api.errors += httpError(429, """{"error":{"code":"CHAT_LIMIT_REACHED","message":"x"}}""")
        assertEquals(AiChatError.DailyLimit, error(repo.send("u1", "hola", null, null)))
    }

    @Test fun `refresh reemplaza el dia, conserva sugerencias por id y devuelve lo que queda`() = runTest {
        api.reply = replyDto("r1", "Probá press", 19, press)
        repo.send("u1", "hola", null, null)
        api.today = AiChatTodayDto(listOf(
            todayMessage("q1", "user", "hola", "2026-11-09T15:00:00Z"),
            todayMessage("r1", "assistant", "Probá press", "2026-11-09T15:00:00Z"),
        ), 19)
        assertEquals(19, repo.refresh("u1").getOrThrow())
        val msgs = today()
        assertEquals(listOf("q1", "r1"), msgs.map { it.id })
        assertEquals("Press", msgs[1].suggestions.single().name)
    }

    @Test fun `refresh acepta created_at con offset`() = runTest {
        api.today = AiChatTodayDto(listOf(todayMessage("q1", "user", "hola", "2026-11-09T15:00:00.123+00:00")), 19)
        repo.refresh("u1").getOrThrow()
        assertEquals(Instant.parse("2026-11-09T15:00:00.123Z"), today().single().createdAt)
    }

    @Test fun `lo de ayer no se ve`() = runTest {
        api.today = AiChatTodayDto(listOf(todayMessage("viejo", "user", "ayer", "2026-11-09T02:00:00Z")), 20)
        repo.refresh("u1").getOrThrow()
        assertEquals(emptyList<AiChatMessage>(), today())
    }

    @Test fun `un refresh que falla deja Room como estaba`() = runTest {
        repo.send("u1", "hola", null, null)
        api.todayError = IOException()
        assertEquals(AiChatError.Offline, error(repo.refresh("u1")))
        assertEquals(2, today().size)
    }

    @Test fun `una respuesta que llega despues del logout no se guarda`() = runTest {
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        val pending = async { repo.send("u1", "hola", null, null) }
        runCurrent()
        repo.clearUserData("u1")
        gate.complete(Unit)
        assertTrue(pending.await().isFailure)
        assertEquals(emptyList<AiChatMessage>(), today())
    }

    @Test fun `cerrar sesion borra solo al duenio`() = runTest {
        repo.send("u1", "hola", null, null)
        repo.send("u2", "hola", null, null)
        repo.clearUserData("u1")
        assertEquals(emptyList<AiChatMessage>(), today())
        assertEquals(2, repo.observeToday("u2").first().size)
        assertNull(dao.rows.value.firstOrNull { it.ownerId == "u1" })
    }
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.aichat.*"`
Expected: FAIL de compilación (`Unresolved reference: AiChatRepository`).

- [ ] **Step 4: Write the domain, errors and mapper**

`AiChatMessage.kt`:

```kotlin
package com.fittrainer.data.aichat

import java.time.Instant

/** Un ejercicio de la biblioteca que la IA propone como reemplazo, con su motivo. */
data class AiChatSuggestion(val exerciseId: String, val name: String, val reason: String)

/** Un mensaje del chat IA, tal como lo ve la app (sin Room ni Retrofit). */
data class AiChatMessage(
    val id: String,
    val fromUser: Boolean,
    val content: String,
    val createdAt: Instant,
    val suggestions: List<AiChatSuggestion>,
)
```

`AiChatErrors.kt`:

```kotlin
package com.fittrainer.data.aichat

import com.fittrainer.data.api.ErrorBody
import com.fittrainer.data.api.errorEnvelope
import java.io.IOException
import java.io.InterruptedIOException
import retrofit2.HttpException

private const val CHAT_LIMIT_REACHED = "CHAT_LIMIT_REACHED"
private const val CHAT_IN_PROGRESS = "CHAT_IN_PROGRESS"
internal const val SESSION_FINISHED = "SESSION_FINISHED"

/** El mensaje del backend para 503, por si el body no se puede leer. */
const val AI_UNAVAILABLE_FALLBACK_DATA = "El asistente no está disponible ahora. Seguí con tu entrenamiento."

/** Por qué falló una consulta al asistente; la UI elige el texto. */
sealed interface AiChatError {
    data object Offline : AiChatError
    data object Timeout : AiChatError
    data object DailyLimit : AiChatError
    data object InProgress : AiChatError
    data class TooManyAttempts(val retryAfterSeconds: Long?) : AiChatError
    data class Unavailable(val message: String) : AiChatError
    data object Unknown : AiChatError
}

class AiChatException(val error: AiChatError, cause: Throwable? = null) : Exception(cause)

/** El error de un HTTP [code] con su [body] ya leído (leer el body lo consume). */
internal fun httpAiChatError(code: Int, body: ErrorBody?, retryAfter: String?): AiChatError = when {
    code == 429 && body?.code == CHAT_LIMIT_REACHED -> AiChatError.DailyLimit
    code == 429 && body?.code == CHAT_IN_PROGRESS -> AiChatError.InProgress
    code == 429 -> AiChatError.TooManyAttempts(retryAfter?.toLongOrNull())
    code == 502 || code == 503 -> AiChatError.Unavailable(body?.message ?: AI_UNAVAILABLE_FALLBACK_DATA)
    else -> AiChatError.Unknown
}

/** Timeout antes que red: SocketTimeoutException y el callTimeout de OkHttp son InterruptedIOException. */
internal fun Throwable.toAiChatError(): AiChatError = when (this) {
    is AiChatException -> error
    is InterruptedIOException -> AiChatError.Timeout
    is IOException -> AiChatError.Offline
    is HttpException -> httpAiChatError(code(), errorEnvelope(), response()?.headers()?.get("Retry-After"))
    else -> AiChatError.Unknown
}
```

`AiChatMapper.kt`:

```kotlin
package com.fittrainer.data.aichat

import com.fittrainer.data.agenda.isoMillis
import com.fittrainer.data.api.chat.AiChatReplyDto
import com.fittrainer.data.api.chat.AiChatSuggestionDto
import com.fittrainer.data.api.chat.AiChatTodayMessageDto
import com.fittrainer.data.db.aichat.AiChatMessageEntity
import com.fittrainer.data.db.aichat.ROLE_ASSISTANT
import com.fittrainer.data.db.aichat.ROLE_USER
import java.time.Instant
import java.util.UUID
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true }

/** La pregunta recién enviada: el POST no devuelve su id, el próximo refresh la cambia por la del servidor. */
internal fun userEntity(ownerId: String, content: String, at: Long) =
    AiChatMessageEntity(ownerId, "local-${UUID.randomUUID()}", ROLE_USER, content, at, null)

internal fun AiChatReplyDto.toEntity(ownerId: String, at: Long) = AiChatMessageEntity(
    ownerId, messageId, ROLE_ASSISTANT, response, at,
    suggestions.takeIf { it.isNotEmpty() }?.let { json.encodeToString(it) },
)

/** [keptSuggestions]: las que ya tenía Room para este id (GET /chat/today no las trae). */
internal fun AiChatTodayMessageDto.toEntity(ownerId: String, keptSuggestions: String?) =
    AiChatMessageEntity(ownerId, id, role, content, isoMillis(createdAt), keptSuggestions)

internal fun AiChatMessageEntity.toDomain() = AiChatMessage(
    id = id,
    fromUser = role == ROLE_USER,
    content = content,
    createdAt = Instant.ofEpochMilli(createdAt),
    suggestions = suggestionsJson
        ?.let { runCatching { json.decodeFromString<List<AiChatSuggestionDto>>(it) }.getOrNull() }
        .orEmpty()
        .map { AiChatSuggestion(it.exerciseId, it.name, it.reason) },
)
```

> Si `isoMillis` no resulta visible (es `internal` del mismo módulo, así que debería), copiar su línea a este archivo como `private fun isoMillis(iso: String) = OffsetDateTime.parse(iso).toInstant().toEpochMilli()`.

- [ ] **Step 5: Write the repository**

`AiChatRepository.kt`:

```kotlin
package com.fittrainer.data.aichat

import com.fittrainer.data.agenda.localDay
import com.fittrainer.data.agenda.student.dayStartMillis
import com.fittrainer.data.api.chat.AiChatApi
import com.fittrainer.data.api.chat.AiChatReplyDto
import com.fittrainer.data.api.chat.AiChatRequest
import com.fittrainer.data.api.errorEnvelope
import com.fittrainer.data.auth.RequiredUser
import com.fittrainer.data.db.aichat.AiChatDao
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.util.concurrent.atomic.AtomicLong
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import retrofit2.HttpException

/**
 * Chat IA del alumno (tarjeta 14). La conversación del día vive en Room y se refresca con GET /chat/today. Enviar es
 * solo con red y sin reintento: POST /chat no acepta un id del cliente y cada intento gasta cupo y una llamada a la
 * IA. Solo lo que salió bien se guarda. Única excepción: SESSION_FINISHED (sale antes de llamar a la IA) se reintenta
 * una vez sin session_id.
 */
@Singleton
class AiChatRepository @Inject constructor(
    private val api: AiChatApi,
    private val dao: AiChatDao,
    private val clock: Clock,
) : UserDataCleaner {

    // Cerrar sesión sube la generación y borra; una respuesta que llega después no se guarda (como los turnos).
    private val generation = AtomicLong()
    private val writeLock = Mutex()

    /** Los mensajes del día de Argentina de ahora, pregunta antes que respuesta. */
    fun observeToday(ownerId: String): Flow<List<AiChatMessage>> {
        val (from, to) = todayBounds()
        return dao.observeBetween(ownerId, from, to).map { rows -> rows.map { it.toDomain() } }.distinctUntilChanged()
    }

    /** Reemplaza el día con lo del servidor, conservando las sugerencias por id. Devuelve las consultas que quedan. */
    suspend fun refresh(ownerId: String): Result<Int> = call {
        val started = generation.get()
        val today = api.today(RequiredUser(ownerId)).data
        val (from, to) = todayBounds()
        guarded(started) {
            val kept = dao.getBetween(ownerId, from, to).associate { it.id to it.suggestionsJson }
            dao.replaceBetween(ownerId, from, to, today.messages.map { it.toEntity(ownerId, kept[it.id]) })
        }
        today.remainingToday
    }

    /** Una consulta. Si sale bien guarda pregunta y respuesta y devuelve las que quedan; si no, AiChatException. */
    suspend fun send(ownerId: String, message: String, sessionId: String?, exerciseId: String?): Result<Int> = call {
        val started = generation.get()
        val reply = post(ownerId, AiChatRequest(message, sessionId, exerciseId))
        val now = clock.millis()
        guarded(started) { dao.insert(listOf(userEntity(ownerId, message, now), reply.toEntity(ownerId, now))) }
        reply.remainingToday
    }

    private suspend fun post(ownerId: String, body: AiChatRequest): AiChatReplyDto = try {
        api.send(RequiredUser(ownerId), body).data
    } catch (e: HttpException) {
        val envelope = e.errorEnvelope()
        if (body.sessionId == null || e.code() != 400 || envelope?.code != SESSION_FINISHED) {
            throw AiChatException(httpAiChatError(e.code(), envelope, e.response()?.headers()?.get("Retry-After")), e)
        }
        api.send(RequiredUser(ownerId), body.copy(sessionId = null)).data
    }

    private fun todayBounds(): Pair<Long, Long> {
        val day = localDay(clock.instant())
        return dayStartMillis(day) to dayStartMillis(day.plusDays(1))
    }

    private suspend fun guarded(started: Long, write: suspend () -> Unit) = writeLock.withLock {
        if (generation.get() != started) throw AiChatException(AiChatError.Unknown)
        write()
    }

    private suspend fun <T> call(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(e as? AiChatException ?: AiChatException(e.toAiChatError(), e))
    }

    override suspend fun clearUserData(ownerId: String?) = writeLock.withLock {
        generation.incrementAndGet()
        if (ownerId == null) dao.clear() else dao.clearOwner(ownerId)
    }
}
```

Nota sobre el test `SESSION_FINISHED dos veces`: el segundo 400 sale de `api.send` dentro del `catch`, sin envoltorio → `call` lo mapea con `toAiChatError()` → `Unknown` (400 no es 429/502/503). Es lo esperado.

- [ ] **Step 6: Register the cleaner** — en `AiChatModule.kt`, debajo del `object`, sumar:

```kotlin
/** El chat IA del día también se borra al cerrar sesión. */
@Module
@InstallIn(SingletonComponent::class)
abstract class AiChatCleanerModule {
    @Binds
    @IntoSet
    abstract fun bindAiChatCleaner(impl: AiChatRepository): UserDataCleaner
}
```
(imports: `dagger.Binds`, `dagger.multibindings.IntoSet`, `com.fittrainer.data.aichat.AiChatRepository`, `com.fittrainer.data.session.UserDataCleaner`).

- [ ] **Step 7: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.aichat.*"`
Expected: PASS (todos). Después `./gradlew checkFileLength assembleDebug` (Hilt compila el grafo).

- [ ] **Step 8: Dejar listo** — sin commitear.

---

### Task 4: `AiChatViewModel` y textos

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/workout/aichat/AiChatTexts.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/workout/aichat/AiChatUiState.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/workout/aichat/AiChatViewModel.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/workout/aichat/AiChatTextsTest.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/workout/aichat/AiChatViewModelTest.kt`

**Interfaces:**
- Consumes: `AiChatRepository`, `AiChatError`, `AiChatException`, `AiChatMessage` (Task 3); `FakeAiChatApi`, `FakeAiChatDao`, `replyDto` (Tasks 2-3); `LibraryRepository.observeCache/refresh`, `LibraryExercise`; `SessionRepository`, `Session.Student`; `ConnectivityObserver`; fakes `FakeConnectivityObserver`, `FakeStudentSession`, `FakeExerciseApi`, `FakeLibraryDao`, `libraryDto`, `MutableClock`, `MainDispatcherRule`.
- Produces:
  - `data class AiChatTarget(val sessionId: String?, val exerciseId: String?, val exerciseName: String)`
  - `data class AiChatUiState(messages, offline, sending, remaining: Int?, notice: String?)` con `limitReached`, `canAsk`, `canSend(draft: String)`, `banner: String?`, `remainingLabel: String?`
  - `AiChatViewModel`: `draft: TextFieldValue`, `uiState: StateFlow<AiChatUiState>`, `onOpen()`, `onDraft(TextFieldValue)`, `onChip(question: String, target: AiChatTarget)`, `onPainChip(exerciseName: String)`, `onDictated(text: String)`, `onSend(target: AiChatTarget)`, `onReplaceSuggestion(exerciseId: String, onResolved: (LibraryExercise) -> Unit)`, `dismissNotice()`, `showNotice(text: String)`
  - Textos: `AI_OFFLINE`, `AI_TIMEOUT`, `AI_DAILY_LIMIT`, `AI_IN_PROGRESS`, `AI_UNKNOWN`, `AI_SUGGESTION_MISSING`, `CHIP_REPLACE`, `CHIP_HOW_TO`, `CHIP_PAIN`, `PAIN_CURSOR = 9`, `painTemplate(name)`, `aiChatErrorText(AiChatError)`, `remainingText(n)`, `AI_EMPTY_HINT`, `AI_THINKING`, `AI_TITLE`, `MAX_MESSAGE_LENGTH = 500`, `LOW_REMAINING = 5`

- [ ] **Step 1: Write the failing tests**

`AiChatTextsTest.kt`:

```kotlin
package com.fittrainer.ui.workout.aichat

import com.fittrainer.data.aichat.AiChatError
import org.junit.Assert.assertEquals
import org.junit.Test

class AiChatTextsTest {
    @Test fun `la plantilla del dolor deja el cursor en el hueco`() {
        val t = painTemplate("Sentadilla")
        assertEquals("Me duele  al hacer Sentadilla", t)
        assertEquals(' ', t[PAIN_CURSOR - 1])
        assertEquals(' ', t[PAIN_CURSOR])
    }

    @Test fun `cada error tiene su texto`() {
        assertEquals(AI_OFFLINE, aiChatErrorText(AiChatError.Offline))
        assertEquals(AI_TIMEOUT, aiChatErrorText(AiChatError.Timeout))
        assertEquals(AI_DAILY_LIMIT, aiChatErrorText(AiChatError.DailyLimit))
        assertEquals(AI_IN_PROGRESS, aiChatErrorText(AiChatError.InProgress))
        assertEquals("Caído", aiChatErrorText(AiChatError.Unavailable("Caído")))
        assertEquals(AI_UNKNOWN, aiChatErrorText(AiChatError.Unknown))
        assertEquals("Hiciste muchas consultas seguidas. Probá de nuevo en 2 min.", aiChatErrorText(AiChatError.TooManyAttempts(61)))
        assertEquals("Hiciste muchas consultas seguidas. Probá de nuevo más tarde.", aiChatErrorText(AiChatError.TooManyAttempts(null)))
    }

    @Test fun `las consultas que quedan`() {
        assertEquals("Te queda 1 consulta hoy", remainingText(1))
        assertEquals("Te quedan 5 consultas hoy", remainingText(5))
    }
}
```

`AiChatViewModelTest.kt`:

```kotlin
package com.fittrainer.ui.workout.aichat

import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.aichat.AiChatRepository
import com.fittrainer.data.api.LibraryResponse
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.aichat.FakeAiChatApi
import com.fittrainer.testing.fakes.aichat.FakeAiChatDao
import com.fittrainer.testing.fakes.aichat.replyDto
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.auth.httpError
import com.fittrainer.testing.fakes.library.FakeExerciseApi
import com.fittrainer.testing.fakes.library.FakeLibraryDao
import com.fittrainer.testing.fakes.library.libraryDto
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import java.io.IOException
import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** Tarjeta 14: el chat IA dentro de la sesión. El alumno es u1; hoy es el 09/11 a las 12:00 de Argentina. */
@OptIn(ExperimentalCoroutinesApi::class)
class AiChatViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    private val api = FakeAiChatApi()
    private val clock = MutableClock(Instant.parse("2026-11-09T15:00:00Z").toEpochMilli())
    private val repo = AiChatRepository(api, FakeAiChatDao(), clock)
    private val exerciseApi = FakeExerciseApi(LibraryResponse(listOf(libraryDto("e2"))))
    private val library = LibraryRepository(exerciseApi, FakeLibraryDao(), clock)
    private val connectivity = FakeConnectivityObserver()
    private val vm by lazy { AiChatViewModel(repo, library, FakeStudentSession(), connectivity, SavedStateHandle()) }
    private val target = AiChatTarget("s1", "e1", "Sentadilla")

    private fun chatTest(block: suspend TestScope.() -> Unit) = runTest {
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        block()
    }

    @Test fun `un chip de pregunta se envia solo y la respuesta queda en la lista`() = chatTest {
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()
        assertEquals(CHIP_REPLACE, api.sent.single().message)
        assertEquals(listOf(CHIP_REPLACE, "Probá press"), vm.uiState.value.messages.map { it.content })
        assertEquals(19, vm.uiState.value.remaining)
    }

    @Test fun `el chip del dolor completa la caja con el cursor en el hueco y no envia`() = chatTest {
        vm.onPainChip("Sentadilla")
        assertEquals("Me duele  al hacer Sentadilla", vm.draft.text)
        assertEquals(TextRange(PAIN_CURSOR), vm.draft.selection)
        assertTrue(api.sent.isEmpty())
    }

    @Test fun `enviar la caja la vacia si sale bien`() = chatTest {
        vm.onDraft(TextFieldValue("  ¿Cómo bajo?  "))
        vm.onSend(target)
        runCurrent()
        assertEquals("¿Cómo bajo?", api.sent.single().message)
        assertEquals("", vm.draft.text)
    }

    @Test fun `si falla el texto queda en la caja con el aviso`() = chatTest {
        api.errors += IOException()
        vm.onDraft(TextFieldValue("hola"))
        vm.onSend(target)
        runCurrent()
        assertEquals("hola", vm.draft.text)
        assertEquals(AI_OFFLINE, vm.uiState.value.banner)
        assertFalse(vm.uiState.value.sending)
    }

    @Test fun `un segundo envio mientras espera no sale`() = chatTest {
        val gate = CompletableDeferred<Unit>()
        api.gate = gate
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()
        assertTrue(vm.uiState.value.sending)
        vm.onChip(CHIP_HOW_TO, target)
        vm.onDraft(TextFieldValue("otra"))
        vm.onSend(target)
        runCurrent()
        gate.complete(Unit)
        runCurrent()
        assertEquals(1, api.sent.size)
    }

    @Test fun `el tope del dia apaga la caja`() = chatTest {
        api.errors += httpError(429, """{"error":{"code":"CHAT_LIMIT_REACHED","message":"x"}}""")
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()
        assertTrue(vm.uiState.value.limitReached)
        assertFalse(vm.uiState.value.canAsk)
        assertEquals(AI_DAILY_LIMIT, vm.uiState.value.banner)
    }

    @Test fun `responder con cero restantes tambien apaga la caja`() = chatTest {
        api.reply = replyDto(remaining = 0)
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()
        assertTrue(vm.uiState.value.limitReached)
    }

    @Test fun `sin red no se puede preguntar y el aviso lo explica`() = chatTest {
        connectivity.state.value = false
        runCurrent()
        assertFalse(vm.uiState.value.canAsk)
        assertEquals(AI_OFFLINE, vm.uiState.value.banner)
        vm.onChip(CHIP_REPLACE, target)
        runCurrent()
        assertTrue(api.sent.isEmpty())
    }

    @Test fun `abrir refresca y trae lo que queda`() = chatTest {
        api.today = api.today.copy(remainingToday = 4)
        vm.onOpen()
        runCurrent()
        assertEquals(4, vm.uiState.value.remaining)
        assertEquals(remainingText(4), vm.uiState.value.remainingLabel)
    }

    @Test fun `dictar suma el texto a la caja`() = chatTest {
        vm.onDictated("me duele la rodilla")
        assertEquals("me duele la rodilla", vm.draft.text)
        vm.onDictated("al bajar")
        assertEquals("me duele la rodilla al bajar", vm.draft.text)
    }

    @Test fun `reemplazar una sugerencia que no esta en Room refresca la biblioteca una vez`() = chatTest {
        var resolved: LibraryExercise? = null
        vm.onReplaceSuggestion("e2") { resolved = it }
        runCurrent()
        assertEquals("e2", resolved?.id)
        assertEquals(1, exerciseApi.calls)
    }

    @Test fun `una sugerencia que no aparece ni refrescando avisa`() = chatTest {
        var resolved: LibraryExercise? = null
        vm.onReplaceSuggestion("nada") { resolved = it }
        runCurrent()
        assertNull(resolved)
        assertEquals(AI_SUGGESTION_MISSING, vm.uiState.value.banner)
    }

    @Test fun `la caja corta en 500`() = chatTest {
        vm.onDraft(TextFieldValue("x".repeat(600)))
        assertEquals(MAX_MESSAGE_LENGTH, vm.draft.text.length)
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.aichat.*"`
Expected: FAIL de compilación.

- [ ] **Step 3: Write texts and state**

`AiChatTexts.kt`:

```kotlin
package com.fittrainer.ui.workout.aichat

import com.fittrainer.data.aichat.AiChatError

const val AI_TITLE = "Asistente IA"
const val AI_THINKING = "Pensando…"
const val AI_EMPTY_HINT = "Preguntá cómo hacer el ejercicio, con qué reemplazarlo o qué hacer si te molesta algo."
const val AI_OFFLINE = "Necesitás conexión para usar el asistente. Tu sesión sigue guardándose sin red."
const val AI_TIMEOUT = "El asistente tardó demasiado. Seguí con tu entrenamiento y probá de nuevo."
const val AI_DAILY_LIMIT = "Llegaste al límite de consultas de hoy. Mañana podés seguir."
const val AI_IN_PROGRESS = "Esperá la respuesta anterior."
const val AI_UNKNOWN = "No pudimos consultar al asistente. Probá de nuevo."
const val AI_SUGGESTION_MISSING = "Ese ejercicio no está en tu biblioteca. Probá con Reemplazar."
const val AI_REPLACE = "Reemplazar"
const val AI_INPUT_HINT = "Escribí tu pregunta"
const val AI_DICTATE = "Dictar"
const val AI_SEND = "Enviar"

const val CHIP_REPLACE = "¿Con qué lo reemplazo?"
const val CHIP_HOW_TO = "¿Cómo se hace?"
const val CHIP_PAIN = "Me duele…"

/** Largo máximo de una consulta (el backend acepta 1-500). */
const val MAX_MESSAGE_LENGTH = 500

/** Desde cuántas consultas restantes se muestra el contador. */
const val LOW_REMAINING = 5

/** Dónde queda el cursor en [painTemplate]: entre "Me duele " y " al hacer". */
const val PAIN_CURSOR = 9

fun painTemplate(exerciseName: String) = "Me duele  al hacer $exerciseName"

fun remainingText(n: Int) = if (n == 1) "Te queda 1 consulta hoy" else "Te quedan $n consultas hoy"

fun aiChatErrorText(error: AiChatError): String = when (error) {
    AiChatError.Offline -> AI_OFFLINE
    AiChatError.Timeout -> AI_TIMEOUT
    AiChatError.DailyLimit -> AI_DAILY_LIMIT
    AiChatError.InProgress -> AI_IN_PROGRESS
    is AiChatError.TooManyAttempts -> error.retryAfterSeconds
        ?.let { "Hiciste muchas consultas seguidas. Probá de nuevo en ${(it + 59) / 60} min." }
        ?: "Hiciste muchas consultas seguidas. Probá de nuevo más tarde."
    is AiChatError.Unavailable -> error.message
    AiChatError.Unknown -> AI_UNKNOWN
}
```

`AiChatUiState.kt`:

```kotlin
package com.fittrainer.ui.workout.aichat

import com.fittrainer.data.aichat.AiChatMessage

/** Lo que la hoja necesita de la sesión: a qué sesión y ejercicio se refiere la consulta. */
data class AiChatTarget(val sessionId: String?, val exerciseId: String?, val exerciseName: String)

/** remaining: consultas que quedan hoy (null = todavía no se sabe). notice: el error del último intento. */
data class AiChatUiState(
    val messages: List<AiChatMessage> = emptyList(),
    val offline: Boolean = false,
    val sending: Boolean = false,
    val remaining: Int? = null,
    val notice: String? = null,
) {
    val limitReached: Boolean get() = remaining == 0
    val canAsk: Boolean get() = !offline && !sending && !limitReached
    fun canSend(draft: String) = canAsk && draft.isNotBlank()

    /** El aviso sobre la caja: sin red y el tope ganan sobre el error del último intento. */
    val banner: String? get() = when {
        offline -> AI_OFFLINE
        limitReached -> AI_DAILY_LIMIT
        else -> notice
    }

    val remainingLabel: String? get() = remaining?.takeIf { it in 1..LOW_REMAINING }?.let { remainingText(it) }
}
```

- [ ] **Step 4: Write the ViewModel**

`AiChatViewModel.kt`:

```kotlin
package com.fittrainer.ui.workout.aichat

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.aichat.AiChatError
import com.fittrainer.data.aichat.AiChatException
import com.fittrainer.data.aichat.AiChatRepository
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.data.library.LibraryRepository
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
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
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private data class AiChatLocal(val sending: Boolean = false, val remaining: Int? = null, val notice: String? = null)

/**
 * La hoja del asistente IA en la sesión activa (tarjeta 14). Lee la conversación del día de Room y la refresca al
 * abrirse; preguntar es solo con red y de a una. El borrador vive en [SavedStateHandle]. La sesión no se toca: el
 * reemplazo de una sugerencia lo hace WorkoutViewModel con el ejercicio que resuelve [onReplaceSuggestion].
 */
@HiltViewModel
class AiChatViewModel @Inject constructor(
    private val repository: AiChatRepository,
    private val library: LibraryRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val saved: SavedStateHandle,
) : ViewModel() {

    private val ownerId = sessionRepository.session.map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val local = MutableStateFlow(AiChatLocal())

    @OptIn(ExperimentalCoroutinesApi::class)
    private val messages = ownerId.filterNotNull().flatMapLatest { repository.observeToday(it) }.onStart { emit(emptyList()) }

    val uiState: StateFlow<AiChatUiState> = combine(messages, online, local) { m, on, l ->
        AiChatUiState(m, !on, l.sending, l.remaining, l.notice)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AiChatUiState())

    var draft by mutableStateOf(TextFieldValue(saved[DRAFT_KEY] ?: ""))
        private set

    /** Al abrir la hoja: trae el día del servidor. Si falla (sin red) se ve lo que ya había en Room. */
    fun onOpen() {
        viewModelScope.launch {
            repository.refresh(owner()).onSuccess { r -> local.update { it.copy(remaining = r) } }
        }
    }

    fun onDraft(value: TextFieldValue) {
        val text = value.text.take(MAX_MESSAGE_LENGTH)
        setDraft(if (text == value.text) value else TextFieldValue(text, TextRange(text.length)))
        dismissNotice()
    }

    fun onPainChip(exerciseName: String) = setDraft(TextFieldValue(painTemplate(exerciseName), TextRange(PAIN_CURSOR)))

    /** Lo dictado se suma al final de la caja; no se envía solo. */
    fun onDictated(text: String) {
        val current = draft.text.trimEnd()
        val joined = (if (current.isEmpty()) text.trim() else "$current ${text.trim()}").take(MAX_MESSAGE_LENGTH)
        setDraft(TextFieldValue(joined, TextRange(joined.length)))
    }

    fun onChip(question: String, target: AiChatTarget) = ask(question, target, fromDraft = false)

    fun onSend(target: AiChatTarget) = ask(draft.text.trim(), target, fromDraft = true)

    /** Busca el ejercicio en la biblioteca de Room; si no está, la refresca una vez. Si sigue sin estar, avisa. */
    fun onReplaceSuggestion(exerciseId: String, onResolved: (LibraryExercise) -> Unit) {
        viewModelScope.launch {
            val id = owner()
            val found = find(id, exerciseId) ?: library.refresh(id).let { find(id, exerciseId) }
            if (found != null) onResolved(found) else local.update { it.copy(notice = AI_SUGGESTION_MISSING) }
        }
    }

    fun dismissNotice() {
        if (local.value.notice != null) local.update { it.copy(notice = null) }
    }

    /** Un aviso de la pantalla (p. ej. «Reemplazar» bloqueado en una sugerencia). */
    fun showNotice(text: String) = local.update { it.copy(notice = text) }

    private fun ask(text: String, target: AiChatTarget, fromDraft: Boolean) {
        val l = local.value
        if (text.isBlank() || l.sending || !online.value || l.remaining == 0) return
        local.update { it.copy(sending = true, notice = null) }
        viewModelScope.launch {
            val result = repository.send(owner(), text, target.sessionId, target.exerciseId)
            result.onSuccess { remaining ->
                if (fromDraft && draft.text.trim() == text) setDraft(TextFieldValue(""))
                local.update { it.copy(sending = false, remaining = remaining) }
            }
            result.onFailure { e ->
                val error = (e as? AiChatException)?.error ?: AiChatError.Unknown
                local.update {
                    it.copy(
                        sending = false,
                        notice = aiChatErrorText(error),
                        remaining = if (error == AiChatError.DailyLimit) 0 else it.remaining,
                    )
                }
            }
        }
    }

    private suspend fun find(ownerId: String, exerciseId: String): LibraryExercise? =
        library.observeCache(ownerId).first().exercises.firstOrNull { it.id == exerciseId }

    private suspend fun owner(): String = ownerId.filterNotNull().first()

    private fun setDraft(value: TextFieldValue) {
        draft = value
        saved[DRAFT_KEY] = value.text
    }
}

private const val DRAFT_KEY = "ai_chat_draft"
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.aichat.*"`
Expected: PASS. Si `si falla el texto queda en la caja` da `banner = null`, revisar que `onDraft` no se llame después del envío (el `dismissNotice` de `onDraft` borra el aviso: es lo buscado al tipear de nuevo).

- [ ] **Step 6: Dejar listo** — `./gradlew checkFileLength`; sin commitear.

---

### Task 5: La hoja `AiChatSheet` y el botón «✦ IA»

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/workout/aichat/AiChatSheet.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/workout/aichat/components/AiChatBubbles.kt` (burbujas, «Pensando…», tarjeta de sugerencia)
- Create: `mobile/app/src/main/java/com/fittrainer/ui/workout/aichat/components/AiChatComposer.kt` (chips, caja, micrófono, Enviar)
- Create: `mobile/app/src/main/java/com/fittrainer/ui/workout/aichat/components/Dictation.kt` (`rememberDictation`)
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/workout/components/BottomActions.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/workout/WorkoutContent.kt` (`WorkoutActions` + llamada a `BottomActions`)
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/workout/WorkoutScreen.kt` (`Overlay.Ai`)
- Modify: `mobile/app/src/main/AndroidManifest.xml` (`<queries>` del dictado)
- Test: `mobile/app/src/test/java/com/fittrainer/ui/workout/components/BottomActionsTextsTest.kt` no hace falta: lo visual se prueba a mano (Task 6). Los cambios de lógica ya están cubiertos en la Task 4.

**Interfaces:**
- Consumes: `AiChatViewModel`, `AiChatUiState`, `AiChatTarget`, textos (Task 4); `AiChatMessage`, `AiChatSuggestion` (Task 3); `WorkoutViewModel.onReplace(LibraryExercise)`, `workout.canReplace(position)`, `REPLACE_LOCKED`, `SnackbarHostState.flash`.
- Produces: `@Composable fun AiChatSheet(target: AiChatTarget, canReplace: Boolean, onDismiss: () -> Unit, onReplace: (LibraryExercise) -> Unit, viewModel: AiChatViewModel = hiltViewModel())`; `BottomActions(canReplace, aiEnabled, onTechnique, onReplace, onAi, onReplaceLocked, onAiLocked)`.

- [ ] **Step 1: `BottomActions` con el botón IA activo**

Reemplazar la firma y el tercer botón:

```kotlin
/**
 * Técnica (hoja de la biblioteca), Reemplazar y ✦ IA (tarjeta 14). Bloqueados se ven apagados pero se pueden tocar:
 * así la pantalla explica por qué (onReplaceLocked / onAiLocked) en vez de un texto fijo.
 */
@Composable
fun BottomActions(
    canReplace: Boolean,
    aiEnabled: Boolean,
    onTechnique: () -> Unit,
    onReplace: () -> Unit,
    onAi: () -> Unit,
    onReplaceLocked: () -> Unit = {},
    onAiLocked: () -> Unit = {},
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        OutlinedButton(onClick = onTechnique, modifier = Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget)) { Text("Técnica") }
        LockableButton("Reemplazar", canReplace, if (canReplace) onReplace else onReplaceLocked, Modifier.weight(1.3f))
        LockableButton("✦ IA", aiEnabled, if (aiEnabled) onAi else onAiLocked, Modifier.weight(0.7f))
    }
}

/** Apagado pero tocable; sin `enabled`, TalkBack lo leería activo: se avisa que ahora no está disponible. */
@Composable
private fun LockableButton(label: String, enabled: Boolean, onClick: () -> Unit, modifier: Modifier) {
    OutlinedButton(
        onClick = onClick,
        colors = if (enabled) ButtonDefaults.outlinedButtonColors() else ButtonDefaults.outlinedButtonColors(contentColor = FtColors.Ink5),
        border = if (enabled) ButtonDefaults.outlinedButtonBorder(true) else BorderStroke(1.dp, FtColors.Card),
        modifier = modifier.heightIn(min = Spacing.minTouchTarget).then(
            if (enabled) Modifier else Modifier.semantics { stateDescription = "No disponible" },
        ),
    ) { Text(label) }
}
```

En `WorkoutContent.kt`: sumar `val onAi: () -> Unit,` y `val onAiLocked: () -> Unit,` a `WorkoutActions` (al final, con default `= {}` si el constructor ya usa defaults; si no, sin default y pasarlos en `WorkoutScreen`), y cambiar la llamada:

```kotlin
BottomActions(
    workout.canReplace(workout.cursor.position), !state.isOffline,
    actions.onTechnique, actions.onReplace, actions.onAi, actions.onReplaceLocked, actions.onAiLocked,
)
```

- [ ] **Step 2: Dictado** (`components/Dictation.kt`)

```kotlin
package com.fittrainer.ui.workout.aichat.components

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

/** Abre el dictado del sistema (sin permiso de micrófono). null si el celular no tiene reconocedor de voz. */
@Composable
fun rememberDictation(onText: (String) -> Unit): (() -> Unit)? {
    val context = LocalContext.current
    val intent = remember {
        Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-AR")
    }
    val available = remember { intent.resolveActivity(context.packageManager) != null }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode != Activity.RESULT_OK) return@rememberLauncherForActivityResult
        result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()?.takeIf { it.isNotBlank() }?.let(onText)
    }
    return if (available) ({ launcher.launch(intent) }) else null
}
```

En `AndroidManifest.xml`, dentro de `<manifest>` (antes de `<application>`; si ya hay un `<queries>`, sumar el `<intent>` adentro):

```xml
    <!-- Dictado del chat IA (tarjeta 14): sin esto, en Android 11+ no se ve la actividad de reconocimiento de voz. -->
    <queries>
        <intent>
            <action android:name="android.speech.action.RECOGNIZE_SPEECH" />
        </intent>
    </queries>
```

- [ ] **Step 3: Burbujas y sugerencias** (`components/AiChatBubbles.kt`)

```kotlin
package com.fittrainer.ui.workout.aichat.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import com.fittrainer.data.aichat.AiChatMessage
import com.fittrainer.data.aichat.AiChatSuggestion
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.aichat.AI_REPLACE
import com.fittrainer.ui.workout.aichat.AI_THINKING

/** Una burbuja: el alumno a la derecha (azul de marca), la IA a la izquierda, con sus sugerencias abajo. */
@Composable
fun AiChatBubble(message: AiChatMessage, canReplace: Boolean, onReplace: (AiChatSuggestion) -> Unit, onReplaceLocked: () -> Unit) {
    Column(Modifier.fillMaxWidth(), horizontalAlignment = if (message.fromUser) Alignment.End else Alignment.Start) {
        Bubble(message.content, message.fromUser)
        message.suggestions.forEach { s ->
            SuggestionCard(s, canReplace, onClick = { if (canReplace) onReplace(s) else onReplaceLocked() })
        }
    }
}

@Composable
fun ThinkingBubble() = Bubble(AI_THINKING, fromUser = false)

@Composable
private fun Bubble(text: String, fromUser: Boolean) {
    Box(
        Modifier.widthIn(max = 300.dp).clip(MaterialTheme.shapes.medium)
            .background(if (fromUser) FtColors.Brand else FtColors.Card)
            .padding(horizontal = Spacing.md, vertical = Spacing.sm),
    ) {
        Text(text, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
    }
}

@Composable
private fun SuggestionCard(s: AiChatSuggestion, canReplace: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.padding(top = Spacing.xs).widthIn(max = 300.dp).clip(MaterialTheme.shapes.medium)
            .background(FtColors.Elevated).padding(Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Column(Modifier.weight(1f)) {
            Text(s.name, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
            Text(s.reason, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        }
        OutlinedButton(
            onClick = onClick,
            colors = if (canReplace) ButtonDefaults.outlinedButtonColors() else ButtonDefaults.outlinedButtonColors(contentColor = FtColors.Ink5),
            modifier = Modifier.heightIn(min = Spacing.minTouchTarget).then(
                if (canReplace) Modifier else Modifier.semantics { stateDescription = "No disponible" },
            ),
        ) { Text(AI_REPLACE) }
    }
}
```

- [ ] **Step 4: Caja y chips** (`components/AiChatComposer.kt`)

```kotlin
package com.fittrainer.ui.workout.aichat.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.input.TextFieldValue
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.aichat.AI_DICTATE
import com.fittrainer.ui.workout.aichat.AI_INPUT_HINT
import com.fittrainer.ui.workout.aichat.AI_SEND
import com.fittrainer.ui.workout.aichat.CHIP_HOW_TO
import com.fittrainer.ui.workout.aichat.CHIP_PAIN
import com.fittrainer.ui.workout.aichat.CHIP_REPLACE

/** Chips de preguntas frecuentes arriba de la caja; micrófono solo si hay dictado ([onDictate] != null). */
@Composable
fun AiChatComposer(
    draft: TextFieldValue,
    enabled: Boolean,
    canSend: Boolean,
    focus: FocusRequester,
    onDraft: (TextFieldValue) -> Unit,
    onQuestionChip: (String) -> Unit,
    onPainChip: () -> Unit,
    onDictate: (() -> Unit)?,
    onSend: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            AssistChip(onClick = { onQuestionChip(CHIP_REPLACE) }, label = { Text(CHIP_REPLACE) }, enabled = enabled)
            AssistChip(onClick = { onQuestionChip(CHIP_HOW_TO) }, label = { Text(CHIP_HOW_TO) }, enabled = enabled)
            AssistChip(onClick = onPainChip, label = { Text(CHIP_PAIN) }, enabled = enabled)
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = draft, onValueChange = onDraft, enabled = enabled, placeholder = { Text(AI_INPUT_HINT) },
                maxLines = 4, modifier = Modifier.weight(1f).focusRequester(focus),
            )
            onDictate?.let { IconButton(onClick = it, enabled = enabled) { Icon(Icons.Filled.Mic, contentDescription = AI_DICTATE) } }
            IconButton(onClick = onSend, enabled = canSend) { Icon(Icons.AutoMirrored.Filled.Send, contentDescription = AI_SEND) }
        }
    }
}
```

> Si `Icons.Filled.Mic` no está (falta `material-icons-extended`), revisar `mobile/app/build.gradle.kts`: si la dependencia no está, usar un `Text("🎤")` dentro del `IconButton` con `Modifier.semantics { contentDescription = AI_DICTATE }` en vez de sumar una dependencia nueva. Lo mismo para `Send` (`Text("➤")`).

- [ ] **Step 5: La hoja** (`AiChatSheet.kt`)

```kotlin
package com.fittrainer.ui.workout.aichat

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.library.LibraryExercise
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.REPLACE_LOCKED
import com.fittrainer.ui.workout.aichat.components.AiChatBubble
import com.fittrainer.ui.workout.aichat.components.AiChatComposer
import com.fittrainer.ui.workout.aichat.components.ThinkingBubble
import com.fittrainer.ui.workout.aichat.components.rememberDictation

/**
 * Guía Mobile p.15 · Asistente IA, arriba de la sesión activa (tarjeta 14). Cerrarla deja al alumno en la misma serie:
 * el timer y el cursor siguen en WorkoutViewModel. «Reemplazar» de una sugerencia llama a [onReplace] (el reemplazo
 * de siempre) y la pantalla cierra la hoja.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiChatSheet(
    target: AiChatTarget,
    canReplace: Boolean,
    onDismiss: () -> Unit,
    onReplace: (LibraryExercise) -> Unit,
    viewModel: AiChatViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val focus = remember { FocusRequester() }
    val list = rememberLazyListState()
    val dictate = rememberDictation(viewModel::onDictated)
    LaunchedEffect(Unit) { viewModel.onOpen() }
    LaunchedEffect(state.messages.size, state.sending) {
        val last = state.messages.size + (if (state.sending) 1 else 0) - 1
        if (last >= 0) list.animateScrollToItem(last)
    }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = FtColors.Background) {
        Column(
            Modifier.fillMaxWidth().fillMaxHeight(0.9f).imePadding().padding(horizontal = Spacing.lg, vertical = Spacing.sm),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Text("$AI_TITLE · ${target.exerciseName}", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            state.remainingLabel?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary) }
            LazyColumn(Modifier.weight(1f), state = list, verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                if (state.messages.isEmpty() && !state.sending) {
                    item { Text(AI_EMPTY_HINT, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary) }
                }
                items(state.messages, key = { it.id }) { m ->
                    AiChatBubble(
                        m, canReplace,
                        onReplace = { s -> viewModel.onReplaceSuggestion(s.exerciseId, onReplace) },
                        onReplaceLocked = { viewModel.showNotice(REPLACE_LOCKED) },
                    )
                }
                if (state.sending) item { ThinkingBubble() }
            }
            state.banner?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary) }
            AiChatComposer(
                draft = viewModel.draft,
                enabled = state.canAsk,
                canSend = state.canSend(viewModel.draft.text),
                focus = focus,
                onDraft = viewModel::onDraft,
                onQuestionChip = { viewModel.onChip(it, target) },
                onPainChip = {
                    viewModel.onPainChip(target.exerciseName)
                    focus.requestFocus()
                },
                onDictate = dictate,
                onSend = { viewModel.onSend(target) },
            )
        }
    }
}
```

(`viewModel.showNotice` ya está en la Task 4.)

- [ ] **Step 6: Abrir la hoja desde la sesión** (`WorkoutScreen.kt`)

- `private enum class Overlay { Edit, Technique, Replace, List, Ai }`
- En `WorkoutActions(...)`: `onAi = { overlay = Overlay.Ai },` y `onAiLocked = { scope.launch { snackbar.flash(AI_OFFLINE) } },` (import `com.fittrainer.ui.workout.aichat.AI_OFFLINE`).
- En el `when (overlay)`:

```kotlin
        Overlay.Ai -> AiChatSheet(
            AiChatTarget(workout.id, exercise.exerciseId, exercise.name),
            canReplace = workout.canReplace(workout.cursor.position),
            onDismiss = { overlay = null },
        ) {
            viewModel.onReplace(it)
            overlay = null
        }
```
(imports `com.fittrainer.ui.workout.aichat.AiChatSheet`, `AiChatTarget`, `com.fittrainer.data.workout.canReplace`). Si la hoja está abierta y se corta la red, la hoja queda abierta y apaga la caja (lo maneja su estado).

- [ ] **Step 7: Build y tamaños**

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL; ningún archivo > 200 líneas (`WorkoutScreen.kt` debería quedar en ~188).

- [ ] **Step 8: Dejar listo** — sin commitear.

---

### Task 6: Verificación completa y prueba manual

**Files:** ninguno nuevo (salvo correcciones que salgan de la prueba).

- [ ] **Step 1: Suite completa**

Run (en `mobile/`): `./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL, 0 tests fallidos. Con el emulador: `./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.fittrainer.data.db.migration.v2x.MigrationV25Test`.

- [ ] **Step 2: Levantar backend y n8n** desde el worktree `C:\Users\igna_\Desktop\fittrainer-ia-rag` (rama de la #90): `docker compose up -d n8n` y `npm run dev` en `backend/`. App en el emulador con `API_BASE_URL=http://10.0.2.2:3001/api`.

- [ ] **Step 3: Criterio de aceptación** (con `alumna.card8` / `Prueba1234`):
  1. Empezar la rutina de hoy → registrar una serie → «✦ IA» → chip «¿Cómo se hace?» → llega la respuesta (≤ 20 s).
  2. Chip «¿Con qué lo reemplazo?» en un ejercicio sin series hechas → «Reemplazar» en una sugerencia → la hoja se cierra, el ejercicio cambió y el timer siguió corriendo.
  3. Cerrar la hoja → misma serie, mismos kg cargados, cronómetro intacto.
  4. «Me duele…» → la caja queda con el cursor en el hueco y el teclado abierto; completar y enviar.
  5. Micrófono → dictar → el texto queda en la caja.
  6. Modo avión → «✦ IA» apagado; tocarlo muestra el aviso. Con la hoja abierta, activar modo avión → caja y chips se apagan con el aviso, la conversación sigue visible.
  7. Corte a los 20 s: frenar n8n (`docker compose stop n8n` hace que el backend responda 503 enseguida; para el timeout, pausar el contenedor con `docker compose pause n8n`) → aviso de timeout y el texto queda en la caja. `docker compose unpause n8n` al terminar.

- [ ] **Step 4: Trello** — mover la tarjeta 14 a 🔍 AUDITORÍA CODEX y comentar `🛠️ CLAUDE · Lista para auditar` (rama `feature/android-chat-ia` sobre `feature/ai-rag-nvidia`, carpetas, spec y plan, criterio, cómo se probó y pendientes: celular físico, merge de #83/#85/#90, cambio de base a `develop`).
