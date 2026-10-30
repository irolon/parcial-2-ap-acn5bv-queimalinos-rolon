---
tags: [plan]
tarjeta: 11
---
# Sincronización offline de sesiones — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Las sesiones terminadas en el celular se suben solas al módulo Sesiones del backend con WorkManager, sin perder ni duplicar nada, y el alumno ve si le queda algo sin subir.

**Architecture:**
- **Room v5** suma estado de subida por serie.
- **Subida:**
  - `SessionUploader` sube una sesión por Retrofit, sin tocar Room;
  - `SyncPass` recorre las pendientes del alumno logueado y guarda cada resultado en Room;
  - `SyncSessionsWorker` es el `CoroutineWorker` (Hilt) que corre una pasada;
  - `SyncTrigger` observa Room y encola el trabajo único `sync-sessions` cada vez que hay algo pendiente.
- **UI:** lee el estado de Room con `UploadStatusRepository`. El logout pregunta con `SignOutSyncViewModel`.

**Tech Stack:** Kotlin, Jetpack Compose, Room 2.7.2, WorkManager 2.10.3, androidx.hilt:hilt-work 1.2.0, Hilt 2.57.1, Retrofit 2.11 + kotlinx.serialization, JUnit4 + MockWebServer + kotlinx-coroutines-test.

**Spec:** `docs/superpowers/specs/2026-10-29-sync-offline-design.md`. Contrato: `docs/arquitectura/contratos-api.md`, módulo Sesiones.

## Global Constraints

- Ningún archivo de código (tests incluidos) pasa de **200 líneas físicas** (`gradlew checkFileLength`). Capa → módulo → archivo: lo nuevo de subida va en `data/sync/` y `ui/sync/`; sus tests copian el árbol.
- **Room es la única fuente de verdad:** la UI nunca lee WorkManager ni Retrofit, solo Room vía repositorio.
- **Nunca migraciones destructivas:** v4 → v5 es `AutoMigration` y suma su caso a `FitTrainerDatabaseMigrationTest`. Se commitea `app/schemas/com.fittrainer.data.db.FitTrainerDatabase/5.json`.
- Solo se suben sesiones `status = FINISHED` y `syncState = PENDING` **del alumno con sesión iniciada**. Una sesión `ACTIVE` nunca se toca.
- Las series en `failed` nunca se reintentan. Lotes de **1 a 100** series por request.
- Fechas al backend en ISO 8601 con zona: `Instant.ofEpochMilli(ms).toString()`.
- Textos de UI exactos del spec §6. Tema oscuro (`FtColors`), toque mínimo `Spacing.minTouchTarget`.
- **Los agentes no commitean** (`AGENTS.md`): cada task termina en un checkpoint con los tests en verde. El commit lo hace Igna.
- Builds con `JAVA_HOME` del JDK 24 (`C:\Program Files\Java\jdk-24*`): el JBR de Android Studio está roto.

## Review Focus

1. **Logout o cambio de alumno con sesiones pendientes de otro dueño:** solo se suben las del alumno logueado; las otras quedan `PENDING` intactas. *(Task 3: `solo sube las terminadas pendientes del duenio`)*
2. **Sesión con más de 100 series y una fallida en el segundo lote:** `index` es relativo al lote, así que la fallida tiene que caer en la serie correcta (`batch[index]`, no `sets[index]`). *(Task 2: `mas de 100 series van en dos lotes y el index es del lote`)*
3. **El servidor devuelve los ids en minúscula y el celular los tiene en mayúscula:** igual se marcan `SYNCED`. *(Task 2: `ids en minuscula en la respuesta se resuelven a los locales`)*
4. **Se corta la red después del primer lote:** lo del primer lote queda `SYNCED`, la sesión sigue `PENDING` y la pasada pide reintento; reenviar no duplica. *(Task 2: `5xx en el segundo lote corta con RETRY y conserva el primero`; Task 3: `RETRY deja marcado lo ya subido`)*
5. **"Subir ahora" sin red:** falla al instante, sin quedarse 15 s con la ruedita. *(Task 6: `subir ahora sin red falla al instante`)*

## Decisiones del plan (detalles que el spec deja abiertos)

- **Disparadores (spec §4):** en vez de llamar a `enqueue()` desde `finish()`, el login y el arranque, `SyncTrigger` observa en Room cuántas sesiones pendientes tiene el alumno logueado y encola cuando hay alguna. Cubre los tres casos y cualquier otro camino por donde aparezca una sesión pendiente, sin tocar `WorkoutRepository`.
- **Aviso en Hoy (spec §6):** lo alimenta `UploadStatusViewModel`, un ViewModel aparte, en lugar de `TodayViewModel`. `TodayViewModel` ya tiene 160 líneas y la lógica de refresco no tiene nada que ver con la subida.
- **`syncNow`:** solo encola y espera a que la cola quede quieta. Si se agota el tiempo, devuelve `false`. Si hay o no pendientes lo decide Room, no WorkManager.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `data/db/workout/WorkoutEntities.kt` (mod) | `SYNC_SYNCED`, `SYNC_FAILED`; `syncState` y `syncError` en `WorkoutSetEntity` |
| `data/db/workout/UploadRows.kt` (nuevo) | `UploadCounts`, `SessionUploadRow` (filas de las consultas de subida) |
| `data/db/workout/WorkoutDao.kt` (mod) | consultas de subida + `applyUpload` transaccional |
| `data/db/FitTrainerDatabase.kt` (mod) | versión 5 + `AutoMigration(4, 5)` |
| `data/api/SessionApi.kt` (nuevo) | Retrofit + DTO del módulo Sesiones |
| `di/NetworkModule.kt` (mod) | `provideSessionApi` |
| `data/sync/SessionUploader.kt` (nuevo) | sube una sesión; traduce respuestas a `UploadResult` |
| `data/sync/SyncPass.kt` (nuevo) | una pasada sobre las pendientes del dueño |
| `data/sync/SyncSessionsWorker.kt` (nuevo) | `CoroutineWorker` Hilt: corre `SyncPass` |
| `data/sync/SessionSync.kt` (nuevo) | interfaz + `WorkManagerSessionSync` (trabajo único `sync-sessions`) |
| `data/sync/SyncTrigger.kt` (nuevo) | observa Room y encola |
| `data/sync/UploadStatusRepository.kt` (nuevo) | lectura de estado de subida para la UI |
| `di/SyncModule.kt` (nuevo) | `SessionSync` → `WorkManagerSessionSync` |
| `FitTrainerApp.kt`, `AndroidManifest.xml` (mod) | `Configuration.Provider` + arranque del trigger; sin inicializador por defecto |
| `data/workout/Workout.kt`, `WorkoutRules.kt` (mod) | `WorkoutSummary.sessionId` |
| `ui/sync/SyncTexts.kt` (nuevo) | textos de estado (puros) |
| `ui/sync/UploadStatusViewModel.kt` (nuevo) | cuentas del alumno + estado de una sesión |
| `ui/sync/SignOutSyncViewModel.kt` (nuevo) | aviso del logout |
| `ui/sync/components/UploadsNotice.kt`, `PendingUploadsSignOutDialog.kt` (nuevos) | UI |
| `ui/today/TodayScreen.kt`, `ui/workout/WorkoutScreen.kt`, `ui/workout/components/WorkoutSummaryView.kt`, `navigation/RoleShell.kt` (mod) | conexión de la UI |

Rutas de código bajo `mobile/app/src/main/java/com/fittrainer/`; unit tests bajo `mobile/app/src/test/java/com/fittrainer/`; instrumentados bajo `mobile/app/src/androidTest/java/com/fittrainer/`. Los comandos de Gradle se corren desde `mobile/` con `$env:JAVA_HOME` apuntando al JDK 24.

---

### Task 1: Room v5 con estado de subida por serie

**Files:**
- Modify: `data/db/workout/WorkoutEntities.kt`
- Create: `data/db/workout/UploadRows.kt`
- Modify: `data/db/workout/WorkoutDao.kt`
- Modify: `data/db/FitTrainerDatabase.kt:29-38`
- Modify: `test/.../testing/fakes/workout/FakeWorkoutDao.kt`
- Test: `androidTest/.../data/db/FitTrainerDatabaseMigrationTest.kt`, `androidTest/.../data/db/workout/WorkoutDaoUploadTest.kt` (nuevo)

**Interfaces:**
- Produces:
  - `const val SYNC_SYNCED = "SYNCED"`, `const val SYNC_FAILED = "FAILED"` (junto a `SYNC_PENDING`);
  - `WorkoutSetEntity(..., syncState: String = SYNC_PENDING, syncError: String? = null)`;
  - `data class UploadCounts(val pending: Int = 0, val failed: Int = 0)`;
  - `data class SessionUploadRow(val syncState: String, val failedSets: Int)`;
  - en `WorkoutDao`:
    - `suspend fun pendingUploads(ownerId: String): List<WorkoutSessionEntity>`;
    - `suspend fun pendingSets(sessionId: String): List<WorkoutSetEntity>`;
    - `fun observeUploadCounts(ownerId: String): Flow<UploadCounts>`;
    - `fun observeSessionUpload(id: String): Flow<SessionUploadRow?>`;
    - `suspend fun applyUpload(sessionId: String, synced: List<String>, failed: Map<String, String>, rejected: Boolean)`.

- [ ] **Step 1: Test de migración que falla**

Agregar a `FitTrainerDatabaseMigrationTest` (antes del cierre de la clase):

```kotlin
    @Test fun migra4a5DejandoLasSeriesPendientesDeSubir() {
        helper.createDatabase(DB, 4).apply {
            execSQL(
                "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, " +
                    "syncState, currentPosition, currentSet, restEndsAt, restTotalSeconds, restPausedRemainingMs) " +
                    "VALUES ('w1', 'u1', 'rt-1', 'Push', 1, 2, 'FINISHED', 'PENDING', 0, 1, NULL, NULL, NULL)"
            )
            execSQL(
                "INSERT INTO workout_sets (id, sessionId, position, exerciseId, originalExerciseId, routineExerciseId, " +
                    "setNumber, actualKg, actualReps, executedAt) VALUES ('s1', 'w1', 0, 'ex-0', NULL, 're-0', 1, 40.0, 8, 2)"
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(DB, 5, true)

        db.query("SELECT actualKg, syncState, syncError FROM workout_sets WHERE id = 's1'").use {
            assertTrue(it.moveToFirst())
            assertEquals(40.0, it.getDouble(0), 0.0)
            assertEquals("PENDING", it.getString(1))
            assertTrue(it.isNull(2))
        }
    }
```

- [ ] **Step 2: Entidades y filas**

En `WorkoutEntities.kt`, debajo de `SYNC_PENDING`:

```kotlin
/** Subida y guardada en el servidor (tarjeta 11). */
const val SYNC_SYNCED = "SYNCED"
/** El servidor la rechazó para siempre (spec §5 de la tarjeta 11): no se reintenta. */
const val SYNC_FAILED = "FAILED"
```

Y al final de `WorkoutSetEntity` (después de `executedAt`), con `import androidx.room.ColumnInfo`:

```kotlin
    /** PENDING hasta que el servidor la guarda (SYNCED) o la rechaza (FAILED, con su code en syncError). */
    @ColumnInfo(defaultValue = SYNC_PENDING) val syncState: String = SYNC_PENDING,
    val syncError: String? = null,
```

Crear `data/db/workout/UploadRows.kt`:

```kotlin
package com.fittrainer.data.db.workout

/** Sesiones terminadas del alumno que faltan subir y que el servidor rechazó. */
data class UploadCounts(val pending: Int = 0, val failed: Int = 0)

/** Estado de subida de una sesión y cuántas de sus series rechazó el servidor. */
data class SessionUploadRow(val syncState: String, val failedSets: Int)
```

- [ ] **Step 3: Consultas del DAO**

En `WorkoutDao.kt`, antes de `start(...)`:

```kotlin
    /** Lo que sube la tarjeta 11: terminadas y pendientes del dueño, en orden. Nunca una ACTIVE. */
    @Query(
        "SELECT * FROM workout_sessions WHERE ownerId = :ownerId AND status = 'FINISHED' " +
            "AND syncState = 'PENDING' ORDER BY startedAt"
    )
    abstract suspend fun pendingUploads(ownerId: String): List<WorkoutSessionEntity>

    @Query("SELECT * FROM workout_sets WHERE sessionId = :sessionId AND syncState = 'PENDING' ORDER BY executedAt, id")
    abstract suspend fun pendingSets(sessionId: String): List<WorkoutSetEntity>

    @Query("UPDATE workout_sets SET syncState = 'SYNCED', syncError = NULL WHERE id IN (:ids)")
    abstract suspend fun markSetsSynced(ids: List<String>)

    @Query("UPDATE workout_sets SET syncState = 'FAILED', syncError = :code WHERE id = :id")
    abstract suspend fun markSetFailed(id: String, code: String)

    @Query("UPDATE workout_sessions SET syncState = :syncState WHERE id = :id")
    abstract suspend fun setSyncState(id: String, syncState: String)

    @Query(
        "SELECT COALESCE(SUM(syncState = 'PENDING'), 0) AS pending, COALESCE(SUM(syncState = 'FAILED'), 0) AS failed " +
            "FROM workout_sessions WHERE ownerId = :ownerId AND status = 'FINISHED'"
    )
    abstract fun observeUploadCounts(ownerId: String): Flow<UploadCounts>

    @Query(
        "SELECT syncState, (SELECT COUNT(*) FROM workout_sets WHERE sessionId = :id AND syncState = 'FAILED') " +
            "AS failedSets FROM workout_sessions WHERE id = :id"
    )
    abstract fun observeSessionUpload(id: String): Flow<SessionUploadRow?>

    /**
     * Resultado de subir una sesión: series marcadas y, si no le queda ninguna pendiente, la sesión
     * subida. rejected: el servidor rechazó la sesión entera (queda FAILED, sus series sin tocar).
     */
    @Transaction
    open suspend fun applyUpload(sessionId: String, synced: List<String>, failed: Map<String, String>, rejected: Boolean) {
        if (synced.isNotEmpty()) markSetsSynced(synced)
        failed.forEach { (id, code) -> markSetFailed(id, code) }
        when {
            rejected -> setSyncState(sessionId, SYNC_FAILED)
            pendingSets(sessionId).isEmpty() -> setSyncState(sessionId, SYNC_SYNCED)
        }
    }
```

- [ ] **Step 4: Versión 5 de la base**

En `FitTrainerDatabase.kt`: `version = 5` y sumar `AutoMigration(from = 4, to = 5),` a `autoMigrations`.

- [ ] **Step 5: El fake implementa lo nuevo**

En `FakeWorkoutDao.kt` (imports: `SYNC_PENDING`, `SYNC_SYNCED`, `SYNC_FAILED`, `UploadCounts`, `SessionUploadRow`), antes de `start(...)`:

```kotlin
    override suspend fun pendingUploads(ownerId: String) = state.value.sessions.values
        .filter { it.ownerId == ownerId && it.status == STATUS_FINISHED && it.syncState == SYNC_PENDING }
        .sortedBy { it.startedAt }

    override suspend fun pendingSets(sessionId: String) = state.value.sets
        .filter { it.sessionId == sessionId && it.syncState == SYNC_PENDING }
        .sortedWith(compareBy({ it.executedAt }, { it.id }))

    override suspend fun markSetsSynced(ids: List<String>) = write { st ->
        st.copy(sets = st.sets.map { if (it.id in ids) it.copy(syncState = SYNC_SYNCED, syncError = null) else it })
    }

    override suspend fun markSetFailed(id: String, code: String) = write { st ->
        st.copy(sets = st.sets.map { if (it.id == id) it.copy(syncState = SYNC_FAILED, syncError = code) else it })
    }

    override suspend fun setSyncState(id: String, syncState: String) = write { st ->
        val session = st.sessions[id] ?: return@write st
        st.copy(sessions = st.sessions + (id to session.copy(syncState = syncState)))
    }

    override fun observeUploadCounts(ownerId: String): Flow<UploadCounts> = state.map { st ->
        val done = st.sessions.values.filter { it.ownerId == ownerId && it.status == STATUS_FINISHED }
        UploadCounts(done.count { it.syncState == SYNC_PENDING }, done.count { it.syncState == SYNC_FAILED })
    }.distinctUntilChanged()

    override fun observeSessionUpload(id: String): Flow<SessionUploadRow?> = state.map { st ->
        st.sessions[id]?.let { s -> SessionUploadRow(s.syncState, st.sets.count { it.sessionId == id && it.syncState == SYNC_FAILED }) }
    }.distinctUntilChanged()
```

- [ ] **Step 6: Tests instrumentados del DAO**

Crear `androidTest/.../data/db/workout/WorkoutDaoUploadTest.kt`:

```kotlin
package com.fittrainer.data.db.workout

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.db.FitTrainerDatabase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Consultas de la subida (tarjeta 11). */
@RunWith(AndroidJUnit4::class)
class WorkoutDaoUploadTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: WorkoutDao

    private fun session(id: String, owner: String = "u1", status: String = STATUS_FINISHED, startedAt: Long = 1_000L) =
        WorkoutSessionEntity(id, owner, "rt-1", "Push", startedAt, startedAt + 1, status, SYNC_PENDING, 0, 1, null, null, null)

    private fun set(id: String, sessionId: String, setNumber: Int = 1) =
        WorkoutSetEntity(id, sessionId, 0, "ex-0", null, "re-0", setNumber, 40.0, 8, 2_000L + setNumber)

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
        dao = db.workoutDao()
    }

    @After fun tearDown() = db.close()

    @Test fun pendingUploadsSoloTraeTerminadasPendientesDelDuenioEnOrden() = runTest {
        dao.insertSession(session("w2", startedAt = 2_000L))
        dao.insertSession(session("w1", startedAt = 1_000L))
        dao.insertSession(session("activa", status = STATUS_ACTIVE))
        dao.insertSession(session("ajena", owner = "u2"))
        dao.insertSession(session("subida").copy(syncState = SYNC_SYNCED))

        assertEquals(listOf("w1", "w2"), dao.pendingUploads("u1").map { it.id })
    }

    @Test fun applyUploadMarcaSeriesYCierraLaSesionSinPendientes() = runTest {
        dao.insertSession(session("w1"))
        dao.upsertSet(set("s1", "w1", 1))
        dao.upsertSet(set("s2", "w1", 2))

        dao.applyUpload("w1", synced = listOf("s1"), failed = mapOf("s2" to "EXERCISE_NOT_FOUND"), rejected = false)

        assertEquals(SessionUploadRow(SYNC_SYNCED, failedSets = 1), dao.observeSessionUpload("w1").first())
        assertEquals(emptyList<WorkoutSetEntity>(), dao.pendingSets("w1"))
    }

    @Test fun applyUploadDejaPendienteLaSesionSiFaltanSeries() = runTest {
        dao.insertSession(session("w1"))
        dao.upsertSet(set("s1", "w1", 1))
        dao.upsertSet(set("s2", "w1", 2))

        dao.applyUpload("w1", synced = listOf("s1"), failed = emptyMap(), rejected = false)

        assertEquals(SYNC_PENDING, dao.observeSessionUpload("w1").first()?.syncState)
        assertEquals(listOf("s2"), dao.pendingSets("w1").map { it.id })
    }

    @Test fun applyUploadRechazadaDejaLaSesionFallidaSinTocarSusSeries() = runTest {
        dao.insertSession(session("w1"))
        dao.upsertSet(set("s1", "w1"))

        dao.applyUpload("w1", synced = emptyList(), failed = emptyMap(), rejected = true)

        assertEquals(SYNC_FAILED, dao.observeSessionUpload("w1").first()?.syncState)
        assertEquals(listOf("s1"), dao.pendingSets("w1").map { it.id })
    }

    @Test fun observeUploadCountsCuentaPendientesYFallidasDelDuenio() = runTest {
        assertEquals(UploadCounts(0, 0), dao.observeUploadCounts("u1").first())
        dao.insertSession(session("w1"))
        dao.insertSession(session("w2").copy(syncState = SYNC_FAILED))
        dao.insertSession(session("activa", status = STATUS_ACTIVE))
        dao.insertSession(session("ajena", owner = "u2"))

        assertEquals(UploadCounts(pending = 1, failed = 1), dao.observeUploadCounts("u1").first())
    }
}
```

- [ ] **Step 7: Compilar, generar el schema 5 y correr todo**

Run: `.\gradlew.bat checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL; se crea `app/schemas/com.fittrainer.data.db.FitTrainerDatabase/5.json` con `syncState` (default `'PENDING'`) y `syncError` en `workout_sets`.

Run (emulador abierto): `.\gradlew.bat connectedDebugAndroidTest --tests "com.fittrainer.data.db.*"`
Expected: pasan `migra4a5DejandoLasSeriesPendientesDeSubir` y los 5 de `WorkoutDaoUploadTest`, más todos los anteriores.

- [ ] **Step 8: Checkpoint.** Sin commit (lo hace Igna). Anotar en el ledger que el Task 1 quedó verde.

---

### Task 2: `SessionApi` y `SessionUploader`

**Files:**
- Create: `data/api/SessionApi.kt`, `data/sync/SessionUploader.kt`
- Modify: `di/NetworkModule.kt` (provider nuevo, debajo de `provideExerciseApi`)
- Create (test): `test/.../testing/fakes/sync/SyncFixtures.kt`, `test/.../data/sync/SessionUploaderTest.kt`

**Interfaces:**
- Consumes: `WorkoutSessionEntity`, `WorkoutSetEntity` (Task 1).
- Produces:
  - `interface SessionApi { suspend fun create(body: CreateSessionRequest); suspend fun addSets(id: String, body: SessionSetsRequest): SessionSetsResponse }`;
  - los DTO `CreateSessionRequest`, `SessionSetDto`, `SessionSetsRequest`, `SavedSetDto`, `FailedSetDto`, `SessionSetsResult`, `SessionSetsResponse`;
  - `enum class StopReason { RETRY, UNAUTHORIZED, SESSION_REJECTED }`;
  - `data class SetResults(val synced: List<String> = emptyList(), val failed: Map<String, String> = emptyMap())`;
  - `data class UploadResult(val sets: SetResults, val stop: StopReason? = null)`;
  - `class SessionUploader @Inject constructor(api: SessionApi) { suspend fun upload(session: WorkoutSessionEntity, sets: List<WorkoutSetEntity>): UploadResult }`;
  - `const val SETS_PER_BATCH = 100`;
  - fixtures de test: `finishedSession(...)`, `pendingSet(...)`.

- [ ] **Step 1: Fixtures compartidas de test**

Crear `test/.../testing/fakes/sync/SyncFixtures.kt`:

```kotlin
package com.fittrainer.testing.fakes.sync

import com.fittrainer.data.db.workout.STATUS_FINISHED
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.db.workout.WorkoutSetEntity

/** Sesión terminada: empezó a las 10:00:00 UTC del 17/10 y duró un minuto. */
fun finishedSession(
    id: String = "w1",
    owner: String = "u1",
    status: String = STATUS_FINISHED,
    syncState: String = SYNC_PENDING,
    startedAt: Long = 1_760_695_200_000L,
) = WorkoutSessionEntity(id, owner, "rt-1", "Push", startedAt, startedAt + 60_000L, status, syncState, 0, 1, null, null, null)

fun pendingSet(id: String, sessionId: String = "w1", setNumber: Int = 1) =
    WorkoutSetEntity(id, sessionId, 0, "ex-0", null, "re-0", setNumber, 40.0, 8, 1_760_695_230_000L + setNumber)
```

- [ ] **Step 2: Tests del uploader que fallan**

Crear `test/.../data/sync/SessionUploaderTest.kt`:

```kotlin
package com.fittrainer.data.sync

import com.fittrainer.data.api.SessionApi
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.pendingSet
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** Por la cadena real de Retrofit, como en NetworkModule. */
class SessionUploaderTest {

    private val json = Json { ignoreUnknownKeys = true }
    private val server = MockWebServer()
    private lateinit var uploader: SessionUploader

    @Before fun setUp() {
        server.start()
        val api = Retrofit.Builder()
            .baseUrl(server.url("/api/"))
            .client(OkHttpClient())
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(SessionApi::class.java)
        uploader = SessionUploader(api)
    }

    @After fun tearDown() = server.shutdown()

    private fun created() = MockResponse().setResponseCode(201).setBody("""{"data":{}}""")
    private fun error(code: Int, errorCode: String = "X") =
        MockResponse().setResponseCode(code).setBody("""{"error":{"code":"$errorCode","message":"m"}}""")
    private fun setsOk(saved: List<String>, failed: String = "") = MockResponse().setBody(
        """{"data":{"saved":[${saved.joinToString(",") { """{"id":"$it","created":true}""" }}],"failed":[$failed]}}""",
    )

    @Test fun `sube la sesion terminada y despues sus series`() = runTest {
        server.enqueue(created())
        server.enqueue(setsOk(listOf("s1")))

        val result = uploader.upload(finishedSession(), listOf(pendingSet("s1")))

        assertEquals(UploadResult(SetResults(synced = listOf("s1"))), result)
        val session = server.takeRequest()
        assertEquals("/api/sessions", session.path)
        val body = session.body.readUtf8()
        assertTrue(body, body.contains(""""id":"w1""""))
        assertTrue(body, body.contains(""""started_at":"2025-10-17T10:00:00Z""""))
        assertTrue(body, body.contains(""""finished_at":"2025-10-17T10:01:00Z""""))
        val sets = server.takeRequest()
        assertEquals("/api/sessions/w1/sets", sets.path)
        val setsBody = sets.body.readUtf8()
        assertTrue(setsBody, setsBody.contains(""""exercise_id":"ex-0""""))
        assertTrue(setsBody, setsBody.contains(""""executed_at":"2025-10-17T10:00:30.001Z""""))
    }

    @Test fun `mas de 100 series van en dos lotes y el index es del lote`() = runTest {
        val sets = (0 until 101).map { pendingSet("s$it", setNumber = it % 100 + 1) }
        server.enqueue(created())
        server.enqueue(setsOk(sets.take(100).map { it.id }))
        // En el segundo lote la única serie (index 0 de ESE lote) es la s100.
        server.enqueue(setsOk(emptyList(), failed = """{"id":"s100","index":0,"code":"EXERCISE_NOT_FOUND","message":"m"}"""))

        val result = uploader.upload(finishedSession(), sets)

        assertEquals(100, result.sets.synced.size)
        assertEquals(mapOf("s100" to "EXERCISE_NOT_FOUND"), result.sets.failed)
        assertEquals(null, result.stop)
        assertEquals(3, server.requestCount)
    }

    @Test fun `ids en minuscula en la respuesta se resuelven a los locales`() = runTest {
        server.enqueue(created())
        server.enqueue(setsOk(listOf("abc-def")))

        val result = uploader.upload(finishedSession(), listOf(pendingSet("ABC-DEF")))

        assertEquals(listOf("ABC-DEF"), result.sets.synced)
    }

    @Test fun `409 al crear la sesion la rechaza sin mandar series`() = runTest {
        server.enqueue(error(409, "SESSION_ID_CONFLICT"))

        val result = uploader.upload(finishedSession(), listOf(pendingSet("s1")))

        assertEquals(UploadResult(SetResults(), StopReason.SESSION_REJECTED), result)
        assertEquals(1, server.requestCount)
    }

    @Test fun `5xx en el segundo lote corta con RETRY y conserva el primero`() = runTest {
        val sets = (0 until 101).map { pendingSet("s$it", setNumber = it % 100 + 1) }
        server.enqueue(created())
        server.enqueue(setsOk(sets.take(100).map { it.id }))
        server.enqueue(error(503))

        val result = uploader.upload(finishedSession(), sets)

        assertEquals(StopReason.RETRY, result.stop)
        assertEquals(100, result.sets.synced.size)
    }

    @Test fun `401 corta sin reintentar`() = runTest {
        server.enqueue(error(401, "UNAUTHORIZED"))

        assertEquals(StopReason.UNAUTHORIZED, uploader.upload(finishedSession(), listOf(pendingSet("s1"))).stop)
    }

    @Test fun `404 en las series se reintenta`() = runTest {
        server.enqueue(created())
        server.enqueue(error(404, "SESSION_NOT_FOUND"))

        assertEquals(StopReason.RETRY, uploader.upload(finishedSession(), listOf(pendingSet("s1"))).stop)
    }

    @Test fun `sin red se reintenta`() = runTest {
        server.shutdown()

        assertEquals(StopReason.RETRY, uploader.upload(finishedSession(), listOf(pendingSet("s1"))).stop)
    }
}
```

Las fechas: `finishedSession()` arranca en `1_760_695_200_000` = `2025-10-17T10:00:00Z`; `pendingSet(setNumber = 1)` se ejecutó en `1_760_695_230_001` = `2025-10-17T10:00:30.001Z`.

- [ ] **Step 3: Correr y ver que falla**

Run: `.\gradlew.bat testDebugUnitTest --tests "com.fittrainer.data.sync.SessionUploaderTest"`
Expected: FAIL de compilación (`SessionApi`, `SessionUploader` no existen).

- [ ] **Step 4: `SessionApi`**

Crear `data/api/SessionApi.kt`:

```kotlin
package com.fittrainer.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Path

/** POST /sessions: la sesión ya terminada (el RPE y las notas son de la tarjeta 12). */
@Serializable
data class CreateSessionRequest(
    val id: String,
    @SerialName("routine_id") val routineId: String?,
    @SerialName("started_at") val startedAt: String,
    @SerialName("finished_at") val finishedAt: String?,
)

@Serializable
data class SessionSetDto(
    val id: String,
    @SerialName("exercise_id") val exerciseId: String,
    @SerialName("original_exercise_id") val originalExerciseId: String?,
    @SerialName("routine_exercise_id") val routineExerciseId: String?,
    @SerialName("set_number") val setNumber: Int,
    @SerialName("actual_reps") val actualReps: Int,
    @SerialName("actual_kg") val actualKg: Double,
    @SerialName("executed_at") val executedAt: String,
)

@Serializable
data class SessionSetsRequest(val sets: List<SessionSetDto>)

@Serializable
data class SavedSetDto(val id: String, val created: Boolean)

/** index: posición de la serie en el lote que se mandó. */
@Serializable
data class FailedSetDto(val id: String? = null, val index: Int, val code: String)

@Serializable
data class SessionSetsResult(val saved: List<SavedSetDto> = emptyList(), val failed: List<FailedSetDto> = emptyList())

@Serializable
data class SessionSetsResponse(val data: SessionSetsResult)

/** Módulo Sesiones (contratos-api.md). Va por el cliente principal: Bearer y refresh transparente. */
interface SessionApi {
    @POST("sessions")
    suspend fun create(@Body body: CreateSessionRequest)

    @POST("sessions/{id}/sets")
    suspend fun addSets(@Path("id") id: String, @Body body: SessionSetsRequest): SessionSetsResponse
}
```

En `di/NetworkModule.kt`, debajo de `provideExerciseApi`:

```kotlin
    @Provides
    @Singleton
    fun provideSessionApi(client: OkHttpClient, json: Json): SessionApi =
        retrofit(client, json).create(SessionApi::class.java)
```

- [ ] **Step 5: `SessionUploader`**

Crear `data/sync/SessionUploader.kt`:

```kotlin
package com.fittrainer.data.sync

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.api.SessionSetDto
import com.fittrainer.data.api.SessionSetsRequest
import com.fittrainer.data.api.SessionSetsResult
import com.fittrainer.data.db.workout.WorkoutSessionEntity
import com.fittrainer.data.db.workout.WorkoutSetEntity
import java.io.IOException
import java.time.Instant
import javax.inject.Inject
import retrofit2.HttpException

const val SETS_PER_BATCH = 100

/** Por qué se cortó la subida de una sesión (spec §5). */
enum class StopReason { RETRY, UNAUTHORIZED, SESSION_REJECTED }

/** Series que el servidor ya resolvió, con los ids locales: subidas y fallidas (id → code). */
data class SetResults(val synced: List<String> = emptyList(), val failed: Map<String, String> = emptyMap()) {
    operator fun plus(other: SetResults) = SetResults(synced + other.synced, failed + other.failed)
}

/** stop == null: la sesión y todas las series que se mandaron tuvieron respuesta. */
data class UploadResult(val sets: SetResults, val stop: StopReason? = null)

/** Sube UNA sesión terminada y sus series, en lotes. No toca Room: devuelve qué pasó con cada serie. */
class SessionUploader @Inject constructor(private val api: SessionApi) {

    suspend fun upload(session: WorkoutSessionEntity, sets: List<WorkoutSetEntity>): UploadResult {
        stopOf { api.create(session.toRequest()) }?.let { return UploadResult(SetResults(), it) }
        var results = SetResults()
        for (batch in sets.chunked(SETS_PER_BATCH)) {
            var response: SessionSetsResult? = null
            val stop = stopOf { response = api.addSets(session.id, SessionSetsRequest(batch.map { it.toDto() })).data }
            if (stop != null) return UploadResult(results, stop)
            results += response!!.resolve(batch)
        }
        return UploadResult(results)
    }

    /** null si el request anduvo; si no, cómo sigue la pasada. */
    private suspend fun stopOf(block: suspend () -> Unit): StopReason? = try {
        block()
        null
    } catch (e: HttpException) {
        when (e.code()) {
            401, 403 -> StopReason.UNAUTHORIZED
            400, 409 -> StopReason.SESSION_REJECTED
            else -> StopReason.RETRY
        }
    } catch (e: IOException) {
        StopReason.RETRY
    }
}

/** Los ids vuelven en minúscula y `index` es la posición en ESTE lote: se traducen a los ids locales. */
private fun SessionSetsResult.resolve(batch: List<WorkoutSetEntity>): SetResults {
    val local = batch.associateBy({ it.id.lowercase() }, { it.id })
    return SetResults(
        synced = saved.mapNotNull { local[it.id.lowercase()] },
        failed = failed.mapNotNull { f -> batch.getOrNull(f.index)?.let { it.id to f.code } }.toMap(),
    )
}

private fun WorkoutSessionEntity.toRequest() =
    CreateSessionRequest(id, routineId, iso(startedAt), finishedAt?.let(::iso))

private fun WorkoutSetEntity.toDto() = SessionSetDto(
    id, exerciseId, originalExerciseId, routineExerciseId, setNumber, actualReps, actualKg, iso(executedAt),
)

private fun iso(millis: Long): String = Instant.ofEpochMilli(millis).toString()
```

- [ ] **Step 6: Correr y ver que pasa**

Run: `.\gradlew.bat testDebugUnitTest --tests "com.fittrainer.data.sync.SessionUploaderTest"`
Expected: PASS (8 tests).

- [ ] **Step 7: Checkpoint.** `.\gradlew.bat checkFileLength testDebugUnitTest` en verde. Sin commit.

---

### Task 3: `SyncPass`, una pasada sobre las pendientes del alumno

**Files:**
- Create: `data/sync/SyncPass.kt`
- Create (test): `test/.../testing/fakes/sync/FakeSessionApi.kt`, `test/.../data/sync/SyncPassTest.kt`

**Interfaces:**
- Consumes:
  - `WorkoutDao.pendingUploads/pendingSets/applyUpload` (Task 1);
  - `SessionUploader.upload`, `StopReason` (Task 2);
  - `SessionRepository.session: Flow<Session>`.
- Produces:
  - `enum class PassResult { DONE, RETRY }`;
  - `class SyncPass @Inject constructor(dao: WorkoutDao, uploader: SessionUploader, sessionRepository: SessionRepository) { suspend fun run(): PassResult }`;
  - fake de test `FakeSessionApi`.

- [ ] **Step 1: Fake de la API**

Crear `test/.../testing/fakes/sync/FakeSessionApi.kt`:

```kotlin
package com.fittrainer.testing.fakes.sync

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.api.FailedSetDto
import com.fittrainer.data.api.SavedSetDto
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.api.SessionSetsRequest
import com.fittrainer.data.api.SessionSetsResponse
import com.fittrainer.data.api.SessionSetsResult
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import retrofit2.Response

/** Backend en memoria: guarda lo que recibe y devuelve en minúscula, como el real. */
class FakeSessionApi : SessionApi {
    val created = mutableListOf<CreateSessionRequest>()
    val batches = mutableListOf<Pair<String, SessionSetsRequest>>()
    var createError: Throwable? = null
    var setsError: Throwable? = null
    /** id de serie → code: esas vuelven en `failed`. */
    var failCodes: Map<String, String> = emptyMap()

    override suspend fun create(body: CreateSessionRequest) {
        createError?.let { throw it }
        created += body
    }

    override suspend fun addSets(id: String, body: SessionSetsRequest): SessionSetsResponse {
        setsError?.let { throw it }
        batches += id to body
        val (bad, ok) = body.sets.withIndex().partition { it.value.id in failCodes }
        return SessionSetsResponse(
            SessionSetsResult(
                saved = ok.map { SavedSetDto(it.value.id.lowercase(), created = true) },
                failed = bad.map { FailedSetDto(it.value.id.lowercase(), it.index, failCodes.getValue(it.value.id)) },
            ),
        )
    }
}

fun httpError(code: Int) = HttpException(Response.error<Any>(code, "{}".toResponseBody("application/json".toMediaType())))
```

- [ ] **Step 2: Tests que fallan**

Crear `test/.../data/sync/SyncPassTest.kt`:

```kotlin
package com.fittrainer.data.sync

import com.fittrainer.data.db.workout.STATUS_ACTIVE
import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.session.Session
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.httpError
import com.fittrainer.testing.fakes.sync.pendingSet
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncPassTest {

    private val dao = FakeWorkoutDao()
    private val api = FakeSessionApi()
    private val session = FakeStudentSession()
    private val pass = SyncPass(dao, SessionUploader(api), session)

    private fun seed(vararg sessions: com.fittrainer.data.db.workout.WorkoutSessionEntity) {
        dao.state.value = FakeWorkoutDao.State(
            sessions = sessions.associateBy { it.id },
            sets = sessions.map { pendingSet("set-${it.id}", it.id) },
        )
    }

    private fun syncState(id: String) = dao.state.value.sessions.getValue(id).syncState
    private fun set(id: String) = dao.state.value.sets.single { it.id == id }

    @Test fun `solo sube las terminadas pendientes del duenio`() = runTest {
        seed(
            finishedSession("w1"),
            finishedSession("activa", status = STATUS_ACTIVE),
            finishedSession("ajena", owner = "u2"),
            finishedSession("subida", syncState = SYNC_SYNCED),
        )

        assertEquals(PassResult.DONE, pass.run())

        assertEquals(listOf("w1"), api.created.map { it.id })
        assertEquals(SYNC_SYNCED, syncState("w1"))
        assertEquals(SYNC_PENDING, syncState("activa"))
        assertEquals(SYNC_PENDING, syncState("ajena"))
        assertEquals(SYNC_SYNCED, set("set-w1").syncState)
    }

    @Test fun `una serie rechazada queda FAILED con su code y la sesion igual se sube`() = runTest {
        seed(finishedSession("w1"))
        api.failCodes = mapOf("set-w1" to "EXERCISE_NOT_FOUND")

        assertEquals(PassResult.DONE, pass.run())

        assertEquals(SYNC_FAILED, set("set-w1").syncState)
        assertEquals("EXERCISE_NOT_FOUND", set("set-w1").syncError)
        assertEquals(SYNC_SYNCED, syncState("w1"))
    }

    @Test fun `una sesion rechazada queda FAILED y se sigue con la siguiente`() = runTest {
        seed(finishedSession("w1", startedAt = 1L), finishedSession("w2", startedAt = 2L))
        var calls = 0
        val failingFirst = object : com.fittrainer.data.api.SessionApi by api {
            override suspend fun create(body: com.fittrainer.data.api.CreateSessionRequest) {
                if (calls++ == 0) throw httpError(409) else api.create(body)
            }
        }

        assertEquals(PassResult.DONE, SyncPass(dao, SessionUploader(failingFirst), session).run())

        assertEquals(SYNC_FAILED, syncState("w1"))
        assertEquals(SYNC_PENDING, set("set-w1").syncState)
        assertEquals(SYNC_SYNCED, syncState("w2"))
    }

    @Test fun `RETRY deja marcado lo ya subido y la sesion pendiente`() = runTest {
        seed(finishedSession("w1"))
        dao.state.value = dao.state.value.copy(
            sets = (0 until 101).map { pendingSet("s$it", "w1", setNumber = it % 100 + 1) },
        )
        var batches = 0
        val dropsSecond = object : com.fittrainer.data.api.SessionApi by api {
            override suspend fun addSets(id: String, body: com.fittrainer.data.api.SessionSetsRequest) =
                if (batches++ == 0) api.addSets(id, body) else throw IOException("se cortó")
        }

        assertEquals(PassResult.RETRY, SyncPass(dao, SessionUploader(dropsSecond), session).run())

        assertEquals(SYNC_PENDING, syncState("w1"))
        assertEquals(100, dao.state.value.sets.count { it.syncState == SYNC_SYNCED })
        assertEquals(listOf("s100"), dao.state.value.sets.filter { it.syncState == SYNC_PENDING }.map { it.id })
    }

    @Test fun `sin red pide reintento y no marca nada`() = runTest {
        seed(finishedSession("w1"))
        api.createError = IOException("sin red")

        assertEquals(PassResult.RETRY, pass.run())

        assertEquals(SYNC_PENDING, syncState("w1"))
    }

    @Test fun `401 corta sin reintentar y deja todo pendiente`() = runTest {
        seed(finishedSession("w1"), finishedSession("w2"))
        api.createError = httpError(401)

        assertEquals(PassResult.DONE, pass.run())

        assertEquals(SYNC_PENDING, syncState("w1"))
        assertEquals(SYNC_PENDING, syncState("w2"))
    }

    @Test fun `sin alumno logueado no hace nada`() = runTest {
        seed(finishedSession("w1"))
        session.session.value = Session.LoggedOut

        assertEquals(PassResult.DONE, pass.run())

        assertTrue(api.created.isEmpty())
    }
}
```

- [ ] **Step 3: Correr y ver que falla**

Run: `.\gradlew.bat testDebugUnitTest --tests "com.fittrainer.data.sync.SyncPassTest"`
Expected: FAIL de compilación (`SyncPass`, `PassResult` no existen).

- [ ] **Step 4: `SyncPass`**

Crear `data/sync/SyncPass.kt`:

```kotlin
package com.fittrainer.data.sync

import com.fittrainer.data.db.workout.WorkoutDao
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import javax.inject.Inject
import kotlinx.coroutines.flow.first

enum class PassResult { DONE, RETRY }

/**
 * Una pasada de subida (spec §4): las sesiones terminadas y pendientes del alumno con sesión
 * iniciada, de a una y en orden. Lo que el servidor resolvió se guarda en Room antes de seguir.
 */
class SyncPass @Inject constructor(
    private val dao: WorkoutDao,
    private val uploader: SessionUploader,
    private val sessionRepository: SessionRepository,
) {
    suspend fun run(): PassResult {
        val owner = (sessionRepository.session.first() as? Session.Student)?.user?.id ?: return PassResult.DONE
        for (session in dao.pendingUploads(owner)) {
            val result = uploader.upload(session, dao.pendingSets(session.id))
            val rejected = result.stop == StopReason.SESSION_REJECTED
            dao.applyUpload(session.id, result.sets.synced, result.sets.failed, rejected)
            when (result.stop) {
                StopReason.RETRY -> return PassResult.RETRY
                // Sin sesión válida (refresh rechazado): todo queda PENDING hasta el próximo login.
                StopReason.UNAUTHORIZED -> return PassResult.DONE
                StopReason.SESSION_REJECTED, null -> Unit
            }
        }
        return PassResult.DONE
    }
}
```

- [ ] **Step 5: Correr y ver que pasa**

Run: `.\gradlew.bat testDebugUnitTest --tests "com.fittrainer.data.sync.SyncPassTest"`
Expected: PASS (7 tests).

- [ ] **Step 6: Checkpoint.** `.\gradlew.bat checkFileLength testDebugUnitTest` en verde. Sin commit.

---

### Task 4: WorkManager, el worker y el disparador

**Files:**
- Modify: `mobile/gradle/libs.versions.toml`, `mobile/app/build.gradle.kts`
- Create: `data/sync/SyncSessionsWorker.kt`, `data/sync/SessionSync.kt`, `data/sync/SyncTrigger.kt`, `di/SyncModule.kt`
- Modify: `FitTrainerApp.kt`, `app/src/main/AndroidManifest.xml`
- Create (test): `test/.../testing/fakes/sync/FakeSessionSync.kt`, `test/.../data/sync/SyncTriggerTest.kt`, `androidTest/.../data/sync/WorkManagerSessionSyncTest.kt`

**Interfaces:**
- Consumes:
  - `SyncPass.run(): PassResult` (Task 3);
  - `WorkoutDao.observeUploadCounts` (Task 1).
- Produces:
  - `interface SessionSync { fun enqueue(); suspend fun syncNow(timeoutMs: Long): Boolean }`;
  - `const val SYNC_WORK_NAME = "sync-sessions"`;
  - `class SyncTrigger { fun start(scope: CoroutineScope): Job }`;
  - fake de test `FakeSessionSync`.

- [ ] **Step 1: Dependencias**

En `libs.versions.toml`, en `[versions]`:

```toml
work = "2.10.3"
hiltWork = "1.2.0"
```

En `[libraries]`:

```toml
androidx-work-runtime = { group = "androidx.work", name = "work-runtime-ktx", version.ref = "work" }
androidx-work-testing = { group = "androidx.work", name = "work-testing", version.ref = "work" }
androidx-hilt-work = { group = "androidx.hilt", name = "hilt-work", version.ref = "hiltWork" }
androidx-hilt-compiler = { group = "androidx.hilt", name = "hilt-compiler", version.ref = "hiltWork" }
```

En `app/build.gradle.kts`, en `dependencies`, debajo de `implementation(libs.androidx.hilt.navigation.compose)`:

```kotlin
    // Subida de sesiones en segundo plano (tarjeta 11).
    implementation(libs.androidx.work.runtime)
    implementation(libs.androidx.hilt.work)
    ksp(libs.androidx.hilt.compiler)
```

Y con los `androidTestImplementation`: `androidTestImplementation(libs.androidx.work.testing)`.

Run: `.\gradlew.bat assembleDebug`
Expected: BUILD SUCCESSFUL. Si Gradle no resuelve `2.10.3`, usar la última 2.10.x publicada y anotarlo en el ledger.

- [ ] **Step 2: Fake y test del disparador que fallan**

Crear `test/.../testing/fakes/sync/FakeSessionSync.kt`:

```kotlin
package com.fittrainer.testing.fakes.sync

import com.fittrainer.data.sync.SessionSync

class FakeSessionSync : SessionSync {
    var enqueued = 0
    var syncNowCalls = 0
    var syncNowResult = true
    /** Lo que "hace la pasada" durante syncNow (p. ej. marcar sesiones como subidas en el FakeWorkoutDao). */
    var onSyncNow: suspend () -> Unit = {}

    override fun enqueue() {
        enqueued++
    }

    override suspend fun syncNow(timeoutMs: Long): Boolean {
        syncNowCalls++
        onSyncNow()
        return syncNowResult
    }
}
```

Crear `test/.../data/sync/SyncTriggerTest.kt`:

```kotlin
package com.fittrainer.data.sync

import com.fittrainer.data.db.workout.STATUS_ACTIVE
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.session.Session
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionSync
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SyncTriggerTest {

    private val dao = FakeWorkoutDao()
    private val session = FakeStudentSession()
    private val sync = FakeSessionSync()
    private val trigger = SyncTrigger(session, dao, sync)

    private fun put(vararg sessions: com.fittrainer.data.db.workout.WorkoutSessionEntity) {
        dao.state.value = dao.state.value.copy(sessions = dao.state.value.sessions + sessions.associateBy { it.id })
    }

    @Test fun `al abrir con pendientes encola una pasada`() = runTest {
        put(finishedSession("w1"))
        trigger.start(backgroundScope + UnconfinedTestDispatcher(testScheduler))

        assertEquals(1, sync.enqueued)
    }

    @Test fun `terminar otra sesion vuelve a encolar`() = runTest {
        trigger.start(backgroundScope + UnconfinedTestDispatcher(testScheduler))
        assertEquals(0, sync.enqueued)

        put(finishedSession("w1"))
        put(finishedSession("w2"))

        assertEquals(2, sync.enqueued)
    }

    @Test fun `una sesion abierta o ya subida no encola`() = runTest {
        put(finishedSession("activa", status = STATUS_ACTIVE), finishedSession("subida", syncState = SYNC_SYNCED))
        trigger.start(backgroundScope + UnconfinedTestDispatcher(testScheduler))

        assertEquals(0, sync.enqueued)
    }

    @Test fun `sin alumno logueado no encola y al entrar si`() = runTest {
        put(finishedSession("w1"))
        session.session.value = Session.LoggedOut
        trigger.start(backgroundScope + UnconfinedTestDispatcher(testScheduler))
        assertEquals(0, sync.enqueued)

        session.session.value = Session.Student(com.fittrainer.data.auth.AuthUser("u1", "Ana", "a@test.com", com.fittrainer.data.session.Role.STUDENT))

        assertEquals(1, sync.enqueued)
    }
}
```

`backgroundScope + dispatcher` necesita `import kotlinx.coroutines.plus`.

Run: `.\gradlew.bat testDebugUnitTest --tests "com.fittrainer.data.sync.SyncTriggerTest"`
Expected: FAIL de compilación (`SessionSync`, `SyncTrigger` no existen).

- [ ] **Step 3: `SessionSync` y su implementación con WorkManager**

Crear `data/sync/SessionSync.kt`:

```kotlin
package com.fittrainer.data.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkRequest
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull

const val SYNC_WORK_NAME = "sync-sessions"

/** La cola de subida vista desde la app (spec §4). El estado de cada sesión se lee de Room, no de acá. */
interface SessionSync {
    /** Pide una pasada. Si ya hay una corriendo o esperando, la nueva queda a continuación. */
    fun enqueue()

    /** Pide una pasada y espera a que la cola quede quieta. false si no terminó en [timeoutMs]. */
    suspend fun syncNow(timeoutMs: Long): Boolean
}

@Singleton
class WorkManagerSessionSync @Inject constructor(@ApplicationContext private val context: Context) : SessionSync {

    private val workManager get() = WorkManager.getInstance(context)

    override fun enqueue() {
        val request = OneTimeWorkRequestBuilder<SyncSessionsWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, WorkRequest.MIN_BACKOFF_MILLIS, TimeUnit.MILLISECONDS)
            .build()
        // APPEND_OR_REPLACE: lo que termina mientras corre una pasada se sube en la siguiente.
        workManager.enqueueUniqueWork(SYNC_WORK_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
    }

    override suspend fun syncNow(timeoutMs: Long): Boolean {
        enqueue()
        return withTimeoutOrNull(timeoutMs) {
            workManager.getWorkInfosForUniqueWorkFlow(SYNC_WORK_NAME).first { infos -> infos.all { it.state.isFinished } }
        } != null
    }
}
```

- [ ] **Step 4: Worker**

Crear `data/sync/SyncSessionsWorker.kt`:

```kotlin
package com.fittrainer.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlin.coroutines.cancellation.CancellationException

/** Una pasada de subida (trabajo único `sync-sessions`, solo con red). */
@HiltWorker
class SyncSessionsWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val pass: SyncPass,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = try {
        when (pass.run()) {
            PassResult.DONE -> Result.success()
            PassResult.RETRY -> Result.retry()
        }
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        // Room o una respuesta ilegible: se reintenta con backoff. Lo resuelto ya quedó guardado.
        Result.retry()
    }
}
```

- [ ] **Step 5: Disparador**

Crear `data/sync/SyncTrigger.kt`:

```kotlin
package com.fittrainer.data.sync

import com.fittrainer.data.db.workout.WorkoutDao
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/**
 * Encola una pasada cada vez que cambia lo pendiente del alumno logueado (spec §4). Leyendo Room
 * cubre los tres casos del spec: terminar una sesión, iniciar sesión y abrir la app.
 */
@Singleton
class SyncTrigger @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val dao: WorkoutDao,
    private val sync: SessionSync,
) {
    @OptIn(ExperimentalCoroutinesApi::class)
    fun start(scope: CoroutineScope): Job = scope.launch {
        sessionRepository.session
            .map { (it as? Session.Student)?.user?.id }
            .distinctUntilChanged()
            .flatMapLatest { owner ->
                if (owner == null) emptyFlow() else dao.observeUploadCounts(owner).map { owner to it.pending }
            }
            .distinctUntilChanged()
            .filter { (_, pending) -> pending > 0 }
            .collect { sync.enqueue() }
    }
}
```

Run: `.\gradlew.bat testDebugUnitTest --tests "com.fittrainer.data.sync.SyncTriggerTest"`
Expected: PASS (4 tests).

- [ ] **Step 6: Hilt, Application y manifest**

Crear `di/SyncModule.kt`:

```kotlin
package com.fittrainer.di

import com.fittrainer.data.sync.SessionSync
import com.fittrainer.data.sync.WorkManagerSessionSync
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class SyncModule {

    @Binds
    abstract fun bindSessionSync(impl: WorkManagerSessionSync): SessionSync
}
```

Reemplazar `FitTrainerApp.kt`:

```kotlin
package com.fittrainer

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.fittrainer.data.sync.SyncTrigger
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

@HiltAndroidApp
class FitTrainerApp : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    @Inject lateinit var syncTrigger: SyncTrigger

    /** Vive lo que vive el proceso: el disparador de la subida de sesiones (tarjeta 11). */
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder().setWorkerFactory(workerFactory).build()

    override fun onCreate() {
        super.onCreate()
        syncTrigger.start(appScope)
    }
}
```

En `AndroidManifest.xml`:
- sumar `xmlns:tools="http://schemas.android.com/tools"` al `<manifest>`;
- dentro de `<application>`, después del `<service>`, agregar:

```xml
        <!-- WorkManager se configura en FitTrainerApp (HiltWorkerFactory): sin su inicializador por defecto. -->
        <provider
            android:name="androidx.startup.InitializationProvider"
            android:authorities="${applicationId}.androidx-startup"
            android:exported="false"
            tools:node="merge">
            <meta-data
                android:name="androidx.work.WorkManagerInitializer"
                android:value="androidx.startup"
                tools:node="remove" />
        </provider>
```

- [ ] **Step 7: Test instrumentado del encolado**

Crear `androidTest/.../data/sync/WorkManagerSessionSyncTest.kt`:

```kotlin
package com.fittrainer.data.sync

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.Configuration
import androidx.work.NetworkType
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.SynchronousExecutor
import androidx.work.testing.WorkManagerTestInitHelper
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Sin red simulada el trabajo no corre: se verifica cómo queda encolado. */
@RunWith(AndroidJUnit4::class)
class WorkManagerSessionSyncTest {

    private val context = ApplicationProvider.getApplicationContext<Context>()

    @Before fun setUp() {
        WorkManagerTestInitHelper.initializeTestWorkManager(
            context,
            Configuration.Builder().setExecutor(SynchronousExecutor()).build(),
        )
    }

    @Test fun encolaUnTrabajoUnicoQueEsperaRedYAgregaLaSiguientePasadaDetras() {
        val sync = WorkManagerSessionSync(context)

        sync.enqueue()
        sync.enqueue()

        val infos = WorkManager.getInstance(context).getWorkInfosForUniqueWork(SYNC_WORK_NAME).get()
        assertEquals(setOf(WorkInfo.State.ENQUEUED, WorkInfo.State.BLOCKED), infos.map { it.state }.toSet())
        assertEquals(NetworkType.CONNECTED, infos.first { it.state == WorkInfo.State.ENQUEUED }.constraints.requiredNetworkType)
    }
}
```

- [ ] **Step 8: Verificación**

Run: `.\gradlew.bat checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL.

Run (emulador): `.\gradlew.bat connectedDebugAndroidTest`
Expected: todo en verde, incluido `WorkManagerSessionSyncTest`.

- [ ] **Step 9: Checkpoint.** Sin commit.

---

### Task 5: Estado de subida en el resumen y en Hoy

**Files:**
- Create: `data/sync/UploadStatusRepository.kt`, `ui/sync/SyncTexts.kt`, `ui/sync/UploadStatusViewModel.kt`, `ui/sync/components/UploadsNotice.kt`
- Modify: `data/workout/Workout.kt:68`, `data/workout/WorkoutRules.kt:55-56`, `ui/workout/components/WorkoutSummaryView.kt`, `ui/workout/WorkoutScreen.kt:84-87`, `ui/today/TodayScreen.kt`
- Modify (tests): `test/.../data/workout/WorkoutRepositoryTest.kt:62`, `test/.../data/workout/WorkoutRulesTest.kt:76`, `test/.../ui/workout/WorkoutTextsTest.kt:47`, `test/.../ui/workout/WorkoutViewModelTest.kt:115`
- Create (test): `test/.../ui/sync/SyncTextsTest.kt`, `test/.../ui/sync/UploadStatusViewModelTest.kt`

**Interfaces:**
- Consumes: `WorkoutDao.observeUploadCounts/observeSessionUpload`, `UploadCounts`, `SessionUploadRow`, `SYNC_*` (Task 1).
- Produces:
  - `data class WorkoutSummary(val sets: Int, val minutes: Long, val sessionId: String)`;
  - `class UploadStatusRepository @Inject constructor(dao: WorkoutDao)`, con:
    - `fun observeCounts(ownerId: String): Flow<UploadCounts>`;
    - `fun observeSession(sessionId: String): Flow<SessionUploadRow?>`;
    - `suspend fun pendingCount(ownerId: String): Int`;
  - `fun sessionUploadText(row: SessionUploadRow?): String?`;
  - `fun pendingUploadsText(counts: UploadCounts): String?`;
  - `fun signOutPendingText(pending: Int): String`;
  - `UploadStatusViewModel`, con:
    - `val counts: StateFlow<UploadCounts>`;
    - `fun session(sessionId: String): Flow<SessionUploadRow?>`.

- [ ] **Step 1: Tests de textos que fallan**

Crear `test/.../ui/sync/SyncTextsTest.kt`:

```kotlin
package com.fittrainer.ui.sync

import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_PENDING
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.SessionUploadRow
import com.fittrainer.data.db.workout.UploadCounts
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SyncTextsTest {

    @Test fun `linea del resumen segun el estado`() {
        assertNull(sessionUploadText(null))
        assertEquals("Guardado en el celular · se sube cuando haya conexión", sessionUploadText(SessionUploadRow(SYNC_PENDING, 0)))
        assertEquals("Subido ✓", sessionUploadText(SessionUploadRow(SYNC_SYNCED, 0)))
        assertEquals("Subido · 1 serie no se pudo subir", sessionUploadText(SessionUploadRow(SYNC_SYNCED, 1)))
        assertEquals("Subido · 3 series no se pudieron subir", sessionUploadText(SessionUploadRow(SYNC_SYNCED, 3)))
        assertEquals("No se pudo subir este entrenamiento", sessionUploadText(SessionUploadRow(SYNC_FAILED, 0)))
    }

    @Test fun `aviso de Hoy solo si hay algo`() {
        assertNull(pendingUploadsText(UploadCounts(0, 0)))
        assertEquals("1 entrenamiento sin subir", pendingUploadsText(UploadCounts(1, 0)))
        assertEquals("2 entrenamientos sin subir", pendingUploadsText(UploadCounts(2, 0)))
        assertEquals(
            "2 entrenamientos sin subir · 1 entrenamiento no se pudo subir",
            pendingUploadsText(UploadCounts(2, 1)),
        )
        assertEquals("3 entrenamientos no se pudieron subir", pendingUploadsText(UploadCounts(0, 3)))
    }

    @Test fun `aviso del logout`() {
        assertEquals("Tenés 1 entrenamiento sin subir. Se va a subir cuando vuelvas a entrar.", signOutPendingText(1))
        assertEquals("Tenés 2 entrenamientos sin subir. Se van a subir cuando vuelvas a entrar.", signOutPendingText(2))
    }
}
```

Run: `.\gradlew.bat testDebugUnitTest --tests "com.fittrainer.ui.sync.SyncTextsTest"`
Expected: FAIL de compilación.

- [ ] **Step 2: Textos**

Crear `ui/sync/SyncTexts.kt`:

```kotlin
package com.fittrainer.ui.sync

import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.SessionUploadRow
import com.fittrainer.data.db.workout.UploadCounts

/** Línea del resumen al terminar (spec §6). null: todavía no se leyó Room. */
fun sessionUploadText(row: SessionUploadRow?): String? = when {
    row == null -> null
    row.syncState == SYNC_FAILED -> "No se pudo subir este entrenamiento"
    row.syncState == SYNC_SYNCED && row.failedSets == 1 -> "Subido · 1 serie no se pudo subir"
    row.syncState == SYNC_SYNCED && row.failedSets > 1 -> "Subido · ${row.failedSets} series no se pudieron subir"
    row.syncState == SYNC_SYNCED -> "Subido ✓"
    else -> "Guardado en el celular · se sube cuando haya conexión"
}

/** Aviso de Hoy (spec §6): null si no hay nada pendiente ni fallido. */
fun pendingUploadsText(counts: UploadCounts): String? = listOfNotNull(
    counts.pending.takeIf { it > 0 }?.let { if (it == 1) "1 entrenamiento sin subir" else "$it entrenamientos sin subir" },
    counts.failed.takeIf { it > 0 }?.let {
        if (it == 1) "1 entrenamiento no se pudo subir" else "$it entrenamientos no se pudieron subir"
    },
).joinToString(" · ").ifEmpty { null }

fun signOutPendingText(pending: Int): String =
    if (pending == 1) "Tenés 1 entrenamiento sin subir. Se va a subir cuando vuelvas a entrar."
    else "Tenés $pending entrenamientos sin subir. Se van a subir cuando vuelvas a entrar."
```

Run: `.\gradlew.bat testDebugUnitTest --tests "com.fittrainer.ui.sync.SyncTextsTest"`
Expected: PASS.

- [ ] **Step 3: `WorkoutSummary` con el id de la sesión**

En `data/workout/Workout.kt:68`:

```kotlin
data class WorkoutSummary(val sets: Int, val minutes: Long, val sessionId: String)
```

En `WorkoutRules.kt:55-56`:

```kotlin
fun Workout.summary(now: Instant): WorkoutSummary =
    WorkoutSummary(sets.size, Duration.between(startedAt, now).toMinutes(), id)
```

Ajustar los tests que comparan resúmenes (el id de sesión es el primero que da el generador del test, o `"w-1"` en las fixtures):
- `WorkoutRepositoryTest.kt:62` → `assertEquals(WorkoutSummary(1, 52, "id-0"), summary)`;
- `WorkoutRulesTest.kt:76` → `assertEquals(WorkoutSummary(2, 52, "w-1"), w.summary(...))`;
- `WorkoutTextsTest.kt:47` → `summaryText(WorkoutSummary(18, 52, "w-1"))`;
- `WorkoutViewModelTest.kt:115` → `assertEquals(WorkoutSummary(1, 10, "id-0"), state.summary)`.

Si en el test de ViewModel el id de la sesión no es `id-0`, se ve en el mensaje del fallo. En ese caso, usar el que devuelva el fallo, que es el primer `newId()` del test.

Run: `.\gradlew.bat testDebugUnitTest`
Expected: PASS (los 4 ajustados incluidos).

- [ ] **Step 4: Repositorio y ViewModel, con su test que falla**

Crear `test/.../ui/sync/UploadStatusViewModelTest.kt`:

```kotlin
package com.fittrainer.ui.sync

import com.fittrainer.data.db.workout.SYNC_FAILED
import com.fittrainer.data.db.workout.UploadCounts
import com.fittrainer.data.session.Session
import com.fittrainer.data.sync.UploadStatusRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class UploadStatusViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val dao = FakeWorkoutDao()
    private val session = FakeStudentSession()
    private val vm by lazy { UploadStatusViewModel(session, UploadStatusRepository(dao)) }

    @Test fun `cuenta pendientes y fallidas del alumno logueado`() = runTest {
        dao.state.value = FakeWorkoutDao.State(
            sessions = listOf(
                finishedSession("w1"),
                finishedSession("w2", syncState = SYNC_FAILED),
                finishedSession("ajena", owner = "u2"),
            ).associateBy { it.id },
        )
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.counts.collect {} }

        assertEquals(UploadCounts(pending = 1, failed = 1), vm.counts.value)

        session.session.value = Session.LoggedOut
        assertEquals(UploadCounts(), vm.counts.value)
    }

    @Test fun `estado de una sesion`() = runTest {
        dao.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession("w1")))

        assertEquals("PENDING", vm.session("w1").first()?.syncState)
    }
}
```

Run: `.\gradlew.bat testDebugUnitTest --tests "com.fittrainer.ui.sync.UploadStatusViewModelTest"`
Expected: FAIL de compilación.

Crear `data/sync/UploadStatusRepository.kt`:

```kotlin
package com.fittrainer.data.sync

import com.fittrainer.data.db.workout.SessionUploadRow
import com.fittrainer.data.db.workout.UploadCounts
import com.fittrainer.data.db.workout.WorkoutDao
import javax.inject.Inject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

/** Estado de la subida para la UI: siempre de Room, nunca de WorkManager (spec §4). */
class UploadStatusRepository @Inject constructor(private val dao: WorkoutDao) {

    fun observeCounts(ownerId: String): Flow<UploadCounts> = dao.observeUploadCounts(ownerId)

    fun observeSession(sessionId: String): Flow<SessionUploadRow?> = dao.observeSessionUpload(sessionId)

    suspend fun pendingCount(ownerId: String): Int = dao.observeUploadCounts(ownerId).first().pending
}
```

Crear `ui/sync/UploadStatusViewModel.kt`:

```kotlin
package com.fittrainer.ui.sync

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.db.workout.SessionUploadRow
import com.fittrainer.data.db.workout.UploadCounts
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.sync.UploadStatusRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

/** Lo que el alumno ve de la subida: el aviso de Hoy y la línea del resumen (spec §6). */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class UploadStatusViewModel @Inject constructor(
    sessionRepository: SessionRepository,
    private val status: UploadStatusRepository,
) : ViewModel() {

    val counts: StateFlow<UploadCounts> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .flatMapLatest { owner -> owner?.let(status::observeCounts) ?: flowOf(UploadCounts()) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UploadCounts())

    fun session(sessionId: String): Flow<SessionUploadRow?> = status.observeSession(sessionId)
}
```

Run: `.\gradlew.bat testDebugUnitTest --tests "com.fittrainer.ui.sync.*"`
Expected: PASS.

- [ ] **Step 5: Componentes y conexión con las pantallas**

Crear `ui/sync/components/UploadsNotice.kt`:

```kotlin
package com.fittrainer.ui.sync.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.FtRadius
import com.fittrainer.ui.theme.Spacing

/** Aviso chico de Hoy con lo que falta subir (spec §6). Desaparece solo cuando se sube. */
@Composable
fun UploadsNotice(text: String) {
    val shape = RoundedCornerShape(FtRadius.card)
    Text(
        text,
        style = MaterialTheme.typography.labelMedium,
        color = FtColors.TextSecondary,
        modifier = Modifier.fillMaxWidth().background(FtColors.Card, shape).border(1.dp, FtColors.Border, shape).padding(Spacing.md),
    )
}
```

`WorkoutSummaryView.kt`: sumar el parámetro `uploadText: String? = null` antes de `onBack` y, debajo del `Text(summaryText(summary), ...)`:

```kotlin
        uploadText?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary) }
```

Actualizar el KDoc: `/** "Sesión terminada · N series · M min" y si ya se subió. El RPE y las notas son de la tarjeta 12. */`.

`WorkoutScreen.kt`:
- sumar el parámetro `uploads: UploadStatusViewModel = hiltViewModel()` después de `viewModel`;
- reemplazar el bloque de las líneas 84-87 por:

```kotlin
        state.summary?.let { summary ->
            val upload by remember(summary.sessionId) { uploads.session(summary.sessionId) }
                .collectAsStateWithLifecycle(initialValue = null)
            WorkoutSummaryView(summary, sessionUploadText(upload), onExit)
            return@Box
        }
```

Imports: `com.fittrainer.ui.sync.UploadStatusViewModel`, `com.fittrainer.ui.sync.sessionUploadText`.

`TodayScreen.kt`:
- sumar el parámetro `uploads: UploadStatusViewModel = hiltViewModel()` a `TodayScreen`;
- leer `val uploadCounts by uploads.counts.collectAsStateWithLifecycle()`;
- pasar `uploadsText = pendingUploadsText(uploadCounts)` a `TodayBody`;
- en `TodayBody`, sumar el parámetro `uploadsText: String? = null` (al final) y, en el `LazyColumn`, debajo de la línea del `NoticeBanner`:

```kotlin
            uploadsText?.let { text -> item { UploadsNotice(text) } }
```

- [ ] **Step 6: Verificación**

Run: `.\gradlew.bat checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL; `WorkoutScreen.kt` y `TodayScreen.kt` siguen ≤ 200 líneas.

Run (emulador): `.\gradlew.bat connectedDebugAndroidTest --tests "com.fittrainer.ui.*"`
Expected: `WorkoutContentTest` en verde.

- [ ] **Step 7: Checkpoint.** Sin commit.

---

### Task 6: Logout con entrenamientos sin subir

**Files:**
- Create: `ui/sync/SignOutSyncViewModel.kt`, `ui/sync/components/PendingUploadsSignOutDialog.kt`
- Modify: `navigation/RoleShell.kt:36-63`
- Create (test): `test/.../ui/sync/SignOutSyncViewModelTest.kt`

**Interfaces:**
- Consumes:
  - `UploadStatusRepository.pendingCount` (Task 5);
  - `SessionSync.syncNow` (Task 4);
  - `ConnectivityObserver.isOnline`;
  - `signOutPendingText` (Task 5).
- Produces:
  - `sealed interface SignOutSyncState { Hidden; Asking(pending: Int); Uploading; Failed(pending: Int) }`;
  - `SignOutSyncViewModel`, con:
    - `val state: StateFlow<SignOutSyncState>`;
    - `fun request(onSignOut: () -> Unit)`, `fun uploadNow()`, `fun signOutAnyway()`, `fun cancel()`.

- [ ] **Step 1: Tests que fallan**

Crear `test/.../ui/sync/SignOutSyncViewModelTest.kt`:

```kotlin
package com.fittrainer.ui.sync

import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.sync.UploadStatusRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionSync
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class SignOutSyncViewModelTest {

    @get:Rule val main = MainDispatcherRule()

    private val dao = FakeWorkoutDao()
    private val sync = FakeSessionSync()
    private val online = FakeConnectivityObserver(online = true)
    private val vm by lazy { SignOutSyncViewModel(FakeStudentSession(), UploadStatusRepository(dao), sync, online) }
    private var signedOut = 0

    private fun pending(vararg ids: String) {
        dao.state.value = FakeWorkoutDao.State(sessions = ids.toList().associateWith { finishedSession(it) })
    }

    @Test fun `sin pendientes cierra sesion directo`() = runTest {
        vm.request { signedOut++ }

        assertEquals(1, signedOut)
        assertEquals(SignOutSyncState.Hidden, vm.state.value)
    }

    @Test fun `con pendientes pregunta y cancelar no cierra`() = runTest {
        pending("w1", "w2")

        vm.request { signedOut++ }
        assertEquals(SignOutSyncState.Asking(2), vm.state.value)

        vm.cancel()
        assertEquals(SignOutSyncState.Hidden, vm.state.value)
        assertEquals(0, signedOut)
    }

    @Test fun `subir ahora con red sube todo y cierra sesion`() = runTest {
        pending("w1")
        sync.onSyncNow = { dao.setSyncState("w1", SYNC_SYNCED) }

        vm.request { signedOut++ }
        vm.uploadNow()

        assertEquals(1, sync.syncNowCalls)
        assertEquals(1, signedOut)
        assertEquals(SignOutSyncState.Hidden, vm.state.value)
    }

    @Test fun `subir ahora sin red falla al instante`() = runTest {
        pending("w1")
        online.state.value = false

        vm.request { signedOut++ }
        vm.uploadNow()

        assertEquals(0, sync.syncNowCalls)
        assertEquals(SignOutSyncState.Failed(1), vm.state.value)
        assertEquals(0, signedOut)
    }

    @Test fun `si queda algo pendiente avisa y cerrar igual cierra`() = runTest {
        pending("w1")
        sync.syncNowResult = false

        vm.request { signedOut++ }
        vm.uploadNow()
        assertEquals(SignOutSyncState.Failed(1), vm.state.value)

        vm.signOutAnyway()
        assertEquals(1, signedOut)
        assertEquals(SignOutSyncState.Hidden, vm.state.value)
    }
}
```

Run: `.\gradlew.bat testDebugUnitTest --tests "com.fittrainer.ui.sync.SignOutSyncViewModelTest"`
Expected: FAIL de compilación.

- [ ] **Step 2: ViewModel**

Crear `ui/sync/SignOutSyncViewModel.kt`:

```kotlin
package com.fittrainer.ui.sync

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.sync.SessionSync
import com.fittrainer.data.sync.UploadStatusRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

sealed interface SignOutSyncState {
    data object Hidden : SignOutSyncState
    data class Asking(val pending: Int) : SignOutSyncState
    data object Uploading : SignOutSyncState
    data class Failed(val pending: Int) : SignOutSyncState
}

/** Aviso del logout con entrenamientos sin subir (spec §6): Subir ahora, Cerrar igual o Cancelar. */
@HiltViewModel
class SignOutSyncViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val status: UploadStatusRepository,
    private val sync: SessionSync,
    private val connectivity: ConnectivityObserver,
) : ViewModel() {

    private val _state = MutableStateFlow<SignOutSyncState>(SignOutSyncState.Hidden)
    val state: StateFlow<SignOutSyncState> = _state

    /** El logout que se completa al cerrar el aviso; null si no hay aviso abierto. */
    private var signOut: (() -> Unit)? = null

    fun request(onSignOut: () -> Unit) {
        viewModelScope.launch {
            val owner = currentOwner() ?: return@launch onSignOut()
            val pending = status.pendingCount(owner)
            if (pending == 0) return@launch onSignOut()
            signOut = onSignOut
            _state.value = SignOutSyncState.Asking(pending)
        }
    }

    fun uploadNow() {
        val onSignOut = signOut ?: return
        viewModelScope.launch {
            val owner = currentOwner() ?: return@launch close(onSignOut)
            // Sin red no tiene sentido esperar 15 s: se avisa enseguida.
            if (!connectivity.isOnline.first()) {
                _state.value = SignOutSyncState.Failed(status.pendingCount(owner))
                return@launch
            }
            _state.value = SignOutSyncState.Uploading
            sync.syncNow(SYNC_NOW_TIMEOUT_MS)
            val left = status.pendingCount(owner)
            if (left == 0) close(onSignOut) else _state.value = SignOutSyncState.Failed(left)
        }
    }

    fun signOutAnyway() {
        signOut?.let(::close)
    }

    fun cancel() {
        signOut = null
        _state.value = SignOutSyncState.Hidden
    }

    private fun close(onSignOut: () -> Unit) {
        signOut = null
        _state.value = SignOutSyncState.Hidden
        onSignOut()
    }

    private suspend fun currentOwner(): String? = (sessionRepository.session.first() as? Session.Student)?.user?.id

    companion object {
        const val SYNC_NOW_TIMEOUT_MS = 15_000L
    }
}
```

Run: `.\gradlew.bat testDebugUnitTest --tests "com.fittrainer.ui.sync.SignOutSyncViewModelTest"`
Expected: PASS (5 tests).

- [ ] **Step 3: Diálogo**

Crear `ui/sync/components/PendingUploadsSignOutDialog.kt`:

```kotlin
package com.fittrainer.ui.sync.components

import androidx.compose.foundation.layout.Row
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import com.fittrainer.ui.sync.SignOutSyncState
import com.fittrainer.ui.sync.signOutPendingText

/** Spec §6: las sesiones no se pierden en el logout; se ofrece subirlas antes de salir. */
@Composable
fun PendingUploadsSignOutDialog(
    state: SignOutSyncState,
    onUpload: () -> Unit,
    onSignOutAnyway: () -> Unit,
    onCancel: () -> Unit,
) {
    when (state) {
        SignOutSyncState.Hidden -> Unit
        is SignOutSyncState.Asking -> AlertDialog(
            onDismissRequest = onCancel,
            title = { Text("Entrenamientos sin subir") },
            text = { Text(signOutPendingText(state.pending)) },
            confirmButton = { TextButton(onClick = onUpload) { Text("Subir ahora") } },
            dismissButton = {
                Row {
                    TextButton(onClick = onCancel) { Text("Cancelar") }
                    TextButton(onClick = onSignOutAnyway) { Text("Cerrar igual") }
                }
            },
        )
        SignOutSyncState.Uploading -> AlertDialog(
            onDismissRequest = {},
            title = { Text("Subiendo entrenamientos…") },
            text = { CircularProgressIndicator() },
            confirmButton = {},
        )
        is SignOutSyncState.Failed -> AlertDialog(
            onDismissRequest = onCancel,
            title = { Text("No se pudo subir") },
            text = { Text("¿Cerrar sesión igual? ${signOutPendingText(state.pending)}") },
            confirmButton = { TextButton(onClick = onUpload) { Text("Reintentar") } },
            dismissButton = {
                Row {
                    TextButton(onClick = onCancel) { Text("Cancelar") }
                    TextButton(onClick = onSignOutAnyway) { Text("Cerrar igual") }
                }
            },
        )
    }
}
```

- [ ] **Step 4: Conectar en `RoleShell`**

En `navigation/RoleShell.kt`:
- sumar el parámetro `uploads: SignOutSyncViewModel = hiltViewModel()` después de `entry`;
- reemplazar el bloque de `guardedSignOut` y del `ActiveWorkoutSignOutDialog` (líneas 49-61) por:

```kotlin
    var confirmSignOut by remember { mutableStateOf(false) }
    // Antes de salir se ofrece subir lo pendiente (tarjeta 11); también después de terminar la abierta.
    val syncedSignOut: () -> Unit = { uploads.request(onSignOut) }
    val guardedSignOut: () -> Unit = {
        if (isStudent) {
            entry.requestSignOut(onNoActive = syncedSignOut, onActive = { confirmSignOut = true })
        } else {
            onSignOut()
        }
    }
    if (confirmSignOut) {
        ActiveWorkoutSignOutDialog(
            onFinishAndSignOut = { confirmSignOut = false; entry.finishActive(syncedSignOut) },
            onCancel = { confirmSignOut = false },
        )
    }
    val uploadState by uploads.state.collectAsStateWithLifecycle()
    PendingUploadsSignOutDialog(uploadState, uploads::uploadNow, uploads::signOutAnyway, uploads::cancel)
```

Imports: `com.fittrainer.ui.sync.SignOutSyncViewModel`, `com.fittrainer.ui.sync.components.PendingUploadsSignOutDialog`.

- [ ] **Step 5: Verificación**

Run: `.\gradlew.bat checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL; `RoleShell.kt` ≤ 200 líneas.

- [ ] **Step 6: Checkpoint.** Sin commit.

---

### Task 7: Verificación completa y prueba de punta a punta

**Files:** ninguno nuevo. Si la prueba encuentra un bug, se arregla con su test en el task que corresponda.

- [ ] **Step 1: Suite completa**

Run: `.\gradlew.bat checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL. Anotar el total de tests (antes de la tarjeta: 324 unit).

Run (emulador): `.\gradlew.bat connectedDebugAndroidTest`
Expected: todo en verde.

- [ ] **Step 2: Backend local**

En `backend/` (rama `develop` actualizada): `npm run dev`, con el `.env` apuntando a Supabase dev. Emulador con `API_BASE_URL=http://10.0.2.2:3001/api`. Alumna de prueba: `alumna.card8@…` / `Prueba1234`, con rutina asignada.

- [ ] **Step 3: Prueba de punta a punta**

1. **Modo avión:** entrenar 2 ejercicios × 2 series y terminar.
   - El resumen dice "Guardado en el celular · se sube cuando haya conexión".
   - Hoy muestra "1 entrenamiento sin subir".
2. **Sacar el modo avión** y cronometrar. En < 5 s:
   - el aviso de Hoy desaparece;
   - en Supabase, `sessions` tiene la fila con ese `id` y `finished_at`, y `session_sets` las 4 series con su `executed_at` real.
3. **Reenvío:** volver a encolar (cerrar y abrir la app con otra sesión pendiente, o forzar con `adb shell cmd jobscheduler run -f com.fittrainer <jobId>`) y confirmar que en `session_sets` siguen 4 filas.
4. **Logout con pendientes:**
   - Modo avión, terminar otra sesión → Perfil → Cerrar sesión → aparece "Tenés 1 entrenamiento sin subir…".
   - "Subir ahora" sin red: falla al instante.
   - "Cerrar igual": sale.
   - Volver a entrar con red: la sesión se sube sola.
5. **Logout con "Subir ahora" con red:** sube y sale.
6. **Web de Pablo:** el panel del entrenador ya no muestra "Nunca entrenó" para esa alumna.

Anotar en el ledger los tiempos medidos y cualquier diferencia.

- [ ] **Step 4: Checkpoint final.**
  - Que no quede nada sin seguimiento en git que falte (`5.json` incluido).
  - Pasar la tarjeta a 🔍 AUDITORÍA CODEX con el comentario "🛠️ CLAUDE · Lista para auditar" (`AGENTS.md`).
  - El commit, el push y la PR los hace Igna.
