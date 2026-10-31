# Logros, rachas y desafíos (mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El alumno ve su racha (Hoy y Progreso), sus medallas con progreso y sus desafíos, y recibe una celebración al desbloquear un logro, también en modo avión.

**Architecture:** `GamificationRepository` refresca desde `GET /students/:id/achievements/progress` y `GET /students/:id/challenges` a Room (v10) y expone un `GamificationSummary` que suma la cuenta local (sesiones cerradas después de la última foto del servidor, racha con el día de Buenos Aires). Las celebraciones son filas de Room (`celebrations`): las crean la evaluación local, el sync (`unlocked_achievements`) y el refresco (lo otorgado por el job diario). Un `CelebrationHost` en el `RoleShell` del alumno las muestra fuera de la sesión activa.

**Tech Stack:** Kotlin, Jetpack Compose (Material 3), Hilt, Room (KSP, schemas exportados), Retrofit + kotlinx.serialization, coroutines/Flow, JUnit4 + fakes en memoria.

**Spec:** `docs/superpowers/specs/2026-10-31-logros-rachas-desafios-design.md` §3–§6 (el backend de §2 lo cubre `2026-10-31-logros-backend.md`).

## Global Constraints

- Worktree `C:\Users\igna_\Desktop\fittrainer-logros`, rama `feature/android-logros` (sale de `feature/android-graficos` + merge de `feature/android-mis-rutinas`, Task 0). Gradle desde `mobile/`.
- **Los agentes no commitean** (ni `git add`); el merge del Task 0 queda sin commitear (`--no-commit`).
- Ningún archivo de código (tests incluidos) pasa de **200 líneas físicas** (`./gradlew checkFileLength`). Lo que se divide va en una carpeta propia.
- Orden capa → módulo → archivo; los tests copian el árbol de `src/main`.
- **Room es la única fuente de verdad:** ninguna pantalla ni ViewModel llama a Retrofit.
- Tema oscuro, colores de `FtColors` (racha `Coral`, logros `Green`, bloqueados `Ink5`/`TextSecondary`), espacios de `Spacing`, toque mínimo `Spacing.minTouchTarget`.
- Textos en español rioplatense; fechas y días con la zona `America/Argentina/Buenos_Aires` (`BUSINESS_ZONE`), nunca la del teléfono para la racha.
- Comentarios en español, con la densidad del código vecino (KDoc corto que explica el porqué).
- **Nunca se celebra de más:** ante la duda la cuenta local cuenta de menos (spec §3.3).
- Hoy y Mis rutinas no cambian de comportamiento: `TodayViewModel` y `RoutinesViewModel` no se tocan; sus tests pasan sin modificarse.
- Cierre: `./gradlew checkFileLength assembleDebug testDebugUnitTest` en verde y sin warnings nuevos.

## Review Focus

- Sesión cerrada sin red justo después de una foto vieja: la racha y el progreso suman la sesión y la celebración aparece al salir de la sesión, aunque el servidor no sepa nada.
- Sesión que terminó antes de la foto pero todavía no subió: **no** se suma (contaría doble cuando suba).
- El mismo logro llega por la evaluación local y después por el sync y por el refresco: se celebra una sola vez.
- Primera foto después de loguearse (con logros viejos desbloqueados): no festeja nada.
- Logout con un refresco o un sync en vuelo: no quedan filas del dueño anterior ni celebraciones para la cuenta nueva.

---

### Task 0: Worktree (lo hace el controller, no un subagente)

Requiere que Igna haya commiteado la tarjeta 13 en `feature/android-graficos` y "Mis rutinas" en `feature/android-mis-rutinas`.

- [ ] `git worktree add -b feature/android-logros C:/Users/igna_/Desktop/fittrainer-logros feature/android-graficos`
- [ ] En el worktree: `git merge --no-commit --no-ff feature/android-mis-rutinas`. Conflicto esperado en `RoleShell.kt`: queda la versión de "Mis rutinas" (rutas de detalle y biblioteca, `openWorkout`, salida de la sesión con guarda por `entry.id`) con `ProgressScreen(onOpen = ...)` de la 13 en la pestaña Progreso (en lugar de `HistoryScreen`), y el import de `ProgressScreen` en lugar del de `HistoryScreen`. Resolver otros conflictos uniendo los dos lados.
- [ ] Copiar `mobile/local.properties` desde `fittrainer-graficos`, y el spec y los dos planes desde `fittrainer-gamification-progress/docs/superpowers/`.
- [ ] `./gradlew checkFileLength assembleDebug testDebugUnitTest` en verde antes del Task 1 (línea de base).

---

### Task 1: API (DTOs) y `unlocked_achievements` en el contrato de sesiones

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/api/gamification/GamificationApi.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/api/gamification/GamificationDtos.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/data/api/SessionApi.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/di/NetworkModule.kt`
- Modify: `mobile/app/src/test/java/com/fittrainer/testing/fakes/sync/FakeSessionApi.kt` y los `object : SessionApi by api` que sobreescriben `create` (en `test/.../data/sync/syncpass/`)
- Test: `mobile/app/src/test/java/com/fittrainer/data/api/gamification/GamificationDtosTest.kt`

**Interfaces:**
- Produces: `GamificationApi.progress(studentId): AchievementsProgressResponse`, `GamificationApi.challenges(studentId): StudentChallengesResponse`; DTOs de abajo; `SessionApi.create(...): CreateSessionResponse`; `SessionSetsResult.unlockedAchievements`; `UnlockedAchievementDto(code, name, category)`.

- [ ] **Step 1: Write the failing test**

```kotlin
package com.fittrainer.data.api.gamification

import com.fittrainer.data.api.CreateSessionResponse
import com.fittrainer.data.api.SessionSetsResponse
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GamificationDtosTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test fun leeElProgresoComoLoMandaElBackend() {
        val body = """
            {"data":{"streak":{"current_streak_days":6,"longest_streak_days":9,"last_session_date":"2026-10-30"},
             "facts":{"sessions_count":3,"longest_streak":9,"pr_sessions":1,"full_weeks":0},
             "achievements":[{"id":"a1","code":"SESSIONS_10","name":"10 sesiones","description":"d","category":"milestone",
               "icon_url":null,"criteria_type":"sessions_count","current":3,"target":10,"unlocked_at":null}]}}
        """.trimIndent()
        val dto = json.decodeFromString<AchievementsProgressResponse>(body).data
        assertEquals(6, dto.streak.currentDays)
        assertEquals("2026-10-30", dto.streak.lastSessionDate)
        assertEquals(1, dto.facts.prSessions)
        assertEquals("sessions_count", dto.achievements.single().criteriaType)
        assertNull(dto.achievements.single().unlockedAt)
    }

    @Test fun leeLosDesafiosDelAlumno() {
        val body = """
            {"data":[{"id":"sc1","challenge":{"id":"c1","name":"12 sesiones en 30 días","description":null,
              "goal_type":"sessions_count","goal_value":12,"duration_days":30,"reward_achievement_id":null},
              "started_at":"2026-10-01T10:00:00.123456+00:00","ends_at":"2026-10-31T10:00:00+00:00",
              "current_progress":3,"goal_value":12,"progress_pct":25,"status":"active","completed_at":null}]}
        """.trimIndent()
        val dto = json.decodeFromString<StudentChallengesResponse>(body).data.single()
        assertEquals("12 sesiones en 30 días", dto.challenge.name)
        assertEquals(25.0, dto.progressPct, 0.0)
        assertEquals("active", dto.status)
    }

    @Test fun leeUnlockedAchievementsDelSyncYLosTomaVaciosSiFaltan() {
        val created = json.decodeFromString<CreateSessionResponse>(
            """{"data":{"id":"s1","unlocked_achievements":[{"code":"FIRST_SESSION","name":"Primera sesión","category":"milestone"}]}}""",
        )
        assertEquals("FIRST_SESSION", created.data.unlockedAchievements.single().code)
        val sets = json.decodeFromString<SessionSetsResponse>("""{"data":{"saved":[],"failed":[]}}""")
        assertEquals(emptyList<Any>(), sets.data.unlockedAchievements)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.api.gamification.GamificationDtosTest"`
Expected: FAIL de compilación (no existen los DTOs).

- [ ] **Step 3: Write the implementation**

`GamificationDtos.kt`:

```kotlin
package com.fittrainer.data.api.gamification

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** GET /students/:id/achievements/progress (tarjeta 15): racha, datos y progreso de cada logro del catálogo. */
@Serializable
data class AchievementsProgressResponse(val data: AchievementsProgressDto)

@Serializable
data class AchievementsProgressDto(val streak: StreakDto, val facts: FactsDto, val achievements: List<AchievementProgressDto>)

@Serializable
data class StreakDto(
    @SerialName("current_streak_days") val currentDays: Int,
    @SerialName("longest_streak_days") val longestDays: Int,
    @SerialName("last_session_date") val lastSessionDate: String? = null,
)

@Serializable
data class FactsDto(
    @SerialName("sessions_count") val sessionsCount: Int,
    @SerialName("longest_streak") val longestStreak: Int,
    @SerialName("pr_sessions") val prSessions: Int,
    @SerialName("full_weeks") val fullWeeks: Int,
)

@Serializable
data class AchievementProgressDto(
    val id: String,
    val code: String,
    val name: String,
    val description: String? = null,
    val category: String? = null,
    @SerialName("criteria_type") val criteriaType: String? = null,
    val current: Int,
    val target: Int,
    @SerialName("unlocked_at") val unlockedAt: String? = null,
)

/** GET /students/:id/challenges: las asignaciones del alumno, la más nueva primero. */
@Serializable
data class StudentChallengesResponse(val data: List<StudentChallengeDto>)

@Serializable
data class StudentChallengeDto(
    val id: String,
    val challenge: ChallengeDto,
    @SerialName("started_at") val startedAt: String,
    @SerialName("ends_at") val endsAt: String,
    @SerialName("current_progress") val currentProgress: Double,
    @SerialName("goal_value") val goalValue: Double,
    @SerialName("progress_pct") val progressPct: Double,
    val status: String,
    @SerialName("completed_at") val completedAt: String? = null,
)

@Serializable
data class ChallengeDto(
    val id: String,
    val name: String,
    val description: String? = null,
    @SerialName("goal_type") val goalType: String? = null,
)
```

`GamificationApi.kt`:

```kotlin
package com.fittrainer.data.api.gamification

import retrofit2.http.GET
import retrofit2.http.Path

/** Gamificación del alumno (cliente principal: Bearer + refresh transparente). */
interface GamificationApi {
    @GET("students/{studentId}/achievements/progress")
    suspend fun progress(@Path("studentId") studentId: String): AchievementsProgressResponse

    @GET("students/{studentId}/challenges")
    suspend fun challenges(@Path("studentId") studentId: String): StudentChallengesResponse
}
```

`SessionApi.kt`: agregar, debajo de `UpdateSessionRequest`:

```kotlin
/** Logro recién desbloqueado que devuelve el backend al cerrar una sesión o sumarle series (tarjeta 15). */
@Serializable
data class UnlockedAchievementDto(val code: String, val name: String, val category: String? = null)

/** POST /sessions: de la sesión creada solo interesan los logros desbloqueados (el resto se ignora). */
@Serializable
data class CreatedSessionDto(
    @SerialName("unlocked_achievements") val unlockedAchievements: List<UnlockedAchievementDto> = emptyList(),
)

@Serializable
data class CreateSessionResponse(val data: CreatedSessionDto = CreatedSessionDto())
```

`SessionSetsResult` pasa a:

```kotlin
@Serializable
data class SessionSetsResult(
    val saved: List<SavedSetDto> = emptyList(),
    val failed: List<FailedSetDto> = emptyList(),
    @SerialName("unlocked_achievements") val unlockedAchievements: List<UnlockedAchievementDto> = emptyList(),
)
```

y `create` devuelve la respuesta:

```kotlin
    @POST("sessions")
    suspend fun create(@Tag owner: RequiredUser, @Body body: CreateSessionRequest): CreateSessionResponse
```

`NetworkModule.kt`: un provider como los demás:

```kotlin
    @Provides
    @Singleton
    fun provideGamificationApi(client: OkHttpClient, json: Json): GamificationApi =
        retrofit(client, json).create(GamificationApi::class.java)
```

(con la misma anotación de scope que usan los providers vecinos; si ellos no llevan `@Singleton`, tampoco este).

`FakeSessionApi.kt`: agregar

```kotlin
    /** Logros que devuelven create y addSets (como unlocked_achievements). */
    var unlockedOnCreate: List<UnlockedAchievementDto> = emptyList()
    var unlockedOnSets: List<UnlockedAchievementDto> = emptyList()
```

`create` termina con `return CreateSessionResponse(CreatedSessionDto(unlockedOnCreate))` (declarando el tipo de retorno), y el `SessionSetsResult(...)` de `addSets` suma `unlockedAchievements = unlockedOnSets`. En los tests que hacen `object : SessionApi by api { override suspend fun create(...) { ... } }`, el override declara `: CreateSessionResponse` y devuelve `api.create(owner, body)` donde antes lo llamaba, o `CreateSessionResponse()` si no lo llamaba (el comportamiento de cada test no cambia).

- [ ] **Step 4: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest`
Expected: PASS (todo, incluidos los tests de sync existentes).

- [ ] **Step 5: Checkpoint** — sin commit.

---

### Task 2: Room v10 (tablas, DAO y migración)

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/db/gamification/GamificationEntities.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/db/gamification/GamificationDao.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/data/db/FitTrainerDatabase.kt` (4 entidades, `version = 10`, `AutoMigration(from = 9, to = 10)`, `gamificationDao()`)
- Modify: `mobile/app/src/main/java/com/fittrainer/di/DatabaseModule.kt` (`provideGamificationDao`)
- Create (generado por el build): `mobile/app/schemas/com.fittrainer.data.db.FitTrainerDatabase/10.json`
- Create: `mobile/app/src/androidTest/java/com/fittrainer/data/db/migration/MigrationTo10Test.kt`
- Create: `mobile/app/src/test/java/com/fittrainer/testing/fakes/gamification/FakeGamificationDao.kt`

**Interfaces:**
- Produces: entidades `GamificationSnapshotEntity`, `AchievementProgressEntity`, `StudentChallengeEntity`, `CelebrationEntity`; constantes `CELEBRATION_PENDING`/`CELEBRATION_SHOWN`; `GamificationDao` con los métodos de abajo; `FakeGamificationDao` (estado en `state: MutableStateFlow<State>`).

- [ ] **Step 1: Entities**

```kotlin
package com.fittrainer.data.db.gamification

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

const val CELEBRATION_PENDING = "PENDING"
const val CELEBRATION_SHOWN = "SHOWN"

/** Última foto del servidor (GET .../achievements/progress). fetchedAt: reloj del celular, el mismo que finishedAt (spec §3.3). */
@Entity(tableName = "gamification_snapshot")
data class GamificationSnapshotEntity(
    @PrimaryKey val ownerId: String,
    val currentStreak: Int,
    val longestStreak: Int,
    /** "YYYY-MM-DD" (día de Buenos Aires) o null si nunca cerró una sesión. */
    val lastSessionDate: String?,
    val sessionsCount: Int,
    val prSessions: Int,
    val fullWeeks: Int,
    val fetchedAt: Long,
)

/** Un logro del catálogo con el progreso de la foto. position: orden del servidor. */
@Entity(tableName = "achievement_progress", primaryKeys = ["ownerId", "code"])
data class AchievementProgressEntity(
    val ownerId: String,
    val code: String,
    val achievementId: String,
    val name: String,
    val description: String?,
    val category: String?,
    val criteriaType: String?,
    val current: Int,
    val target: Int,
    val unlockedAt: Long?,
    val position: Int,
)

@Entity(tableName = "student_challenges", indices = [Index("ownerId")])
data class StudentChallengeEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val name: String,
    val description: String?,
    val goalType: String?,
    val goalValue: Double,
    val currentProgress: Double,
    val progressPct: Double,
    val status: String,
    val startedAt: Long,
    val endsAt: Long,
    val completedAt: Long?,
)

/** Una fila por logro y cuenta: si ya existe (pendiente o mostrada) nadie la vuelve a crear, así no se celebra dos veces. */
@Entity(tableName = "celebrations", primaryKeys = ["ownerId", "code"])
data class CelebrationEntity(
    val ownerId: String,
    val code: String,
    val name: String,
    val description: String?,
    val category: String?,
    val state: String,
    val createdAt: Long,
)
```

- [ ] **Step 2: DAO**

```kotlin
package com.fittrainer.data.db.gamification

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import com.fittrainer.data.db.workout.STATUS_FINISHED
import kotlinx.coroutines.flow.Flow

/** Caché de gamificación (tarjeta 15). Todo por dueño; se borra en el logout. */
@Dao
abstract class GamificationDao {
    @Query("SELECT * FROM gamification_snapshot WHERE ownerId = :ownerId")
    abstract fun observeSnapshot(ownerId: String): Flow<GamificationSnapshotEntity?>

    @Query("SELECT * FROM gamification_snapshot WHERE ownerId = :ownerId")
    abstract suspend fun snapshot(ownerId: String): GamificationSnapshotEntity?

    @Query("SELECT * FROM achievement_progress WHERE ownerId = :ownerId ORDER BY position")
    abstract fun observeAchievements(ownerId: String): Flow<List<AchievementProgressEntity>>

    @Query("SELECT * FROM achievement_progress WHERE ownerId = :ownerId ORDER BY position")
    abstract suspend fun achievements(ownerId: String): List<AchievementProgressEntity>

    @Query("SELECT * FROM student_challenges WHERE ownerId = :ownerId ORDER BY startedAt DESC, id DESC")
    abstract fun observeChallenges(ownerId: String): Flow<List<StudentChallengeEntity>>

    /** Cierres de las sesiones terminadas del celular: las posteriores a la foto son las "extras" (spec §3.3). */
    @Query("SELECT finishedAt FROM workout_sessions WHERE ownerId = :ownerId AND status = '$STATUS_FINISHED' AND finishedAt IS NOT NULL")
    abstract fun observeFinishedAt(ownerId: String): Flow<List<Long>>

    @Query("SELECT finishedAt FROM workout_sessions WHERE ownerId = :ownerId AND status = '$STATUS_FINISHED' AND finishedAt IS NOT NULL")
    abstract suspend fun finishedAt(ownerId: String): List<Long>

    @Query("SELECT * FROM celebrations WHERE ownerId = :ownerId AND state = '$CELEBRATION_PENDING' ORDER BY createdAt, code")
    abstract fun observePending(ownerId: String): Flow<List<CelebrationEntity>>

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    abstract suspend fun insertCelebrations(rows: List<CelebrationEntity>)

    @Query("UPDATE celebrations SET state = '$CELEBRATION_SHOWN' WHERE ownerId = :ownerId AND code IN (:codes)")
    abstract suspend fun markShown(ownerId: String, codes: List<String>)

    @Upsert
    abstract suspend fun upsertSnapshot(snapshot: GamificationSnapshotEntity)

    @Insert
    abstract suspend fun insertAchievements(rows: List<AchievementProgressEntity>)

    @Insert
    abstract suspend fun insertChallenges(rows: List<StudentChallengeEntity>)

    @Query("DELETE FROM gamification_snapshot WHERE ownerId = :ownerId")
    abstract suspend fun deleteSnapshot(ownerId: String)

    @Query("DELETE FROM achievement_progress WHERE ownerId = :ownerId")
    abstract suspend fun deleteAchievements(ownerId: String)

    @Query("DELETE FROM student_challenges WHERE ownerId = :ownerId")
    abstract suspend fun deleteChallenges(ownerId: String)

    @Query("DELETE FROM celebrations WHERE ownerId = :ownerId")
    abstract suspend fun deleteCelebrations(ownerId: String)

    @Query("DELETE FROM gamification_snapshot")
    abstract suspend fun deleteAllSnapshots()

    @Query("DELETE FROM achievement_progress")
    abstract suspend fun deleteAllAchievements()

    @Query("DELETE FROM student_challenges")
    abstract suspend fun deleteAllChallenges()

    @Query("DELETE FROM celebrations")
    abstract suspend fun deleteAllCelebrations()

    /** Reemplaza la foto, los logros y los desafíos de la cuenta (las celebraciones no se tocan). */
    @Transaction
    open suspend fun replace(
        snapshot: GamificationSnapshotEntity,
        achievements: List<AchievementProgressEntity>,
        challenges: List<StudentChallengeEntity>,
    ) {
        deleteAchievements(snapshot.ownerId)
        deleteChallenges(snapshot.ownerId)
        upsertSnapshot(snapshot)
        insertAchievements(achievements)
        insertChallenges(challenges)
    }

    @Transaction
    open suspend fun clear(ownerId: String) {
        deleteSnapshot(ownerId)
        deleteAchievements(ownerId)
        deleteChallenges(ownerId)
        deleteCelebrations(ownerId)
    }

    @Transaction
    open suspend fun clearAll() {
        deleteAllSnapshots()
        deleteAllAchievements()
        deleteAllChallenges()
        deleteAllCelebrations()
    }

    @Transaction
    open suspend fun inTransaction(block: suspend () -> Unit) = block()
}
```

- [ ] **Step 3: Base de datos y módulo** — en `FitTrainerDatabase` sumar las cuatro entidades al final de `entities`, `version = 10`, `AutoMigration(from = 9, to = 10)` al final de `autoMigrations` y `abstract fun gamificationDao(): GamificationDao`. En `DatabaseModule`:

```kotlin
    @Provides
    fun provideGamificationDao(db: FitTrainerDatabase): GamificationDao = db.gamificationDao()
```

- [ ] **Step 4: Fake del DAO** (`test/.../testing/fakes/gamification/FakeGamificationDao.kt`)

```kotlin
package com.fittrainer.testing.fakes.gamification

import com.fittrainer.data.db.gamification.AchievementProgressEntity
import com.fittrainer.data.db.gamification.CELEBRATION_PENDING
import com.fittrainer.data.db.gamification.CELEBRATION_SHOWN
import com.fittrainer.data.db.gamification.CelebrationEntity
import com.fittrainer.data.db.gamification.GamificationDao
import com.fittrainer.data.db.gamification.GamificationSnapshotEntity
import com.fittrainer.data.db.gamification.StudentChallengeEntity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update

/** Room en memoria para la gamificación. `finished`: cierres de sesiones del celular por dueño (la tabla de workout). */
class FakeGamificationDao : GamificationDao() {
    data class State(
        val snapshots: Map<String, GamificationSnapshotEntity> = emptyMap(),
        val achievements: List<AchievementProgressEntity> = emptyList(),
        val challenges: List<StudentChallengeEntity> = emptyList(),
        val finished: Map<String, List<Long>> = emptyMap(),
        val celebrations: List<CelebrationEntity> = emptyList(),
    )

    val state = MutableStateFlow(State())

    private fun achievementsOf(s: State, ownerId: String) = s.achievements.filter { it.ownerId == ownerId }.sortedBy { it.position }
    private fun pendingOf(s: State, ownerId: String) =
        s.celebrations.filter { it.ownerId == ownerId && it.state == CELEBRATION_PENDING }.sortedWith(compareBy({ it.createdAt }, { it.code }))

    override fun observeSnapshot(ownerId: String) = state.map { it.snapshots[ownerId] }.distinctUntilChanged()
    override suspend fun snapshot(ownerId: String) = state.value.snapshots[ownerId]
    override fun observeAchievements(ownerId: String) = state.map { achievementsOf(it, ownerId) }.distinctUntilChanged()
    override suspend fun achievements(ownerId: String) = achievementsOf(state.value, ownerId)
    override fun observeChallenges(ownerId: String) = state.map { s ->
        s.challenges.filter { it.ownerId == ownerId }.sortedWith(compareByDescending<StudentChallengeEntity> { it.startedAt }.thenByDescending { it.id })
    }.distinctUntilChanged()
    override fun observeFinishedAt(ownerId: String) = state.map { it.finished[ownerId].orEmpty() }.distinctUntilChanged()
    override suspend fun finishedAt(ownerId: String) = state.value.finished[ownerId].orEmpty()
    override fun observePending(ownerId: String) = state.map { pendingOf(it, ownerId) }.distinctUntilChanged()

    override suspend fun insertCelebrations(rows: List<CelebrationEntity>) = state.update { s ->
        val keys = s.celebrations.map { it.ownerId to it.code }.toMutableSet()
        s.copy(celebrations = s.celebrations + rows.filter { keys.add(it.ownerId to it.code) })
    }

    override suspend fun markShown(ownerId: String, codes: List<String>) = state.update { s ->
        s.copy(celebrations = s.celebrations.map { if (it.ownerId == ownerId && it.code in codes) it.copy(state = CELEBRATION_SHOWN) else it })
    }

    override suspend fun upsertSnapshot(snapshot: GamificationSnapshotEntity) =
        state.update { it.copy(snapshots = it.snapshots + (snapshot.ownerId to snapshot)) }
    override suspend fun insertAchievements(rows: List<AchievementProgressEntity>) = state.update { it.copy(achievements = it.achievements + rows) }
    override suspend fun insertChallenges(rows: List<StudentChallengeEntity>) = state.update { it.copy(challenges = it.challenges + rows) }
    override suspend fun deleteSnapshot(ownerId: String) = state.update { it.copy(snapshots = it.snapshots - ownerId) }
    override suspend fun deleteAchievements(ownerId: String) = state.update { s -> s.copy(achievements = s.achievements.filterNot { it.ownerId == ownerId }) }
    override suspend fun deleteChallenges(ownerId: String) = state.update { s -> s.copy(challenges = s.challenges.filterNot { it.ownerId == ownerId }) }
    override suspend fun deleteCelebrations(ownerId: String) = state.update { s -> s.copy(celebrations = s.celebrations.filterNot { it.ownerId == ownerId }) }
    override suspend fun deleteAllSnapshots() = state.update { it.copy(snapshots = emptyMap()) }
    override suspend fun deleteAllAchievements() = state.update { it.copy(achievements = emptyList()) }
    override suspend fun deleteAllChallenges() = state.update { it.copy(challenges = emptyList()) }
    override suspend fun deleteAllCelebrations() = state.update { it.copy(celebrations = emptyList()) }
}
```

- [ ] **Step 5: Test de migración** (instrumentado; con el mismo `MigrationTestHelper` y la misma configuración que `FitTrainerDatabaseMigrationTest`, en un archivo propio porque aquel ya está cerca de 200 líneas):

```kotlin
    @Test fun migra9a10ConservandoLasSesionesYConLasTablasDeGamificacionVacias() {
        helper.createDatabase(DB, 9).apply {
            execSQL("INSERT INTO history_sessions (id, ownerId, startedAt, hasModifications, sets, volumeKg, hasPr, inLatest, detailLoaded) VALUES ('h1', 'u1', 1, 0, 3, 300.0, 0, 1, 1)")
            close()
        }
        val db = helper.runMigrationsAndValidate(DB, 10, true)
        db.query("SELECT COUNT(*) FROM history_sessions").use { it.moveToFirst(); assertEquals(1, it.getInt(0)) }
        for (table in listOf("gamification_snapshot", "achievement_progress", "student_challenges", "celebrations")) {
            db.query("SELECT COUNT(*) FROM $table").use { it.moveToFirst(); assertEquals(0, it.getInt(0)) }
        }
    }
```

- [ ] **Step 6: Verificación**

Run: `./gradlew assembleDebug assembleDebugAndroidTest testDebugUnitTest checkFileLength`
Expected: compila, se genera `schemas/.../10.json`, tests JVM en verde. (El test instrumentado se corre en el E2E con emulador.)

- [ ] **Step 7: Checkpoint** — sin commit.

---

### Task 3: Modelos y reglas puras (racha local, cuenta local, resumen)

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/gamification/GamificationModels.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/gamification/GamificationSyncHook.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/gamification/LocalStreak.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/gamification/LocalCounts.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/gamification/LocalStreakTest.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/gamification/LocalCountsTest.kt`

**Interfaces:**
- Produces: modelos de abajo; `BUSINESS_ZONE`, `businessDate(millis)`; `localStreak(snapshot, trainedDays, assignedDays, today): LocalStreak`; `localCounts(snapshot, finishedAt, assignedDays, today): LocalCounts`; `Achievement.localCurrent(counts)`; `localUnlocks(achievements, counts)`; `buildSummary(...)`; interfaz `GamificationSyncHook` (con `None`).

- [ ] **Step 1: Modelos e interfaz** (sin test propio: los cubren los de abajo)

`GamificationModels.kt`:

```kotlin
package com.fittrainer.data.gamification

import java.time.Instant
import java.time.LocalDate

/** Tipos de criterio que el celular cuenta por su cuenta (spec §3.3); el resto solo lo otorga el servidor. */
const val CRITERIA_SESSIONS = "sessions_count"
const val CRITERIA_STREAK = "streak"
const val CRITERIA_CHALLENGE = "challenge"

/** Lo último que mandó el servidor. fetchedAt: reloj del celular al recibirlo. */
data class Snapshot(
    val currentStreak: Int,
    val longestStreak: Int,
    val lastSessionDate: LocalDate?,
    val sessionsCount: Int,
    val prSessions: Int,
    val fullWeeks: Int,
    val fetchedAt: Long,
)

/** Un logro del catálogo con el progreso de la foto. */
data class Achievement(
    val code: String,
    val name: String,
    val description: String?,
    val category: String?,
    val criteriaType: String?,
    val current: Int,
    val target: Int,
    val unlockedAt: Instant?,
)

/** Logro para mostrar: progreso con la cuenta local. awaitingSync = llegó al objetivo y el servidor todavía no lo otorgó. */
data class AchievementView(val achievement: Achievement, val current: Int, val awaitingSync: Boolean) {
    val unlocked: Boolean get() = achievement.unlockedAt != null
}

data class Challenge(
    val id: String,
    val name: String,
    val description: String?,
    val goalType: String?,
    val goalValue: Double,
    val currentProgress: Double,
    val progressPct: Double,
    val status: String,
    val startedAt: Instant,
    val endsAt: Instant,
    val completedAt: Instant?,
)

/** La gamificación de la cuenta ya con la cuenta local (racha, progreso de sesiones y racha). */
data class GamificationSummary(
    val currentStreak: Int,
    val longestStreak: Int,
    val prSessions: Int,
    val fullWeeks: Int,
    val achievements: List<AchievementView>,
    val challenges: List<Challenge>,
    val fetchedAt: Instant,
)

/** Logro recién desbloqueado según el servidor (unlocked_achievements del sync). */
data class UnlockedAchievement(val code: String, val name: String, val category: String?)

/** Celebración pendiente de mostrar. */
data class Celebration(val code: String, val name: String, val description: String?, val category: String?)
```

`GamificationSyncHook.kt`:

```kotlin
package com.fittrainer.data.gamification

/** Lo que el sync le avisa a la gamificación (spec §3.2 y §3.4). None: los tests de sync que no la miran. */
interface GamificationSyncHook {
    /** El servidor devolvió logros recién desbloqueados al subir una sesión. */
    suspend fun onUnlocked(ownerId: String, unlocked: List<UnlockedAchievement>)

    /** Terminó una pasada que subió al menos una sesión: hay que refrescar la foto. */
    suspend fun afterUploads(ownerId: String)

    object None : GamificationSyncHook {
        override suspend fun onUnlocked(ownerId: String, unlocked: List<UnlockedAchievement>) = Unit
        override suspend fun afterUploads(ownerId: String) = Unit
    }
}
```

- [ ] **Step 2: Write the failing tests**

`LocalStreakTest.kt` (el 30/10/2026 es viernes):

```kotlin
package com.fittrainer.data.gamification

import java.time.DayOfWeek.FRIDAY
import java.time.DayOfWeek.MONDAY
import java.time.DayOfWeek.WEDNESDAY
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Test

class LocalStreakTest {
    private fun d(day: Int) = LocalDate.of(2026, 10, day)
    private fun snap(current: Int, longest: Int, last: Int?) = Snapshot(current, longest, last?.let(::d), 0, 0, 0, 0L)
    private val all = emptySet<java.time.DayOfWeek>()

    @Test fun sinExtrasYSinCorteDevuelveLaFoto() =
        assertEquals(LocalStreak(3, 5), localStreak(snap(3, 5, 29), emptyList(), all, d(30)))

    @Test fun hoyNoCortaAunqueTodaviaNoSeEntreno() =
        assertEquals(LocalStreak(3, 5), localStreak(snap(3, 5, 29), emptyList(), setOf(FRIDAY), d(30)))

    @Test fun elDiaSiguienteSumaUno() =
        assertEquals(LocalStreak(4, 5), localStreak(snap(3, 5, 29), listOf(d(30)), all, d(30)))

    @Test fun elMismoDiaDeLaFotoNoSuma() =
        assertEquals(LocalStreak(3, 5), localStreak(snap(3, 5, 30), listOf(d(30), d(30)), all, d(30)))

    @Test fun unDiaAsignadoSinEntrenarEnElMedioVuelveAUno() =
        assertEquals(LocalStreak(1, 5), localStreak(snap(3, 5, 26), listOf(d(30)), setOf(MONDAY, WEDNESDAY, FRIDAY), d(30)))

    @Test fun losDiasNoAsignadosNoCortan() =
        assertEquals(LocalStreak(4, 5), localStreak(snap(3, 5, 26), listOf(d(28)), setOf(MONDAY, WEDNESDAY, FRIDAY), d(28)))

    @Test fun entrenarUnDiaNoAsignadoSuma() =
        assertEquals(LocalStreak(4, 5), localStreak(snap(3, 5, 26), listOf(d(27)), setOf(MONDAY), d(27)))

    @Test fun sinRutinaTodosLosDiasSonAsignados() =
        assertEquals(LocalStreak(1, 5), localStreak(snap(3, 5, 26), listOf(d(28)), all, d(28)))

    @Test fun variasExtrasSeguidasSumanYActualizanLaMejor() =
        assertEquals(LocalStreak(6, 6), localStreak(snap(4, 4, 27), listOf(d(29), d(28)), all, d(29)))

    @Test fun sinFotoDeUltimoDiaLaPrimeraExtraDejaUno() =
        assertEquals(LocalStreak(1, 1), localStreak(snap(0, 0, null), listOf(d(30)), all, d(30)))

    @Test fun cortadaSinExtrasLaActualEsCeroYLaMejorNoCambia() =
        assertEquals(LocalStreak(0, 5), localStreak(snap(3, 5, 26), emptyList(), all, d(29)))

    @Test fun lasExtrasPosterioresAHoySeIgnoran() =
        assertEquals(LocalStreak(3, 5), localStreak(snap(3, 5, 29), listOf(d(31)), all, d(30)))

    @Test fun elDiaLoDefineBuenosAiresNoElTelefono() {
        // 2026-10-31T02:30Z son las 23:30 del 30 en Buenos Aires.
        assertEquals(d(30), businessDate(java.time.Instant.parse("2026-10-31T02:30:00Z").toEpochMilli()))
    }
}
```

`LocalCountsTest.kt`:

```kotlin
package com.fittrainer.data.gamification

import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalCountsTest {
    private val fetchedAt = Instant.parse("2026-10-30T12:00:00Z").toEpochMilli() // 09:00 AR del viernes 30
    private val today = LocalDate.of(2026, 10, 30)
    private val snapshot = Snapshot(6, 6, LocalDate.of(2026, 10, 29), 9, 2, 1, fetchedAt)

    private fun achievement(code: String, type: String?, current: Int, target: Int, unlocked: Boolean = false) =
        Achievement(code, code, null, null, type, current, target, if (unlocked) Instant.EPOCH else null)

    @Test fun soloSumanLasSesionesQueCerraronDespuesDeLaFoto() {
        val counts = localCounts(snapshot, listOf(fetchedAt - 1_000, fetchedAt + 1_000), emptySet(), today)
        assertEquals(10, counts.sessions)
        assertEquals(LocalStreak(7, 7), counts.streak)
    }

    @Test fun sinExtrasEsLaFoto() {
        val counts = localCounts(snapshot, listOf(fetchedAt - 1_000), emptySet(), today)
        assertEquals(9, counts.sessions)
        assertEquals(LocalStreak(6, 6), counts.streak)
    }

    @Test fun elProgresoLocalUsaSesionesYLaRachaMasLargaRecortados() {
        val counts = LocalCounts(sessions = 12, streak = LocalStreak(current = 2, longest = 8))
        assertEquals(10, achievement("S10", CRITERIA_SESSIONS, 9, 10).localCurrent(counts))
        assertEquals(7, achievement("ST7", CRITERIA_STREAK, 6, 7).localCurrent(counts))
        assertEquals(0, achievement("PR", "pr_count", 0, 1).localCurrent(counts))
        assertEquals(4, achievement("FW", "full_week", 4, 4, unlocked = true).localCurrent(counts))
    }

    @Test fun localUnlocksSoloDevuelveSesionesYRachaBloqueadosQueLlegaron() {
        val counts = LocalCounts(sessions = 10, streak = LocalStreak(7, 7))
        val list = listOf(
            achievement("S10", CRITERIA_SESSIONS, 9, 10),
            achievement("S50", CRITERIA_SESSIONS, 9, 50),
            achievement("ST7", CRITERIA_STREAK, 6, 7),
            achievement("FIRST", CRITERIA_SESSIONS, 1, 1, unlocked = true),
            achievement("PR", "pr_count", 1, 1),
        )
        assertEquals(listOf("S10", "ST7"), localUnlocks(list, counts).map { it.code })
    }

    @Test fun elResumenMarcaLoQueEsperaAlServidor() {
        val achievements = listOf(achievement("ST7", CRITERIA_STREAK, 6, 7), achievement("FIRST", CRITERIA_SESSIONS, 1, 1, unlocked = true))
        val summary = buildSummary(snapshot, achievements, emptyList(), listOf(fetchedAt + 1_000), emptySet(), today)
        assertEquals(7, summary.currentStreak)
        assertEquals(2, summary.prSessions)
        val streak = summary.achievements.first()
        assertEquals(7, streak.current)
        assertTrue(streak.awaitingSync)
        assertFalse(summary.achievements[1].awaitingSync)
    }
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.gamification.*"`
Expected: FAIL de compilación.

- [ ] **Step 4: Write the implementation**

`LocalStreak.kt`:

```kotlin
package com.fittrainer.data.gamification

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** El día que vale para la racha lo define Buenos Aires, igual que el backend (ADR 0005), no la zona del teléfono. */
val BUSINESS_ZONE: ZoneId = ZoneId.of("America/Argentina/Buenos_Aires")

fun businessDate(millis: Long): LocalDate = Instant.ofEpochMilli(millis).atZone(BUSINESS_ZONE).toLocalDate()

data class LocalStreak(val current: Int, val longest: Int)

/**
 * Racha con las sesiones que la foto no conoce (spec §3.3). Parte de la foto y recorre en orden los días
 * entrenados posteriores a su último día: suma 1, o vuelve a 1 si en el medio quedó un día asignado sin entrenar.
 * Al final, si entre el último día entrenado y hoy hay uno asignado sin entrenar, la racha actual es 0.
 * [assignedDays] vacío = sin rutina: todos los días son asignados.
 */
fun localStreak(snapshot: Snapshot, trainedDays: Collection<LocalDate>, assignedDays: Set<DayOfWeek>, today: LocalDate): LocalStreak {
    val assigned = assignedDays.ifEmpty { DayOfWeek.entries.toSet() }
    var current = snapshot.currentStreak
    var longest = snapshot.longestStreak
    var last = snapshot.lastSessionDate
    for (day in trainedDays.filter { it <= today }.toSortedSet()) {
        if (last != null && day <= last) continue
        current = if (last == null || assignedBetween(last, day, assigned)) 1 else current + 1
        longest = maxOf(longest, current)
        last = day
    }
    if (last != null && assignedBetween(last, today, assigned)) current = 0
    return LocalStreak(current, longest)
}

/** ¿Hay un día asignado estrictamente entre [from] y [to]? Los entrenados ya se recorrieron, así que quedó sin entrenar. */
private fun assignedBetween(from: LocalDate, to: LocalDate, assigned: Set<DayOfWeek>): Boolean {
    var day = from.plusDays(1)
    var checked = 0
    // Una semana alcanza: con algún día asignado, siete días seguidos siempre lo incluyen.
    while (day < to && checked < 7) {
        if (day.dayOfWeek in assigned) return true
        day = day.plusDays(1)
        checked++
    }
    return false
}
```

`LocalCounts.kt`:

```kotlin
package com.fittrainer.data.gamification

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate

/** La cuenta local: sesiones (foto + extras) y racha. */
data class LocalCounts(val sessions: Int, val streak: LocalStreak)

/**
 * Una sesión llega al servidor recién terminada, así que las que cerraron después de la foto seguro no están en ella
 * (spec §3.3). Las anteriores que todavía no subieron no se suman: se cuenta de menos, nunca de más.
 */
fun localCounts(snapshot: Snapshot, finishedAt: List<Long>, assignedDays: Set<DayOfWeek>, today: LocalDate): LocalCounts {
    val extras = finishedAt.filter { it > snapshot.fetchedAt }
    return LocalCounts(snapshot.sessionsCount + extras.size, localStreak(snapshot, extras.map(::businessDate), assignedDays, today))
}

/** Progreso con la cuenta local: sesiones y racha más larga (como el longestStreak del backend); el resto, el de la foto. */
fun Achievement.localCurrent(counts: LocalCounts): Int = when {
    unlockedAt != null -> target
    criteriaType == CRITERIA_SESSIONS -> minOf(target, maxOf(current, counts.sessions))
    criteriaType == CRITERIA_STREAK -> minOf(target, maxOf(current, counts.streak.longest))
    else -> current
}

/** Logros que la cuenta local da por cumplidos y el servidor todavía no otorgó (solo los que el celular sabe contar). */
fun localUnlocks(achievements: List<Achievement>, counts: LocalCounts): List<Achievement> = achievements.filter {
    it.unlockedAt == null && (it.criteriaType == CRITERIA_SESSIONS || it.criteriaType == CRITERIA_STREAK) && it.localCurrent(counts) >= it.target
}

fun buildSummary(
    snapshot: Snapshot,
    achievements: List<Achievement>,
    challenges: List<Challenge>,
    finishedAt: List<Long>,
    assignedDays: Set<DayOfWeek>,
    today: LocalDate,
): GamificationSummary {
    val counts = localCounts(snapshot, finishedAt, assignedDays, today)
    return GamificationSummary(
        currentStreak = counts.streak.current,
        longestStreak = counts.streak.longest,
        prSessions = snapshot.prSessions,
        fullWeeks = snapshot.fullWeeks,
        achievements = achievements.map { a ->
            val current = a.localCurrent(counts)
            AchievementView(a, current, awaitingSync = a.unlockedAt == null && current >= a.target)
        },
        challenges = challenges,
        fetchedAt = Instant.ofEpochMilli(snapshot.fetchedAt),
    )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.gamification.*"`
Expected: PASS.

- [ ] **Step 6: Checkpoint** — sin commit.

---

### Task 4: `GamificationRepository` (refresco, resumen, limpieza) y mapper

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/gamification/GamificationMapper.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/gamification/GamificationRepository.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/di/GamificationModule.kt`
- Create: `mobile/app/src/test/java/com/fittrainer/testing/fakes/gamification/FakeGamificationApi.kt`
- Create: `mobile/app/src/test/java/com/fittrainer/testing/fakes/gamification/GamificationFixtures.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/gamification/GamificationRepositoryTest.kt`

**Interfaces:**
- Consumes: Task 1 (API/DTOs), Task 2 (DAO), Task 3 (modelos, `buildSummary`, `GamificationSyncHook`); `RoutineRepository.observeCache(ownerId)`.
- Produces: `GamificationRepository` con `observeSummary(ownerId): Flow<GamificationSummary?>`, `refresh(ownerId): Result<Unit>`, `clearUserData`; en el Task 5 suma `observePending`, `evaluationTriggers`, `evaluateLocal`, `markShown` y la implementación de `GamificationSyncHook`.

- [ ] **Step 1: Fixtures y fake de la API**

`GamificationFixtures.kt`:

```kotlin
package com.fittrainer.testing.fakes.gamification

import com.fittrainer.data.api.gamification.AchievementProgressDto
import com.fittrainer.data.api.gamification.AchievementsProgressDto
import com.fittrainer.data.api.gamification.ChallengeDto
import com.fittrainer.data.api.gamification.FactsDto
import com.fittrainer.data.api.gamification.StreakDto
import com.fittrainer.data.api.gamification.StudentChallengeDto

fun achievementDto(code: String, type: String, current: Int, target: Int, unlockedAt: String? = null) =
    AchievementProgressDto(id = "id-$code", code = code, name = "Logro $code", description = "Descripción $code",
        category = if (type == "streak") "streak" else "milestone", criteriaType = type, current = current, target = target, unlockedAt = unlockedAt)

/** Fecha vieja de desbloqueo (anterior a cualquier foto de los tests). */
const val OLD_UNLOCK = "2026-10-01T10:00:00+00:00"

/**
 * Catálogo chico: una de cada tipo que importa para la cuenta local. Como el servidor, lo que ya llegó a su meta
 * viene desbloqueado (con [OLD_UNLOCK]) salvo que [unlocked] diga otra fecha.
 */
fun catalog(sessions: Int = 0, longest: Int = 0, unlocked: Map<String, String> = emptyMap()): List<AchievementProgressDto> {
    fun dto(code: String, type: String, current: Int, target: Int) =
        achievementDto(code, type, current, target, unlocked[code] ?: OLD_UNLOCK.takeIf { current >= target })
    return listOf(
        dto("FIRST_SESSION", "sessions_count", minOf(sessions, 1), 1),
        dto("SESSIONS_10", "sessions_count", minOf(sessions, 10), 10),
        dto("STREAK_7_DAYS", "streak", minOf(longest, 7), 7),
        achievementDto("FIRST_PR", "pr_count", 0, 1, unlocked["FIRST_PR"]),
        achievementDto("CHALLENGE_DONE", "challenge", 0, 1, unlocked["CHALLENGE_DONE"]),
    )
}

fun progressDto(sessions: Int = 0, current: Int = 0, longest: Int = 0, last: String? = null, unlocked: Map<String, String> = emptyMap()) =
    AchievementsProgressDto(
        streak = StreakDto(current, longest, last),
        facts = FactsDto(sessions, longest, 0, 0),
        achievements = catalog(sessions, longest, unlocked),
    )

fun challengeDto(id: String = "sc1", status: String = "active", current: Double = 3.0, goal: Double = 12.0) = StudentChallengeDto(
    id = id, challenge = ChallengeDto("c-$id", "12 sesiones en 30 días", null, "sessions_count"),
    startedAt = "2026-10-20T10:00:00+00:00", endsAt = "2026-11-19T10:00:00+00:00",
    currentProgress = current, goalValue = goal, progressPct = current / goal * 100, status = status,
)
```

`FakeGamificationApi.kt`:

```kotlin
package com.fittrainer.testing.fakes.gamification

import com.fittrainer.data.api.gamification.AchievementsProgressDto
import com.fittrainer.data.api.gamification.AchievementsProgressResponse
import com.fittrainer.data.api.gamification.GamificationApi
import com.fittrainer.data.api.gamification.StudentChallengeDto
import com.fittrainer.data.api.gamification.StudentChallengesResponse
import kotlinx.coroutines.CompletableDeferred

/** Backend en memoria de la gamificación. `gate`: el pedido de progreso queda "volando" hasta completarla. */
class FakeGamificationApi : GamificationApi {
    var progress: AchievementsProgressDto = progressDto()
    var challenges: List<StudentChallengeDto> = emptyList()
    var error: Throwable? = null
    var gate: CompletableDeferred<Unit>? = null
    var progressCalls = 0
    /** Corre mientras "vuela" el pedido de progreso (p. ej. el logout en medio del refresco). */
    var onProgress: () -> Unit = {}

    override suspend fun progress(studentId: String): AchievementsProgressResponse {
        progressCalls++
        onProgress()
        gate?.await()
        error?.let { throw it }
        return AchievementsProgressResponse(progress)
    }

    override suspend fun challenges(studentId: String): StudentChallengesResponse {
        error?.let { throw it }
        return StudentChallengesResponse(challenges)
    }
}
```

- [ ] **Step 2: Write the failing test**

```kotlin
package com.fittrainer.data.gamification

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.Session
import com.fittrainer.testing.fakes.gamification.FakeGamificationApi
import com.fittrainer.testing.fakes.gamification.FakeGamificationDao
import com.fittrainer.testing.fakes.gamification.challengeDto
import com.fittrainer.testing.fakes.gamification.progressDto
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import java.io.IOException
import java.time.Instant
import javax.inject.Provider
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GamificationRepositoryTest {
    private val api = FakeGamificationApi()
    private val dao = FakeGamificationDao()
    private val session = FakeStudentSession()
    private val clock = StepClock(Instant.parse("2026-10-30T15:00:00Z"))
    private val repo = GamificationRepository(api, dao, RoutineRepository(FakeRoutineApi(), FakeRoutineDao(), clock), Provider { session }, clock)

    @Test fun sinFotoElResumenEsNull() = runTest { assertNull(repo.observeSummary("u1").first()) }

    @Test fun refrescaFotoLogrosYDesafios() = runTest {
        api.progress = progressDto(sessions = 3, current = 2, longest = 4, last = "2026-10-29")
        api.challenges = listOf(challengeDto())
        assertTrue(repo.refresh("u1").isSuccess)
        val summary = repo.observeSummary("u1").first()!!
        assertEquals(2, summary.currentStreak)
        assertEquals(listOf("FIRST_SESSION", "SESSIONS_10", "STREAK_7_DAYS", "FIRST_PR", "CHALLENGE_DONE"), summary.achievements.map { it.achievement.code })
        assertEquals(3, summary.achievements[1].current)
        assertEquals("12 sesiones en 30 días", summary.challenges.single().name)
        assertEquals(clock.millis(), dao.state.value.snapshots.getValue("u1").fetchedAt)
    }

    @Test fun siFallaLaRedRoomQuedaComoEstaba() = runTest {
        repo.refresh("u1")
        api.progress = progressDto(sessions = 5)
        api.error = IOException("sin red")
        val result = repo.refresh("u1")
        assertEquals(DataError.Offline, (result.exceptionOrNull() as DataException).error)
        assertEquals(0, dao.state.value.snapshots.getValue("u1").sessionsCount)
    }

    @Test fun dosRefrescosJuntosHacenUnSoloPedido() = runTest {
        val gate = CompletableDeferred<Unit>().also { api.gate = it }
        val first = async { repo.refresh("u1") }
        val second = async { repo.refresh("u1") }
        testScheduler.runCurrent()
        gate.complete(Unit)
        assertTrue(first.await().isSuccess && second.await().isSuccess)
        assertEquals(1, api.progressCalls)
    }

    @Test fun unRefrescoQueVolabaDuranteElLogoutNoEscribe() = runTest {
        api.onProgress = { session.session.value = Session.LoggedOut }
        assertTrue(repo.refresh("u1").isFailure)
        assertNull(dao.state.value.snapshots["u1"])
    }

    @Test fun laPrimeraFotoNoCelebraLoViejo() = runTest {
        api.progress = progressDto(sessions = 1, unlocked = mapOf("FIRST_SESSION" to "2026-10-01T10:00:00+00:00"))
        repo.refresh("u1")
        assertEquals(emptyList<Any>(), dao.state.value.celebrations)
    }

    @Test fun laSiguienteFotoCelebraLoOtorgadoDespuesDeLaAnterior() = runTest {
        repo.refresh("u1")
        clock.now = clock.now.plusSeconds(3_600)
        api.progress = progressDto(
            sessions = 1,
            unlocked = mapOf("FIRST_SESSION" to "2026-10-30T15:30:00+00:00", "FIRST_PR" to "2026-10-01T10:00:00+00:00"),
        )
        repo.refresh("u1")
        assertEquals(listOf("FIRST_SESSION"), dao.state.value.celebrations.map { it.code })
    }

    @Test fun elLogoutBorraTodoLoDeLaCuenta() = runTest {
        repo.refresh("u1")
        repo.clearUserData("u1")
        assertEquals(FakeGamificationDao.State(), dao.state.value)
    }
}
```

(Si `FakeRoutineApi` o `Session.LoggedOut` tienen otro nombre en el repo, usar el equivalente de `RoutineRepositoryOwnerTest` / `ProgressRepositoryRaceTest`.)

- [ ] **Step 3: Run test to verify it fails**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.gamification.GamificationRepositoryTest"`
Expected: FAIL de compilación.

- [ ] **Step 4: Write the implementation**

`GamificationMapper.kt`:

```kotlin
package com.fittrainer.data.gamification

import com.fittrainer.data.api.UnlockedAchievementDto
import com.fittrainer.data.api.gamification.AchievementProgressDto
import com.fittrainer.data.api.gamification.AchievementsProgressDto
import com.fittrainer.data.api.gamification.StudentChallengeDto
import com.fittrainer.data.db.gamification.AchievementProgressEntity
import com.fittrainer.data.db.gamification.CELEBRATION_PENDING
import com.fittrainer.data.db.gamification.CelebrationEntity
import com.fittrainer.data.db.gamification.GamificationSnapshotEntity
import com.fittrainer.data.db.gamification.StudentChallengeEntity
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime

/** Supabase manda "+00:00" y microsegundos: OffsetDateTime los acepta, igual que "Z". */
private fun millis(raw: String?): Long? = raw?.let { runCatching { OffsetDateTime.parse(it).toInstant().toEpochMilli() }.getOrNull() }

fun AchievementsProgressDto.toSnapshotEntity(ownerId: String, fetchedAt: Long) = GamificationSnapshotEntity(
    ownerId, streak.currentDays, streak.longestDays, streak.lastSessionDate, facts.sessionsCount, facts.prSessions, facts.fullWeeks, fetchedAt,
)

fun AchievementProgressDto.toEntity(ownerId: String, position: Int) = AchievementProgressEntity(
    ownerId, code, id, name, description, category, criteriaType, current, target, millis(unlockedAt), position,
)

fun StudentChallengeDto.toEntity(ownerId: String) = StudentChallengeEntity(
    id, ownerId, challenge.name, challenge.description, challenge.goalType, goalValue, currentProgress, progressPct, status,
    millis(startedAt) ?: 0L, millis(endsAt) ?: 0L, millis(completedAt),
)

fun GamificationSnapshotEntity.toDomain() = Snapshot(
    currentStreak, longestStreak, lastSessionDate?.let { runCatching { LocalDate.parse(it) }.getOrNull() },
    sessionsCount, prSessions, fullWeeks, fetchedAt,
)

fun AchievementProgressEntity.toDomain() =
    Achievement(code, name, description, category, criteriaType, current, target, unlockedAt?.let(Instant::ofEpochMilli))

fun StudentChallengeEntity.toDomain() = Challenge(
    id, name, description, goalType, goalValue, currentProgress, progressPct, status,
    Instant.ofEpochMilli(startedAt), Instant.ofEpochMilli(endsAt), completedAt?.let(Instant::ofEpochMilli),
)

fun AchievementProgressEntity.toCelebration(now: Long) = CelebrationEntity(ownerId, code, name, description, category, CELEBRATION_PENDING, now)

fun CelebrationEntity.toDomain() = Celebration(code, name, description, category)

fun UnlockedAchievementDto.toDomain() = UnlockedAchievement(code, name, category)
```

`GamificationRepository.kt` (el Task 5 le suma los métodos de celebración; tiene que quedar ≤ 200 líneas):

```kotlin
package com.fittrainer.data.gamification

import com.fittrainer.data.api.gamification.GamificationApi
import com.fittrainer.data.auth.AccountChangedException
import com.fittrainer.data.db.gamification.GamificationDao
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.repository.toDataError
import com.fittrainer.data.routine.RoutineCache
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.session.UserDataCleaner
import java.time.Clock
import java.time.DayOfWeek
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Logros, racha y desafíos (tarjeta 15). Refresca Room desde la API y expone el resumen con la cuenta local
 * (spec §3.3): el ViewModel nunca ve Retrofit.
 */
@Singleton
class GamificationRepository @Inject constructor(
    private val api: GamificationApi,
    private val dao: GamificationDao,
    private val routines: RoutineRepository,
    /** Provider: la sesión depende de los UserDataCleaner (este repositorio entre ellos) y Hilt no admite el ciclo. */
    private val sessionProvider: Provider<SessionRepository>,
    private val clock: Clock,
) : UserDataCleaner {

    private val mutex = Mutex()

    /** Cuántos refrescos buenos hubo y de quién fue el último: quien esperaba el Mutex no repite uno recién hecho. */
    @Volatile private var successCount = 0L
    @Volatile private var successOwner: String? = null

    /** Sube con cada limpieza: un pedido que arrancó antes del logout no escribe aunque el token siga. */
    @Volatile private var clearGeneration = 0

    /** null: la cuenta nunca trajo la gamificación. */
    fun observeSummary(ownerId: String): Flow<GamificationSummary?> = combine(
        dao.observeSnapshot(ownerId),
        dao.observeAchievements(ownerId),
        dao.observeChallenges(ownerId),
        dao.observeFinishedAt(ownerId),
        routines.observeCache(ownerId),
    ) { snapshot, achievements, challenges, finished, cache ->
        snapshot?.let {
            buildSummary(it.toDomain(), achievements.map { a -> a.toDomain() }, challenges.map { c -> c.toDomain() }, finished, cache.assignedDays(), today())
        }
    }

    /** Si falla, Room queda como estaba y el error viaja en un [DataException]. Un pedido a la vez (Hoy, Progreso y el sync). */
    suspend fun refresh(ownerId: String): Result<Unit> {
        val seen = successCount
        return mutex.withLock {
            if (successCount != seen && successOwner == ownerId) return@withLock Result.success(Unit)
            guard { fetch(ownerId) }.onSuccess {
                successOwner = ownerId
                successCount++
            }
        }
    }

    private suspend fun fetch(ownerId: String) {
        val gen = clearGeneration
        val (progress, challenges) = coroutineScope {
            val p = async { api.progress(ownerId).data }
            val c = async { api.challenges(ownerId).data }
            p.await() to c.await()
        }
        val now = clock.millis()
        val achievements = progress.achievements.mapIndexed { i, dto -> dto.toEntity(ownerId, i) }
        // Chequeo y escritura en la misma transacción: clearUserData no puede colarse entre los dos.
        dao.inTransaction {
            checkOwner(ownerId, gen)
            val previous = dao.snapshot(ownerId)
            dao.replace(progress.toSnapshotEntity(ownerId, now), achievements, challenges.map { it.toEntity(ownerId) })
            // Lo que otorgó el servidor por su cuenta desde la foto anterior (job diario, spec §3.4 caso 3).
            // La primera foto de la cuenta no festeja: sería celebrar lo viejo al instalar o loguearse.
            if (previous != null) {
                val fresh = achievements.filter { a -> a.unlockedAt?.let { it > previous.fetchedAt } == true }
                dao.insertCelebrations(fresh.map { it.toCelebration(now) })
            }
        }
    }

    override suspend fun clearUserData(ownerId: String?) {
        clearGeneration++
        successOwner = null
        if (ownerId == null) dao.clearAll() else dao.clear(ownerId)
    }

    private fun today(): LocalDate = businessDate(clock.millis())

    /** Una respuesta que volaba durante el logout (o un cambio de cuenta) no escribe filas del dueño anterior. */
    private suspend fun checkOwner(ownerId: String, gen: Int) {
        val current = (sessionProvider.get().session.first() as? Session.Student)?.user?.id
        if (current != ownerId || gen != clearGeneration) throw AccountChangedException()
    }

    private suspend fun <T> guard(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }
}

/** Unión de los días de las rutinas activas guardadas; vacía = sin rutina (todos los días cuentan). */
internal fun RoutineCache.assignedDays(): Set<DayOfWeek> = routines.flatMap { it.days }.toSet()
```

`GamificationModule.kt`:

```kotlin
package com.fittrainer.di

import com.fittrainer.data.gamification.GamificationRepository
import com.fittrainer.data.session.UserDataCleaner
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.multibindings.IntoSet

/** La gamificación se borra al cerrar sesión, como el historial y el progreso. */
@Module
@InstallIn(SingletonComponent::class)
abstract class GamificationModule {
    @Binds
    @IntoSet
    abstract fun bindGamificationCleaner(impl: GamificationRepository): UserDataCleaner
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.gamification.*"`
Expected: PASS.

- [ ] **Step 6: Checkpoint** — `./gradlew assembleDebug checkFileLength`. Sin commit.

---

### Task 5: Celebraciones en el repositorio (evaluación local, sync, mostrar)

**Files:**
- Modify: `mobile/app/src/main/java/com/fittrainer/data/gamification/GamificationRepository.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/di/GamificationModule.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/gamification/GamificationCelebrationTest.kt`

**Interfaces:**
- Produces: `observePending(ownerId): Flow<List<Celebration>>`; `evaluationTriggers(ownerId): Flow<Unit>` (emite cuando cambian la foto o las sesiones terminadas); `evaluateLocal(ownerId)`; `markShown(ownerId, codes)`; `GamificationRepository : GamificationSyncHook` (`onUnlocked`, `afterUploads`), ligado en `GamificationModule`.

- [ ] **Step 1: Write the failing test**

```kotlin
package com.fittrainer.data.gamification

import com.fittrainer.data.db.gamification.CELEBRATION_SHOWN
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.Session
import com.fittrainer.testing.fakes.gamification.FakeGamificationApi
import com.fittrainer.testing.fakes.gamification.FakeGamificationDao
import com.fittrainer.testing.fakes.gamification.progressDto
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import java.time.Instant
import javax.inject.Provider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class GamificationCelebrationTest {
    private val api = FakeGamificationApi()
    private val dao = FakeGamificationDao()
    private val session = FakeStudentSession()
    // Viernes 30/10 12:00 AR.
    private val clock = StepClock(Instant.parse("2026-10-30T15:00:00Z"))
    private val repo = GamificationRepository(api, dao, RoutineRepository(FakeRoutineApi(), FakeRoutineDao(), clock), Provider { session }, clock)
    private val fetchedAt get() = dao.state.value.snapshots.getValue("u1").fetchedAt

    private fun finish(vararg at: Long) = dao.state.update { it.copy(finished = mapOf("u1" to at.toList())) }
    private fun codes() = dao.state.value.celebrations.map { it.code }

    @Test fun sinFotoNoEvaluaNada() = runTest {
        finish(clock.millis())
        repo.evaluateLocal("u1")
        assertEquals(emptyList<String>(), codes())
    }

    @Test fun unaSesionDespuesDeLaFotoCompletaLasDiezSesiones() = runTest {
        api.progress = progressDto(sessions = 9)
        repo.refresh("u1")
        finish(fetchedAt - 1_000)
        repo.evaluateLocal("u1")
        assertEquals(emptyList<String>(), codes())
        finish(fetchedAt - 1_000, fetchedAt + 1_000)
        repo.evaluateLocal("u1")
        assertEquals(listOf("SESSIONS_10"), codes())
    }

    @Test fun elSeptimoDiaCelebraLaRachaSinRed() = runTest {
        api.progress = progressDto(sessions = 6, current = 6, longest = 6, last = "2026-10-29")
        repo.refresh("u1")
        finish(fetchedAt + 60_000)
        repo.evaluateLocal("u1")
        assertEquals(listOf("STREAK_7_DAYS"), codes())
    }

    @Test fun noSeCelebraDosVecesNiLoQueElCelularNoSabeContar() = runTest {
        api.progress = progressDto(sessions = 9)
        repo.refresh("u1")
        finish(fetchedAt + 1_000)
        repo.evaluateLocal("u1")
        repo.evaluateLocal("u1")
        repo.onUnlocked("u1", listOf(UnlockedAchievement("SESSIONS_10", "10 sesiones", "milestone")))
        assertEquals(listOf("SESSIONS_10"), codes())
    }

    @Test fun elSyncAnotaLosDelServidorConLaDescripcionDelCatalogo() = runTest {
        repo.refresh("u1")
        repo.onUnlocked("u1", listOf(UnlockedAchievement("FIRST_PR", "Primer récord", "pr")))
        val row = dao.state.value.celebrations.single()
        assertEquals("Descripción FIRST_PR", row.description)
        assertEquals(listOf(Celebration("FIRST_PR", "Primer récord", "Descripción FIRST_PR", "pr")), repo.observePending("u1").first())
    }

    @Test fun elSyncDeOtraCuentaNoAnotaNada() = runTest {
        session.session.value = Session.LoggedOut
        repo.onUnlocked("u1", listOf(UnlockedAchievement("FIRST_PR", "Primer récord", "pr")))
        assertEquals(emptyList<String>(), codes())
    }

    @Test fun mostrarLasDejaComoVistas() = runTest {
        repo.refresh("u1")
        repo.onUnlocked("u1", listOf(UnlockedAchievement("FIRST_PR", "Primer récord", "pr")))
        repo.markShown("u1", listOf("FIRST_PR"))
        assertEquals(CELEBRATION_SHOWN, dao.state.value.celebrations.single().state)
        assertEquals(emptyList<Celebration>(), repo.observePending("u1").first())
    }

    @Test fun despuesDeSubirRefresca() = runTest {
        repo.afterUploads("u1")
        assertEquals(1, api.progressCalls)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.gamification.GamificationCelebrationTest"`
Expected: FAIL de compilación.

- [ ] **Step 3: Write the implementation** — en `GamificationRepository`: la clase pasa a `: UserDataCleaner, GamificationSyncHook`, y se suman (imports: `CelebrationEntity`, `CELEBRATION_PENDING`, `kotlinx.coroutines.flow.map`):

```kotlin
    fun observePending(ownerId: String): Flow<List<Celebration>> = dao.observePending(ownerId).map { rows -> rows.map { it.toDomain() } }

    /** Emite cuando cambian la foto o las sesiones terminadas del celular: es cuando la cuenta local puede cumplir algo. */
    fun evaluationTriggers(ownerId: String): Flow<Unit> =
        combine(dao.observeSnapshot(ownerId), dao.observeFinishedAt(ownerId)) { _, _ -> }

    /** Spec §3.4 caso 1: lo que la cuenta local ya cumple (sesiones y racha) queda por celebrar. Sin foto no se evalúa. */
    suspend fun evaluateLocal(ownerId: String) {
        val snapshot = dao.snapshot(ownerId)?.toDomain() ?: return
        val counts = localCounts(snapshot, dao.finishedAt(ownerId), routines.observeCache(ownerId).first().assignedDays(), today())
        val rows = dao.achievements(ownerId)
        val unlocks = localUnlocks(rows.map { it.toDomain() }, counts).map { it.code }.toSet()
        if (unlocks.isNotEmpty()) dao.insertCelebrations(rows.filter { it.code in unlocks }.map { it.toCelebration(clock.millis()) })
    }

    suspend fun markShown(ownerId: String, codes: List<String>) = dao.markShown(ownerId, codes)

    /** Spec §3.4 caso 2. Si ya no es la cuenta logueada (logout a mitad de la pasada), no se anota nada. */
    override suspend fun onUnlocked(ownerId: String, unlocked: List<UnlockedAchievement>) {
        if (unlocked.isEmpty()) return
        val gen = clearGeneration
        val catalog = dao.achievements(ownerId).associateBy { it.code }
        val now = clock.millis()
        try {
            dao.inTransaction {
                checkOwner(ownerId, gen)
                dao.insertCelebrations(
                    unlocked.map { CelebrationEntity(ownerId, it.code, it.name, catalog[it.code]?.description, it.category, CELEBRATION_PENDING, now) },
                )
            }
        } catch (e: AccountChangedException) {
            // Lo pendiente era de la cuenta anterior: se descarta.
        }
    }

    /** Spec §3.2: después de subir, la foto se refresca (si falla, la cuenta local cuenta de menos y no festeja de más). */
    override suspend fun afterUploads(ownerId: String) {
        refresh(ownerId)
    }
```

En `GamificationModule`, sumar:

```kotlin
    @Binds
    abstract fun bindGamificationSyncHook(impl: GamificationRepository): GamificationSyncHook
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.gamification.*"`
Expected: PASS. `GamificationRepository.kt` ≤ 200 líneas (`./gradlew checkFileLength`).

- [ ] **Step 5: Checkpoint** — sin commit.

---

### Task 6: Sync — `unlocked_achievements` y refresco después de subir

**Files:**
- Modify: `mobile/app/src/main/java/com/fittrainer/data/sync/SessionUploader.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/data/sync/SyncPass.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/sync/syncpass/SyncPassGamificationTest.kt`

**Interfaces:**
- Consumes: `UnlockedAchievementDto.toDomain()` (Task 4), `GamificationSyncHook` (Task 3), `FakeSessionApi.unlockedOnCreate/unlockedOnSets` (Task 1).
- Produces: `UploadResult.unlocked: List<UnlockedAchievement>`; `SyncPass(dao, uploader, sessionRepository, gamification: GamificationSyncHook = GamificationSyncHook.None)`.

- [ ] **Step 1: Write the failing test**

```kotlin
package com.fittrainer.data.sync.syncpass

import com.fittrainer.data.api.UnlockedAchievementDto
import com.fittrainer.data.gamification.GamificationSyncHook
import com.fittrainer.data.gamification.UnlockedAchievement
import com.fittrainer.data.sync.SessionUploader
import com.fittrainer.data.sync.SyncPass
import com.fittrainer.testing.fakes.sync.finishedSession
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class SyncPassGamificationTest : SyncPassTestBase() {
    private class RecordingHook : GamificationSyncHook {
        val unlocked = mutableListOf<Pair<String, List<UnlockedAchievement>>>()
        var refreshes = 0
        override suspend fun onUnlocked(ownerId: String, unlocked: List<UnlockedAchievement>) { this.unlocked += ownerId to unlocked }
        override suspend fun afterUploads(ownerId: String) { refreshes++ }
    }

    private val hook = RecordingHook()
    private val gamifiedPass = SyncPass(dao, SessionUploader(api), session, hook)

    @Test fun pasaLosLogrosDelCreateYDeLasSeriesSinRepetir() = runTest {
        seed(finishedSession("s1"))
        api.unlockedOnCreate = listOf(UnlockedAchievementDto("FIRST_SESSION", "Primera sesión", "milestone"))
        api.unlockedOnSets = listOf(
            UnlockedAchievementDto("FIRST_PR", "Primer récord", "pr"),
            UnlockedAchievementDto("FIRST_SESSION", "Primera sesión", "milestone"),
        )
        gamifiedPass.run()
        assertEquals(listOf("FIRST_SESSION", "FIRST_PR"), hook.unlocked.single().second.map { it.code })
        assertEquals("u1", hook.unlocked.single().first)
        assertEquals(1, hook.refreshes)
    }

    @Test fun sinNadaPendienteNoRefresca() = runTest {
        gamifiedPass.run()
        assertEquals(0, hook.refreshes)
    }

    @Test fun siElCreateFallaNiAnotaNiRefresca() = runTest {
        seed(finishedSession("s1"))
        api.createError = IOException("sin red")
        gamifiedPass.run()
        assertEquals(emptyList<Any>(), hook.unlocked)
        assertEquals(0, hook.refreshes)
    }

    @Test fun sinLogrosNoLlamaAOnUnlockedPeroRefresca() = runTest {
        seed(finishedSession("s1"))
        gamifiedPass.run()
        assertEquals(emptyList<Any>(), hook.unlocked)
        assertEquals(1, hook.refreshes)
    }
}
```

(Usar el fixture de sesión terminada y pendiente que ya usan los otros `SyncPass*Test` —en `SyncFixtures.kt`— con su nombre real.)

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.sync.syncpass.SyncPassGamificationTest"`
Expected: FAIL de compilación.

- [ ] **Step 3: Write the implementation**

`SessionUploader.kt`: `UploadResult` suma `val unlocked: List<UnlockedAchievement> = emptyList()` (KDoc: "logros que devolvió el servidor, sin repetir"). `upload` junta los de cada respuesta:

```kotlin
    suspend fun upload(owner: String, session: WorkoutSessionEntity, sets: List<WorkoutSetEntity>): UploadResult {
        val tag = RequiredUser(owner)
        val created = when (val create = attempt { api.create(tag, session.toRequest()) }) {
            is Outcome.Stop -> return UploadResult(SetResults(), create.reason, created = false)
            is Outcome.Ok -> create.value
        }
        val unlocked = created.data.unlockedAchievements.toMutableList()
        var results = SetResults()
        for (batch in sets.chunked(SETS_PER_BATCH)) {
            when (val sent = attempt { api.addSets(tag, session.id, SessionSetsRequest(batch.map { it.toDto() })).data }) {
                is Outcome.Stop -> return UploadResult(results, sent.reason, unlocked = unlocked.toDomain())
                is Outcome.Ok -> {
                    results += sent.value.resolve(batch)
                    unlocked += sent.value.unlockedAchievements
                }
            }
        }
        return UploadResult(results, unlocked = unlocked.toDomain())
    }
```

con, al final del archivo:

```kotlin
private fun List<UnlockedAchievementDto>.toDomain() = distinctBy { it.code }.map { it.toDomain() }
```

`SyncPass.kt`: constructor

```kotlin
class SyncPass @Inject constructor(
    private val dao: WorkoutDao,
    private val uploader: SessionUploader,
    private val sessionRepository: SessionRepository,
    /** Logros y refresco de la gamificación (tarjeta 15). Por defecto nada: los tests de subida no la miran. */
    private val gamification: GamificationSyncHook = GamificationSyncHook.None,
) : UploadPass {
```

`run()` pasa a envolver la subida (el cuerpo actual, desde `for (session in dao.pendingUploads(owner))` hasta `return sendFeedback(owner)`, se mueve sin cambios a `private suspend fun upload(owner: String, onUploaded: () -> Unit): PassResult`):

```kotlin
    override suspend fun run(): PassResult {
        val owner = currentStudent() ?: return PassResult.DONE
        var uploaded = false
        val result = upload(owner) { uploaded = true }
        // Con algo subido la foto de la gamificación quedó vieja (spec §3.2). Solo si sigue siendo la misma cuenta.
        if (uploaded && currentStudent() == owner) gamification.afterUploads(owner)
        return result
    }
```

y dentro de `upload`, en el bloque `if (result.created || rejected) { ... }`, al final:

```kotlin
                if (result.created) {
                    onUploaded()
                    if (result.unlocked.isNotEmpty()) gamification.onUnlocked(owner, result.unlocked)
                }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest`
Expected: PASS (todos los `SyncPass*Test` existentes sin modificar, más el nuevo).

- [ ] **Step 5: Checkpoint** — `./gradlew assembleDebug checkFileLength` (Hilt resuelve el constructor de `SyncPass` con el hook ligado en el Task 5). Sin commit.

---

### Task 7: Estado de UI y `GamificationViewModel`

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/GamificationTexts.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/GamificationUiState.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/GamificationViewModel.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/gamification/GamificationUiStateTest.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/gamification/GamificationViewModelTest.kt`

**Interfaces:**
- Consumes: `GamificationRepository.observeSummary/refresh` (Task 4), `RefreshController` (ui/refresh, de "Mis rutinas").
- Produces: `GamificationUiState(content, isOffline, isRefreshing, notice)`; `GamificationContent` = `Loading` | `NeverSynced` | `Ready(GamificationReady)`; `GamificationReady(currentStreak, longestStreak, prSessions, fullWeeks, medals: List<MedalUi>, recent: List<MedalUi>, activeChallenges: List<ChallengeUi>, finishedChallenges: List<ChallengeUi>)`; `MedalUi`, `ChallengeUi`; `GamificationViewModel.uiState/onStart/onPullToRefresh/dismissNotice`. Lo usan el chip de Hoy, el bloque de Progreso y la pantalla Logros (una instancia por pantalla).

- [ ] **Step 1: Write the failing tests**

`GamificationUiStateTest.kt`:

```kotlin
package com.fittrainer.ui.gamification

import com.fittrainer.data.gamification.Achievement
import com.fittrainer.data.gamification.AchievementView
import com.fittrainer.data.gamification.Challenge
import com.fittrainer.data.gamification.GamificationSummary
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GamificationUiStateTest {
    private val today = LocalDate.of(2026, 10, 30)

    private fun view(code: String, type: String, current: Int, target: Int, unlockedAt: String? = null, awaiting: Boolean = false) = AchievementView(
        Achievement(code, "Logro $code", "Desc", if (type == "streak") "streak" else "milestone", type, current, target, unlockedAt?.let(Instant::parse)),
        current, awaiting,
    )

    private fun challenge(status: String, goalType: String, current: Double, goal: Double, endsAt: String) = Challenge(
        "c-$status-$goalType", "Desafío", null, goalType, goal, current, current / goal * 100, status,
        Instant.parse("2026-10-01T10:00:00Z"), Instant.parse(endsAt), null,
    )

    private fun summary(achievements: List<AchievementView>, challenges: List<Challenge> = emptyList()) =
        GamificationSummary(3, 9, 2, 1, achievements, challenges, Instant.parse("2026-10-30T12:00:00Z"))

    @Test fun desbloqueadasPrimeroDeLaMasNuevaYDespuesLasMasCercanas() {
        val ready = readyState(summary(listOf(
            view("A", "sessions_count", 3, 10),
            view("B", "sessions_count", 1, 1, "2026-10-01T10:00:00Z"),
            view("C", "streak", 6, 7),
            view("D", "sessions_count", 10, 10, "2026-10-20T10:00:00Z"),
        )), today)
        assertEquals(listOf("D", "B", "C", "A"), ready.medals.map { it.code })
        assertEquals(listOf("D", "B"), ready.recent.map { it.code })
    }

    @Test fun textosDeLasMedallas() {
        val ready = readyState(summary(listOf(
            view("A", "sessions_count", 3, 10),
            view("B", "sessions_count", 1, 1, "2026-10-01T15:00:00Z"),
            view("C", "challenge", 0, 1),
            view("E", "streak", 7, 7, awaiting = true),
        )), today)
        val byCode = ready.medals.associateBy { it.code }
        assertEquals("3/10", byCode.getValue("A").progressLabel)
        assertEquals(0.3f, byCode.getValue("A").progress, 0.001f)
        assertEquals("1 oct", byCode.getValue("B").dateLabel)
        assertTrue(byCode.getValue("B").unlocked)
        assertEquals("Cumplí un desafío", byCode.getValue("C").progressLabel)
        assertFalse(byCode.getValue("C").showsBar)
        assertEquals("Se confirma al sincronizar", byCode.getValue("E").progressLabel)
    }

    @Test fun desafiosActivosYTerminadosConSusTextos() {
        val ready = readyState(summary(emptyList(), listOf(
            challenge("active", "sessions_count", 3.0, 12.0, "2026-11-08T12:00:00Z"),
            challenge("active", "volume", 2500.0, 10000.0, "2026-10-30T20:00:00Z"),
            challenge("completed", "streak", 14.0, 14.0, "2026-10-15T12:00:00Z"),
            challenge("failed", "weight_target", 80.5, 75.0, "2026-10-10T12:00:00Z"),
        )), today)
        assertEquals(listOf("3 de 12 sesiones", "2.500 de 10.000 kg de volumen"), ready.activeChallenges.map { it.progressLabel })
        assertEquals(listOf("Quedan 9 días", "Termina hoy"), ready.activeChallenges.map { it.timeLabel })
        assertEquals(listOf("Cumplido", "No se cumplió"), ready.finishedChallenges.map { it.timeLabel })
        assertEquals("Peso actual 80,5 kg · meta 75 kg", ready.finishedChallenges[1].progressLabel)
    }

    @Test fun quedaUnDiaEnSingular() {
        assertEquals("Queda 1 día", daysLeftLabel(LocalDate.of(2026, 10, 31), today))
    }

    @Test fun sinResumenNoHayContenidoListo() {
        assertNull(contentOf(null, today).let { it as? GamificationContent.Ready })
        assertEquals(GamificationContent.NeverSynced, contentOf(null, today))
    }
}
```

`GamificationViewModelTest.kt`: copiar la estructura de `RoutinesViewModelTest` (mismo `MainDispatcherRule`, fake de conectividad y `FakeStudentSession`), con un `GamificationRepository` armado como en `GamificationRepositoryTest`:

```kotlin
    @Test fun sinFotoEsNeverSyncedYAlRefrescarQuedaListo() = runTest {
        val vm = viewModel()
        val states = mutableListOf<GamificationUiState>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.toList(states) }
        assertEquals(GamificationContent.NeverSynced, states.last().content)
        api.progress = progressDto(sessions = 3, current = 2, longest = 4)
        vm.onStart()
        advanceUntilIdle()
        assertEquals(2, (states.last().content as GamificationContent.Ready).ready.currentStreak)
    }

    @Test fun unPullQueFallaAvisa() = runTest {
        val vm = viewModel()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }
        api.error = IOException("sin red")
        vm.onPullToRefresh()
        advanceUntilIdle()
        assertEquals(GAMIFICATION_REFRESH_FAILED, vm.uiState.value.notice)
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.gamification.*"`
Expected: FAIL de compilación.

- [ ] **Step 3: Write the implementation**

`GamificationTexts.kt`:

```kotlin
package com.fittrainer.ui.gamification

import com.fittrainer.data.gamification.BUSINESS_ZONE
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.abs
import kotlin.math.roundToLong

const val GAMIFICATION_REFRESH_FAILED = "No pudimos actualizar tus logros. Mostrando lo guardado"

private val MONTHS = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")

/** "12 oct", con el día de Buenos Aires. */
fun shortDate(instant: Instant): String = instant.atZone(BUSINESS_ZONE).toLocalDate().let { "${it.dayOfMonth} ${MONTHS[it.monthValue - 1]}" }

/** Enteros con punto de miles ("10.000"); con decimales, uno y con coma ("80,5"). Sin Locale. */
fun amount(value: Double): String {
    if (abs(value - value.roundToLong()) < 0.05) return value.roundToLong().toString().reversed().chunked(3).joinToString(".").reversed()
    return ((value * 10).roundToLong() / 10.0).toString().replace('.', ',')
}

fun challengeProgressLabel(goalType: String?, current: Double, goal: Double): String = when (goalType) {
    "sessions_count" -> "${amount(current)} de ${amount(goal)} sesiones"
    "streak" -> "${amount(current)} de ${amount(goal)} días de racha"
    "volume" -> "${amount(current)} de ${amount(goal)} kg de volumen"
    "weight_target" -> "Peso actual ${amount(current)} kg · meta ${amount(goal)} kg"
    else -> "${amount(current)} de ${amount(goal)}"
}

/** Días que quedan hasta el día (Buenos Aires) en que vence. */
fun daysLeftLabel(endsOn: LocalDate, today: LocalDate): String = when (val days = ChronoUnit.DAYS.between(today, endsOn)) {
    in Long.MIN_VALUE..0L -> "Termina hoy"
    1L -> "Queda 1 día"
    else -> "Quedan $days días"
}
```

`GamificationUiState.kt`:

```kotlin
package com.fittrainer.ui.gamification

import com.fittrainer.data.gamification.AchievementView
import com.fittrainer.data.gamification.CRITERIA_CHALLENGE
import com.fittrainer.data.gamification.Challenge
import com.fittrainer.data.gamification.GamificationSummary
import com.fittrainer.data.gamification.BUSINESS_ZONE
import java.time.LocalDate

/** Una medalla lista para dibujar. showsBar: bloqueada con barra (las de desafío no tienen). */
data class MedalUi(
    val code: String,
    val name: String,
    val description: String?,
    val category: String?,
    val unlocked: Boolean,
    val dateLabel: String?,
    val progressLabel: String?,
    val progress: Float,
    val showsBar: Boolean,
)

data class ChallengeUi(val id: String, val name: String, val description: String?, val progress: Float, val progressLabel: String, val timeLabel: String)

data class GamificationReady(
    val currentStreak: Int,
    val longestStreak: Int,
    val prSessions: Int,
    val fullWeeks: Int,
    val medals: List<MedalUi>,
    /** Las últimas 3 desbloqueadas (bloque de Progreso). */
    val recent: List<MedalUi>,
    val activeChallenges: List<ChallengeUi>,
    val finishedChallenges: List<ChallengeUi>,
)

sealed interface GamificationContent {
    data object Loading : GamificationContent
    data object NeverSynced : GamificationContent
    data class Ready(val ready: GamificationReady) : GamificationContent
}

data class GamificationUiState(
    val content: GamificationContent = GamificationContent.Loading,
    val isOffline: Boolean = false,
    val isRefreshing: Boolean = false,
    val notice: String? = null,
)

fun contentOf(summary: GamificationSummary?, today: LocalDate): GamificationContent =
    summary?.let { GamificationContent.Ready(readyState(it, today)) } ?: GamificationContent.NeverSynced

fun readyState(summary: GamificationSummary, today: LocalDate): GamificationReady {
    val (unlocked, locked) = summary.achievements.partition { it.unlocked }
    val medals = unlocked.sortedByDescending { it.achievement.unlockedAt }.map { it.toMedal() } +
        locked.sortedByDescending { it.current.toFloat() / it.achievement.target.coerceAtLeast(1) }.map { it.toMedal() }
    val (active, finished) = summary.challenges.partition { it.status == "active" }
    return GamificationReady(
        summary.currentStreak, summary.longestStreak, summary.prSessions, summary.fullWeeks,
        medals, medals.filter { it.unlocked }.take(3),
        active.map { it.toUi(today) }, finished.map { it.toUi(today) },
    )
}

private fun AchievementView.toMedal(): MedalUi {
    val a = achievement
    val isChallenge = a.criteriaType == CRITERIA_CHALLENGE
    return MedalUi(
        code = a.code,
        name = a.name,
        description = a.description,
        category = a.category,
        unlocked = unlocked,
        dateLabel = a.unlockedAt?.let(::shortDate),
        progressLabel = when {
            unlocked -> null
            awaitingSync -> "Se confirma al sincronizar"
            isChallenge -> "Cumplí un desafío"
            else -> "$current/${a.target}"
        },
        progress = if (unlocked) 1f else current.toFloat() / a.target.coerceAtLeast(1),
        showsBar = !unlocked && !isChallenge,
    )
}

private fun Challenge.toUi(today: LocalDate) = ChallengeUi(
    id = id,
    name = name,
    description = description,
    progress = (progressPct / 100).toFloat().coerceIn(0f, 1f),
    progressLabel = challengeProgressLabel(goalType, currentProgress, goalValue),
    timeLabel = when (status) {
        "active" -> daysLeftLabel(endsAt.atZone(BUSINESS_ZONE).toLocalDate(), today)
        "completed" -> "Cumplido"
        else -> "No se cumplió"
    },
)
```

`GamificationViewModel.kt` (mismo patrón que `RoutinesViewModel`):

```kotlin
package com.fittrainer.ui.gamification

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.gamification.GamificationRepository
import com.fittrainer.data.gamification.businessDate
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.refresh.RefreshController
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Clock
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.shareIn
import kotlinx.coroutines.flow.stateIn

/** Racha, medallas y desafíos (chip de Hoy, bloque de Progreso y pantalla Logros). Lee de Room y refresca como Hoy. */
@HiltViewModel
class GamificationViewModel @Inject constructor(
    repository: GamificationRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val ownerId: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.shareIn(viewModelScope, SharingStarted.Eagerly, replay = 1)
    private val today = MutableStateFlow(businessDate(clock.millis()))
    private val refresher = RefreshController(viewModelScope, online, ownerId, GAMIFICATION_REFRESH_FAILED, repository::refresh)

    @OptIn(ExperimentalCoroutinesApi::class)
    private val summary = ownerId.filterNotNull().flatMapLatest { repository.observeSummary(it) }

    val uiState: StateFlow<GamificationUiState> =
        combine(summary, today, online, refresher.state) { s, date, isOnline, r ->
            GamificationUiState(contentOf(s, date), isOffline = !isOnline, isRefreshing = r.isRefreshing, notice = r.notice)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), GamificationUiState())

    /** Visible de nuevo: recalcula el día (racha y días que quedan) y refresca. */
    fun onStart() {
        today.value = businessDate(clock.millis())
        refresher.start()
    }

    fun onPullToRefresh() = refresher.pull()

    fun dismissNotice() = refresher.dismissNotice()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.gamification.*"`
Expected: PASS.

- [ ] **Step 5: Checkpoint** — sin commit.

---

### Task 8: Pantalla Logros, ruta y medallas

**Files:**
- Modify: `mobile/gradle/libs.versions.toml` y `mobile/app/build.gradle.kts` (`material-icons-extended`, versión del BOM)
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/components/MedalIcon.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/components/MedalGrid.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/components/ChallengeCard.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/components/StreakCard.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/AchievementsScreen.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/navigation/RoleTabs.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/navigation/RoleShell.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/navigation/RoleTabsTest.kt`

**Interfaces:**
- Consumes: `GamificationViewModel`, `GamificationReady`, `MedalUi`, `ChallengeUi` (Task 7).
- Produces: `STUDENT_ACHIEVEMENTS_ROUTE = "student/progress/achievements"`; `AchievementsScreen(onBack)`; `MedalIcon(category, unlocked, size)` (lo reusan el bloque de Progreso y la celebración).

- [ ] **Step 1: Write the failing test** — en `RoleTabsTest`:

```kotlin
    @Test fun losLogrosDejanMarcadaProgreso() {
        assertTrue(isTabSelected(STUDENT_PROGRESS_ROUTE, STUDENT_ACHIEVEMENTS_ROUTE))
        assertFalse(isTabSelected(STUDENT_ROUTINES_ROUTE, STUDENT_ACHIEVEMENTS_ROUTE))
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.navigation.RoleTabsTest"`
Expected: FAIL de compilación (no existe la ruta).

- [ ] **Step 3: Ruta** — en `RoleTabs.kt`:

```kotlin
/** Progreso → Logros (tarjeta 15). */
const val STUDENT_ACHIEVEMENTS_ROUTE = "student/progress/achievements"
```

y en `parentTab` la primera rama pasa a
`route.startsWith("student/history/") || route.startsWith("$STUDENT_PROGRESS_ROUTE/") -> STUDENT_PROGRESS_ROUTE`
(actualizando el KDoc de `isTabSelected`: "el historial y los logros cuelgan de Progreso").

En `RoleShell.kt`, junto a los otros destinos hijos:

```kotlin
            composable(STUDENT_ACHIEVEMENTS_ROUTE) {
                AchievementsScreen(onBack = { navController.popBackStack() })
            }
```

(y sumar "logros" a la lista del KDoc de `RoleShell`).

- [ ] **Step 4: Íconos** — en `libs.versions.toml`, junto a `androidx-compose-material-icons-core`:

```toml
androidx-compose-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended" }
```

y en `app/build.gradle.kts`, debajo de `implementation(libs.androidx.compose.material.icons.core)`:

```kotlin
    implementation(libs.androidx.compose.material.icons.extended)
```

- [ ] **Step 5: Componentes**

`MedalIcon.kt`:

```kotlin
package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors

/** El backend manda icon_url en null: el ícono sale de la categoría (contratos-api, GET /achievements). */
fun categoryIcon(category: String?): ImageVector = when (category) {
    "streak" -> Icons.Filled.LocalFireDepartment
    "pr" -> Icons.Filled.EmojiEvents
    "consistency" -> Icons.Filled.CalendarMonth
    else -> Icons.Filled.Flag
}

/** Racha en coral; el resto de los logros en verde. */
fun medalColor(category: String?): Color = if (category == "streak") FtColors.Coral else FtColors.Green

@Composable
fun MedalIcon(category: String?, unlocked: Boolean, size: Dp = 56.dp) {
    val tint = if (unlocked) medalColor(category) else FtColors.Ink5
    Box(
        Modifier.size(size).clip(CircleShape).background(if (unlocked) tint.copy(alpha = 0.16f) else FtColors.Elevated),
        contentAlignment = Alignment.Center,
    ) {
        Icon(categoryIcon(category), contentDescription = null, tint = tint, modifier = Modifier.size(size / 2))
    }
}
```

`MedalGrid.kt` — filas de 3 dentro del `LazyColumn` (una grilla perezosa no puede ir dentro de otra lista):

```kotlin
package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import com.fittrainer.ui.gamification.MedalUi
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Una fila de hasta 3 medallas; los huecos se rellenan para que las columnas no se corran. */
@Composable
fun MedalRow(medals: List<MedalUi>, onOpen: (MedalUi) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
        medals.forEach { MedalCell(it, Modifier.weight(1f)) { onOpen(it) } }
        repeat(3 - medals.size) { Spacer(Modifier.weight(1f)) }
    }
}

@Composable
private fun MedalCell(medal: MedalUi, modifier: Modifier, onClick: () -> Unit) {
    val status = if (medal.unlocked) "desbloqueado el ${medal.dateLabel}" else medal.progressLabel.orEmpty()
    Column(
        modifier
            .heightIn(min = Spacing.minTouchTarget)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics(mergeDescendants = true) { contentDescription = "${medal.name}, $status" }
            .padding(vertical = Spacing.sm),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        MedalIcon(medal.category, medal.unlocked)
        Text(
            medal.name,
            style = MaterialTheme.typography.labelMedium,
            color = if (medal.unlocked) FtColors.TextPrimary else FtColors.TextSecondary,
            textAlign = TextAlign.Center,
            maxLines = 2,
        )
        if (medal.showsBar) {
            LinearProgressIndicator(
                progress = { medal.progress },
                modifier = Modifier.fillMaxWidth(),
                color = FtColors.TextSecondary,
                trackColor = FtColors.Elevated,
            )
        }
        (medal.dateLabel ?: medal.progressLabel)?.let {
            Text(it, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary, textAlign = TextAlign.Center)
        }
    }
}
```

`ChallengeCard.kt`:

```kotlin
package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.gamification.ChallengeUi
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Un desafío: nombre, barra, "3 de 12 sesiones" y "Quedan 9 días" (o "Cumplido"/"No se cumplió"). */
@Composable
fun ChallengeCard(challenge: ChallengeUi, finished: Boolean = false) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Card, RoundedCornerShape(14.dp)).padding(Spacing.lg)
            .semantics(mergeDescendants = true) { },
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(challenge.name, style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary, modifier = Modifier.weight(1f))
            Text(challenge.timeLabel, style = MaterialTheme.typography.labelSmall, color = if (finished) FtColors.TextSecondary else FtColors.Amber)
        }
        LinearProgressIndicator(
            progress = { challenge.progress },
            modifier = Modifier.fillMaxWidth(),
            color = if (finished) FtColors.TextSecondary else FtColors.Brand,
            trackColor = FtColors.Elevated,
        )
        Text(challenge.progressLabel, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
    }
}
```

`StreakCard.kt`:

```kotlin
package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Racha actual (con la cuenta local) y la mejor. */
@Composable
fun StreakCard(current: Int, longest: Int) {
    Row(
        Modifier.fillMaxWidth().background(FtColors.Card, RoundedCornerShape(14.dp)).padding(Spacing.lg)
            .semantics(mergeDescendants = true) { contentDescription = "Racha de $current días. Mejor racha: $longest días" },
        horizontalArrangement = Arrangement.spacedBy(Spacing.lg),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MedalIcon("streak", unlocked = current > 0)
        Column(Modifier.weight(1f)) {
            Text("$current días", style = MaterialTheme.typography.headlineSmall, color = FtColors.Coral)
            Text("Racha actual", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        }
        Column(horizontalAlignment = Alignment.End) {
            Text("$longest", style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
            Text("Mejor racha", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        }
    }
}
```

- [ ] **Step 6: Pantalla** (`AchievementsScreen.kt`; el encabezado con volver copia el de `HistoryDetailScreen`):

```kotlin
package com.fittrainer.ui.gamification

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.components.exercise.SectionLabel
import com.fittrainer.ui.gamification.components.ChallengeCard
import com.fittrainer.ui.gamification.components.MedalIcon
import com.fittrainer.ui.gamification.components.MedalRow
import com.fittrainer.ui.gamification.components.StreakCard
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Logros del alumno (tarjeta 15, sin mockup): racha, desafíos y medallas. Hija de Progreso. */
@Composable
fun AchievementsScreen(onBack: () -> Unit, viewModel: GamificationViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    AchievementsBody(state, onBack, viewModel::onPullToRefresh, viewModel::dismissNotice)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AchievementsBody(state: GamificationUiState, onBack: () -> Unit, onRefresh: () -> Unit, onDismissNotice: () -> Unit) {
    var open by remember { mutableStateOf<MedalUi?>(null) }
    var showFinished by rememberSaveable { mutableStateOf(false) }
    PullToRefreshBox(state.isRefreshing, onRefresh, Modifier.fillMaxSize().background(FtColors.Background)) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(Spacing.lg), verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                    }
                    Text("Logros", style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
                }
            }
            if (state.isOffline) item { OfflineIndicator("Sin conexión · mostrando lo guardado") }
            state.notice?.let { item { NoticeBanner(it, onDismissNotice) } }
            when (val content = state.content) {
                GamificationContent.Loading -> Unit
                GamificationContent.NeverSynced -> item {
                    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                        InfoCard("Todavía no hay datos", "Conectate una vez para ver tus logros.")
                        TextButton(onClick = onRefresh, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Reintentar") }
                    }
                }
                is GamificationContent.Ready -> {
                    val ready = content.ready
                    item { StreakCard(ready.currentStreak, ready.longestStreak) }
                    item { SectionLabel("DESAFÍOS ACTIVOS", ready.activeChallenges.size.toString()) }
                    if (ready.activeChallenges.isEmpty()) {
                        item { InfoCard("Sin desafíos", "Tu entrenador todavía no te asignó desafíos.") }
                    }
                    items(ready.activeChallenges, key = { it.id }) { ChallengeCard(it) }
                    if (ready.finishedChallenges.isNotEmpty()) {
                        item {
                            TextButton(onClick = { showFinished = !showFinished }, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                                Text(if (showFinished) "Ocultar terminados" else "Ver terminados (${ready.finishedChallenges.size})")
                            }
                        }
                        if (showFinished) items(ready.finishedChallenges, key = { "f-${it.id}" }) { ChallengeCard(it, finished = true) }
                    }
                    item { SectionLabel("MEDALLAS", "${ready.medals.count { it.unlocked }}/${ready.medals.size}") }
                    items(ready.medals.chunked(3), key = { row -> row.first().code }) { row -> MedalRow(row) { open = it } }
                }
            }
        }
    }
    open?.let { medal ->
        ModalBottomSheet(onDismissRequest = { open = null }, containerColor = FtColors.Surface) {
            Column(
                Modifier.fillMaxWidth().padding(Spacing.lg).padding(bottom = Spacing.xl),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(Spacing.sm),
            ) {
                MedalIcon(medal.category, medal.unlocked)
                Text(medal.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary)
                medal.description?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary) }
                Text(medal.dateLabel?.let { "Desbloqueado el $it" } ?: medal.progressLabel.orEmpty(), color = FtColors.TextSecondary)
            }
        }
    }
}
```

(Si `InfoCard`, `NoticeBanner`, `OfflineIndicator` o `SectionLabel` tienen otra firma, usar la de `RoutinesScreen`. Si el archivo pasa de 200 líneas, mover la hoja a `components/MedalSheet.kt`.)

- [ ] **Step 7: Run tests and build**

Run: `./gradlew testDebugUnitTest assembleDebug checkFileLength`
Expected: PASS.

- [ ] **Step 8: Checkpoint** — sin commit.

---

### Task 9: Chip de racha en Hoy y bloque "Logros recientes" en Progreso

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/components/StreakChip.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/components/AchievementsSummaryBlock.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/today/TodayScreen.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/progress/ProgressScreen.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/navigation/RoleShell.kt`

**Interfaces:**
- Consumes: `GamificationViewModel` (una instancia propia por pantalla con `hiltViewModel()`), `MedalIcon`, `STUDENT_ACHIEVEMENTS_ROUTE`.
- Produces: `StreakChip()`, `AchievementsSummaryBlock(onOpen)`; `ProgressScreen(onOpen, onOpenAchievements, ...)`.

- [ ] **Step 1: Chip** (`StreakChip.kt`):

```kotlin
package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.gamification.GamificationContent
import com.fittrainer.ui.gamification.GamificationViewModel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Racha en Hoy (Guía Mobile p.12). Con 0, o sin datos, no se muestra: no hace sentir culpa. */
@Composable
fun StreakChip(viewModel: GamificationViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    val days = (state.content as? GamificationContent.Ready)?.ready?.currentStreak ?: 0
    if (days <= 0) return
    Row(
        Modifier.background(FtColors.Coral.copy(alpha = 0.14f), RoundedCornerShape(50))
            .padding(horizontal = Spacing.md, vertical = Spacing.xs)
            .semantics(mergeDescendants = true) { contentDescription = "Racha de $days días" },
        horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.LocalFireDepartment, contentDescription = null, tint = FtColors.Coral, modifier = Modifier.size(16.dp))
        Text(if (days == 1) "1 día" else "$days días", style = MaterialTheme.typography.labelLarge, color = FtColors.Coral)
    }
}
```

En `TodayScreen.kt`, el `item` del header pasa a:

```kotlin
            item {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    TodayHeader(state.today, state.studentName, state.isOffline, showsRoutine = state.showsRoutine)
                    StreakChip()
                }
            }
```

(`TodayViewModel` no se toca.)

- [ ] **Step 2: Bloque de Progreso** (`AchievementsSummaryBlock.kt`):

```kotlin
package com.fittrainer.ui.gamification.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.gamification.GamificationContent
import com.fittrainer.ui.gamification.GamificationViewModel
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Bloque "Logros recientes" de Progreso (Guía Mobile p.16): racha, récords, semanas completas y las últimas medallas. */
@Composable
fun AchievementsSummaryBlock(onOpen: () -> Unit, viewModel: GamificationViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    val ready = (state.content as? GamificationContent.Ready)?.ready
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        if (ready == null) {
            if (state.content == GamificationContent.NeverSynced) {
                Text("Conectate una vez para ver tus logros", style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary)
            }
        } else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                MiniStat("${ready.currentStreak}", "RACHA", FtColors.Coral, Modifier.weight(1f))
                MiniStat("${ready.prSessions}", "RÉCORDS", FtColors.BrandText, Modifier.weight(1f))
                MiniStat("${ready.fullWeeks}", "SEMANAS COMPLETAS", FtColors.Green, Modifier.weight(1f))
            }
        }
        Row(
            Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget).clickable(role = Role.Button, onClick = onOpen),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            ready?.recent?.forEach { MedalIcon(it.category, unlocked = true, size = 32.dp) }
            Text("Ver logros ›", style = MaterialTheme.typography.labelLarge, color = FtColors.BrandText, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun MiniStat(value: String, label: String, color: Color, modifier: Modifier) {
    Column(
        modifier.background(FtColors.Card, RoundedCornerShape(12.dp)).padding(vertical = Spacing.md, horizontal = Spacing.sm)
            .semantics(mergeDescendants = true) { contentDescription = "$label: $value" },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(value, style = MaterialTheme.typography.titleLarge, color = color)
        Text(label, style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary, maxLines = 1)
    }
}
```

En `ProgressScreen.kt`: la firma pasa a `fun ProgressScreen(onOpen: (String) -> Unit, onOpenAchievements: () -> Unit, historyViewModel: HistoryViewModel = hiltViewModel())`, y dentro del `Box` del header, `HistoryHeader(state.weekSummary)` pasa a:

```kotlin
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
                HistoryHeader(state.weekSummary)
                AchievementsSummaryBlock(onOpenAchievements)
            }
```

En `RoleShell.kt`: `ProgressScreen(onOpen = { navController.navigate(historyDetailRoute(it)) }, onOpenAchievements = { navController.navigate(STUDENT_ACHIEVEMENTS_ROUTE) })`.

- [ ] **Step 3: Build y tests**

Run: `./gradlew testDebugUnitTest assembleDebug checkFileLength`
Expected: PASS (tests de Hoy y Progreso sin cambios).

- [ ] **Step 4: Checkpoint** — sin commit.

---

### Task 10: Celebración

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/celebration/CelebrationState.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/celebration/CelebrationViewModel.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/gamification/celebration/CelebrationHost.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/navigation/RoleShell.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/gamification/celebration/CelebrationStateTest.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/gamification/celebration/CelebrationViewModelTest.kt`

**Interfaces:**
- Consumes: `GamificationRepository.observePending/evaluationTriggers/evaluateLocal/markShown` (Task 5), `MedalIcon`, `WORKOUT_ROUTE`.
- Produces: `CelebrationDialogUi` = `Single(Celebration)` | `Group(List<Celebration>)`; `celebrationDialog(pending, onWorkout)`; `CelebrationViewModel.pending/onShown`; `CelebrationHost(onWorkout)`.

- [ ] **Step 1: Write the failing tests**

`CelebrationStateTest.kt`:

```kotlin
package com.fittrainer.ui.gamification.celebration

import com.fittrainer.data.gamification.Celebration
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CelebrationStateTest {
    private fun c(code: String) = Celebration(code, "Logro $code", null, "milestone")

    @Test fun nadaPendienteNoMuestraNada() = assertNull(celebrationDialog(emptyList(), onWorkout = false))

    @Test fun duranteLaSesionActivaNoInterrumpe() = assertNull(celebrationDialog(listOf(c("A")), onWorkout = true))

    @Test fun unoODosVanDeAUno() {
        assertEquals(CelebrationDialogUi.Single(c("A")), celebrationDialog(listOf(c("A"), c("B")), onWorkout = false))
    }

    @Test fun tresOMasVanEnUnSoloDialogo() {
        val pending = listOf(c("A"), c("B"), c("C"))
        val dialog = celebrationDialog(pending, onWorkout = false) as CelebrationDialogUi.Group
        assertEquals(pending, dialog.items)
        assertEquals(listOf("A", "B", "C"), dialog.codes)
        assertEquals("Desbloqueaste 3 logros", dialog.title)
    }
}
```

`CelebrationViewModelTest.kt` (estructura de `GamificationViewModelTest`; repositorio real con fakes):

```kotlin
    @Test fun alCerrarUnaSesionNuevaEvaluaYMuestraLaCelebracion() = runTest {
        api.progress = progressDto(sessions = 6, current = 6, longest = 6, last = "2026-10-29")
        repo.refresh("u1")
        val vm = CelebrationViewModel(repo, session)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.pending.collect {} }
        val fetchedAt = dao.state.value.snapshots.getValue("u1").fetchedAt
        dao.state.update { it.copy(finished = mapOf("u1" to listOf(fetchedAt + 60_000))) }
        advanceUntilIdle()
        assertEquals(listOf("STREAK_7_DAYS"), vm.pending.value.map { it.code })
        vm.onShown(listOf("STREAK_7_DAYS"))
        advanceUntilIdle()
        assertEquals(emptyList<Celebration>(), vm.pending.value)
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.gamification.celebration.*"`
Expected: FAIL de compilación.

- [ ] **Step 3: Write the implementation**

`CelebrationState.kt`:

```kotlin
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
```

`CelebrationViewModel.kt`:

```kotlin
package com.fittrainer.ui.gamification.celebration

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.gamification.Celebration
import com.fittrainer.data.gamification.GamificationRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Celebraciones del alumno (spec §3.4 y §4.4). Mientras la app está abierta, cada cambio de la foto o de las sesiones
 * terminadas vuelve a evaluar la cuenta local: así cubre el cierre desde la pantalla y desde la notificación.
 */
@HiltViewModel
class CelebrationViewModel @Inject constructor(
    private val repository: GamificationRepository,
    sessionRepository: SessionRepository,
) : ViewModel() {

    private val ownerId = sessionRepository.session.map { (it as? Session.Student)?.user?.id }.distinctUntilChanged()
    private val currentOwner: StateFlow<String?> = ownerId.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    @OptIn(ExperimentalCoroutinesApi::class)
    val pending: StateFlow<List<Celebration>> = ownerId
        .flatMapLatest { id -> id?.let(repository::observePending) ?: flowOf(emptyList()) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        viewModelScope.launch {
            @OptIn(ExperimentalCoroutinesApi::class)
            ownerId.flatMapLatest { id -> id?.let { repository.evaluationTriggers(it).map { _ -> id } } ?: flowOf(null) }
                .collectLatest { id -> id?.let { repository.evaluateLocal(it) } }
        }
    }

    /** "Seguir": lo mostrado queda visto (no vuelve a salir). */
    fun onShown(codes: List<String>) {
        val id = currentOwner.value ?: return
        viewModelScope.launch { repository.markShown(id, codes) }
    }
}
```

`CelebrationHost.kt`:

```kotlin
package com.fittrainer.ui.gamification.celebration

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.gamification.components.MedalIcon
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Muestra las celebraciones pendientes fuera de la sesión activa (spec §4.4). Va en el RoleShell del alumno. */
@Composable
fun CelebrationHost(onWorkout: Boolean, viewModel: CelebrationViewModel = hiltViewModel()) {
    val pending by viewModel.pending.collectAsStateWithLifecycle()
    val dialog = celebrationDialog(pending, onWorkout) ?: return
    Dialog(onDismissRequest = {}, properties = DialogProperties(usePlatformDefaultWidth = false, dismissOnClickOutside = false)) {
        CelebrationContent(dialog, onContinue = { viewModel.onShown(dialog.codes) })
    }
}

@Composable
private fun CelebrationContent(dialog: CelebrationDialogUi, onContinue: () -> Unit) {
    val haptics = LocalHapticFeedback.current
    val scale = remember(dialog.codes) { Animatable(0.3f) }
    LaunchedEffect(dialog.codes) {
        haptics.performHapticFeedback(HapticFeedbackType.LongPress)
        scale.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy))
    }
    Column(
        Modifier.fillMaxSize().background(FtColors.Background.copy(alpha = 0.96f)).padding(Spacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.lg, Alignment.CenterVertically),
    ) {
        when (dialog) {
            is CelebrationDialogUi.Single -> {
                Column(Modifier.scale(scale.value)) { MedalIcon(dialog.item.category, unlocked = true, size = 120.dp) }
                Text("¡Logro desbloqueado!", style = MaterialTheme.typography.labelLarge, color = FtColors.Green)
                Text(dialog.item.name, style = MaterialTheme.typography.headlineMedium, color = FtColors.TextPrimary, textAlign = TextAlign.Center)
                dialog.item.description?.let {
                    Text(it, style = MaterialTheme.typography.bodyLarge, color = FtColors.TextSecondary, textAlign = TextAlign.Center)
                }
            }
            is CelebrationDialogUi.Group -> {
                Column(Modifier.scale(scale.value)) { MedalIcon("milestone", unlocked = true, size = 120.dp) }
                Text(dialog.title, style = MaterialTheme.typography.headlineMedium, color = FtColors.TextPrimary, textAlign = TextAlign.Center)
                dialog.items.forEach { Text(it.name, style = MaterialTheme.typography.bodyLarge, color = FtColors.TextSecondary) }
            }
        }
        Button(
            onClick = onContinue,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
            colors = ButtonDefaults.buttonColors(containerColor = FtColors.Brand),
        ) { Text("Seguir") }
    }
}
```

En `RoleShell.kt`, después del `Scaffold` (dentro de la función), para el alumno:

```kotlin
    // Celebraciones de logros (tarjeta 15): nunca encima de la sesión activa.
    if (isStudent) CelebrationHost(onWorkout = currentRoute == WORKOUT_ROUTE)
```

- [ ] **Step 4: Run tests and build**

Run: `./gradlew testDebugUnitTest assembleDebug checkFileLength`
Expected: PASS. `RoleShell.kt` ≤ 200 líneas.

- [ ] **Step 5: Checkpoint** — sin commit.

---

### Task 11: Verificación final y E2E (controller)

- [ ] `./gradlew checkFileLength assembleDebug testDebugUnitTest --rerun-tasks` en verde, sin warnings nuevos.
- [ ] Backend local con la rama `feature/gamification-progress` (el endpoint nuevo) y emulador.
- [ ] Datos en Supabase dev para `alumna.card8`: sesiones cerradas en los 6 días anteriores (todos asignados según sus rutinas, o sin días intermedios asignados sin entrenar) para que la racha quede en 6.
- [ ] Con red: abrir Hoy (chip "6 días"), Progreso (mini-stats y "Ver logros ›") y Logros (desbloqueados a color, bloqueados en gris con progreso, desafíos).
- [ ] Modo avión: entrenar y cerrar la sesión del día → al salir de la sesión, celebración "Racha de 7 días"; Hoy muestra "7 días"; Logros la muestra "Se confirma al sincronizar".
- [ ] Volver la red → el sync sube, la foto se refresca, la medalla queda desbloqueada y **no** se repite la celebración.
- [ ] Test instrumentado de la migración 9 → 10 en el emulador.
