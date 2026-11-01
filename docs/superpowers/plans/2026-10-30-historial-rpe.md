# Historial de sesiones y feedback post-entreno (tarjeta 12) — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Objetivo:** que el alumno deje RPE y nota al terminar una sesión (salteable) y vea su historial (lista y detalle con series y comentario del PT) en la pestaña Progreso, también sin conexión.

**Arquitectura:** Room v7 suma el feedback a `workout_sessions` y tres tablas de caché del historial (`history_*`). `HistoryRepository` las llena desde `GET /students/:id/sessions` (las 20 más recientes con detalle) y arma la lista combinando el caché con las sesiones del celular que el servidor todavía no tiene. El feedback sube por el trabajo `sync-sessions` de la tarjeta 11: dentro del `POST /sessions` si la sesión no subió, o con un `PATCH /sessions/:id` si ya subió.

**Stack:** Kotlin, Jetpack Compose, Hilt, Retrofit + kotlinx.serialization, Room (auto-migración), WorkManager, JUnit4 + coroutines-test, Compose UI test.

**Spec:** `docs/superpowers/specs/2026-10-30-historial-rpe-design.md`

## Restricciones globales

- Room es la única fuente de verdad: ninguna pantalla ni ViewModel llama a Retrofit.
- Ningún archivo de código (tests incluidos) pasa de **200 líneas físicas**. Orden capa → módulo → archivo; el historial va en `history/` dentro de `workout/` (recurso `sessions`).
- Migración v6 → v7 automática y sin pérdida; nunca destructiva. `7.json` se commitea.
- `rpe`: entero 1-10. `notes`: hasta **1000** caracteres, recortada; vacía pasa a nulo.
- Feedback salteable con un toque; las 10 etiquetas del RPE, textuales, de la §6 del spec.
- Offline: **20** sesiones con detalle (`limit=20`).
- Tema oscuro, azul de marca `#2952D9` (`FtColors.Brand`), toque mínimo 44 px (`Spacing.minTouchTarget`).
- Commits sin firmas de IA. Los commits los hace Igna salvo que pida lo contrario.
- Antes de cerrar: `gradlew checkFileLength assembleDebug testDebugUnitTest` en verde (y los instrumentados nuevos en el emulador).

## Foco de revisión

1. **Reloj del celular atrasado o adelantado:** una sesión local con `finishedAt < startedAt` muestra 0 min, no un negativo. Se prueba en la Tarea 6.
2. **Una sesión que sube mientras el historial está abierto** no aparece dos veces (local + caché) ni desaparece entre la subida y el refresco. Se prueba en la Tarea 6.
3. **Cambio de cuenta en el mismo celular:** el historial de otra cuenta no se ve ni se borra mal. `observe` filtra por `ownerId` y `clearUserData` borra solo al dueño. Se prueba en las Tareas 5 y 6.
4. **Nota con solo espacios o de más de 1000 caracteres:** se guarda como nula, o el campo no deja pasar de 1000. Se prueba en las Tareas 3 y 8.
5. **"Ver más" que trae una sesión ya guardada entre las 20** (entró una sesión nueva entre páginas) no la duplica ni le saca el detalle. Se prueba en la Tarea 5.

---

## Mapa de archivos

**Datos (`mobile/app/src/main/java/com/fittrainer/data/`):**

| Archivo | Qué | Tarea |
|---|---|---|
| `db/workout/WorkoutEntities.kt` | + `rpe`, `notes`, `feedbackState` en `WorkoutSessionEntity`; constantes `FEEDBACK_*` | 1 |
| `db/workout/history/HistoryEntities.kt` (nuevo) | `HistorySessionEntity`, `HistoryExerciseEntity`, `HistorySetEntity`, `HistoryWithDetails` | 1 |
| `db/workout/history/HistoryDao.kt` (nuevo) | Consultas y escrituras del caché | 1 |
| `db/FitTrainerDatabase.kt` | v7, entidades nuevas, `historyDao()` | 1 |
| `di/DatabaseModule.kt` | `provideHistoryDao` | 1 |
| `db/workout/WorkoutDao.kt` | Feedback: guardar, pendientes, marcar; `observeForHistory` | 3, 4, 6 |
| `db/workout/UploadRows.kt` | `UploadCounts.pendingFeedback` | 4 |
| `api/SessionApi.kt` | + `rpe`/`notes` en `CreateSessionRequest`; `UpdateSessionRequest`; `update`, `history`, `historyDetail` | 2 |
| `api/history/HistoryDtos.kt` (nuevo) | DTOs del historial | 2 |
| `workout/WorkoutRepository.kt` | `saveFeedback` | 3 |
| `sync/SessionUploader.kt` | Manda feedback en el `POST`; `sendFeedback` (`PATCH`) | 4 |
| `sync/SyncPass.kt` | Marca el feedback; pasada de `PATCH` | 4 |
| `sync/SyncTrigger.kt`, `sync/UploadStatusRepository.kt` | Cuentan el feedback pendiente | 4 |
| `workout/history/HistoryModels.kt` (nuevo) | `HistoryItem`, `HistoryDetail`, `HistoryExercise`, `HistorySet` | 5 |
| `workout/history/HistoryRepository.kt` (nuevo) | `refresh`, `loadMore`, `loadDetail`, `observe`, `observeDetail`, `clearUserData` | 5, 6 |
| `workout/history/HistoryMapper.kt` (nuevo) | DTO → entidad; entidad → modelo; local → modelo | 5, 6 |
| `di/HistoryModule.kt` (nuevo) | `UserDataCleaner` en el set | 5 |

**UI (`mobile/app/src/main/java/com/fittrainer/ui/`):**

| Archivo | Qué | Tarea |
|---|---|---|
| `workout/RpeTexts.kt` (nuevo) | Etiquetas del RPE | 7 |
| `workout/history/HistoryTexts.kt` (nuevo) | Fecha, duración, volumen, series, plan | 7 |
| `workout/feedback/FeedbackViewModel.kt` (nuevo) | Estado del formulario y guardado | 8 |
| `workout/feedback/FeedbackForm.kt` (nuevo) | Botones del RPE, etiqueta, nota, Guardar y Saltar | 8 |
| `workout/components/WorkoutSummaryView.kt` | Incluye `FeedbackForm` | 8 |
| `workout/history/HistoryViewModel.kt`, `HistoryUiState.kt`, `HistoryScreen.kt`, `components/HistoryCard.kt` (nuevos) | Lista | 9 |
| `workout/history/detail/HistoryDetailViewModel.kt`, `HistoryDetailScreen.kt`, `components/ExerciseBlock.kt` (nuevos) | Detalle | 10 |
| `navigation/RoleTabs.kt`, `navigation/RoleShell.kt` | Ruta de Progreso y del detalle | 9, 10 |

**Tests:** copian el árbol (`src/test/...` y `src/androidTest/...`). Fakes nuevos en `testing/fakes/history/`.

---

### Tarea 1: Room v7 — feedback en la sesión y tablas del historial

**Archivos:**
- Modificar: `data/db/workout/WorkoutEntities.kt`, `data/db/FitTrainerDatabase.kt`, `di/DatabaseModule.kt`
- Crear: `data/db/workout/history/HistoryEntities.kt`, `data/db/workout/history/HistoryDao.kt`
- Generado: `mobile/app/schemas/com.fittrainer.data.db.FitTrainerDatabase/7.json`
- Test: `androidTest/.../data/db/FitTrainerDatabaseMigrationTest.kt` (caso 6→7), `androidTest/.../data/db/workout/history/HistoryDaoTest.kt` (nuevo)

**Interfaces:**
- Produce:
  - `FEEDBACK_NONE`, `FEEDBACK_PENDING`, `FEEDBACK_SYNCED`, `FEEDBACK_REJECTED`;
  - `WorkoutSessionEntity.rpe: Int?`, `.notes: String?`, `.feedbackState: String`;
  - `HistoryDao` con las firmas de abajo y `FitTrainerDatabase.historyDao()`.

- [ ] **Paso 1: columnas de feedback.** En `WorkoutEntities.kt`, debajo de `SYNC_FAILED`:

```kotlin
/** Feedback post-entreno (tarjeta 12): sin cargar o salteado. */
const val FEEDBACK_NONE = "NONE"
/** Guardado en el celular, falta subirlo. */
const val FEEDBACK_PENDING = "PENDING"
const val FEEDBACK_SYNCED = "SYNCED"
/** El servidor lo rechazó (400/404): no se reintenta. */
const val FEEDBACK_REJECTED = "REJECTED"
```

Y al final de `WorkoutSessionEntity` (después de `failureSeen`):

```kotlin
    /** RPE 1-10 del feedback post-entreno (v7). */
    val rpe: Int? = null,
    /** Nota libre del feedback, hasta 1000 caracteres (v7). */
    val notes: String? = null,
    @ColumnInfo(defaultValue = FEEDBACK_NONE) val feedbackState: String = FEEDBACK_NONE,
```

- [ ] **Paso 2: entidades del historial.** Crear `data/db/workout/history/HistoryEntities.kt`:

```kotlin
package com.fittrainer.data.db.workout.history

import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Relation

/** Resumen de una sesión tal como lo manda GET /students/:id/sessions (tarjeta 12). Es caché: se borra en el logout. */
@Entity(tableName = "history_sessions", indices = [Index(value = ["ownerId", "startedAt"])])
data class HistorySessionEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val startedAt: Long,
    val finishedAt: Long?,
    val durationMin: Int?,
    val routineName: String?,
    val rpe: Int?,
    val notes: String?,
    val trainerComment: String?,
    val hasModifications: Boolean,
    val sets: Int,
    val volumeKg: Double,
    val hasPr: Boolean,
    /** Está entre las 20 más recientes del último refresco (las que se guardan con detalle). */
    val inLatest: Boolean,
    /** Sus ejercicios y series ya están guardados. */
    val detailLoaded: Boolean,
)

@Entity(
    tableName = "history_exercises",
    primaryKeys = ["sessionId", "position"],
    foreignKeys = [ForeignKey(HistorySessionEntity::class, ["id"], ["sessionId"], onDelete = ForeignKey.CASCADE)],
)
data class HistoryExerciseEntity(
    val sessionId: String,
    /** Orden del servidor (el del primer executed_at). */
    val position: Int,
    val exerciseName: String,
    val originalExerciseName: String?,
    val plannedSets: Int?,
    val plannedReps: Int?,
    val plannedKg: Double?,
    val isPr: Boolean,
)

@Entity(
    tableName = "history_sets",
    indices = [Index("sessionId")],
    foreignKeys = [ForeignKey(HistorySessionEntity::class, ["id"], ["sessionId"], onDelete = ForeignKey.CASCADE)],
)
data class HistorySetEntity(
    @PrimaryKey val id: String,
    val sessionId: String,
    val exercisePosition: Int,
    val setNumber: Int,
    val reps: Int?,
    val kg: Double?,
    val executedAt: Long,
)

data class HistoryWithDetails(
    @Embedded val session: HistorySessionEntity,
    @Relation(parentColumn = "id", entityColumn = "sessionId") val exercises: List<HistoryExerciseEntity>,
    @Relation(parentColumn = "id", entityColumn = "sessionId") val sets: List<HistorySetEntity>,
)
```

- [ ] **Paso 3: DAO del historial.** Crear `data/db/workout/history/HistoryDao.kt`:

```kotlin
package com.fittrainer.data.db.workout.history

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** Caché del historial (tarjeta 12). Todo por dueño: otra cuenta en el mismo celular no ve nada ajeno. */
@Dao
abstract class HistoryDao {

    @Query("SELECT * FROM history_sessions WHERE ownerId = :ownerId ORDER BY startedAt DESC, id DESC")
    abstract fun observeSessions(ownerId: String): Flow<List<HistorySessionEntity>>

    @Transaction
    @Query("SELECT * FROM history_sessions WHERE ownerId = :ownerId AND id = :id")
    abstract fun observeDetail(ownerId: String, id: String): Flow<HistoryWithDetails?>

    @Query("SELECT * FROM history_sessions WHERE ownerId = :ownerId")
    abstract suspend fun sessions(ownerId: String): List<HistorySessionEntity>

    @Upsert
    abstract suspend fun upsertSessions(sessions: List<HistorySessionEntity>)

    /** "Ver más": las que ya están (entre las 20) no se tocan. */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    abstract suspend fun insertIfAbsent(sessions: List<HistorySessionEntity>)

    @Query("DELETE FROM history_sessions WHERE ownerId = :ownerId AND id NOT IN (:keep)")
    abstract suspend fun deleteOthers(ownerId: String, keep: List<String>)

    @Query("DELETE FROM history_exercises WHERE sessionId = :sessionId")
    abstract suspend fun deleteExercises(sessionId: String)

    @Query("DELETE FROM history_sets WHERE sessionId = :sessionId")
    abstract suspend fun deleteSets(sessionId: String)

    @Insert
    abstract suspend fun insertExercises(exercises: List<HistoryExerciseEntity>)

    @Insert
    abstract suspend fun insertSets(sets: List<HistorySetEntity>)

    @Query("UPDATE history_sessions SET detailLoaded = 1 WHERE id = :sessionId")
    abstract suspend fun markDetailLoaded(sessionId: String)

    @Query("DELETE FROM history_sessions WHERE ownerId = :ownerId")
    abstract suspend fun clear(ownerId: String)

    @Query("DELETE FROM history_sessions")
    abstract suspend fun clearAll()

    /** Las 20 más recientes reemplazan al caché del dueño (las de "Ver más" se van). Upsert: no borra el detalle. */
    @Transaction
    open suspend fun replaceLatest(ownerId: String, latest: List<HistorySessionEntity>) {
        deleteOthers(ownerId, latest.map { it.id })
        upsertSessions(latest)
    }

    /** Ejercicios y series de una sesión, de una vez. */
    @Transaction
    open suspend fun replaceDetail(sessionId: String, exercises: List<HistoryExerciseEntity>, sets: List<HistorySetEntity>) {
        deleteExercises(sessionId)
        deleteSets(sessionId)
        insertExercises(exercises)
        insertSets(sets)
        markDetailLoaded(sessionId)
    }
}
```

- [ ] **Paso 4: registrar la base v7.** En `FitTrainerDatabase.kt`:
  - sumar a `entities`: `HistorySessionEntity::class, HistoryExerciseEntity::class, HistorySetEntity::class`;
  - `version = 7`;
  - `AutoMigration(from = 6, to = 7)`;
  - `abstract fun historyDao(): HistoryDao`.

  En `di/DatabaseModule.kt`, junto a `provideWorkoutDao`:

```kotlin
    @Provides
    fun provideHistoryDao(db: FitTrainerDatabase): HistoryDao = db.historyDao()
```

- [ ] **Paso 5: test de migración (falla primero).** En `FitTrainerDatabaseMigrationTest.kt`, después del caso 5→6:

```kotlin
    @Test fun migra6a7ConElFeedbackVacioYElHistorialSinFilas() {
        helper.createDatabase(DB, 6).apply {
            execSQL(
                "INSERT INTO workout_sessions (id, ownerId, routineId, routineName, startedAt, finishedAt, status, " +
                    "syncState, currentPosition, currentSet, failureSeen) " +
                    "VALUES ('w1', 'u1', 'rt-1', 'Push', 1, 2, 'FINISHED', 'SYNCED', 0, 1, 0)"
            )
            close()
        }
        val db = helper.runMigrationsAndValidate(DB, 7, true)
        db.query("SELECT rpe, notes, feedbackState FROM workout_sessions WHERE id = 'w1'").use {
            assertTrue(it.moveToFirst())
            assertTrue(it.isNull(0))
            assertTrue(it.isNull(1))
            assertEquals("NONE", it.getString(2))
        }
        db.query("SELECT COUNT(*) FROM history_sessions").use { it.moveToFirst(); assertEquals(0, it.getInt(0)) }
    }
```

- [ ] **Paso 6: compilar y generar `7.json`.**

Correr: `gradlew assembleDebug` (desde `mobile/`).
Esperado: BUILD SUCCESSFUL y `app/schemas/.../7.json` creado.

- [ ] **Paso 7: tests del DAO del historial.** Crear `androidTest/.../data/db/workout/history/HistoryDaoTest.kt`:

```kotlin
package com.fittrainer.data.db.workout.history

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.db.FitTrainerDatabase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HistoryDaoTest {
    private val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java).build()
    private val dao = db.historyDao()

    private fun session(id: String, owner: String = "u1", startedAt: Long = 1L, inLatest: Boolean = true) =
        HistorySessionEntity(id, owner, startedAt, startedAt + 60_000, 1, "Push", null, null, null, false, 3, 300.0, false, inLatest, false)

    private fun exercise(sessionId: String) = HistoryExerciseEntity(sessionId, 0, "Press", null, 3, 10, 40.0, false)
    private fun set(id: String, sessionId: String) = HistorySetEntity(id, sessionId, 0, 1, 10, 40.0, 1L)

    @After fun close() = db.close()

    @Test fun ordenaDeLaMasNuevaALaMasViejaYSoloDelDueno() = runBlocking {
        dao.upsertSessions(listOf(session("a", startedAt = 1), session("b", startedAt = 2), session("c", owner = "u2")))
        assertEquals(listOf("b", "a"), dao.observeSessions("u1").first().map { it.id })
    }

    @Test fun replaceLatestBorraLasDeVerMasYConservaElDetalle() = runBlocking {
        dao.upsertSessions(listOf(session("a"), session("viejo", inLatest = false)))
        dao.replaceDetail("a", listOf(exercise("a")), listOf(set("s1", "a")))
        dao.replaceLatest("u1", listOf(session("a")))
        val detail = dao.observeDetail("u1", "a").first()!!
        assertEquals(listOf("a"), dao.sessions("u1").map { it.id })
        assertEquals(1, detail.sets.size)
    }

    @Test fun replaceLatestNoTocaAOtroDueno() = runBlocking {
        dao.upsertSessions(listOf(session("x", owner = "u2")))
        dao.replaceLatest("u1", listOf(session("a")))
        assertEquals(listOf("x"), dao.sessions("u2").map { it.id })
    }

    @Test fun borrarLaSesionBorraEnCascada() = runBlocking {
        dao.upsertSessions(listOf(session("a")))
        dao.replaceDetail("a", listOf(exercise("a")), listOf(set("s1", "a")))
        dao.clear("u1")
        assertTrue(dao.observeDetail("u1", "a").first() == null)
        db.query("SELECT COUNT(*) FROM history_sets", null).use { it.moveToFirst(); assertEquals(0, it.getInt(0)) }
    }

    @Test fun insertIfAbsentNoPisaUnaDeLasVeinte() = runBlocking {
        dao.upsertSessions(listOf(session("a")))
        dao.replaceDetail("a", listOf(exercise("a")), listOf(set("s1", "a")))
        dao.insertIfAbsent(listOf(session("a", inLatest = false)))
        val a = dao.sessions("u1").single()
        assertTrue(a.inLatest && a.detailLoaded)
    }
}
```

- [ ] **Paso 8: correr los instrumentados.**

Correr: `gradlew connectedDebugAndroidTest "-Pandroid.testInstrumentationRunnerArguments.class=com.fittrainer.data.db.FitTrainerDatabaseMigrationTest,com.fittrainer.data.db.workout.history.HistoryDaoTest" "-Pandroid.injected.androidTest.leaveApksInstalledAfterRun=true"`
Esperado: PASS (los 6 casos de migración y los 5 del DAO).

- [ ] **Paso 9: commit.**

```bash
git add mobile/app/src/main/java/com/fittrainer/data/db mobile/app/src/main/java/com/fittrainer/di/DatabaseModule.kt mobile/app/schemas mobile/app/src/androidTest
git commit -m "feat(mobile): Room v7 con feedback post-entreno y caché del historial (tarjeta 12)"
```

---

### Tarea 2: API del historial y del feedback

**Archivos:**
- Modificar: `data/api/SessionApi.kt`, `test/.../testing/fakes/sync/FakeSessionApi.kt`
- Crear: `data/api/history/HistoryDtos.kt`
- Test: `test/.../data/api/history/HistoryDtosTest.kt` (nuevo)

**Interfaces:**
- Produce:
  - `CreateSessionRequest(id, routineId, startedAt, finishedAt, rpe: Int? = null, notes: String? = null)`;
  - `UpdateSessionRequest(rpe: Int?, notes: String?)`;
  - en `SessionApi`: `update(owner: RequiredUser, id: String, body: UpdateSessionRequest)`, `history(studentId: String, page: Int, limit: Int): HistoryPageDto` y `historyDetail(studentId: String, sessionId: String): HistoryDetailResponse`;
  - DTOs: `HistorySummaryDto`, `HistoryPageDto`, `HistoryMetaDto`, `HistoryDetailDto`, `HistoryDetailResponse`, `HistoryExerciseDto`, `NamedRefDto`, `PlannedDto`, `HistorySetDto`.

- [ ] **Paso 1: test de parseo (falla primero).** Crear `test/.../data/api/history/HistoryDtosTest.kt`:

```kotlin
package com.fittrainer.data.api.history

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class HistoryDtosTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test fun parseaUnaPaginaConLosNulosDelContrato() {
        val body = """{"data":[{"id":"s1","started_at":"2026-10-29T12:00:00Z","finished_at":null,"duration_min":null,
            "routine":null,"rpe":null,"notes":null,"trainer_comment":null,"has_modifications":false,"sets":0,
            "volume_kg":0,"has_pr":false}],"meta":{"total":21,"page":1,"limit":20,"total_pages":2}}"""
        val page = json.decodeFromString(HistoryPageDto.serializer(), body)
        assertNull(page.data.single().routine)
        assertEquals(2, page.meta.totalPages)
    }

    @Test fun parseaElDetalleConReemplazoYPlanParcial() {
        val body = """{"data":{"id":"s1","started_at":"2026-10-29T12:00:00Z","finished_at":"2026-10-29T12:54:00Z",
            "duration_min":54,"routine":{"id":"r1","name":"Push"},"rpe":8,"notes":"bien","trainer_comment":"Muy bien",
            "has_modifications":true,"sets":1,"volume_kg":625,"has_pr":true,"exercises":[{"exercise":{"id":"e1","name":"Press"},
            "original_exercise":{"id":"e2","name":"Press con mancuernas"},"planned":{"sets":4,"reps":null,"suggested_kg":60},
            "is_pr":true,"sets":[{"id":"x1","set_number":1,"actual_reps":10,"actual_kg":62.5,"completed":true,
            "executed_at":"2026-10-29T12:10:00Z"}]}]}}"""
        val detail = json.decodeFromString(HistoryDetailResponse.serializer(), body).data
        val exercise = detail.exercises.single()
        assertEquals("Press con mancuernas", exercise.originalExercise?.name)
        assertNull(exercise.planned?.reps)
        assertEquals(62.5, exercise.sets.single().actualKg!!, 0.0)
    }
}
```

- [ ] **Paso 2: correr y ver que falla.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.data.api.history.HistoryDtosTest"`
Esperado: FAIL de compilación (`HistoryPageDto` no existe).

- [ ] **Paso 3: DTOs.** Crear `data/api/history/HistoryDtos.kt`:

```kotlin
package com.fittrainer.data.api.history

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** GET /students/:id/sessions y su detalle (contratos-api.md). Nulos según "Campos que pueden ser null". */
@Serializable
data class NamedRefDto(val id: String, val name: String)

@Serializable
data class HistorySummaryDto(
    val id: String,
    @SerialName("started_at") val startedAt: String,
    @SerialName("finished_at") val finishedAt: String? = null,
    @SerialName("duration_min") val durationMin: Int? = null,
    val routine: NamedRefDto? = null,
    val rpe: Int? = null,
    val notes: String? = null,
    @SerialName("trainer_comment") val trainerComment: String? = null,
    @SerialName("has_modifications") val hasModifications: Boolean = false,
    val sets: Int = 0,
    @SerialName("volume_kg") val volumeKg: Double = 0.0,
    @SerialName("has_pr") val hasPr: Boolean = false,
)

@Serializable
data class HistoryMetaDto(val total: Int, val page: Int, val limit: Int, @SerialName("total_pages") val totalPages: Int)

@Serializable
data class HistoryPageDto(val data: List<HistorySummaryDto>, val meta: HistoryMetaDto)

@Serializable
data class PlannedDto(val sets: Int? = null, val reps: Int? = null, @SerialName("suggested_kg") val suggestedKg: Double? = null)

@Serializable
data class HistorySetDto(
    val id: String,
    @SerialName("set_number") val setNumber: Int,
    @SerialName("actual_reps") val actualReps: Int? = null,
    @SerialName("actual_kg") val actualKg: Double? = null,
    @SerialName("executed_at") val executedAt: String,
)

@Serializable
data class HistoryExerciseDto(
    val exercise: NamedRefDto,
    @SerialName("original_exercise") val originalExercise: NamedRefDto? = null,
    val planned: PlannedDto? = null,
    @SerialName("is_pr") val isPr: Boolean = false,
    val sets: List<HistorySetDto> = emptyList(),
)

@Serializable
data class HistoryDetailDto(
    val id: String,
    @SerialName("started_at") val startedAt: String,
    @SerialName("finished_at") val finishedAt: String? = null,
    @SerialName("duration_min") val durationMin: Int? = null,
    val routine: NamedRefDto? = null,
    val rpe: Int? = null,
    val notes: String? = null,
    @SerialName("trainer_comment") val trainerComment: String? = null,
    @SerialName("has_modifications") val hasModifications: Boolean = false,
    val sets: Int = 0,
    @SerialName("volume_kg") val volumeKg: Double = 0.0,
    @SerialName("has_pr") val hasPr: Boolean = false,
    val exercises: List<HistoryExerciseDto> = emptyList(),
)

@Serializable
data class HistoryDetailResponse(val data: HistoryDetailDto)
```

- [ ] **Paso 4: `SessionApi`.** En `data/api/SessionApi.kt`:
  - Reemplazar el KDoc de `CreateSessionRequest` por `/** POST /sessions: la sesión ya terminada, con el feedback si el alumno lo cargó (tarjeta 12). */` y sumar dos campos al final:

```kotlin
    val rpe: Int? = null,
    val notes: String? = null,
```

  - Debajo de `CreateSessionRequest`:

```kotlin
/** PATCH /sessions/:id: el feedback de una sesión que ya subió. El backend ignora los null. */
@Serializable
data class UpdateSessionRequest(val rpe: Int?, val notes: String?)
```

  - En la interfaz (con los imports `retrofit2.http.GET`, `retrofit2.http.PATCH`, `retrofit2.http.Query` y los DTOs de `history`):

```kotlin
    @PATCH("sessions/{id}")
    suspend fun update(@Tag owner: RequiredUser, @Path("id") id: String, @Body body: UpdateSessionRequest)

    @GET("students/{studentId}/sessions")
    suspend fun history(@Path("studentId") studentId: String, @Query("page") page: Int, @Query("limit") limit: Int): HistoryPageDto

    @GET("students/{studentId}/sessions/{sessionId}")
    suspend fun historyDetail(@Path("studentId") studentId: String, @Path("sessionId") sessionId: String): HistoryDetailResponse
```

- [ ] **Paso 5: el fake.** En `FakeSessionApi.kt` sumar:

```kotlin
    val updates = mutableListOf<Pair<String, UpdateSessionRequest>>()
    var updateError: Throwable? = null
    /** Páginas del historial por número; detalle por id. */
    var historyPages: Map<Int, HistoryPageDto> = emptyMap()
    var details: Map<String, HistoryDetailDto> = emptyMap()
    var historyError: Throwable? = null
    /** ids cuyo detalle falla (simula un corte a mitad del refresco). */
    var failDetails: Set<String> = emptySet()
    val detailCalls = mutableListOf<String>()

    override suspend fun update(owner: RequiredUser, id: String, body: UpdateSessionRequest) {
        checkAccount(owner)
        updateError?.let { throw it }
        updates += id to body
    }

    override suspend fun history(studentId: String, page: Int, limit: Int): HistoryPageDto {
        historyError?.let { throw it }
        return historyPages[page] ?: HistoryPageDto(emptyList(), HistoryMetaDto(0, page, limit, 0))
    }

    override suspend fun historyDetail(studentId: String, sessionId: String): HistoryDetailResponse {
        detailCalls += sessionId
        historyError?.let { throw it }
        if (sessionId in failDetails) throw java.io.IOException("corte")
        return HistoryDetailResponse(details.getValue(sessionId))
    }
```

- [ ] **Paso 6: correr los tests.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.data.api.history.HistoryDtosTest"`
Esperado: PASS.

- [ ] **Paso 7: commit.**

```bash
git add mobile/app/src/main/java/com/fittrainer/data/api mobile/app/src/test/java/com/fittrainer/data/api mobile/app/src/test/java/com/fittrainer/testing/fakes/sync/FakeSessionApi.kt
git commit -m "feat(mobile): endpoints del historial y PATCH del feedback en SessionApi (tarjeta 12)"
```

---

### Tarea 3: guardar el feedback en Room

**Archivos:**
- Modificar: `data/db/workout/WorkoutDao.kt`, `data/workout/WorkoutRepository.kt`, `test/.../testing/fakes/workout/FakeWorkoutDao.kt`
- Test: `test/.../data/workout/WorkoutRepositoryFeedbackTest.kt` (nuevo)

**Interfaces:**
- Consume: las constantes `FEEDBACK_*` (Tarea 1).
- Produce:
  - `WorkoutDao.saveFeedback(id: String, rpe: Int?, notes: String?)`;
  - `WorkoutRepository.saveFeedback(sessionId: String, rpe: Int?, notes: String?)`.
  - El repositorio recorta la nota, la deja nula si queda vacía y no escribe si no hay nada. Lanza `IllegalArgumentException` si `rpe` no está en 1..10 o la nota pasa de `MAX_NOTES` (1000).

- [ ] **Paso 1: test (falla primero).** Crear `test/.../data/workout/WorkoutRepositoryFeedbackTest.kt`:

```kotlin
package com.fittrainer.data.workout

import com.fittrainer.data.db.workout.FEEDBACK_NONE
import com.fittrainer.data.db.workout.FEEDBACK_PENDING
import com.fittrainer.testing.fakes.auth.TestClock
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WorkoutRepositoryFeedbackTest {
    private val dao = FakeWorkoutDao().apply { state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession())) }
    private val repository = WorkoutRepository(dao, TestClock(), IdGenerator { "id" })
    private fun saved() = dao.state.value.sessions.getValue("w1")

    @Test fun guardaRpeYNotaRecortadaComoPendiente() = runTest {
        repository.saveFeedback("w1", 7, "  pesado  ")
        assertEquals(7, saved().rpe)
        assertEquals("pesado", saved().notes)
        assertEquals(FEEDBACK_PENDING, saved().feedbackState)
    }

    @Test fun notaConSoloEspaciosQuedaNula() = runTest {
        repository.saveFeedback("w1", 5, "   ")
        assertNull(saved().notes)
    }

    @Test fun sinRpeNiNotaNoEscribeNada() = runTest {
        repository.saveFeedback("w1", null, " ")
        assertEquals(FEEDBACK_NONE, saved().feedbackState)
    }

    @Test(expected = IllegalArgumentException::class)
    fun rpeFueraDeRangoSeRechaza() = runTest { repository.saveFeedback("w1", 11, null) }

    @Test(expected = IllegalArgumentException::class)
    fun notaDeMasDe1000SeRechaza() = runTest { repository.saveFeedback("w1", null, "x".repeat(1001)) }
}
```

Antes de correrlo, confirmar que `TestClock()` e `IdGenerator { … }` existen con esa forma en `testing/fakes/auth/TestClock.kt` y `data/workout/IdGenerator.kt`. Si `IdGenerator` es una interfaz con `newId()`, usar `object : IdGenerator { override fun newId() = "id" }`.

- [ ] **Paso 2: correr y ver que falla.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.data.workout.WorkoutRepositoryFeedbackTest"`
Esperado: FAIL de compilación (`saveFeedback` no existe).

- [ ] **Paso 3: DAO.** En `WorkoutDao.kt`, antes de `@Insert insertSession`:

```kotlin
    /** Feedback post-entreno (tarjeta 12): queda pendiente de subir. */
    @Query("UPDATE workout_sessions SET rpe = :rpe, notes = :notes, feedbackState = '$FEEDBACK_PENDING' WHERE id = :id")
    abstract suspend fun saveFeedback(id: String, rpe: Int?, notes: String?)
```

En `FakeWorkoutDao.kt`:

```kotlin
    override suspend fun saveFeedback(id: String, rpe: Int?, notes: String?) = write { st ->
        val s = st.sessions[id] ?: return@write st
        st.copy(sessions = st.sessions + (id to s.copy(rpe = rpe, notes = notes, feedbackState = FEEDBACK_PENDING)))
    }
```

- [ ] **Paso 4: repositorio.** En `WorkoutRepository.kt`, arriba de la clase:

```kotlin
/** Límite de la nota del feedback: el mismo que valida el backend (PATCH /sessions/:id). */
const val MAX_NOTES = 1000
```

Y dentro de la clase:

```kotlin
    /**
     * Feedback post-entreno (spec §4 de la tarjeta 12). La nota se recorta y vacía pasa a null; sin RPE
     * ni nota no se escribe nada (es lo mismo que saltear). Lo sube la pasada de sync-sessions.
     */
    suspend fun saveFeedback(sessionId: String, rpe: Int?, notes: String?) {
        require(rpe == null || rpe in 1..10) { "RPE fuera de rango" }
        val note = notes?.trim()?.takeIf { it.isNotEmpty() }
        require(note == null || note.length <= MAX_NOTES) { "Nota de más de $MAX_NOTES caracteres" }
        if (rpe == null && note == null) return
        dao.saveFeedback(sessionId, rpe, note)
    }
```

- [ ] **Paso 5: correr los tests.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.data.workout.*"`
Esperado: PASS (los nuevos y los que ya estaban).

- [ ] **Paso 6: commit.**

```bash
git add mobile/app/src/main/java/com/fittrainer/data mobile/app/src/test/java/com/fittrainer
git commit -m "feat(mobile): guardar el feedback post-entreno en Room (tarjeta 12)"
```

---

### Tarea 4: subir el feedback con la pasada de sync-sessions

**Archivos:**
- Modificar: `data/db/workout/WorkoutDao.kt`, `data/db/workout/UploadRows.kt`, `data/sync/SessionUploader.kt`, `data/sync/SyncPass.kt`, `data/sync/SyncTrigger.kt`, `data/sync/UploadStatusRepository.kt`, `test/.../testing/fakes/workout/FakeWorkoutDao.kt`
- Test: `test/.../data/sync/SessionUploaderFeedbackTest.kt` (nuevo), `test/.../data/sync/syncpass/SyncPassFeedbackTest.kt` (nuevo), `test/.../data/sync/SyncTriggerTest.kt` (un caso más)

**Interfaces:**
- Consume:
  - `WorkoutSessionEntity.rpe` / `.notes` / `.feedbackState` (Tarea 1);
  - `SessionApi.update`, `UpdateSessionRequest`, `CreateSessionRequest(…, rpe, notes)` (Tarea 2).
- Produce:
  - `UploadCounts.pendingFeedback: Int`;
  - `WorkoutDao.pendingFeedback(ownerId)`, `markFeedbackSynced(id, rpe, notes)`, `markFeedbackRejected(id)`;
  - `SessionUploader.sendFeedback(owner, session): FeedbackOutcome`;
  - `enum class FeedbackOutcome { SENT, REJECTED, RETRY, UNAUTHORIZED, KEEP }`.

- [ ] **Paso 1: tests del uploader (fallan primero).** Crear `test/.../data/sync/SessionUploaderFeedbackTest.kt`:

```kotlin
package com.fittrainer.data.sync

import com.fittrainer.data.api.UpdateSessionRequest
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.httpError
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class SessionUploaderFeedbackTest {
    private val api = FakeSessionApi()
    private val uploader = SessionUploader(api)
    private val withFeedback = finishedSession().copy(rpe = 7, notes = "pesado")

    @Test fun elPostLlevaRpeYNota() = runTest {
        uploader.upload("u1", withFeedback, emptyList())
        assertEquals(7, api.created.single().rpe)
        assertEquals("pesado", api.created.single().notes)
    }

    @Test fun sendFeedbackMandaElPatch() = runTest {
        assertEquals(FeedbackOutcome.SENT, uploader.sendFeedback("u1", withFeedback))
        assertEquals("w1" to UpdateSessionRequest(7, "pesado"), api.updates.single())
    }

    @Test fun cuatrocientosYCuatrocientosCuatroRechazan() = runTest {
        api.updateError = httpError(404)
        assertEquals(FeedbackOutcome.REJECTED, uploader.sendFeedback("u1", withFeedback))
        api.updateError = httpError(400)
        assertEquals(FeedbackOutcome.REJECTED, uploader.sendFeedback("u1", withFeedback))
    }

    @Test fun redYQuinientosReintentan() = runTest {
        api.updateError = IOException("sin red")
        assertEquals(FeedbackOutcome.RETRY, uploader.sendFeedback("u1", withFeedback))
        api.updateError = httpError(503)
        assertEquals(FeedbackOutcome.RETRY, uploader.sendFeedback("u1", withFeedback))
    }

    @Test fun cambioDeCuentaYCuatrocientosTresLoDejanPendiente() = runTest {
        api.account = { "otro" }
        assertEquals(FeedbackOutcome.KEEP, uploader.sendFeedback("u1", withFeedback))
        api.account = null
        api.updateError = httpError(403)
        assertEquals(FeedbackOutcome.KEEP, uploader.sendFeedback("u1", withFeedback))
    }

    @Test fun cuatrocientosUnoEsUnauthorized() = runTest {
        api.updateError = httpError(401)
        assertEquals(FeedbackOutcome.UNAUTHORIZED, uploader.sendFeedback("u1", withFeedback))
    }
}
```

- [ ] **Paso 2: tests de la pasada (fallan primero).** Crear `test/.../data/sync/syncpass/SyncPassFeedbackTest.kt`:

```kotlin
package com.fittrainer.data.sync.syncpass

import com.fittrainer.data.api.CreateSessionRequest
import com.fittrainer.data.api.RequiredUser
import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.db.workout.FEEDBACK_PENDING
import com.fittrainer.data.db.workout.FEEDBACK_REJECTED
import com.fittrainer.data.db.workout.FEEDBACK_SYNCED
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.sync.PassResult
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.httpError
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncPassFeedbackTest : SyncPassTestBase() {
    private fun feedback(id: String) = dao.state.value.sessions.getValue(id).feedbackState

    @Test fun sesionSinSubirLlevaElFeedbackEnElPostYQuedaSubido() = runTest {
        seed(finishedSession().copy(rpe = 7, notes = "ok", feedbackState = FEEDBACK_PENDING))
        assertEquals(PassResult.DONE, pass.run())
        assertEquals(7, api.created.single().rpe)
        assertEquals(FEEDBACK_SYNCED, feedback("w1"))
        assertTrue(api.updates.isEmpty())
    }

    @Test fun sesionYaSubidaMandaPatch() = runTest {
        seed(finishedSession(syncState = SYNC_SYNCED).copy(rpe = 6, feedbackState = FEEDBACK_PENDING))
        assertEquals(PassResult.DONE, pass.run())
        assertEquals("w1", api.updates.single().first)
        assertEquals(FEEDBACK_SYNCED, feedback("w1"))
    }

    @Test fun feedbackGuardadoDuranteElPostTerminaEnPatch() = runTest {
        seed(finishedSession())
        // El alumno guarda el RPE mientras sale el POST (que se leyó sin feedback).
        val racing = object : SessionApi by api {
            override suspend fun create(owner: RequiredUser, body: CreateSessionRequest) {
                api.create(owner, body)
                dao.saveFeedback("w1", 8, null)
            }
        }
        assertEquals(PassResult.DONE, passWith(racing).run())
        assertEquals(null, api.created.single().rpe)
        assertEquals(8, api.updates.single().second.rpe)
        assertEquals(FEEDBACK_SYNCED, feedback("w1"))
    }

    @Test fun elMarcadoCondicionalNoPisaUnValorNuevo() = runTest {
        seed(finishedSession(syncState = SYNC_SYNCED).copy(rpe = 6, feedbackState = FEEDBACK_PENDING))
        val racing = object : SessionApi by api {
            override suspend fun update(owner: RequiredUser, id: String, body: com.fittrainer.data.api.UpdateSessionRequest) {
                api.update(owner, id, body)
                dao.saveFeedback("w1", 9, null)
            }
        }
        passWith(racing).run()
        assertEquals(FEEDBACK_PENDING, feedback("w1"))
    }

    @Test fun cuatrocientosCuatroDescartaElFeedback() = runTest {
        seed(finishedSession(syncState = SYNC_SYNCED).copy(rpe = 6, feedbackState = FEEDBACK_PENDING))
        api.updateError = httpError(404)
        assertEquals(PassResult.DONE, pass.run())
        assertEquals(FEEDBACK_REJECTED, feedback("w1"))
    }

    @Test fun sinRedReintentaYQuedaPendiente() = runTest {
        seed(finishedSession(syncState = SYNC_SYNCED).copy(rpe = 6, feedbackState = FEEDBACK_PENDING))
        api.updateError = IOException("sin red")
        assertEquals(PassResult.RETRY, pass.run())
        assertEquals(FEEDBACK_PENDING, feedback("w1"))
    }
}
```

Para que `dao.saveFeedback` funcione dentro del objeto anónimo, `dao` tiene que ser accesible desde la subclase: ya es `protected` en `SyncPassTestBase`.

- [ ] **Paso 3: correr y ver que fallan.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.data.sync.*Feedback*"`
Esperado: FAIL de compilación (`sendFeedback`, `FeedbackOutcome` y `updates` no existen).

- [ ] **Paso 4: DAO y conteos.** En `UploadRows.kt`, `UploadCounts` suma `val pendingFeedback: Int = 0` como último parámetro. En `WorkoutDao.kt`:
  - en `observeUploadCounts`, agregar al `SELECT` (antes de `FROM workout_sessions`):

```kotlin
            ", COALESCE(SUM(feedbackState = '$FEEDBACK_PENDING'), 0) AS pendingFeedback " +
```

  (ojo con la coma: queda `… AS failedSets, COALESCE(…) AS pendingFeedback FROM workout_sessions …`);
  - y sumar:

```kotlin
    /** Feedback que falta mandar por PATCH: la sesión ya está en el servidor (tarjeta 12). */
    @Query(
        "SELECT * FROM workout_sessions WHERE ownerId = :ownerId AND status = '$STATUS_FINISHED' " +
            "AND syncState = '$SYNC_SYNCED' AND feedbackState = '$FEEDBACK_PENDING' ORDER BY startedAt"
    )
    abstract suspend fun pendingFeedback(ownerId: String): List<WorkoutSessionEntity>

    /** Solo si sigue siendo lo que se mandó: un RPE guardado mientras volaba el pedido queda PENDING. */
    @Query(
        "UPDATE workout_sessions SET feedbackState = '$FEEDBACK_SYNCED' WHERE id = :id " +
            "AND feedbackState = '$FEEDBACK_PENDING' AND rpe IS :rpe AND notes IS :notes"
    )
    abstract suspend fun markFeedbackSynced(id: String, rpe: Int?, notes: String?)

    @Query("UPDATE workout_sessions SET feedbackState = '$FEEDBACK_REJECTED' WHERE id = :id")
    abstract suspend fun markFeedbackRejected(id: String)
```

  - En `FakeWorkoutDao.kt`: el conteo suma `done.count { it.feedbackState == FEEDBACK_PENDING }` como cuarto argumento de `UploadCounts`, y:

```kotlin
    override suspend fun pendingFeedback(ownerId: String) = state.value.sessions.values
        .filter { it.ownerId == ownerId && it.status == STATUS_FINISHED && it.syncState == SYNC_SYNCED && it.feedbackState == FEEDBACK_PENDING }
        .sortedBy { it.startedAt }

    override suspend fun markFeedbackSynced(id: String, rpe: Int?, notes: String?) = write { st ->
        val s = st.sessions[id]?.takeIf { it.feedbackState == FEEDBACK_PENDING && it.rpe == rpe && it.notes == notes }
            ?: return@write st
        st.copy(sessions = st.sessions + (id to s.copy(feedbackState = FEEDBACK_SYNCED)))
    }

    override suspend fun markFeedbackRejected(id: String) = write { st ->
        val s = st.sessions[id] ?: return@write st
        st.copy(sessions = st.sessions + (id to s.copy(feedbackState = FEEDBACK_REJECTED)))
    }
```

  Si `FakeWorkoutDao.kt` pasa de 200 líneas, mover estos tres métodos y `saveFeedback` a un archivo hermano no es posible (es una clase). En ese caso, mover el bloque de conteos (`observeUploadCounts`, `markSessionFailuresSeen`, `markSetFailuresSeen`, `observeSessionUpload`) a funciones de extensión privadas sobre `State` en `testing/fakes/workout/FakeWorkoutCounts.kt`, y dejar en la clase solo los `override` de una línea que las llaman.

- [ ] **Paso 5: uploader.** En `SessionUploader.kt`:

```kotlin
/** Qué pasó con el PATCH del feedback (spec §5 de la tarjeta 12). */
enum class FeedbackOutcome { SENT, REJECTED, RETRY, UNAUTHORIZED, KEEP }
```

  Dentro de la clase:

```kotlin
    /** PATCH /sessions/:id con el RPE y la nota de una sesión que ya subió. */
    suspend fun sendFeedback(owner: String, session: WorkoutSessionEntity): FeedbackOutcome = try {
        api.update(RequiredUser(owner), session.id, UpdateSessionRequest(session.rpe, session.notes))
        FeedbackOutcome.SENT
    } catch (e: AccountChangedException) {
        FeedbackOutcome.KEEP
    } catch (e: HttpException) {
        when (e.code()) {
            400, 404 -> FeedbackOutcome.REJECTED
            401 -> FeedbackOutcome.UNAUTHORIZED
            403 -> FeedbackOutcome.KEEP
            else -> FeedbackOutcome.RETRY
        }
    } catch (e: IOException) {
        FeedbackOutcome.RETRY
    } catch (e: SerializationException) {
        FeedbackOutcome.RETRY
    }
```

  Y `toRequest()`:

```kotlin
private fun WorkoutSessionEntity.toRequest() =
    CreateSessionRequest(id, routineId, iso(startedAt), finishedAt?.let { iso(maxOf(it, startedAt)) }, rpe, notes)
```

- [ ] **Paso 6: pasada.** En `SyncPass.kt`, dentro del `for`, después de `dao.applyUpload(...)` en el `if (result.created || rejected)`:

```kotlin
                // El POST llevó el feedback que había al leerla: queda subido si nadie lo cambió mientras tanto.
                if (result.created && session.feedbackState == FEEDBACK_PENDING) {
                    dao.markFeedbackSynced(session.id, session.rpe, session.notes)
                }
```

  Reemplazar el `return PassResult.DONE` final por `return sendFeedback(owner)` y sumar:

```kotlin
    /** Feedback de sesiones ya subidas (spec §4 de la tarjeta 12): un PATCH por sesión. */
    private suspend fun sendFeedback(owner: String): PassResult {
        for (session in dao.pendingFeedback(owner)) {
            if (currentStudent() != owner) return PassResult.DONE
            when (uploader.sendFeedback(owner, session)) {
                FeedbackOutcome.SENT -> dao.markFeedbackSynced(session.id, session.rpe, session.notes)
                FeedbackOutcome.REJECTED -> dao.markFeedbackRejected(session.id)
                FeedbackOutcome.RETRY -> return PassResult.RETRY
                FeedbackOutcome.UNAUTHORIZED -> return if (currentStudent() == owner) PassResult.RETRY else PassResult.DONE
                FeedbackOutcome.KEEP -> return PassResult.DONE
            }
        }
        return PassResult.DONE
    }
```

- [ ] **Paso 7: disparador y logout.**
  - En `SyncTrigger.kt`, reemplazar `.map { it.pending }` por `.map { it.pending + it.pendingFeedback }` y actualizar el KDoc: "cada vez que cambia lo pendiente (sesiones y feedback, tarjeta 12)".
  - En `UploadStatusRepository.kt`:

```kotlin
    /** Lo que se pierde si cierra sesión: sesiones sin subir y feedback sin mandar (tarjeta 12). */
    suspend fun pendingCount(ownerId: String): Int = counts(ownerId).let { it.pending + it.pendingFeedback }
```

  - En `SyncTriggerTest.kt`, sumar un caso que, con una sesión `SYNCED`, llama a `dao.saveFeedback("w1", 7, null)` y verifica que `FakeSessionSync` recibió un `enqueue(newWork = true)`. Copiar la estructura del caso existente que termina una sesión.

- [ ] **Paso 8: correr los tests de sync.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.data.sync.*" --tests "com.fittrainer.ui.sync.*"`
Esperado: PASS. En `SyncTexts`, el aviso de Hoy sigue usando solo `counts.pending`: no tiene que cambiar ningún test de `SyncTextsTest`.

- [ ] **Paso 9: commit.**

```bash
git add mobile/app/src/main/java/com/fittrainer/data mobile/app/src/test/java/com/fittrainer
git commit -m "feat(mobile): el feedback sube con la pasada de sync-sessions, por POST o PATCH (tarjeta 12)"
```

---

### Tarea 5: HistoryRepository — refresco, "Ver más" y detalle

**Archivos:**
- Crear: `data/workout/history/HistoryModels.kt`, `data/workout/history/HistoryMapper.kt`, `data/workout/history/HistoryRepository.kt`, `di/HistoryModule.kt`, `test/.../testing/fakes/history/FakeHistoryDao.kt`
- Test: `test/.../data/workout/history/HistoryRepositoryRefreshTest.kt` (nuevo)

**Interfaces:**
- Consume: `HistoryDao` (Tarea 1); `SessionApi.history` / `historyDetail` y los DTOs (Tarea 2).
- Produce:
  - `HISTORY_PAGE_SIZE = 20`;
  - `HistoryRepository.refresh(ownerId): Result<Unit>`;
  - `HistoryRepository.loadMore(ownerId, page: Int): Result<Boolean>` (`true` si hay más páginas);
  - `HistoryRepository.loadDetail(ownerId, sessionId): Result<Unit>`;
  - `HistoryRepository.hasMoreAfterRefresh: Boolean` (lo deja el último `refresh` exitoso: `1 < meta.total_pages`).
  - Los errores viajan como `DataException(DataError)`, igual que en `LibraryRepository`.

- [ ] **Paso 1: fake del DAO.** Crear `testing/fakes/history/FakeHistoryDao.kt`:

```kotlin
package com.fittrainer.testing.fakes.history

import com.fittrainer.data.db.workout.history.HistoryDao
import com.fittrainer.data.db.workout.history.HistoryExerciseEntity
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import com.fittrainer.data.db.workout.history.HistorySetEntity
import com.fittrainer.data.db.workout.history.HistoryWithDetails
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** Caché del historial en memoria, con el mismo cascade que Room. */
class FakeHistoryDao : HistoryDao() {
    data class State(
        val sessions: Map<String, HistorySessionEntity> = emptyMap(),
        val exercises: List<HistoryExerciseEntity> = emptyList(),
        val sets: List<HistorySetEntity> = emptyList(),
    )

    val state = MutableStateFlow(State())

    private fun ordered(st: State, owner: String) =
        st.sessions.values.filter { it.ownerId == owner }.sortedWith(compareByDescending<HistorySessionEntity> { it.startedAt }.thenByDescending { it.id })

    override fun observeSessions(ownerId: String): Flow<List<HistorySessionEntity>> = state.map { ordered(it, ownerId) }
    override fun observeDetail(ownerId: String, id: String): Flow<HistoryWithDetails?> = state.map { st ->
        st.sessions[id]?.takeIf { it.ownerId == ownerId }?.let { s ->
            HistoryWithDetails(s, st.exercises.filter { it.sessionId == id }, st.sets.filter { it.sessionId == id })
        }
    }
    override suspend fun sessions(ownerId: String) = ordered(state.value, ownerId)
    override suspend fun upsertSessions(sessions: List<HistorySessionEntity>) = state.update { st ->
        st.copy(sessions = st.sessions + sessions.associateBy { it.id })
    }
    override suspend fun insertIfAbsent(sessions: List<HistorySessionEntity>) = state.update { st ->
        st.copy(sessions = st.sessions + sessions.filter { it.id !in st.sessions }.associateBy { it.id })
    }
    override suspend fun deleteOthers(ownerId: String, keep: List<String>) = drop { it.ownerId == ownerId && it.id !in keep }
    override suspend fun deleteExercises(sessionId: String) = state.update { st -> st.copy(exercises = st.exercises.filterNot { it.sessionId == sessionId }) }
    override suspend fun deleteSets(sessionId: String) = state.update { st -> st.copy(sets = st.sets.filterNot { it.sessionId == sessionId }) }
    override suspend fun insertExercises(exercises: List<HistoryExerciseEntity>) = state.update { it.copy(exercises = it.exercises + exercises) }
    override suspend fun insertSets(sets: List<HistorySetEntity>) = state.update { it.copy(sets = it.sets + sets) }
    override suspend fun markDetailLoaded(sessionId: String) = state.update { st ->
        val s = st.sessions[sessionId] ?: return@update st
        st.copy(sessions = st.sessions + (sessionId to s.copy(detailLoaded = true)))
    }
    override suspend fun clear(ownerId: String) = drop { it.ownerId == ownerId }
    override suspend fun clearAll() = drop { true }

    private fun drop(predicate: (HistorySessionEntity) -> Boolean) = state.update { st ->
        val gone = st.sessions.values.filter(predicate).map { it.id }.toSet()
        State(st.sessions - gone, st.exercises.filterNot { it.sessionId in gone }, st.sets.filterNot { it.sessionId in gone })
    }
}
```

  Las `@Transaction open` (`replaceLatest`, `replaceDetail`) se heredan tal cual: llaman a los métodos de arriba.

- [ ] **Paso 2: tests del refresco (fallan primero).** Crear `test/.../data/workout/history/HistoryRepositoryRefreshTest.kt`:

```kotlin
package com.fittrainer.data.workout.history

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistoryExerciseDto
import com.fittrainer.data.api.history.HistoryMetaDto
import com.fittrainer.data.api.history.HistoryPageDto
import com.fittrainer.data.api.history.HistorySetDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.api.history.NamedRefDto
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HistoryRepositoryRefreshTest {
    private val api = FakeSessionApi()
    private val dao = FakeHistoryDao()
    private val repository = HistoryRepository(api, dao, FakeWorkoutDao())

    private fun summary(id: String, day: Int, sets: Int = 3) =
        HistorySummaryDto(id, "2026-10-%02dT12:00:00Z".format(day), "2026-10-%02dT12:50:00Z".format(day), 50, NamedRefDto("r1", "Push"), sets = sets, volumeKg = 300.0)

    private fun detail(id: String, day: Int) = HistoryDetailDto(
        id, "2026-10-%02dT12:00:00Z".format(day), exercises = listOf(
            HistoryExerciseDto(NamedRefDto("e1", "Press"), sets = listOf(HistorySetDto("$id-s1", 1, 10, 40.0, "2026-10-%02dT12:05:00Z".format(day)))),
        ),
    )

    private fun page(vararg s: HistorySummaryDto, totalPages: Int = 1) = HistoryPageDto(s.toList(), HistoryMetaDto(s.size, 1, 20, totalPages))

    @Test fun refrescoGuardaLasVeinteConSuDetalle() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), summary("b", 1)))
        api.details = mapOf("a" to detail("a", 2), "b" to detail("b", 1))
        assertTrue(repository.refresh("u1").isSuccess)
        assertEquals(setOf("a", "b"), dao.state.value.sessions.keys)
        assertTrue(dao.state.value.sessions.values.all { it.detailLoaded && it.inLatest })
        assertEquals(2, dao.state.value.sets.size)
    }

    @Test fun soloPideElDetalleDeLasNuevasOCambiadas() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), summary("b", 1)))
        api.details = mapOf("a" to detail("a", 2), "b" to detail("b", 1))
        repository.refresh("u1")
        api.detailCalls.clear()
        api.historyPages = mapOf(1 to page(summary("c", 3), summary("a", 2, sets = 4), summary("b", 1)))
        api.details = api.details + ("c" to detail("c", 3))
        repository.refresh("u1")
        assertEquals(listOf("c", "a"), api.detailCalls)
    }

    @Test fun siFallaUnDetalleConservaLoGuardadoYLoReintentaDespues() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), summary("b", 1)))
        api.details = mapOf("a" to detail("a", 2), "b" to detail("b", 1))
        api.failDetails = setOf("b")
        repository.refresh("u1")
        assertTrue(dao.state.value.sessions.getValue("a").detailLoaded)
        assertFalse(dao.state.value.sessions.getValue("b").detailLoaded)
        api.failDetails = emptySet()
        api.detailCalls.clear()
        repository.refresh("u1")
        assertEquals(listOf("b"), api.detailCalls)
    }

    @Test fun elRefrescoBorraLasDeVerMas() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), totalPages = 2), 2 to page(summary("viejo", 1), totalPages = 2))
        api.details = mapOf("a" to detail("a", 2))
        repository.refresh("u1")
        assertTrue(repository.loadMore("u1", 2).getOrThrow().not())
        assertTrue("viejo" in dao.state.value.sessions)
        repository.refresh("u1")
        assertFalse("viejo" in dao.state.value.sessions)
    }

    @Test fun verMasNoDuplicaNiPisaUnaDeLasVeinte() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), totalPages = 2), 2 to page(summary("a", 2), totalPages = 2))
        api.details = mapOf("a" to detail("a", 2))
        repository.refresh("u1")
        repository.loadMore("u1", 2)
        val a = dao.state.value.sessions.getValue("a")
        assertTrue(a.inLatest && a.detailLoaded)
    }

    @Test fun elRefrescoDiceSiHayMasDeVeinte() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2), totalPages = 2))
        api.details = mapOf("a" to detail("a", 2))
        repository.refresh("u1")
        assertTrue(repository.hasMoreAfterRefresh)
    }

    @Test fun verMasDiceSiHayMasPaginas() = runTest {
        api.historyPages = mapOf(2 to page(summary("x", 1), totalPages = 3))
        assertTrue(repository.loadMore("u1", 2).getOrThrow())
    }

    @Test fun sinRedFallaConOfflineYNoTocaElCache() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2)))
        api.details = mapOf("a" to detail("a", 2))
        repository.refresh("u1")
        api.historyError = java.io.IOException("sin red")
        val result = repository.refresh("u1")
        assertTrue(result.isFailure)
        assertEquals(setOf("a"), dao.state.value.sessions.keys)
    }

    @Test fun limpiarBorraSoloAlDueno() = runTest {
        api.historyPages = mapOf(1 to page(summary("a", 2)))
        api.details = mapOf("a" to detail("a", 2))
        repository.refresh("u1")
        repository.clearUserData("otro")
        assertEquals(setOf("a"), dao.state.value.sessions.keys)
        repository.clearUserData("u1")
        assertTrue(dao.state.value.sessions.isEmpty())
    }
}
```

- [ ] **Paso 3: correr y ver que fallan.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.data.workout.history.*"`
Esperado: FAIL de compilación (`HistoryRepository` no existe).

- [ ] **Paso 4: modelos.** Crear `data/workout/history/HistoryModels.kt`:

```kotlin
package com.fittrainer.data.workout.history

import java.time.Instant

/** De dónde sale una sesión del historial (spec §4 de la tarjeta 12). */
enum class HistoryOrigin {
    /** Caché del servidor. */
    SERVER,
    /** Del celular, todavía sin subir: la UI muestra "Sin subir". */
    LOCAL_PENDING,
    /** Del celular, ya subida pero el historial todavía no se refrescó. */
    LOCAL_SYNCED,
}

data class HistoryItem(
    val id: String,
    val startedAt: Instant,
    val durationMin: Int?,
    val routineName: String?,
    val sets: Int,
    val volumeKg: Double,
    val rpe: Int?,
    val hasPr: Boolean,
    val hasComment: Boolean,
    val origin: HistoryOrigin,
)

data class HistorySet(val setNumber: Int, val reps: Int?, val kg: Double?)

data class HistoryExercise(
    val name: String,
    val originalName: String?,
    val plannedSets: Int?,
    val plannedReps: Int?,
    val plannedKg: Double?,
    val isPr: Boolean,
    val sets: List<HistorySet>,
)

/** detailLoaded = false: solo el resumen (las de "Ver más" hasta abrirlas con red). */
data class HistoryDetail(
    val item: HistoryItem,
    val notes: String?,
    val trainerComment: String?,
    val exercises: List<HistoryExercise>,
    val detailLoaded: Boolean,
)
```

- [ ] **Paso 5: mapper (DTO → entidad).** Crear `data/workout/history/HistoryMapper.kt`:

```kotlin
package com.fittrainer.data.workout.history

import com.fittrainer.data.api.history.HistoryDetailDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.db.workout.history.HistoryExerciseEntity
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import com.fittrainer.data.db.workout.history.HistorySetEntity
import java.time.Instant

private fun millis(iso: String): Long = Instant.parse(iso).toEpochMilli()

fun HistorySummaryDto.toEntity(ownerId: String, inLatest: Boolean, detailLoaded: Boolean) = HistorySessionEntity(
    id = id, ownerId = ownerId, startedAt = millis(startedAt), finishedAt = finishedAt?.let(::millis),
    durationMin = durationMin, routineName = routine?.name, rpe = rpe, notes = notes, trainerComment = trainerComment,
    hasModifications = hasModifications, sets = sets, volumeKg = volumeKg, hasPr = hasPr,
    inLatest = inLatest, detailLoaded = detailLoaded,
)

/** Lo que cambia el detalle: si algo de esto difiere del caché, hay que volver a pedirlo. */
fun HistorySessionEntity.detailMatches(dto: HistorySummaryDto): Boolean =
    detailLoaded && sets == dto.sets && volumeKg == dto.volumeKg && hasPr == dto.hasPr &&
        hasModifications == dto.hasModifications && finishedAt == dto.finishedAt?.let(::millis)

fun HistoryDetailDto.exerciseEntities(): List<HistoryExerciseEntity> = exercises.mapIndexed { i, e ->
    HistoryExerciseEntity(id, i, e.exercise.name, e.originalExercise?.name, e.planned?.sets, e.planned?.reps, e.planned?.suggestedKg, e.isPr)
}

fun HistoryDetailDto.setEntities(): List<HistorySetEntity> = exercises.flatMapIndexed { i, e ->
    e.sets.map { s -> HistorySetEntity(s.id, id, i, s.setNumber, s.actualReps, s.actualKg, millis(s.executedAt)) }
}
```

- [ ] **Paso 6: repositorio (refresco).** Crear `data/workout/history/HistoryRepository.kt`:

```kotlin
package com.fittrainer.data.workout.history

import com.fittrainer.data.api.SessionApi
import com.fittrainer.data.db.workout.WorkoutDao
import com.fittrainer.data.db.workout.history.HistoryDao
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.session.UserDataCleaner
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException

/** Las que se guardan con detalle para verlas offline (spec §2). */
const val HISTORY_PAGE_SIZE = 20

/**
 * Historial del alumno (spec §4 de la tarjeta 12). La UI observa Room; refresh() trae las 20 más
 * recientes y su detalle. Las sesiones del celular que el servidor todavía no tiene se suman en observe().
 */
@Singleton
class HistoryRepository @Inject constructor(
    private val api: SessionApi,
    private val dao: HistoryDao,
    private val workoutDao: WorkoutDao,
) : UserDataCleaner {

    /** Lo dice la última página 1 que trajo refresh(): si hay sesiones más viejas que las 20. */
    @Volatile var hasMoreAfterRefresh: Boolean = false
        private set

    /** Si la lista falla, Room queda como estaba. Si falla un detalle, lo ya guardado queda y sigue en el próximo. */
    suspend fun refresh(ownerId: String): Result<Unit> = guard {
        val page = api.history(ownerId, 1, HISTORY_PAGE_SIZE)
        hasMoreAfterRefresh = 1 < page.meta.totalPages
        val cached = dao.sessions(ownerId).associateBy { it.id }
        val stale = page.data.filterNot { cached[it.id]?.detailMatches(it) == true }.map { it.id }.toSet()
        dao.replaceLatest(ownerId, page.data.map { it.toEntity(ownerId, inLatest = true, detailLoaded = it.id !in stale) })
        var failure: Exception? = null
        for (id in page.data.map { it.id }.filter { it in stale }) {
            try {
                saveDetail(ownerId, id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                failure = failure ?: e
            }
        }
        failure?.let { throw it }
    }

    /** "Ver más": guarda la página sin detalle. true si quedan más. */
    suspend fun loadMore(ownerId: String, page: Int): Result<Boolean> = guard {
        val result = api.history(ownerId, page, HISTORY_PAGE_SIZE)
        dao.insertIfAbsent(result.data.map { it.toEntity(ownerId, inLatest = false, detailLoaded = false) })
        page < result.meta.totalPages
    }

    /** Detalle de una sesión que no lo tiene guardado (las de "Ver más"). */
    suspend fun loadDetail(ownerId: String, sessionId: String): Result<Unit> = guard { saveDetail(ownerId, sessionId) }

    private suspend fun saveDetail(ownerId: String, sessionId: String) {
        val detail = api.historyDetail(ownerId, sessionId).data
        dao.replaceDetail(sessionId, detail.exerciseEntities(), detail.setEntities())
    }

    override suspend fun clearUserData(ownerId: String?) {
        if (ownerId == null) dao.clearAll() else dao.clear(ownerId)
    }

    private suspend fun <T> guard(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }
}
```

  `workoutDao` se usa en la Tarea 6 (`observe`). Hasta entonces Kotlin avisa que no se usa: es esperado.

- [ ] **Paso 7: DI.** Crear `di/HistoryModule.kt`:

```kotlin
package com.fittrainer.di

import com.fittrainer.data.session.UserDataCleaner
import com.fittrainer.data.workout.history.HistoryRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** El historial es caché: se borra al cerrar sesión, como rutinas y biblioteca. */
@Module
@InstallIn(SingletonComponent::class)
abstract class HistoryModule {
    @Binds
    @IntoSet
    abstract fun bindHistoryCleaner(impl: HistoryRepository): UserDataCleaner
}
```

- [ ] **Paso 8: correr los tests.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.data.workout.history.*"`
Esperado: PASS (9 casos).

- [ ] **Paso 9: commit.**

```bash
git add mobile/app/src/main/java/com/fittrainer/data/workout/history mobile/app/src/main/java/com/fittrainer/di/HistoryModule.kt mobile/app/src/test/java/com/fittrainer
git commit -m "feat(mobile): refresco del historial con las 20 más recientes y su detalle (tarjeta 12)"
```

---

### Tarea 6: HistoryRepository — lista y detalle combinando el celular y el caché

**Archivos:**
- Modificar: `data/db/workout/WorkoutDao.kt`, `data/workout/history/HistoryRepository.kt`, `test/.../testing/fakes/workout/FakeWorkoutDao.kt`
- Crear: `data/workout/history/HistoryLocalMapper.kt`
- Test: `test/.../data/workout/history/HistoryRepositoryObserveTest.kt` (nuevo)

**Interfaces:**
- Consume: `WorkoutWithDetails` (ya existe: `session`, `exercises`, `sets`), las entidades del historial y los modelos (Tarea 5).
- Produce:
  - `WorkoutDao.observeForHistory(ownerId): Flow<List<WorkoutWithDetails>>`;
  - `HistoryRepository.observe(ownerId): Flow<List<HistoryItem>>`;
  - `HistoryRepository.observeDetail(ownerId, id): Flow<HistoryDetail?>`.

- [ ] **Paso 1: tests (fallan primero).** Crear `test/.../data/workout/history/HistoryRepositoryObserveTest.kt`:

```kotlin
package com.fittrainer.data.workout.history

import com.fittrainer.data.db.workout.FEEDBACK_PENDING
import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.sync.pendingSet
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class HistoryRepositoryObserveTest {
    private val history = FakeHistoryDao()
    private val workouts = FakeWorkoutDao()
    private val repository = HistoryRepository(FakeSessionApi(), history, workouts)

    private fun cached(id: String, startedAt: Long, owner: String = "u1", rpe: Int? = null) =
        HistorySessionEntity(id, owner, startedAt, startedAt + 3_000_000, 50, "Push", rpe, null, "Bien", false, 3, 300.0, true, true, true)

    @Test fun lasLocalesSinSubirVanArribaConSuMarca() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("a" to cached("a", 1_000)))
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(startedAt = 500)), sets = listOf(pendingSet("s1")))
        val items = repository.observe("u1").first()
        assertEquals(listOf("w1", "a"), items.map { it.id })
        assertEquals(HistoryOrigin.LOCAL_PENDING, items.first().origin)
        assertEquals(1, items.first().sets)
        assertEquals(320.0, items.first().volumeKg, 0.0)
    }

    @Test fun unaSubidaQueYaEstaEnElCacheNoSeDuplica() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("w1" to cached("w1", 1_760_695_200_000L)))
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(syncState = SYNC_SYNCED)))
        assertEquals(listOf("w1" to HistoryOrigin.SERVER), repository.observe("u1").first().map { it.id to it.origin })
    }

    @Test fun subidaPeroTodaviaSinRefrescarSeVeSinMarca() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("a" to cached("a", 1_000)))
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(syncState = SYNC_SYNCED, startedAt = 2_000)))
        assertEquals(HistoryOrigin.LOCAL_SYNCED, repository.observe("u1").first().first().origin)
    }

    @Test fun unaSubidaViejaQueSalioDeLasVeinteNoReapareceArriba() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("a" to cached("a", 9_000)))
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(syncState = SYNC_SYNCED, startedAt = 1_000)))
        assertEquals(listOf("a"), repository.observe("u1").first().map { it.id })
    }

    @Test fun elFeedbackPendienteDelCelularLeGanaAlCache() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("w1" to cached("w1", 1_760_695_200_000L, rpe = null)))
        workouts.state.value = FakeWorkoutDao.State(
            sessions = mapOf("w1" to finishedSession(syncState = SYNC_SYNCED).copy(rpe = 8, notes = "duro", feedbackState = FEEDBACK_PENDING)),
        )
        assertEquals(8, repository.observe("u1").first().single().rpe)
        assertEquals("duro", repository.observeDetail("u1", "w1").first()!!.notes)
    }

    @Test fun relojAtrasadoNoDaDuracionNegativa() = runTest {
        val session = finishedSession().let { it.copy(finishedAt = it.startedAt - 60_000) }
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to session))
        assertEquals(0, repository.observe("u1").first().single().durationMin)
    }

    @Test fun otraCuentaNoVeNadaAjeno() = runTest {
        history.state.value = FakeHistoryDao.State(sessions = mapOf("a" to cached("a", 1_000, owner = "u2")))
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession(owner = "u2")))
        assertEquals(emptyList<String>(), repository.observe("u1").first().map { it.id })
    }

    @Test fun detalleDeUnaLocalUsaSusSeriesYElPlanCopiado() = runTest {
        workouts.state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession()), sets = listOf(pendingSet("s1"), pendingSet("s2", setNumber = 2)))
        val detail = repository.observeDetail("u1", "w1").first()!!
        assertEquals(HistoryOrigin.LOCAL_PENDING, detail.item.origin)
        assertEquals(listOf(1, 2), detail.exercises.single().sets.map { it.setNumber })
    }
}
```

  El último caso necesita un ejercicio en `exercises` del fake. Si `finishedSession()` no siembra `WorkoutExerciseEntity`, el mapper local agrupa las series por `position` y usa como nombre el del ejercicio copiado o, si falta, "Ejercicio N". El test solo mira las series.

- [ ] **Paso 2: correr y ver que fallan.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.data.workout.history.HistoryRepositoryObserveTest"`
Esperado: FAIL de compilación (`observe` no existe).

- [ ] **Paso 3: consulta local.** En `WorkoutDao.kt`:

```kotlin
    /**
     * Lo que el historial suma del celular (tarjeta 12): terminadas que el caché no tiene y que no subieron
     * o son más nuevas que lo cacheado (subida sin refrescar), más las que tienen feedback sin mandar.
     */
    @Transaction
    @Query(
        "SELECT * FROM workout_sessions WHERE ownerId = :ownerId AND status = '$STATUS_FINISHED' AND (" +
            "feedbackState = '$FEEDBACK_PENDING' OR (id NOT IN (SELECT id FROM history_sessions WHERE ownerId = :ownerId) " +
            "AND (syncState != '$SYNC_SYNCED' OR startedAt > (SELECT COALESCE(MAX(startedAt), 0) FROM history_sessions " +
            "WHERE ownerId = :ownerId)))) ORDER BY startedAt DESC"
    )
    abstract fun observeForHistory(ownerId: String): Flow<List<WorkoutWithDetails>>
```

  `FakeWorkoutDao` no ve el caché del historial. Por eso, en el fake, `observeForHistory` devuelve todas las terminadas del dueño con sus detalles, y el filtro "no está en el caché / más nueva que el caché" se repite en `HistoryRepository.observe` (así se prueba con fakes y en Room es redundante pero barato):

```kotlin
    override fun observeForHistory(ownerId: String): Flow<List<WorkoutWithDetails>> = state.map { st ->
        st.sessions.values.filter { it.ownerId == ownerId && it.status == STATUS_FINISHED }
            .sortedByDescending { it.startedAt }
            .map { s -> WorkoutWithDetails(s, st.exercises.filter { it.sessionId == s.id }, st.sets.filter { it.sessionId == s.id }) }
    }
```

- [ ] **Paso 4: mapper local.** Crear `data/workout/history/HistoryLocalMapper.kt`:

```kotlin
package com.fittrainer.data.workout.history

import com.fittrainer.data.db.workout.SYNC_SYNCED
import com.fittrainer.data.db.workout.WorkoutWithDetails
import com.fittrainer.data.db.workout.history.HistorySessionEntity
import com.fittrainer.data.db.workout.history.HistoryWithDetails
import java.time.Instant

/** Volumen como el backend: reps × kg, a 1 decimal. */
private fun volume(pairs: List<Pair<Int, Double>>): Double = Math.round(pairs.sumOf { (r, kg) -> r * kg } * 10) / 10.0

/** Reloj atrasado (finishedAt < startedAt): 0 min, nunca negativo. */
private fun minutes(startedAt: Long, finishedAt: Long?): Int? = finishedAt?.let { ((it - startedAt).coerceAtLeast(0) / 60_000).toInt() }

fun WorkoutWithDetails.toHistoryItem(): HistoryItem {
    val done = sets.filter { it.actualReps > 0 }
    return HistoryItem(
        id = session.id, startedAt = Instant.ofEpochMilli(session.startedAt),
        durationMin = minutes(session.startedAt, session.finishedAt), routineName = session.routineName,
        sets = done.size, volumeKg = volume(done.map { it.actualReps to it.actualKg }), rpe = session.rpe,
        hasPr = false, hasComment = false,
        origin = if (session.syncState == SYNC_SYNCED) HistoryOrigin.LOCAL_SYNCED else HistoryOrigin.LOCAL_PENDING,
    )
}

fun WorkoutWithDetails.toHistoryDetail(): HistoryDetail = HistoryDetail(
    item = toHistoryItem(), notes = session.notes, trainerComment = null, detailLoaded = true,
    exercises = sets.groupBy { it.position }.toSortedMap().map { (position, list) ->
        val plan = exercises.firstOrNull { it.position == position }
        HistoryExercise(
            name = plan?.name ?: "Ejercicio ${position + 1}", originalName = null,
            plannedSets = plan?.sets, plannedReps = plan?.reps, plannedKg = plan?.suggestedKg, isPr = false,
            sets = list.sortedBy { it.setNumber }.map { HistorySet(it.setNumber, it.actualReps, it.actualKg) },
        )
    },
)

fun HistorySessionEntity.toHistoryItem(rpeOverride: Int?) = HistoryItem(
    id, Instant.ofEpochMilli(startedAt), durationMin, routineName, sets, volumeKg, rpeOverride ?: rpe, hasPr,
    hasComment = !trainerComment.isNullOrBlank(), origin = HistoryOrigin.SERVER,
)

fun HistoryWithDetails.toHistoryDetail(rpeOverride: Int?, notesOverride: String?) = HistoryDetail(
    item = session.toHistoryItem(rpeOverride), notes = notesOverride ?: session.notes,
    trainerComment = session.trainerComment, detailLoaded = session.detailLoaded,
    exercises = exercises.sortedBy { it.position }.map { e ->
        HistoryExercise(
            e.exerciseName, e.originalExerciseName, e.plannedSets, e.plannedReps, e.plannedKg, e.isPr,
            sets.filter { it.exercisePosition == e.position }.sortedBy { it.setNumber }.map { HistorySet(it.setNumber, it.reps, it.kg) },
        )
    },
)
```

- [ ] **Paso 5: `observe` y `observeDetail`.** En `HistoryRepository.kt` (imports: `combine`, `map`, `Flow`, `FEEDBACK_PENDING`, `SYNC_SYNCED`):

```kotlin
    /** Lista del historial: primero lo del celular que el servidor todavía no tiene, después el caché. */
    fun observe(ownerId: String): Flow<List<HistoryItem>> =
        combine(dao.observeSessions(ownerId), workoutDao.observeForHistory(ownerId)) { cached, local ->
            val cachedIds = cached.map { it.id }.toSet()
            val newestCached = cached.maxOfOrNull { it.startedAt } ?: 0L
            val feedback = local.filter { it.session.feedbackState == FEEDBACK_PENDING }.associate { it.session.id to it.session.rpe }
            val onlyLocal = local.filter {
                it.session.id !in cachedIds && (it.session.syncState != SYNC_SYNCED || it.session.startedAt > newestCached)
            }
            onlyLocal.map { it.toHistoryItem() } + cached.map { it.toHistoryItem(feedback[it.id]) }
        }

    /** Detalle: del caché si lo tiene; si no, de la sesión del celular. */
    fun observeDetail(ownerId: String, id: String): Flow<HistoryDetail?> =
        combine(dao.observeDetail(ownerId, id), workoutDao.observeForHistory(ownerId)) { cached, local ->
            val mine = local.firstOrNull { it.session.id == id }
            val pending = mine?.session?.takeIf { it.feedbackState == FEEDBACK_PENDING }
            cached?.toHistoryDetail(pending?.rpe, pending?.notes) ?: mine?.toHistoryDetail()
        }
```

- [ ] **Paso 6: correr los tests.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.data.workout.history.*"`
Esperado: PASS (los 9 de la Tarea 5 y los 8 nuevos).

- [ ] **Paso 7: test instrumentado de la consulta local.** En `androidTest/.../data/db/workout/WorkoutDaoUploadTest.kt` (o en un `WorkoutDaoHistoryTest.kt` nuevo si pasa de 200 líneas), sumar un caso sobre Room real:
  - insertar en `history_sessions` una sesión `a` con `startedAt = 5_000`;
  - insertar en `workout_sessions` tres terminadas: `p` (`PENDING`, `startedAt = 1_000`), `s` (`SYNCED`, `startedAt = 9_000`) y `v` (`SYNCED`, `startedAt = 2_000`);
  - `observeForHistory("u1").first().map { it.session.id }` tiene que ser `["s", "p"]` (la `v` está subida y es más vieja que el caché).

  Correr con `connectedDebugAndroidTest` filtrando por esa clase. Esperado: PASS.

- [ ] **Paso 8: commit.**

```bash
git add mobile/app/src/main/java/com/fittrainer/data mobile/app/src/test/java/com/fittrainer mobile/app/src/androidTest
git commit -m "feat(mobile): la lista del historial suma las sesiones del celular sin subir (tarjeta 12)"
```

---

### Tarea 7: textos del RPE y del historial

**Archivos:**
- Crear: `ui/workout/RpeTexts.kt`, `ui/workout/history/HistoryTexts.kt`
- Test: `test/.../ui/workout/RpeTextsTest.kt`, `test/.../ui/workout/history/HistoryTextsTest.kt` (nuevos)

**Interfaces:**
- Produce:
  - `rpeLabel(rpe: Int): String`;
  - `historyDate(at: Instant, zone: ZoneId): String` ("Jue 29 oct");
  - `historyLine(durationMin: Int?, sets: Int, volumeKg: Double): String`;
  - `volumeText(kg: Double): String`;
  - `setLine(set: HistorySet): String`;
  - `planLine(sets: Int?, reps: Int?, kg: Double?): String?`.

- [ ] **Paso 1: tests (fallan primero).** `RpeTextsTest.kt`:

```kotlin
package com.fittrainer.ui.workout

import org.junit.Assert.assertEquals
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

    @Test(expected = IllegalArgumentException::class)
    fun fueraDeRangoFalla() { rpeLabel(0) }
}
```

`HistoryTextsTest.kt`:

```kotlin
package com.fittrainer.ui.workout.history

import com.fittrainer.data.workout.history.HistorySet
import java.time.Instant
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class HistoryTextsTest {
    private val ar = ZoneId.of("America/Argentina/Buenos_Aires")

    @Test fun fechaCortaEnHoraArgentina() {
        assertEquals("Jue 29 oct", historyDate(Instant.parse("2026-10-30T01:00:00Z"), ar))
    }

    @Test fun lineaDeResumen() {
        assertEquals("54 min · 18 series · 4.210,5 kg", historyLine(54, 18, 4210.5))
        assertEquals("1 serie · 80 kg", historyLine(null, 1, 80.0))
    }

    @Test fun seriesConYSinKg() {
        assertEquals("S1 · 62,5 kg × 10", setLine(HistorySet(1, 10, 62.5)))
        assertEquals("S2 · 10 reps", setLine(HistorySet(2, 10, null)))
        assertEquals("S3 · 10 reps", setLine(HistorySet(3, 10, 0.0)))
    }

    @Test fun planCompletoParcialYVacio() {
        assertEquals("Plan: 4 × 10 · 60 kg", planLine(4, 10, 60.0))
        assertEquals("Plan: 4 series", planLine(4, null, null))
        assertNull(planLine(null, null, null))
    }
}
```

- [ ] **Paso 2: correr y ver que fallan.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.RpeTextsTest" --tests "com.fittrainer.ui.workout.history.HistoryTextsTest"`
Esperado: FAIL de compilación.

- [ ] **Paso 3: implementación.** `ui/workout/RpeTexts.kt`:

```kotlin
package com.fittrainer.ui.workout

/** Escala RPE con repeticiones en reserva (spec §6 de la tarjeta 12): un número solo no le dice nada a un principiante. */
private val RPE_LABELS = listOf(
    "Muy fácil, como entrar en calor", "Fácil", "Liviano, podías seguir un rato largo", "Moderado",
    "Algo exigente, te quedaban 5 o más reps", "Exigente, te quedaban 4 reps", "Difícil, te quedaban 2-3 reps",
    "Muy difícil, te quedaban 1-2 reps", "Casi al fallo, te quedaba 1 rep", "Al fallo, no salía ni una más",
)

fun rpeLabel(rpe: Int): String {
    require(rpe in 1..10) { "RPE fuera de rango: $rpe" }
    return RPE_LABELS[rpe - 1]
}
```

`ui/workout/history/HistoryTexts.kt`:

```kotlin
package com.fittrainer.ui.workout.history

import com.fittrainer.data.workout.history.HistorySet
import com.fittrainer.ui.workout.kgNumber
import java.text.NumberFormat
import java.time.Instant
import java.time.ZoneId
import java.util.Locale

private val DAYS = listOf("Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom")
private val MONTHS = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")
private val AR = Locale.Builder().setLanguage("es").setRegion("AR").build()

/** "Jue 29 oct" en la zona del celular. */
fun historyDate(at: Instant, zone: ZoneId): String {
    val d = at.atZone(zone)
    return "${DAYS[d.dayOfWeek.value - 1]} ${d.dayOfMonth} ${MONTHS[d.monthValue - 1]}"
}

/** 4210.5 → "4.210,5 kg". */
fun volumeText(kg: Double): String =
    NumberFormat.getNumberInstance(AR).apply { maximumFractionDigits = 1 }.format(kg) + " kg"

/** "54 min · 18 series · 4.210 kg"; sin duración (sesión sin cerrar) se omite. */
fun historyLine(durationMin: Int?, sets: Int, volumeKg: Double): String = listOfNotNull(
    durationMin?.let { "$it min" },
    if (sets == 1) "1 serie" else "$sets series",
    volumeText(volumeKg),
).joinToString(" · ")

/** "S1 · 62,5 kg × 10"; sin kg (o 0, peso corporal): "S1 · 10 reps". */
fun setLine(set: HistorySet): String {
    val reps = set.reps ?: 0
    val kg = set.kg?.takeIf { it > 0 }
    return if (kg == null) "S${set.setNumber} · $reps reps" else "S${set.setNumber} · ${kgNumber(kg)} kg × $reps"
}

/** "Plan: 4 × 10 · 60 kg", con lo que haya; null si no hay plan. */
fun planLine(sets: Int?, reps: Int?, kg: Double?): String? {
    val base = when {
        sets != null && reps != null -> "$sets × $reps"
        sets != null -> "$sets series"
        reps != null -> "$reps reps"
        else -> null
    }
    val load = kg?.takeIf { it > 0 }?.let { "${kgNumber(it)} kg" }
    val text = listOfNotNull(base, load).joinToString(" · ")
    return text.takeIf { it.isNotEmpty() }?.let { "Plan: $it" }
}
```

  `kgNumber` ya existe en `ui/workout/WorkoutTexts.kt` (65.0 → "65"; 62.5 → "62,5").

- [ ] **Paso 4: correr los tests.** El mismo comando del Paso 2. Esperado: PASS.

- [ ] **Paso 5: commit.**

```bash
git add mobile/app/src/main/java/com/fittrainer/ui/workout mobile/app/src/test/java/com/fittrainer/ui/workout
git commit -m "feat(mobile): etiquetas del RPE y textos del historial (tarjeta 12)"
```

---

### Tarea 8: formulario de feedback en "¡Bien ahí!"

**Archivos:**
- Crear: `ui/workout/feedback/FeedbackViewModel.kt`, `ui/workout/feedback/FeedbackForm.kt`
- Modificar: `ui/workout/components/WorkoutSummaryView.kt`
- Test: `test/.../ui/workout/feedback/FeedbackViewModelTest.kt`, `androidTest/.../ui/workout/feedback/FeedbackFormTest.kt` (nuevos)

**Interfaces:**
- Consume: `WorkoutRepository.saveFeedback`, `MAX_NOTES` (Tarea 3); `rpeLabel` (Tarea 7).
- Produce:
  - `FeedbackUiState(rpe: Int?, notes: String, saving: Boolean, error: Boolean, done: Boolean)` con `canSave`;
  - `FeedbackViewModel.onRpe(Int)`, `onNotes(String)`, `save(sessionId)`, `dismissError()`;
  - `FeedbackForm(state, onRpe, onNotes, onSave, onSkip)`.

- [ ] **Paso 1: test del ViewModel (falla primero).** `FeedbackViewModelTest.kt`:

```kotlin
package com.fittrainer.ui.workout.feedback

import com.fittrainer.data.workout.IdGenerator
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.TestClock
import com.fittrainer.testing.fakes.sync.finishedSession
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class FeedbackViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val dao = FakeWorkoutDao().apply { state.value = FakeWorkoutDao.State(sessions = mapOf("w1" to finishedSession())) }
    private val vm = FeedbackViewModel(WorkoutRepository(dao, TestClock(), IdGenerator { "id" }))

    @Test fun guardarSeHabilitaConRpeOConNota() {
        assertFalse(vm.state.value.canSave)
        vm.onNotes("  ")
        assertFalse(vm.state.value.canSave)
        vm.onRpe(7)
        assertTrue(vm.state.value.canSave)
    }

    @Test fun guardaYTermina() = runTest {
        vm.onRpe(7)
        vm.onNotes("pesado")
        vm.save("w1")
        assertTrue(vm.state.value.done)
        assertEquals(7, dao.state.value.sessions.getValue("w1").rpe)
    }

    @Test fun tocarElMismoRpeLoDesmarca() {
        vm.onRpe(7)
        vm.onRpe(7)
        assertEquals(null, vm.state.value.rpe)
    }

    @Test fun laNotaNoPasaDeMilCaracteres() {
        vm.onNotes("x".repeat(1200))
        assertEquals(1000, vm.state.value.notes.length)
    }

    @Test fun siRoomFallaMuestraErrorYNoTermina() = runTest {
        dao.failWrites = true
        vm.onRpe(5)
        vm.save("w1")
        assertTrue(vm.state.value.error)
        assertFalse(vm.state.value.done)
    }
}
```

  Confirmar el nombre y la forma de `MainDispatcherRule` en `testing/MainDispatcherRule.kt` y de `IdGenerator` (ver la nota de la Tarea 3).

- [ ] **Paso 2: correr y ver que falla.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.feedback.*"`
Esperado: FAIL de compilación.

- [ ] **Paso 3: ViewModel.** `ui/workout/feedback/FeedbackViewModel.kt`:

```kotlin
package com.fittrainer.ui.workout.feedback

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.workout.MAX_NOTES
import com.fittrainer.data.workout.WorkoutRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class FeedbackUiState(
    val rpe: Int? = null,
    val notes: String = "",
    val saving: Boolean = false,
    val error: Boolean = false,
    val done: Boolean = false,
) {
    val canSave: Boolean get() = !saving && (rpe != null || notes.isNotBlank())
}

/** Feedback post-entreno (tarjeta 12). Salteable: no guardar no bloquea nada. */
@HiltViewModel
class FeedbackViewModel @Inject constructor(private val repository: WorkoutRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedbackUiState())
    val state: StateFlow<FeedbackUiState> = _state

    /** Tocar el elegido lo desmarca. */
    fun onRpe(value: Int) = _state.update { it.copy(rpe = if (it.rpe == value) null else value) }

    fun onNotes(value: String) = _state.update { it.copy(notes = value.take(MAX_NOTES)) }

    fun dismissError() = _state.update { it.copy(error = false) }

    fun save(sessionId: String) {
        val current = _state.value
        if (!current.canSave) return
        _state.update { it.copy(saving = true, error = false) }
        viewModelScope.launch {
            try {
                repository.saveFeedback(sessionId, current.rpe, current.notes)
                _state.update { it.copy(saving = false, done = true) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(saving = false, error = true) }
            }
        }
    }
}
```

- [ ] **Paso 4: el formulario.** `ui/workout/feedback/FeedbackForm.kt`:

```kotlin
package com.fittrainer.ui.workout.feedback

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.rpeLabel

/** "¿Qué tan dura fue?": RPE 1-10 en dos filas, la etiqueta del elegido, nota opcional, Guardar y Saltar. */
@Composable
fun FeedbackForm(state: FeedbackUiState, onRpe: (Int) -> Unit, onNotes: (String) -> Unit, onSave: () -> Unit, onSkip: () -> Unit) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Spacing.md), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("¿Qué tan dura fue?", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        listOf(1..5, 6..10).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                row.forEach { n -> RpeButton(n, n == state.rpe, Modifier.weight(1f)) { onRpe(n) } }
            }
        }
        state.rpe?.let { Text("$it · ${rpeLabel(it)}", style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary) }
        OutlinedTextField(
            value = state.notes, onValueChange = onNotes, label = { Text("Nota (opcional)") },
            modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4,
        )
        Button(onClick = onSave, enabled = state.canSave, modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget)) {
            Text("Guardar")
        }
        TextButton(onClick = onSkip, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Saltar") }
    }
}

@Composable
private fun RpeButton(n: Int, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val m = modifier.heightIn(min = Spacing.minTouchTarget).semantics { this.selected = selected; contentDescription = "RPE $n" }
    if (selected) {
        Button(onClick = onClick, modifier = m, colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand)) { Text("$n") }
    } else {
        OutlinedButton(onClick = onClick, modifier = m) { Text("$n") }
    }
}
```

- [ ] **Paso 5: integrarlo en `WorkoutSummaryView`.** Reemplazar el cuerpo para incluir el formulario (y `BackHandler` = Saltar):

```kotlin
/** "Sesión terminada · N series · M min", si ya se subió y el feedback post-entreno (tarjeta 12). */
@Composable
fun WorkoutSummaryView(summary: WorkoutSummary, uploadText: String? = null, onBack: () -> Unit, feedback: FeedbackViewModel = hiltViewModel()) {
    val state by feedback.state.collectAsStateWithLifecycle()
    LaunchedEffect(state.done) { if (state.done) onBack() }
    BackHandler(onBack = onBack) // atrás = saltar
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(state.error) {
        if (state.error) {
            snackbar.showSnackbar("No pudimos guardar. Probá de nuevo")
            feedback.dismissError()
        }
    }
    Box(Modifier.fillMaxSize()) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(Spacing.lg),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(Spacing.lg, Alignment.CenterVertically),
        ) {
            Text("¡Bien ahí!", style = MaterialTheme.typography.displayMedium, color = FtColors.TextPrimary)
            Text(summaryText(summary), style = MaterialTheme.typography.bodyLarge, color = FtColors.TextSecondary)
            uploadText?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary) }
            FeedbackForm(state, feedback::onRpe, feedback::onNotes, onSave = { feedback.save(summary.sessionId) }, onSkip = onBack)
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter))
    }
}
```

  El botón "Volver a Hoy" se va: lo reemplazan Guardar y Saltar.

  Para que `WorkoutSummaryView` se pueda probar sin Hilt, el test de Compose usa `FeedbackForm` directo (Paso 6).

- [ ] **Paso 6: test de Compose.** `androidTest/.../ui/workout/feedback/FeedbackFormTest.kt`:

```kotlin
package com.fittrainer.ui.workout.feedback

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.ui.theme.FitTrainerTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FeedbackFormTest {
    @get:Rule val compose = createComposeRule()

    @Test fun tocarUnRpeMuestraSuEtiquetaYSaltarNoGuarda() {
        var state by mutableStateOf(FeedbackUiState())
        var skipped = 0
        var saved = 0
        compose.setContent {
            FitTrainerTheme {
                FeedbackForm(state, onRpe = { state = state.copy(rpe = it) }, onNotes = {}, onSave = { saved++ }, onSkip = { skipped++ })
            }
        }
        compose.onNodeWithText("Guardar").assertIsNotEnabled()
        compose.onNodeWithContentDescription("RPE 7").performClick()
        compose.onNodeWithText("7 · Difícil, te quedaban 2-3 reps").assertExists()
        compose.onNodeWithText("Saltar").performClick()
        assertEquals(1, skipped)
        assertEquals(0, saved)
    }
}
```

- [ ] **Paso 7: correr.** `gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.*"` y el instrumentado `FeedbackFormTest`. Esperado: PASS. Verificar también `checkFileLength`.

- [ ] **Paso 8: commit.**

```bash
git add mobile/app/src/main/java/com/fittrainer/ui/workout mobile/app/src/test/java/com/fittrainer/ui/workout mobile/app/src/androidTest/java/com/fittrainer/ui/workout
git commit -m "feat(mobile): RPE y nota al terminar la sesión, salteables (tarjeta 12)"
```

---

### Tarea 9: pantalla del historial en Progreso

**Archivos:**
- Crear: `ui/workout/history/HistoryUiState.kt`, `ui/workout/history/HistoryViewModel.kt`, `ui/workout/history/HistoryScreen.kt`, `ui/workout/history/components/HistoryCard.kt`
- Modificar: `navigation/RoleTabs.kt`, `navigation/RoleShell.kt`
- Test: `test/.../ui/workout/history/HistoryViewModelTest.kt` (nuevo)

**Interfaces:**
- Consume: `HistoryRepository.observe` / `refresh` / `loadMore` (Tareas 5 y 6); `historyDate`, `historyLine` (Tarea 7); `ConnectivityObserver`, `SessionRepository`.
- Produce:
  - `STUDENT_PROGRESS_ROUTE = "student/progress"` y `historyDetailRoute(id: String)`;
  - `HistoryUiState(items, isOffline, isRefreshing, refreshFailed, hasMore, loadingMore, everLoaded)`;
  - `HistoryViewModel.onStart()`, `onPullToRefresh()`, `onLoadMore()`, `dismissRefreshError()`, y `events: SharedFlow<HistoryEvent>` con `HistoryEvent.NeedsConnection`.

- [ ] **Paso 1: tests del ViewModel (fallan primero).** `HistoryViewModelTest.kt`, con `FakeSessionApi`, `FakeHistoryDao`, `FakeWorkoutDao`, `FakeConnectivityObserver` y `FakeStudentSession` (de `testing/fakes/routine/FakeTodayDeps.kt`), y `MainDispatcherRule`:

```kotlin
package com.fittrainer.ui.workout.history

import com.fittrainer.data.api.history.HistoryMetaDto
import com.fittrainer.data.api.history.HistoryPageDto
import com.fittrainer.data.api.history.HistorySummaryDto
import com.fittrainer.data.workout.history.HistoryRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.history.FakeHistoryDao
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.sync.FakeSessionApi
import com.fittrainer.testing.fakes.sync.httpError
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class HistoryViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val api = FakeSessionApi()
    private val connectivity = FakeConnectivityObserver(online = true)
    private val vm by lazy {
        HistoryViewModel(HistoryRepository(api, FakeHistoryDao(), FakeWorkoutDao()), FakeStudentSession(), connectivity)
    }

    private fun summary(id: String) = HistorySummaryDto(id, "2026-10-29T12:00:00Z", sets = 1, volumeKg = 10.0)

    @Test fun alEntrarRefrescaYMuestraLaLista() = runTest {
        api.historyPages = mapOf(1 to HistoryPageDto(listOf(summary("a")), HistoryMetaDto(1, 1, 20, 2)))
        api.details = mapOf("a" to com.fittrainer.data.api.history.HistoryDetailDto("a", "2026-10-29T12:00:00Z"))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        val state = vm.uiState.value
        assertEquals(listOf("a"), state.items.map { it.id })
        assertTrue(state.hasMore)
        assertTrue(state.everLoaded)
    }

    @Test fun sinRedNoAvisaErrorYMuestraOffline() = runTest {
        connectivity.state.value = false
        api.historyError = java.io.IOException("sin red")
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.isOffline)
        assertFalse(vm.uiState.value.refreshFailed)
    }

    @Test fun unQuinientosConRedAvisaQueNoSePudoActualizar() = runTest {
        api.historyError = httpError(503)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        vm.onStart()
        advanceUntilIdle()
        assertTrue(vm.uiState.value.refreshFailed)
    }

    @Test fun verMasSinRedEmiteNecesitaConexion() = runTest {
        connectivity.state.value = false
        val event = backgroundScope.async(UnconfinedTestDispatcher(testScheduler)) { vm.events.first() }
        vm.onLoadMore()
        advanceUntilIdle()
        assertEquals(HistoryEvent.NeedsConnection, event.await())
    }
}
```

- [ ] **Paso 2: correr y ver que fallan.**

Correr: `gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.history.HistoryViewModelTest"`
Esperado: FAIL de compilación.

- [ ] **Paso 3: estado y ViewModel.** `HistoryUiState.kt`:

```kotlin
package com.fittrainer.ui.workout.history

import com.fittrainer.data.workout.history.HistoryItem

/** everLoaded: alguna vez se bajó el historial (si no y no hay red: "Conectate una vez…"). */
data class HistoryUiState(
    val items: List<HistoryItem> = emptyList(),
    val isOffline: Boolean = false,
    val isRefreshing: Boolean = false,
    val refreshFailed: Boolean = false,
    val hasMore: Boolean = false,
    val loadingMore: Boolean = false,
    val everLoaded: Boolean = false,
)

sealed interface HistoryEvent {
    data object NeedsConnection : HistoryEvent
}
```

  `HistoryViewModel.kt`:

```kotlin
package com.fittrainer.ui.workout.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.history.HistoryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
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

/** Progreso → historial (tarjeta 12). Lee de Room; refresca al entrar y con pull. Nunca dos pedidos a la vez. */
@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val repository: HistoryRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {

    private val owner: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    private val local = MutableStateFlow(HistoryUiState())
    private val _events = MutableSharedFlow<HistoryEvent>(extraBufferCapacity = 1)
    val events: SharedFlow<HistoryEvent> = _events
    private var job: Job? = null
    private var nextPage = 2

    @OptIn(ExperimentalCoroutinesApi::class)
    val uiState: StateFlow<HistoryUiState> =
        combine(owner.filterNotNull().flatMapLatest { repository.observe(it) }, online, local) { items, isOnline, l ->
            l.copy(items = items, isOffline = !isOnline, everLoaded = l.everLoaded || items.isNotEmpty())
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HistoryUiState())

    fun onStart() = refresh()
    fun onPullToRefresh() = refresh()
    fun dismissRefreshError() = local.update { it.copy(refreshFailed = false) }

    private fun refresh() {
        if (job?.isActive == true) return
        job = viewModelScope.launch {
            val id = owner.filterNotNull().first()
            local.update { it.copy(isRefreshing = true, refreshFailed = false) }
            val result = repository.refresh(id)
            val offline = (result.exceptionOrNull() as? DataException)?.error == DataError.Offline
            if (result.isSuccess) nextPage = 2
            local.update {
                it.copy(
                    isRefreshing = false,
                    // Sin red no es un error: se ve lo guardado con el aviso de "sin conexión".
                    refreshFailed = result.isFailure && !offline,
                    everLoaded = it.everLoaded || result.isSuccess,
                    hasMore = if (result.isSuccess) repository.hasMoreAfterRefresh else it.hasMore,
                )
            }
        }
    }

    fun onLoadMore() {
        if (job?.isActive == true) return
        if (!online.value) {
            _events.tryEmit(HistoryEvent.NeedsConnection)
            return
        }
        job = viewModelScope.launch {
            val id = owner.filterNotNull().first()
            local.update { it.copy(loadingMore = true) }
            val result = repository.loadMore(id, nextPage)
            result.onSuccess { more -> nextPage++; local.update { it.copy(hasMore = more) } }
            result.onFailure { _events.tryEmit(HistoryEvent.NeedsConnection) }
            local.update { it.copy(loadingMore = false) }
        }
    }
}
```

- [ ] **Paso 4: card y pantalla.** `components/HistoryCard.kt`:

```kotlin
package com.fittrainer.ui.workout.history.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.fittrainer.data.workout.history.HistoryItem
import com.fittrainer.data.workout.history.HistoryOrigin
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.historyDate
import com.fittrainer.ui.workout.history.historyLine
import java.time.ZoneId

/** Una sesión del historial: fecha y rutina, "54 min · 18 series · 4.210 kg", RPE, 🏆, 💬 y "Sin subir". */
@Composable
fun HistoryCard(item: HistoryItem, zone: ZoneId, onClick: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(FtColors.Card).clickable(onClick = onClick)
            .heightIn(min = Spacing.minTouchTarget).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(historyDate(item.startedAt, zone), style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
            if (item.origin == HistoryOrigin.LOCAL_PENDING) Text("Sin subir", style = MaterialTheme.typography.labelMedium, color = FtColors.Amber)
        }
        Text(item.routineName ?: "Sin rutina", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        Text(historyLine(item.durationMin, item.sets, item.volumeKg), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
        val badges = listOfNotNull(item.rpe?.let { "RPE $it" }, "🏆".takeIf { item.hasPr }, "💬".takeIf { item.hasComment })
        if (badges.isNotEmpty()) Text(badges.joinToString("  "), style = MaterialTheme.typography.labelLarge, color = FtColors.TextPrimary)
    }
}
```

  `HistoryScreen.kt`: igual de estructura que `TodayScreen` (`PullToRefreshBox` + `LazyColumn`), con:
  - `LifecycleStartEffect(Unit) { viewModel.onStart(); onStopOrDispose { } }`;
  - arriba, si `isOffline`, `NoticeBanner("Sin conexión · mostrando lo guardado", onDismiss = null)` (usar el banner de `ui/components` que usa Hoy; si su firma pide `onDismiss`, pasar `{}`);
  - si `refreshFailed`, `NoticeBanner("No pudimos actualizar el historial", onDismiss = viewModel::dismissRefreshError)` con un `TextButton("Reintentar")` que llama `onPullToRefresh`;
  - lista vacía + `!everLoaded` + `isOffline`: `InfoCard("Sin historial guardado", "Conectate una vez para ver tu historial")`;
  - lista vacía y `everLoaded`: `InfoCard("Todavía no hay entrenamientos", "Cuando termines el primero, aparece acá")`;
  - `items(state.items, key = { it.id }) { HistoryCard(it, ZoneId.systemDefault()) { onOpen(it.id) } }`;
  - si `hasMore`, un `OutlinedButton("Ver más")` al final (deshabilitado con `loadingMore`);
  - un `SnackbarHost` que, al recibir `HistoryEvent.NeedsConnection`, muestra "Necesitás conexión para ver sesiones anteriores".

  La firma es `fun HistoryScreen(onOpen: (String) -> Unit, viewModel: HistoryViewModel = hiltViewModel())`. Mantenerlo por debajo de 200 líneas: si los estados vacíos lo pasan, moverlos a `components/HistoryStates.kt`.

- [ ] **Paso 5: navegación.** En `RoleTabs.kt`:

```kotlin
const val STUDENT_PROGRESS_ROUTE = "student/progress"
/** Detalle de una sesión del historial (tarjeta 12). */
const val HISTORY_DETAIL_ROUTE = "student/history/{sessionId}"
fun historyDetailRoute(sessionId: String) = "student/history/$sessionId"
```

  y en `StudentTabs`, `Tab(STUDENT_PROGRESS_ROUTE, "Progreso", Icons.Filled.Star)`. En `RoleShell.kt`, en el `when` de las pestañas:

```kotlin
                        tab.route == STUDENT_PROGRESS_ROUTE -> HistoryScreen(onOpen = { navController.navigate(historyDetailRoute(it)) })
```

  (La ruta del detalle se registra en la Tarea 10.)

- [ ] **Paso 6: correr.** `gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.history.*"` y `gradlew checkFileLength assembleDebug`. Esperado: PASS y BUILD SUCCESSFUL.

- [ ] **Paso 7: commit.**

```bash
git add mobile/app/src/main/java/com/fittrainer mobile/app/src/test/java/com/fittrainer
git commit -m "feat(mobile): historial de sesiones en la pestaña Progreso (tarjeta 12)"
```

---

### Tarea 10: detalle de una sesión

**Archivos:**
- Crear: `ui/workout/history/detail/HistoryDetailViewModel.kt`, `ui/workout/history/detail/HistoryDetailScreen.kt`, `ui/workout/history/detail/components/ExerciseBlock.kt`
- Modificar: `navigation/RoleShell.kt`
- Test: `test/.../ui/workout/history/detail/HistoryDetailViewModelTest.kt`, `androidTest/.../ui/workout/history/detail/ExerciseBlockTest.kt` (nuevos)

**Interfaces:**
- Consume: `HistoryRepository.observeDetail` / `loadDetail` (Tareas 5 y 6); `rpeLabel`, `historyDate`, `historyLine`, `setLine`, `planLine` (Tarea 7).
- Produce:
  - `HistoryDetailUiState(detail: HistoryDetail?, isOffline: Boolean, loading: Boolean, missing: Boolean)`;
  - `HistoryDetailViewModel(SavedStateHandle["sessionId"])`.

- [ ] **Paso 1: tests del ViewModel (fallan primero).** `HistoryDetailViewModelTest.kt`, con `SavedStateHandle(mapOf("sessionId" to "a"))`:
  - **con detalle guardado:** `detail.detailLoaded == true` y no se llama a `historyDetail`;
  - **sin detalle y con red:** al suscribirse llama a `loadDetail` una vez (`api.detailCalls == ["a"]`) y después `detailLoaded == true`;
  - **sin detalle y sin red:** no llama a la API; `isOffline == true`;
  - **sesión local:** sembrar `FakeWorkoutDao` con `finishedSession("w1")`, abrir `"w1"` y verificar que `detail.item.origin == LOCAL_PENDING` sin llamar a la API;
  - **id inexistente:** `missing == true`.

  Usar los mismos fakes y el mismo patrón de `backgroundScope.launch { vm.uiState.collect {} }` + `advanceUntilIdle()` que en la Tarea 9.

- [ ] **Paso 2: correr y ver que fallan.** `gradlew testDebugUnitTest --tests "com.fittrainer.ui.workout.history.detail.*"`. Esperado: FAIL de compilación.

- [ ] **Paso 3: ViewModel.**

```kotlin
package com.fittrainer.ui.workout.history.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.history.HistoryDetail
import com.fittrainer.data.workout.history.HistoryOrigin
import com.fittrainer.data.workout.history.HistoryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class HistoryDetailUiState(
    val detail: HistoryDetail? = null,
    val isOffline: Boolean = false,
    val loading: Boolean = true,
    val missing: Boolean = false,
)

/** Detalle de una sesión (tarjeta 12). Si no tiene el detalle guardado (las de "Ver más"), lo pide una vez con red. */
@HiltViewModel
class HistoryDetailViewModel @Inject constructor(
    handle: SavedStateHandle,
    private val repository: HistoryRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {
    private val sessionId: String = checkNotNull(handle["sessionId"])
    private val owner = sessionRepository.session.map { (it as? Session.Student)?.user?.id }
    private val loading = MutableStateFlow(false)
    private var requested = false

    @OptIn(ExperimentalCoroutinesApi::class)
    val uiState: StateFlow<HistoryDetailUiState> =
        combine(owner.filterNotNull().flatMapLatest { repository.observeDetail(it, sessionId).map { d -> it to d } }, connectivity.isOnline, loading) { (id, d), online, l ->
            if (d != null && !d.detailLoaded && d.item.origin == HistoryOrigin.SERVER && online && !requested) fetch(id)
            HistoryDetailUiState(d, isOffline = !online, loading = l, missing = d == null)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HistoryDetailUiState())

    private fun fetch(ownerId: String) {
        requested = true
        viewModelScope.launch {
            loading.value = true
            repository.loadDetail(ownerId, sessionId)
            loading.value = false
        }
    }
}
```

- [ ] **Paso 4: bloque de ejercicio y pantalla.** `components/ExerciseBlock.kt`:

```kotlin
package com.fittrainer.ui.workout.history.detail.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.fittrainer.data.workout.history.HistoryExercise
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.workout.history.planLine
import com.fittrainer.ui.workout.history.setLine

/** Un ejercicio del detalle: nombre (y "en lugar de …"), 🏆, el plan y las series hechas. */
@Composable
fun ExerciseBlock(exercise: HistoryExercise) {
    Column(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(FtColors.Card).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        Text(exercise.name + if (exercise.isPr) "  🏆" else "", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
        exercise.originalName?.let { Text("en lugar de $it", style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary) }
        planLine(exercise.plannedSets, exercise.plannedReps, exercise.plannedKg)?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
        }
        exercise.sets.forEach { Text(setLine(it), style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary) }
    }
}
```

  `HistoryDetailScreen(onBack: () -> Unit, viewModel: HistoryDetailViewModel = hiltViewModel())`: un `LazyColumn` con:
  - barra con "←" (`IconButton` con `Icons.AutoMirrored.Filled.ArrowBack`, `contentDescription = "Volver"`) y la fecha (`historyDate`);
  - encabezado: rutina (`"Sin rutina"` si es null), `historyLine(...)`, y si hay RPE, `"RPE $rpe · ${rpeLabel(rpe)}"`; la nota del alumno, si hay;
  - si `trainerComment` no es nulo: una card con fondo `FtColors.Brand`, título "Comentario de tu entrenador" y el texto en `FtColors.TextPrimary`;
  - si `!detail.detailLoaded`: con `isOffline`, `InfoCard("Sin detalle guardado", "El detalle de esta sesión se ve con conexión")`; con red y `loading`, un `CircularProgressIndicator`;
  - `items(detail.exercises) { ExerciseBlock(it) }`;
  - si `missing`, `InfoCard("No encontramos esta sesión", "")` y el botón Volver.

- [ ] **Paso 5: ruta.** En `RoleShell.kt`, junto a `HEALTH_ROUTE`:

```kotlin
            composable(HISTORY_DETAIL_ROUTE) {
                HistoryDetailScreen(onBack = { navController.popBackStack() })
            }
```

  El `{sessionId}` llega solo al `SavedStateHandle` (Navigation Compose copia los argumentos de la ruta).

- [ ] **Paso 6: test de Compose.** `ExerciseBlockTest.kt`: con `HistoryExercise("Press de banca", "Press con mancuernas", 4, 10, 60.0, true, listOf(HistorySet(1, 10, 62.5)))`, verificar que existen "Press de banca  🏆", "en lugar de Press con mancuernas", "Plan: 4 × 10 · 60 kg" y "S1 · 62,5 kg × 10".

- [ ] **Paso 7: correr.** Unitarios de `ui.workout.history.detail.*`, el instrumentado `ExerciseBlockTest`, y `gradlew checkFileLength assembleDebug`. Esperado: PASS y BUILD SUCCESSFUL.

- [ ] **Paso 8: commit.**

```bash
git add mobile/app/src/main/java/com/fittrainer mobile/app/src/test/java/com/fittrainer mobile/app/src/androidTest/java/com/fittrainer
git commit -m "feat(mobile): detalle de la sesión con series, plan y comentario del entrenador (tarjeta 12)"
```

---

### Tarea 11: verificación completa, E2E y documentación

**Archivos:**
- Modificar: `docs/tarjetas.md` (fila de la tarjeta 12 con el link de equipo), `docs/superpowers/specs/2026-10-30-historial-rpe-design.md` (solo si algo cambió al implementar)

- [ ] **Paso 1: todo en verde.**

Correr (desde `mobile/`): `gradlew checkFileLength assembleDebug testDebugUnitTest`
Esperado: BUILD SUCCESSFUL, 0 fallas.

Correr: `gradlew connectedDebugAndroidTest "-Pandroid.injected.androidTest.leaveApksInstalledAfterRun=true"`
Esperado: todos los instrumentados en verde (incluye la migración 6→7 y los nuevos).

- [ ] **Paso 2: E2E en el emulador con la web (criterio de aceptación).** Con el backend local corriendo y `alumno2.card9@test.com` (contraseña `Prueba1234`) con una rutina para hoy:
  1. Terminar una sesión con RPE 7 y la nota "E2E card 12". En Supabase: `select rpe, notes from sessions where id = '<id>'` → `7 | E2E card 12`. En la web, como su entrenador, el detalle de la sesión muestra RPE y nota.
  2. Comentar esa sesión desde la web. En el celular: Progreso → deslizar para refrescar → la card muestra 💬 y el detalle, el comentario en la card azul.
  3. Modo avión → cerrar y abrir la app → Progreso muestra las últimas sesiones; el detalle de una de las 20 muestra series y comentario.
  4. En modo avión, terminar otra sesión y tocar **Saltar** → aparece arriba con "Sin subir". Sacar el modo avión → sube (logcat `okhttp`) → refrescar Progreso → la misma sesión, sin la marca y sin duplicarse.
  5. Terminar una sesión, esperar a que suba (sin tocar nada) y recién después guardar RPE 9 → en Supabase `rpe = 9` (salió por `PATCH`).

  Anotar capturas y la consulta en el comentario "🛠️ CLAUDE · Lista para auditar" de la tarjeta.

- [ ] **Paso 3: documentación.** En `docs/tarjetas.md`, la fila de la tarjeta 12 con su link de equipo (`https://trello.com/c/r0It9lo1`), el spec y el plan.

- [ ] **Paso 4: commit.**

```bash
git add docs/tarjetas.md docs/superpowers
git commit -m "docs: spec y plan de la tarjeta 12 (historial y feedback post-entreno)"
```
