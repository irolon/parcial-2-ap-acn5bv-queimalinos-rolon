# Mis rutinas del alumno — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que la pestaña Mis rutinas del alumno liste sus rutinas activas, muestre el detalle de cada una (con
"Empezar" aunque hoy no le toque) y deje la biblioteca como entrada, todo desde Room.

**Architecture:** sin cambios en Room ni en la API. Se lee `RoutineRepository.observeCache` y
`WorkoutRepository.observeActive`. El refresco de Hoy se extrae a un `RefreshController` reutilizable y el
repositorio de rutinas pasa a juntar pedidos simultáneos. Paquete UI nuevo `ui/routines/` (lista) y
`ui/routines/detail/` (detalle), con la lógica en funciones puras testeables.

**Tech Stack:** Kotlin, Jetpack Compose (Material 3), Hilt, Navigation Compose, coroutines/Flow, JUnit4 +
kotlinx-coroutines-test, fakes propios (`src/test/.../testing/fakes`).

**Spec:** `docs/superpowers/specs/2026-10-31-mis-rutinas-design.md`

## Global Constraints

- Ningún archivo de código (tests incluidos) pasa de **200 líneas físicas** (`gradlew checkFileLength`).
- Orden capa → módulo → archivo; los tests copian el árbol de `src/main`.
- **Room es la única fuente de verdad:** ninguna pantalla ni ViewModel llama a Retrofit.
- Tema oscuro, colores de `FtColors`, espacios de `Spacing`, toque mínimo `Spacing.minTouchTarget` (44 dp).
- Textos en español rioplatense, sin `Locale` (no dependen del idioma del teléfono).
- Comentarios en español, con la densidad del código vecino (KDoc corto que explica el porqué).
- **Los agentes no commitean.** Donde un paso diga "Checkpoint", solo se corre la verificación; Igna commitea.
- Comandos de Gradle desde `mobile/` del worktree `C:\Users\igna_\Desktop\fittrainer-mis-rutinas`
  (en Git Bash: `./gradlew ...`).

## Review Focus

1. **Dos pestañas vivas refrescando a la vez** (vuelve la red con Hoy y Mis rutinas en la pila): un solo
   pedido a `/routines/mine` → test en Task 1.
2. **Pull-to-refresh con un pedido en vuelo**: no dispara otro y, si falla, avisa con el texto de esa
   pantalla → test en Task 2.
3. **Rutina que desaparece mientras se mira su detalle** (el entrenador la desactivó y llegó un refresh):
   pasa a "ya no está disponible", sin crash → test en Task 6.
4. **Sesión abierta sin `routineId`** (rutina borrada en el backend): el detalle queda bloqueado, nunca
   "Continuar" sobre otra rutina → test en Task 5.
5. **"Empezar" con Room fallando**: no navega y muestra el aviso → test en Task 6.

---

## Mapa de archivos

Base: `mobile/app/src/main/java/com/fittrainer/` (abreviado `main/`) y
`mobile/app/src/test/java/com/fittrainer/` (abreviado `test/`).

| Archivo | Qué hace |
|---|---|
| `main/data/routine/RoutineRepository.kt` (mod) | `refresh` junta pedidos simultáneos del mismo alumno |
| `main/ui/refresh/RefreshController.kt` (nuevo) | Refresco al quedar visible / volver la red / pull, extraído de Hoy |
| `main/ui/today/TodayViewModel.kt` (mod) | Usa `RefreshController`; mismo comportamiento |
| `main/ui/routines/RoutinesUiState.kt` (nuevo) | Estado de la lista + `routinesContent()` puro |
| `main/ui/routines/RoutinesViewModel.kt` (nuevo) | Caché + refresco de la lista |
| `main/ui/routines/RoutinesScreen.kt` (nuevo) | Pantalla de la lista |
| `main/ui/routines/components/RoutineCard.kt` (nuevo) | Tarjeta de una rutina |
| `main/ui/routines/components/LibraryEntryCard.kt` (nuevo) | Entrada a la biblioteca |
| `main/ui/routines/detail/StartAction.kt` (nuevo) | `startAction()` y textos del detalle, puros |
| `main/ui/routines/detail/RoutineDetailUiState.kt` (nuevo) | Estado del detalle + `detailState()` puro |
| `main/ui/routines/detail/RoutineDetailViewModel.kt` (nuevo) | Caché + sesión activa + "Empezar" |
| `main/ui/routines/detail/RoutineDetailScreen.kt` (nuevo) | Pantalla del detalle |
| `main/ui/routines/detail/components/StartBar.kt` (nuevo) | Barra inferior con la acción |
| `main/ui/library/LibraryScreen.kt` (mod) | `onBack` opcional |
| `main/navigation/RoleTabs.kt` (mod) | Rutas nuevas, `isTabSelected` generalizado |
| `main/navigation/RoleShell.kt` (mod) | Cablea pantallas; salida de la sesión con `popBackStack()` |

Tests: `test/data/routine/RoutineRepositorySingleFlightTest.kt`, `test/ui/refresh/RefreshControllerTest.kt`,
`test/ui/routines/RoutinesContentTest.kt`, `test/ui/routines/RoutinesViewModelTest.kt`,
`test/ui/routines/detail/StartActionTest.kt`, `test/ui/routines/detail/RoutineDetailViewModelTest.kt`,
`test/navigation/RoleTabsTest.kt` (mod).

**Biblioteca en `student/library`** (spec §4.4, ya actualizado): fuera de `student/routines/` para que no
compita con el patrón `student/routines/{routineId}`; `isTabSelected` la asigna igual a Mis rutinas.

---

### Task 1: el repositorio de rutinas junta refrescos simultáneos

**Files:**
- Modify: `main/data/routine/RoutineRepository.kt`
- Test: `test/data/routine/RoutineRepositorySingleFlightTest.kt`

**Interfaces:**
- Produces: `RoutineRepository.refresh(ownerId: String): Result<Unit>` con la misma firma; si mientras
  esperaba terminó bien otro pedido del mismo alumno, devuelve `Result.success(Unit)` sin ir a la red.

- [ ] **Step 1: test que falla**

```kotlin
package com.fittrainer.data.routine

import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Hoy y Mis rutinas refrescan el mismo caché: dos pedidos a la vez no tienen que ir dos veces a la red. */
class RoutineRepositorySingleFlightTest {

    private val api = FakeRoutineApi()
    private val repo = RoutineRepository(api, FakeRoutineDao(), Clock.fixed(Instant.ofEpochMilli(5_000L), ZoneOffset.UTC))

    @Test fun `dos refresh a la vez del mismo alumno hacen un solo pedido`() = runTest {
        api.gate = CompletableDeferred()
        val first = async { repo.refresh("u1") }
        val second = async { repo.refresh("u1") }
        runCurrent()
        assertEquals(1, api.calls)

        api.gate!!.complete(Unit)
        assertTrue(first.await().isSuccess)
        assertTrue(second.await().isSuccess)
        assertEquals(1, api.calls)
    }

    @Test fun `si el primero falla el que esperaba pide de nuevo`() = runTest {
        api.gate = CompletableDeferred()
        api.error = IOException("sin red")
        val first = async { repo.refresh("u1") }
        val second = async { repo.refresh("u1") }
        runCurrent()
        api.error = null
        api.gate!!.complete(Unit)

        assertTrue(first.await().isFailure)
        assertTrue(second.await().isSuccess)
        assertEquals(2, api.calls)
    }

    @Test fun `un pedido de otro alumno no se aprovecha`() = runTest {
        api.gate = CompletableDeferred()
        val first = async { repo.refresh("u1") }
        val second = async { repo.refresh("u2") }
        runCurrent()
        api.gate!!.complete(Unit)

        assertTrue(first.await().isSuccess)
        assertTrue(second.await().isSuccess)
        assertEquals(2, api.calls)
    }

    @Test fun `dos refresh seguidos van los dos a la red`() = runTest {
        repo.refresh("u1")
        repo.refresh("u1")
        assertEquals(2, api.calls)
    }
}
```

- [ ] **Step 2: correrlo y ver que falla**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.routine.RoutineRepositorySingleFlightTest"`
Expected: FAIL `dos refresh a la vez...` (`expected:<1> but was:<2>` al final).

- [ ] **Step 3: implementación**

En `RoutineRepository.kt` agregar imports `kotlinx.coroutines.sync.Mutex` y `kotlinx.coroutines.sync.withLock`,
y reemplazar `refresh` por:

```kotlin
    private val refreshMutex = Mutex()

    /** Cuántas sincronizaciones buenas hubo y de quién fue la última (para no repetir un pedido recién hecho). */
    @Volatile private var successCount = 0L
    @Volatile private var successOwner: String? = null

    /**
     * Si falla, Room queda como estaba y el error viaja en un [DataException]. Un pedido a la vez: si mientras
     * esperaba terminó bien otro del mismo alumno (Hoy y Mis rutinas refrescando juntas), usa ese resultado.
     */
    suspend fun refresh(ownerId: String): Result<Unit> {
        val seen = successCount
        return refreshMutex.withLock {
            if (successCount != seen && successOwner == ownerId) return@withLock Result.success(Unit)
            fetch(ownerId).onSuccess {
                successCount++
                successOwner = ownerId
            }
        }
    }

    private suspend fun fetch(ownerId: String): Result<Unit> = try {
        val routines = api.mine().data
        dao.replaceAll(
            RoutineSyncEntity(ownerId = ownerId, lastSyncedAt = clock.millis()),
            routines.map { it.toEntity() },
            routines.flatMap { it.toExerciseEntities() },
        )
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toDataError(), e))
    }
```

Borrar el KDoc viejo de `refresh` ("Si falla, Room queda como estaba...") porque quedó en el nuevo.

- [ ] **Step 4: correr los tests del repo y de Hoy**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.routine.*" --tests "com.fittrainer.ui.today.*"`
Expected: PASS todos (incluido `si vuelve la red con un refresco en vuelo se cancela y se pide de nuevo`:
el pedido cancelado suelta el `Mutex` y no cuenta como éxito).

- [ ] **Step 5: Checkpoint** (sin commit).

---

### Task 2: extraer `RefreshController` de Hoy

**Files:**
- Create: `main/ui/refresh/RefreshController.kt`
- Modify: `main/ui/today/TodayViewModel.kt`
- Test: `test/ui/refresh/RefreshControllerTest.kt`

**Interfaces:**
- Produces:
  ```kotlin
  data class RefreshState(val isRefreshing: Boolean = false, val notice: String? = null)
  class RefreshController(
      scope: CoroutineScope,
      online: SharedFlow<Boolean>,       // con replay = 1
      ownerId: Flow<String?>,
      failureNotice: String,
      fetch: suspend (String) -> Result<Unit>,
  ) {
      val state: StateFlow<RefreshState>
      fun start()          // pantalla visible
      fun pull()           // pull-to-refresh
      fun dismissNotice()
  }
  ```

- [ ] **Step 1: test que falla**

```kotlin
package com.fittrainer.ui.refresh

import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

/** El grueso del comportamiento lo cubren los tests de Hoy (TodayViewModelTest y TodayViewModelRefreshTest). */
@OptIn(ExperimentalCoroutinesApi::class)
class RefreshControllerTest {

    private val online = MutableSharedFlow<Boolean>(replay = 1).apply { tryEmit(true) }

    @Test fun `un pull con un pedido en vuelo no dispara otro y avisa con el texto de la pantalla`() = runTest {
        val gate = CompletableDeferred<Unit>()
        var calls = 0
        val controller = RefreshController(backgroundScope, online, flowOf("u1"), "falló acá") {
            calls++
            gate.await()
            Result.failure(IOException("caído"))
        }
        controller.start()
        runCurrent()
        controller.pull()
        runCurrent()
        assertEquals(1, calls)

        gate.complete(Unit)
        runCurrent()
        assertEquals(1, calls)
        assertEquals("falló acá", controller.state.value.notice)
        assertFalse(controller.state.value.isRefreshing)
    }

    @Test fun `el automatico que falla no avisa`() = runTest {
        val controller = RefreshController(backgroundScope, online, flowOf("u1"), "falló") {
            Result.failure(IOException("caído"))
        }
        controller.start()
        runCurrent()
        assertNull(controller.state.value.notice)
    }
}
```

- [ ] **Step 2: correrlo y ver que falla**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.refresh.RefreshControllerTest"`
Expected: FAIL de compilación (`Unresolved reference: RefreshController`).

- [ ] **Step 3: crear `RefreshController.kt`**

Es la lógica de `TodayViewModel` movida tal cual; solo cambian los nombres públicos.

```kotlin
package com.fittrainer.ui.refresh

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** isRefreshing: hay un pedido en vuelo. notice: aviso suave del último pull-to-refresh fallido. */
data class RefreshState(val isRefreshing: Boolean = false, val notice: String? = null)

/**
 * Refresco en segundo plano de una pantalla que lee de Room: al quedar visible, al volver la red y con
 * pull-to-refresh. Nunca dos pedidos a la red a la vez desde la misma pantalla. Lo usan Hoy y Mis rutinas.
 * [online] tiene que repetir el último valor (replay = 1): el primero es el estado actual, no un cambio.
 */
class RefreshController(
    private val scope: CoroutineScope,
    private val online: SharedFlow<Boolean>,
    private val ownerId: Flow<String?>,
    private val failureNotice: String,
    private val fetch: suspend (String) -> Result<Unit>,
) {
    private val _state = MutableStateFlow(RefreshState())
    val state: StateFlow<RefreshState> = _state.asStateFlow()
    private var job: Job? = null
    private var manualRequested = false
    private var waitingToRetry = false

    init {
        // drop(1): el estado al suscribirse no es un cambio.
        scope.launch {
            online.drop(1).collect { isOnline ->
                when {
                    // Volvió la red: lo que estaba en vuelo salió por la red vieja (muerta). Se cancela y se arranca otro.
                    isOnline -> refresh(manual = false, restart = true)
                    // Se cortó la red mientras se esperaba para reintentar: no tiene sentido seguir.
                    waitingToRetry -> {
                        job?.cancel()
                        waitingToRetry = false
                    }
                }
            }
        }
    }

    /** La pantalla quedó visible (al entrar o al volver la app al frente). */
    fun start() = refresh(manual = false)

    fun pull() = refresh(manual = true)

    fun dismissNotice() = _state.update { it.copy(notice = null) }

    /**
     * Si ya hay un pedido en vuelo, un pull lo marca como manual (para que avise si falla) y no arranca otro.
     * Si solo se está esperando para reintentar, se arranca ya.
     */
    private fun refresh(manual: Boolean, restart: Boolean = false) {
        if (job?.isActive == true) {
            if (!restart && !waitingToRetry) {
                if (manual) manualRequested = true
                return
            }
            job?.cancel()
            manualRequested = manual || (restart && manualRequested)
        } else {
            manualRequested = manual
        }
        waitingToRetry = false
        job = scope.launch { run() }
    }

    /** Solo el refresco manual avisa si falla; el automático muestra lo que hay en Room sin alarmar. */
    private suspend fun run() {
        val owner = ownerId.filterNotNull().first()
        _state.update { it.copy(isRefreshing = true, notice = null) }
        var result = fetch(owner)
        for (wait in AUTO_RETRY_DELAYS_MS) {
            if (!shouldRetry(result)) break
            // La red recién vuelta puede no estar lista todavía (DNS, Wi-Fi sin validar): se reintenta.
            _state.update { it.copy(isRefreshing = false) }
            waitingToRetry = true
            delay(wait)
            waitingToRetry = false
            _state.update { it.copy(isRefreshing = true) }
            result = fetch(owner)
        }
        _state.value = RefreshState(notice = if (manualRequested && result.isFailure) failureNotice else null)
    }

    private suspend fun shouldRetry(result: Result<Unit>): Boolean {
        val offline = (result.exceptionOrNull() as? DataException)?.error == DataError.Offline
        return offline && !manualRequested && online.first()
    }

    private companion object {
        /** Reintentos del refresco automático que falla por red con el teléfono diciendo que hay red. */
        val AUTO_RETRY_DELAYS_MS = listOf(2_000L, 5_000L)
    }
}
```

- [ ] **Step 4: `TodayViewModel` usa el controller**

Reemplazar el cuerpo de la clase (constructor igual, para que los tests de Hoy no cambien):

```kotlin
/**
 * Pantalla "Hoy". Lee siempre de Room (vía el repositorio) y refresca en segundo plano con [RefreshController]:
 * al quedar visible, al volver la red y con pull-to-refresh.
 */
@HiltViewModel
class TodayViewModel @Inject constructor(
    repository: RoutineRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val student: StateFlow<AuthUser?> = sessionRepository.session
        .map { (it as? Session.Student)?.user }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.shareIn(viewModelScope, SharingStarted.Eagerly, replay = 1)
    private val today = MutableStateFlow(LocalDate.now(clock))
    private val refresher =
        RefreshController(viewModelScope, online, student.map { it?.id }, MANUAL_REFRESH_FAILED, repository::refresh)

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = student.filterNotNull().flatMapLatest { repository.observeCache(it.id) }

    val uiState: StateFlow<TodayUiState> =
        combine(cache, student, today, online, refresher.state) { c, user, date, isOnline, r ->
            TodayUiState(
                content = resolveToday(c.routines, date, everSynced = c.lastSyncedAt != null),
                studentName = user?.name.orEmpty(),
                today = date,
                isOffline = !isOnline,
                lastSyncedAt = c.lastSyncedAt,
                isRefreshing = r.isRefreshing,
                notice = r.notice,
            )
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), TodayUiState(today = LocalDate.now(clock)))

    /** La pantalla quedó visible (al entrar o al volver la app al frente): recalcula el día y refresca. */
    fun onStart() {
        today.value = LocalDate.now(clock)
        refresher.start()
    }

    fun onPullToRefresh() = refresher.pull()

    fun dismissNotice() = refresher.dismissNotice()
}
```

Imports: agregar `com.fittrainer.ui.refresh.RefreshController`; borrar los que quedaron sin uso
(`DataError`, `DataException`, `Job`, `delay`, `drop`, `first`, `update`, `launch`). `repository` deja de
ser `private val` (solo se usa en la inicialización).

- [ ] **Step 5: correr los tests**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.refresh.*" --tests "com.fittrainer.ui.today.*"`
Expected: PASS todos, **sin haber tocado** `TodayViewModelTest` ni `TodayViewModelRefreshTest`.

- [ ] **Step 6: Checkpoint** (sin commit).

---

### Task 3: estado puro de la lista de rutinas

**Files:**
- Create: `main/ui/routines/RoutinesUiState.kt`
- Test: `test/ui/routines/RoutinesContentTest.kt`

**Interfaces:**
- Consumes: `RoutineCache`, `Routine`, `resolveToday`, `TodayContent` (`data/routine`); `dayInitial`
  (`ui/today/RoutineTexts.kt`); `goalLabel` (`ui/join/InvitationMessages.kt`).
- Produces:
  ```kotlin
  const val ROUTINES_REFRESH_FAILED = "No pudimos actualizar. Mostrando tus últimas rutinas"
  data class RoutineCardUi(val id: String, val name: String, val goal: String?, val dayInitials: List<String>, val exercisesText: String, val isToday: Boolean)
  sealed interface RoutinesContent { data object NeverSynced; data object Empty; data class Routines(val cards: List<RoutineCardUi>) }
  data class RoutinesUiState(val content: RoutinesContent? = null, val isOffline: Boolean = false, val isRefreshing: Boolean = false, val notice: String? = null)
  fun routinesContent(cache: RoutineCache, date: LocalDate): RoutinesContent
  ```

- [ ] **Step 1: test que falla**

```kotlin
package com.fittrainer.ui.routines

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineCache
import com.fittrainer.data.routine.RoutineExercise
import java.time.DayOfWeek.FRIDAY
import java.time.DayOfWeek.MONDAY
import java.time.DayOfWeek.WEDNESDAY
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RoutinesContentTest {

    private val monday = LocalDate.of(2026, 10, 19)
    private val synced = Instant.parse("2026-10-19T09:00:00Z")

    private fun exercise(i: Int) = RoutineExercise("re-$i", "ex-$i", "Ej $i", "chest", null, null, 3, 10, 60, 40.0, null, null)

    private fun routine(id: String, days: Set<java.time.DayOfWeek>, created: String, n: Int = 2, goal: String? = "strength") =
        Routine(id, "Rutina $id", goal, days, Instant.parse(created), (0 until n).map(::exercise))

    @Test fun `sin sincronizar nunca`() {
        assertEquals(RoutinesContent.NeverSynced, routinesContent(RoutineCache(emptyList(), null), monday))
    }

    @Test fun `sincronizo sin rutinas`() {
        assertEquals(RoutinesContent.Empty, routinesContent(RoutineCache(emptyList(), synced), monday))
    }

    @Test fun `ordena de la mas nueva a la mas vieja y arma la tarjeta`() {
        val old = routine("a", setOf(FRIDAY, MONDAY), "2026-10-01T10:00:00Z", n = 1, goal = null)
        val new = routine("b", setOf(WEDNESDAY), "2026-10-10T10:00:00Z")
        val cards = (routinesContent(RoutineCache(listOf(old, new), synced), monday) as RoutinesContent.Routines).cards

        assertEquals(listOf("b", "a"), cards.map { it.id })
        assertEquals(listOf("L", "V"), cards[1].dayInitials) // lunes → domingo, no el orden del Set
        assertEquals("1 ejercicio", cards[1].exercisesText)
        assertEquals("2 ejercicios", cards[0].exercisesText)
        assertNull(cards[1].goal)
        assertEquals("Ganar fuerza", cards[0].goal)
    }

    @Test fun `la marca Hoy va solo en la rutina que muestra Hoy`() {
        val older = routine("a", setOf(MONDAY), "2026-10-01T10:00:00Z")
        val newer = routine("b", setOf(MONDAY), "2026-10-10T10:00:00Z")
        val other = routine("c", setOf(WEDNESDAY), "2026-10-05T10:00:00Z")
        val cards = (routinesContent(RoutineCache(listOf(older, newer, other), synced), monday) as RoutinesContent.Routines).cards

        assertEquals(listOf("b"), cards.filter { it.isToday }.map { it.id })
    }

    @Test fun `rutina sin dias no tiene chips ni marca`() {
        val card = (routinesContent(RoutineCache(listOf(routine("a", emptySet(), "2026-10-01T10:00:00Z")), synced), monday)
            as RoutinesContent.Routines).cards.single()
        assertEquals(emptyList<String>(), card.dayInitials)
        assertEquals(false, card.isToday)
    }
}
```

- [ ] **Step 2: correrlo y ver que falla**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.routines.RoutinesContentTest"`
Expected: FAIL de compilación (`Unresolved reference: routinesContent`).

- [ ] **Step 3: implementación**

```kotlin
package com.fittrainer.ui.routines

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineCache
import com.fittrainer.data.routine.TodayContent
import com.fittrainer.data.routine.resolveToday
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.today.dayInitial
import java.time.LocalDate

const val ROUTINES_REFRESH_FAILED = "No pudimos actualizar. Mostrando tus últimas rutinas"

/** Una rutina en la lista. dayInitials va de lunes a domingo. isToday: es la que muestra la pestaña Hoy. */
data class RoutineCardUi(
    val id: String,
    val name: String,
    val goal: String?,
    val dayInitials: List<String>,
    val exercisesText: String,
    val isToday: Boolean,
)

sealed interface RoutinesContent {
    data object NeverSynced : RoutinesContent
    data object Empty : RoutinesContent
    data class Routines(val cards: List<RoutineCardUi>) : RoutinesContent
}

/** content == null: todavía no se leyó Room. */
data class RoutinesUiState(
    val content: RoutinesContent? = null,
    val isOffline: Boolean = false,
    val isRefreshing: Boolean = false,
    val notice: String? = null,
)

/**
 * La marca "Hoy" sale de [resolveToday]: si dos rutinas tienen el día, se marca la que elige Hoy (la más
 * nueva), así las dos pestañas dicen lo mismo.
 */
fun routinesContent(cache: RoutineCache, date: LocalDate): RoutinesContent {
    if (cache.lastSyncedAt == null) return RoutinesContent.NeverSynced
    if (cache.routines.isEmpty()) return RoutinesContent.Empty
    val todayId = (resolveToday(cache.routines, date, everSynced = true) as? TodayContent.Training)?.routine?.id
    return RoutinesContent.Routines(
        cache.routines.sortedByDescending { it.createdAt }.map { it.toCard(isToday = it.id == todayId) },
    )
}

private fun Routine.toCard(isToday: Boolean) = RoutineCardUi(
    id = id,
    name = name,
    goal = goal?.let(::goalLabel),
    dayInitials = days.sorted().map(::dayInitial),
    exercisesText = if (exercises.size == 1) "1 ejercicio" else "${exercises.size} ejercicios",
    isToday = isToday,
)
```

- [ ] **Step 4: correr el test**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.routines.RoutinesContentTest"`
Expected: PASS.

- [ ] **Step 5: Checkpoint** (sin commit).

---

### Task 4: `RoutinesViewModel` y la pantalla de la lista

**Files:**
- Create: `main/ui/routines/RoutinesViewModel.kt`, `main/ui/routines/RoutinesScreen.kt`,
  `main/ui/routines/components/RoutineCard.kt`, `main/ui/routines/components/LibraryEntryCard.kt`
- Test: `test/ui/routines/RoutinesViewModelTest.kt`

**Interfaces:**
- Consumes: `RefreshController` (Task 2), `routinesContent`/`RoutinesUiState`/`ROUTINES_REFRESH_FAILED` (Task 3).
- Produces:
  ```kotlin
  class RoutinesViewModel(repository: RoutineRepository, sessionRepository: SessionRepository, connectivity: ConnectivityObserver, clock: Clock) {
      val uiState: StateFlow<RoutinesUiState>
      fun onStart(); fun onPullToRefresh(); fun dismissNotice()
  }
  @Composable fun RoutinesScreen(onOpenRoutine: (String) -> Unit, onOpenLibrary: () -> Unit, viewModel: RoutinesViewModel = hiltViewModel())
  ```

- [ ] **Step 1: test que falla**

```kotlin
package com.fittrainer.ui.routines

import com.fittrainer.data.api.MineResponse
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.StepClock
import com.fittrainer.testing.fakes.routine.routineDto
import java.io.IOException
import java.time.LocalDate
import java.time.ZoneOffset
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class RoutinesViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val monday = LocalDate.of(2026, 10, 19)
    private val clock = StepClock(monday.atTime(10, 0).toInstant(ZoneOffset.UTC))
    private val api = FakeRoutineApi() // por defecto: una rutina de los lunes
    private val connectivity = FakeConnectivityObserver(online = true)

    private fun viewModel() =
        RoutinesViewModel(RoutineRepository(api, FakeRoutineDao(), clock), FakeStudentSession(), connectivity, clock)

    private fun TestScope.collect(vm: RoutinesViewModel) =
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    @Test fun `sin red y sin datos nunca sincronizo`() = runTest {
        connectivity.state.value = false
        api.error = IOException("sin red")
        val vm = viewModel()
        collect(vm)
        vm.onStart()

        assertEquals(RoutinesContent.NeverSynced, vm.uiState.value.content)
        assertTrue(vm.uiState.value.isOffline)
    }

    @Test fun `al quedar visible trae las rutinas y marca la de hoy`() = runTest {
        api.response = MineResponse(listOf(routineDto("rt-1"), routineDto("rt-2", days = listOf("friday"), createdAt = "2026-10-05T10:00:00+00:00")))
        val vm = viewModel()
        collect(vm)
        vm.onStart()

        val cards = (vm.uiState.value.content as RoutinesContent.Routines).cards
        assertEquals(listOf("rt-2", "rt-1"), cards.map { it.id })
        assertEquals(listOf("rt-1"), cards.filter { it.isToday }.map { it.id })
    }

    @Test fun `sincronizo sin rutinas`() = runTest {
        api.response = MineResponse(emptyList())
        val vm = viewModel()
        collect(vm)
        vm.onStart()

        assertEquals(RoutinesContent.Empty, vm.uiState.value.content)
    }

    @Test fun `offline con cache muestra lo guardado`() = runTest {
        val vm = viewModel()
        collect(vm)
        vm.onStart()
        connectivity.state.value = false

        assertTrue(vm.uiState.value.content is RoutinesContent.Routines)
        assertTrue(vm.uiState.value.isOffline)
    }

    @Test fun `el pull que falla avisa con el texto de Mis rutinas`() = runTest {
        val vm = viewModel()
        collect(vm)
        vm.onStart()
        api.error = IOException("caído")
        vm.onPullToRefresh()

        assertEquals(ROUTINES_REFRESH_FAILED, vm.uiState.value.notice)
    }
}
```

- [ ] **Step 2: correrlo y ver que falla**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.routines.RoutinesViewModelTest"`
Expected: FAIL de compilación (`Unresolved reference: RoutinesViewModel`).

- [ ] **Step 3: `RoutinesViewModel.kt`**

```kotlin
package com.fittrainer.ui.routines

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.ui.refresh.RefreshController
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
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.shareIn
import kotlinx.coroutines.flow.stateIn

/** Mis rutinas: lee de Room y refresca como Hoy (el repositorio junta los pedidos de las dos pestañas). */
@HiltViewModel
class RoutinesViewModel @Inject constructor(
    repository: RoutineRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
    private val clock: Clock,
) : ViewModel() {

    private val ownerId: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val online = connectivity.isOnline.shareIn(viewModelScope, SharingStarted.Eagerly, replay = 1)
    private val today = MutableStateFlow(LocalDate.now(clock))
    private val refresher = RefreshController(viewModelScope, online, ownerId, ROUTINES_REFRESH_FAILED, repository::refresh)

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cache = ownerId.filterNotNull().flatMapLatest { repository.observeCache(it) }

    val uiState: StateFlow<RoutinesUiState> =
        combine(cache, today, online, refresher.state) { c, date, isOnline, r ->
            RoutinesUiState(routinesContent(c, date), isOffline = !isOnline, isRefreshing = r.isRefreshing, notice = r.notice)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), RoutinesUiState())

    /** Visible de nuevo: recalcula el día (para la marca "Hoy") y refresca. */
    fun onStart() {
        today.value = LocalDate.now(clock)
        refresher.start()
    }

    fun onPullToRefresh() = refresher.pull()

    fun dismissNotice() = refresher.dismissNotice()
}
```

- [ ] **Step 4: correr el test**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.routines.RoutinesViewModelTest"`
Expected: PASS.

- [ ] **Step 5: componentes**

`components/LibraryEntryCard.kt`:

```kotlin
package com.fittrainer.ui.routines.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Entrada fija a la biblioteca: se ve aunque no haya rutinas ni red. */
@Composable
fun LibraryEntryCard(onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp)
            .clip(MaterialTheme.shapes.medium)
            .background(FtColors.Card)
            .clickable(onClickLabel = "Abrir la biblioteca", onClick = onClick)
            .padding(horizontal = Spacing.md, vertical = Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text("Biblioteca de ejercicios", style = MaterialTheme.typography.titleSmall, color = FtColors.TextPrimary)
            Text("Todos los ejercicios de tu entrenador", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = FtColors.TextSecondary)
    }
}
```

`components/RoutineCard.kt`:

```kotlin
package com.fittrainer.ui.routines.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.fittrainer.ui.routines.RoutineCardUi
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Una rutina asignada: nombre, objetivo, días y cantidad de ejercicios. La de hoy lleva la marca "HOY". */
@Composable
fun RoutineCard(card: RoutineCardUi, onClick: () -> Unit) {
    val shape = MaterialTheme.shapes.large
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(FtColors.Card)
            .border(1.dp, if (card.isToday) FtColors.Brand else FtColors.Border, shape)
            .clickable(onClickLabel = "Ver la rutina", onClick = onClick)
            .padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(card.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary, modifier = Modifier.weight(1f))
            if (card.isToday) {
                Text(
                    "HOY",
                    style = MaterialTheme.typography.labelSmall,
                    color = FtColors.TextPrimary,
                    modifier = Modifier.background(FtColors.Brand, MaterialTheme.shapes.small).padding(horizontal = Spacing.sm, vertical = 2.dp),
                )
            }
        }
        card.goal?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary) }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            card.dayInitials.forEach { DayChip(it) }
            Text(
                card.exercisesText,
                style = MaterialTheme.typography.labelSmall,
                color = FtColors.TextSecondary,
                modifier = Modifier.weight(1f).padding(start = Spacing.sm),
            )
        }
    }
}

@Composable
private fun DayChip(initial: String) {
    Box(Modifier.size(24.dp).background(FtColors.Elevated, CircleShape), contentAlignment = Alignment.Center) {
        Text(initial, style = MaterialTheme.typography.labelSmall, color = FtColors.TextPrimary)
    }
}
```

- [ ] **Step 6: `RoutinesScreen.kt`**

```kotlin
package com.fittrainer.ui.routines

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.components.exercise.SectionLabel
import com.fittrainer.ui.routines.components.LibraryEntryCard
import com.fittrainer.ui.routines.components.RoutineCard
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Mis rutinas del alumno (sin mockup: componentes y tema de la Rutina del día). */
@Composable
fun RoutinesScreen(
    onOpenRoutine: (String) -> Unit,
    onOpenLibrary: () -> Unit,
    viewModel: RoutinesViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    // ON_START: al entrar a la pestaña y cada vez que la app vuelve al frente.
    LifecycleStartEffect(viewModel) {
        viewModel.onStart()
        onStopOrDispose { }
    }
    RoutinesBody(state, onOpenRoutine, onOpenLibrary, viewModel::onPullToRefresh, viewModel::dismissNotice)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoutinesBody(
    state: RoutinesUiState,
    onOpenRoutine: (String) -> Unit,
    onOpenLibrary: () -> Unit,
    onRefresh: () -> Unit,
    onDismissNotice: () -> Unit,
) {
    val content = state.content
    PullToRefreshBox(
        isRefreshing = state.isRefreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize().background(FtColors.Background),
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    Text("Mis rutinas", style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
                    if (state.isOffline) {
                        OfflineIndicator(if (content is RoutinesContent.Routines) "Sin conexión · mostrando lo guardado" else "Sin conexión")
                    }
                }
            }
            state.notice?.let { notice -> item { NoticeBanner(notice, onDismissNotice) } }
            item { LibraryEntryCard(onOpenLibrary) }
            when (content) {
                RoutinesContent.NeverSynced -> item {
                    InfoCard("Todavía no hay datos", "Conectate una vez para descargar tus rutinas.")
                }
                RoutinesContent.Empty -> item {
                    InfoCard("Sin rutinas por ahora", "Tu entrenador todavía no te asignó rutinas.")
                }
                is RoutinesContent.Routines -> {
                    item { SectionLabel("RUTINAS ASIGNADAS", content.cards.size.toString()) }
                    items(content.cards, key = { it.id }) { card -> RoutineCard(card) { onOpenRoutine(card.id) } }
                }
                null -> Unit
            }
        }
    }
}
```

- [ ] **Step 7: compila**

Run: `./gradlew checkFileLength assembleDebug`
Expected: BUILD SUCCESSFUL (la pantalla todavía no está cableada; eso es la Task 7).

- [ ] **Step 8: Checkpoint** (sin commit).

---

### Task 5: `startAction` y textos del detalle

**Files:**
- Create: `main/ui/routines/detail/StartAction.kt`
- Test: `test/ui/routines/detail/StartActionTest.kt`

**Interfaces:**
- Consumes: `Routine`, `RoutineExercise` (`data/routine`), `Workout` (`data/workout`, campos `routineId: String?`,
  `routineName: String`), `setsReps` (`ui/today/RoutineTexts.kt`), `formatKg`/`muscleLabel`
  (`ui/components/exercise/ExerciseTexts.kt`).
- Produces:
  ```kotlin
  sealed interface StartAction { data object Start; data object Continue; data class Blocked(val otherRoutineName: String); data object NoExercises }
  fun startAction(routine: Routine, active: Workout?): StartAction
  fun detailSubtitle(exercise: RoutineExercise): String   // "4×10 · 60 kg · 90 s · Pecho"
  ```

- [ ] **Step 1: test que falla**

```kotlin
package com.fittrainer.ui.routines.detail

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.testing.fakes.workout.workout
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class StartActionTest {

    private fun exercise(sets: Int? = 4, reps: Int? = 10, kg: Double? = 60.0, rest: Int? = 90, muscle: String? = "chest") =
        RoutineExercise("re-1", "ex-1", "Press", muscle, null, null, sets, reps, rest, kg, null, null)

    private fun routine(id: String = "rt-1", exercises: List<RoutineExercise> = listOf(exercise())) =
        Routine(id, "Pecho", null, emptySet(), Instant.EPOCH, exercises)

    // workout() de los fixtures es de la rutina "rt-1" y se llama "Push".

    @Test fun `sin sesion abierta se puede empezar`() {
        assertEquals(StartAction.Start, startAction(routine(), active = null))
    }

    @Test fun `con la sesion de esta rutina se continua aunque ya no tenga ejercicios`() {
        assertEquals(StartAction.Continue, startAction(routine(exercises = emptyList()), workout()))
    }

    @Test fun `con la sesion de otra rutina queda bloqueado con su nombre`() {
        assertEquals(StartAction.Blocked("Push"), startAction(routine(id = "rt-2"), workout()))
    }

    @Test fun `una sesion sin rutina tambien bloquea`() {
        assertEquals(StartAction.Blocked("Push"), startAction(routine(), workout().copy(routineId = null)))
    }

    @Test fun `sin ejercicios y sin sesion no se puede empezar`() {
        assertEquals(StartAction.NoExercises, startAction(routine(exercises = emptyList()), active = null))
    }

    @Test fun `subtitulo completo y sin separadores colgando`() {
        assertEquals("4×10 · 60 kg · 90 s · Pecho", detailSubtitle(exercise()))
        assertEquals("4 series · Pecho", detailSubtitle(exercise(reps = null, kg = null, rest = null)))
        assertEquals("", detailSubtitle(exercise(sets = null, reps = null, kg = null, rest = null, muscle = null)))
    }
}
```

(Si `muscleLabel("chest")` no devuelve "Pecho", ajustar el texto esperado al que devuelve el mapa
`MUSCLES` de `ExerciseTexts.kt`.)

- [ ] **Step 2: correrlo y ver que falla**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.routines.detail.StartActionTest"`
Expected: FAIL de compilación (`Unresolved reference: startAction`).

- [ ] **Step 3: implementación**

```kotlin
package com.fittrainer.ui.routines.detail

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.data.workout.Workout
import com.fittrainer.ui.components.exercise.formatKg
import com.fittrainer.ui.components.exercise.muscleLabel
import com.fittrainer.ui.today.setsReps

/** Qué ofrece la barra de abajo del detalle de una rutina. */
sealed interface StartAction {
    data object Start : StartAction
    data object Continue : StartAction

    /** Hay una sesión abierta de otra rutina: una sola a la vez, se termina desde la sesión. */
    data class Blocked(val otherRoutineName: String) : StartAction

    /** El repositorio no deja arrancar una rutina vacía. */
    data object NoExercises : StartAction
}

/**
 * La sesión abierta manda: si es de esta rutina se continúa (aunque la rutina haya cambiado), si es de otra
 * (o de una rutina que ya no existe, routineId nulo) se bloquea. Recién sin sesión se mira si hay ejercicios.
 */
fun startAction(routine: Routine, active: Workout?): StartAction = when {
    active != null && active.routineId == routine.id -> StartAction.Continue
    active != null -> StartAction.Blocked(active.routineName)
    routine.exercises.isEmpty() -> StartAction.NoExercises
    else -> StartAction.Start
}

/** "4×10 · 60 kg · 90 s · Pecho", sin separadores colgando si falta algo. */
fun detailSubtitle(exercise: RoutineExercise): String = listOf(
    setsReps(exercise),
    exercise.suggestedKg?.let(::formatKg).orEmpty(),
    exercise.restSeconds?.let { "$it s" }.orEmpty(),
    muscleLabel(exercise.muscleGroup),
).filter { it.isNotBlank() }.joinToString(" · ")
```

- [ ] **Step 4: correr el test**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.routines.detail.StartActionTest"`
Expected: PASS.

- [ ] **Step 5: Checkpoint** (sin commit).

---

### Task 6: detalle de la rutina (ViewModel + pantalla)

**Files:**
- Create: `main/ui/routines/detail/RoutineDetailUiState.kt`, `main/ui/routines/detail/RoutineDetailViewModel.kt`,
  `main/ui/routines/detail/RoutineDetailScreen.kt`, `main/ui/routines/detail/components/StartBar.kt`
- Test: `test/ui/routines/detail/RoutineDetailViewModelTest.kt`

**Interfaces:**
- Consumes: `startAction`, `StartAction`, `detailSubtitle` (Task 5); `RoutineRepository.observeCache`;
  `WorkoutRepository.observeActive` / `start(ownerId, routine)`; `START_FAILED` (`ui/workout/WorkoutTexts.kt`);
  `toDetail()` (`ui/today/RoutineTexts.kt`).
- Produces:
  ```kotlin
  const val ROUTINE_ID_ARG = "routineId"
  sealed interface RoutineDetailContent { data class Loaded(val routine: Routine, val action: StartAction); data object Missing }
  data class RoutineDetailUiState(val content: RoutineDetailContent? = null, val isOffline: Boolean = false, val error: String? = null)
  class RoutineDetailViewModel(handle: SavedStateHandle, routines: RoutineRepository, workouts: WorkoutRepository, sessionRepository: SessionRepository, connectivity: ConnectivityObserver) {
      val uiState: StateFlow<RoutineDetailUiState>
      fun start(onReady: () -> Unit); fun dismissError()
  }
  @Composable fun RoutineDetailScreen(onBack: () -> Unit, onOpenWorkout: () -> Unit, viewModel: RoutineDetailViewModel = hiltViewModel())
  ```

- [ ] **Step 1: test que falla**

```kotlin
package com.fittrainer.ui.routines.detail

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.data.api.MineResponse
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.testing.MainDispatcherRule
import com.fittrainer.testing.fakes.auth.MutableClock
import com.fittrainer.testing.fakes.routine.FakeConnectivityObserver
import com.fittrainer.testing.fakes.routine.FakeRoutineApi
import com.fittrainer.testing.fakes.routine.FakeRoutineDao
import com.fittrainer.testing.fakes.routine.FakeStudentSession
import com.fittrainer.testing.fakes.routine.routineDto
import com.fittrainer.testing.fakes.workout.FakeWorkoutDao
import com.fittrainer.testing.fakes.workout.T0
import com.fittrainer.ui.workout.START_FAILED
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class RoutineDetailViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val clock = MutableClock(T0.toEpochMilli())
    private val api = FakeRoutineApi(MineResponse(listOf(routineDto("rt-1"), routineDto("rt-2"))))
    private val routines = RoutineRepository(api, FakeRoutineDao(), clock)
    private val workoutDao = FakeWorkoutDao()
    private var next = 0
    private val workouts = WorkoutRepository(workoutDao, clock) { "id-${next++}" }

    private fun viewModel(id: String = "rt-1") = RoutineDetailViewModel(
        SavedStateHandle(mapOf(ROUTINE_ID_ARG to id)), routines, workouts, FakeStudentSession(), FakeConnectivityObserver(),
    )

    private fun TestScope.collect(vm: RoutineDetailViewModel) =
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

    private fun loaded(vm: RoutineDetailViewModel) = vm.uiState.value.content as RoutineDetailContent.Loaded

    @Test fun `muestra la rutina y deja empezar`() = runTest {
        routines.refresh("u1")
        val vm = viewModel()
        collect(vm)

        assertEquals("rt-1", loaded(vm).routine.id)
        assertEquals(StartAction.Start, loaded(vm).action)
    }

    @Test fun `una rutina que no esta en el cache`() = runTest {
        routines.refresh("u1")
        val vm = viewModel("rt-9")
        collect(vm)

        assertEquals(RoutineDetailContent.Missing, vm.uiState.value.content)
    }

    @Test fun `si la rutina desaparece mientras se mira pasa a no disponible`() = runTest {
        routines.refresh("u1")
        val vm = viewModel("rt-2")
        collect(vm)
        api.response = MineResponse(listOf(routineDto("rt-1")))
        routines.refresh("u1")

        assertEquals(RoutineDetailContent.Missing, vm.uiState.value.content)
    }

    @Test fun `empezar arranca la sesion y recien ahi navega`() = runTest {
        routines.refresh("u1")
        val vm = viewModel()
        collect(vm)
        var opened = false
        vm.start { opened = true }

        assertTrue(opened)
        assertEquals(StartAction.Continue, loaded(vm).action)
    }

    @Test fun `con la sesion de otra rutina abierta queda bloqueado`() = runTest {
        routines.refresh("u1")
        val other = viewModel("rt-2")
        collect(other)
        other.start { }
        val vm = viewModel("rt-1")
        collect(vm)

        assertEquals(StartAction.Blocked("Rutina rt-2"), loaded(vm).action)
    }

    @Test fun `si Room falla no navega y avisa`() = runTest {
        routines.refresh("u1")
        workoutDao.failWrites = true
        val vm = viewModel()
        collect(vm)
        var opened = false
        vm.start { opened = true }

        assertFalse(opened)
        assertEquals(START_FAILED, vm.uiState.value.error)
        vm.dismissError()
        assertEquals(null, vm.uiState.value.error)
    }
}
```

(`MutableClock` es el de `testing/fakes/auth`, el mismo que usa `WorkoutRepositoryTest`; si su constructor
difiere, copiar cómo lo construye ese test.)

- [ ] **Step 2: correrlo y ver que falla**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.routines.detail.RoutineDetailViewModelTest"`
Expected: FAIL de compilación (`Unresolved reference: RoutineDetailViewModel`).

- [ ] **Step 3: `RoutineDetailUiState.kt`**

```kotlin
package com.fittrainer.ui.routines.detail

import com.fittrainer.data.routine.Routine
import com.fittrainer.data.routine.RoutineCache
import com.fittrainer.data.workout.Workout

sealed interface RoutineDetailContent {
    data class Loaded(val routine: Routine, val action: StartAction) : RoutineDetailContent

    /** No está en el caché: el entrenador la desactivó (o nunca estuvo). */
    data object Missing : RoutineDetailContent
}

/** content == null: todavía no se leyó Room. error: no se pudo abrir la sesión. */
data class RoutineDetailUiState(
    val content: RoutineDetailContent? = null,
    val isOffline: Boolean = false,
    val error: String? = null,
)

fun detailContent(cache: RoutineCache, routineId: String, active: Workout?): RoutineDetailContent =
    cache.routines.firstOrNull { it.id == routineId }
        ?.let { RoutineDetailContent.Loaded(it, startAction(it, active)) }
        ?: RoutineDetailContent.Missing
```

- [ ] **Step 4: `RoutineDetailViewModel.kt`**

```kotlin
package com.fittrainer.ui.routines.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.network.ConnectivityObserver
import com.fittrainer.data.routine.RoutineRepository
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.workout.WorkoutRepository
import com.fittrainer.ui.workout.START_FAILED
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
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

const val ROUTINE_ID_ARG = "routineId"

/** Mis rutinas → una rutina. Solo lee Room: el refresco lo hace la lista (y Hoy). */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class RoutineDetailViewModel @Inject constructor(
    handle: SavedStateHandle,
    routines: RoutineRepository,
    private val workouts: WorkoutRepository,
    sessionRepository: SessionRepository,
    connectivity: ConnectivityObserver,
) : ViewModel() {

    private val routineId: String = checkNotNull(handle[ROUTINE_ID_ARG])
    private val ownerId: StateFlow<String?> = sessionRepository.session
        .map { (it as? Session.Student)?.user?.id }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    private val error = MutableStateFlow<String?>(null)

    val uiState: StateFlow<RoutineDetailUiState> = ownerId.filterNotNull()
        .flatMapLatest { owner ->
            combine(routines.observeCache(owner), workouts.observeActive(owner), connectivity.isOnline, error) { c, active, online, err ->
                RoutineDetailUiState(detailContent(c, routineId, active), isOffline = !online, error = err)
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), RoutineDetailUiState())

    /** "Empezar": la sesión queda guardada en Room antes de navegar. Si Room falla, aviso y no se navega. */
    fun start(onReady: () -> Unit) {
        val owner = ownerId.value ?: return
        val routine = (uiState.value.content as? RoutineDetailContent.Loaded)?.routine ?: return
        viewModelScope.launch {
            try {
                workouts.start(owner, routine)
                onReady()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error.value = START_FAILED
            }
        }
    }

    fun dismissError() { error.value = null }
}
```

- [ ] **Step 5: correr el test**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.routines.detail.*"`
Expected: PASS.

- [ ] **Step 6: `components/StartBar.kt`**

```kotlin
package com.fittrainer.ui.routines.detail.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.routines.detail.StartAction
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Barra de abajo del detalle (spec §3.2). Con otra sesión abierta, el botón se apaga y se ofrece ir a esa. */
@Composable
fun StartBar(action: StartAction, onStart: () -> Unit, onOpenWorkout: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(FtColors.Surface).padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Button(
            onClick = if (action == StartAction.Continue) onOpenWorkout else onStart,
            enabled = action == StartAction.Start || action == StartAction.Continue,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) {
            Text(if (action == StartAction.Continue) "Continuar sesión" else "Empezar")
        }
        when (action) {
            is StartAction.Blocked -> {
                Text(
                    "Tenés una sesión abierta de ${action.otherRoutineName}, terminala primero",
                    style = MaterialTheme.typography.bodySmall,
                    color = FtColors.TextSecondary,
                )
                TextButton(onClick = onOpenWorkout, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                    Text("Ir a la sesión")
                }
            }
            StartAction.NoExercises -> Text(
                "Esta rutina no tiene ejercicios",
                style = MaterialTheme.typography.bodySmall,
                color = FtColors.TextSecondary,
            )
            else -> Unit
        }
    }
}
```

- [ ] **Step 7: `RoutineDetailScreen.kt`**

```kotlin
package com.fittrainer.ui.routines.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.routine.RoutineExercise
import com.fittrainer.ui.components.InfoCard
import com.fittrainer.ui.components.NoticeBanner
import com.fittrainer.ui.components.OfflineIndicator
import com.fittrainer.ui.components.exercise.ExerciseDetailSheet
import com.fittrainer.ui.components.exercise.ExerciseRow
import com.fittrainer.ui.components.exercise.SectionLabel
import com.fittrainer.ui.join.goalLabel
import com.fittrainer.ui.routines.detail.components.StartBar
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import com.fittrainer.ui.today.dayName
import com.fittrainer.ui.today.toDetail

/** Mis rutinas → una rutina: sus ejercicios y "Empezar" aunque hoy no le toque. */
@Composable
fun RoutineDetailScreen(onBack: () -> Unit, onOpenWorkout: () -> Unit, viewModel: RoutineDetailViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var selected by remember { mutableStateOf<RoutineExercise?>(null) }
    val loaded = state.content as? RoutineDetailContent.Loaded
    Column(Modifier.fillMaxSize().background(FtColors.Background)) {
        LazyColumn(
            Modifier.weight(1f),
            contentPadding = PaddingValues(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    IconButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                    }
                    loaded?.let { Text(it.routine.name, style = MaterialTheme.typography.titleMedium, color = FtColors.TextPrimary) }
                }
            }
            if (state.isOffline) item { OfflineIndicator("Sin conexión · mostrando lo guardado") }
            state.error?.let { item { NoticeBanner(it, viewModel::dismissError) } }
            when (val content = state.content) {
                is RoutineDetailContent.Loaded -> {
                    val routine = content.routine
                    val summary = listOfNotNull(
                        routine.goal?.let(::goalLabel),
                        routine.days.sorted().joinToString(", ") { dayName(it) }.takeIf { it.isNotEmpty() },
                    ).joinToString(" · ")
                    if (summary.isNotEmpty()) item { Text(summary, style = MaterialTheme.typography.bodySmall, color = FtColors.TextSecondary) }
                    item { SectionLabel("EJERCICIOS", routine.exercises.size.toString()) }
                    items(routine.exercises, key = { it.id }) { exercise ->
                        ExerciseRow(exercise.name, detailSubtitle(exercise), onClick = { selected = exercise })
                    }
                }
                RoutineDetailContent.Missing -> {
                    item { InfoCard("Esta rutina ya no está disponible", "Puede que tu entrenador la haya desactivado.") }
                    item { TextButton(onClick = onBack, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Volver") } }
                }
                null -> Unit
            }
        }
        loaded?.let { StartBar(it.action, onStart = { viewModel.start(onOpenWorkout) }, onOpenWorkout = onOpenWorkout) }
    }
    selected?.let { exercise ->
        ExerciseDetailSheet(exercise.toDetail(), canOpenVideo = !state.isOffline, onDismiss = { selected = null })
    }
}
```

- [ ] **Step 8: compila**

Run: `./gradlew checkFileLength assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 9: Checkpoint** (sin commit).

---

### Task 7: navegación

**Files:**
- Modify: `main/navigation/RoleTabs.kt`, `main/navigation/RoleShell.kt`, `main/ui/library/LibraryScreen.kt`
- Test: `test/navigation/RoleTabsTest.kt`

**Interfaces:**
- Consumes: `RoutinesScreen` (Task 4), `RoutineDetailScreen`, `ROUTINE_ID_ARG` (Task 6).
- Produces: `STUDENT_ROUTINES_ROUTE`, `STUDENT_LIBRARY_ROUTE = "student/library"`, `ROUTINE_DETAIL_ROUTE`,
  `routineDetailRoute(id)`, `isTabSelected` generalizado; `LibraryScreen(onBack: (() -> Unit)? = null, ...)`.

- [ ] **Step 1: tests que fallan** — agregar a `RoleTabsTest`:

```kotlin
    @Test fun misRutinasQuedaMarcadaEnElDetalleYEnLaBiblioteca() {
        assertTrue(isTabSelected(STUDENT_ROUTINES_ROUTE, routineDetailRoute("a")))
        assertTrue(isTabSelected(STUDENT_ROUTINES_ROUTE, ROUTINE_DETAIL_ROUTE))
        assertTrue(isTabSelected(STUDENT_ROUTINES_ROUTE, STUDENT_LIBRARY_ROUTE))
        assertFalse(isTabSelected(STUDENT_PROGRESS_ROUTE, routineDetailRoute("a")))
        assertFalse(isTabSelected(STUDENT_ROUTINES_ROUTE, historyDetailRoute("a")))
    }
```

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.navigation.RoleTabsTest"`
Expected: FAIL de compilación (`Unresolved reference: STUDENT_ROUTINES_ROUTE`).

- [ ] **Step 2: `RoleTabs.kt`**

Reemplazar `const val STUDENT_LIBRARY_ROUTE = "student/routines"` y la función `isTabSelected` por:

```kotlin
const val STUDENT_ROUTINES_ROUTE = "student/routines"

/** Mis rutinas → una rutina, y Mis rutinas → biblioteca (la biblioteca no cuelga de student/routines/ para no chocar con {routineId}). */
const val ROUTINE_DETAIL_ROUTE = "student/routines/{$ROUTINE_ID_ARG}"
fun routineDetailRoute(routineId: String) = "student/routines/$routineId"
const val STUDENT_LIBRARY_ROUTE = "student/library"
```

```kotlin
/** Las pantallas hijas dejan marcada su pestaña: el historial cuelga de Progreso; el detalle y la biblioteca, de Mis rutinas. */
fun isTabSelected(tabRoute: String, currentRoute: String?): Boolean =
    currentRoute == tabRoute || (currentRoute != null && parentTab(currentRoute) == tabRoute)

private fun parentTab(route: String): String? = when {
    route.startsWith("student/history/") -> STUDENT_PROGRESS_ROUTE
    route.startsWith("$STUDENT_ROUTINES_ROUTE/") || route == STUDENT_LIBRARY_ROUTE -> STUDENT_ROUTINES_ROUTE
    else -> null
}
```

Import `com.fittrainer.ui.routines.detail.ROUTINE_ID_ARG`. En `StudentTabs`, la pestaña Mis rutinas pasa a
`Tab(STUDENT_ROUTINES_ROUTE, "Mis rutinas", Icons.AutoMirrored.Filled.List)`.

- [ ] **Step 3: `LibraryScreen.kt` con `onBack` opcional**

- `fun LibraryScreen(onBack: (() -> Unit)? = null, viewModel: LibraryViewModel = hiltViewModel())` y se
  pasa `onBack` a `LibraryBody` como último parámetro `onBack: (() -> Unit)? = null`.
- En el `item` del título, envolver el `Text(LIBRARY_TITLE, …)` en una `Row` con la flecha si hay `onBack`:

```kotlin
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                        onBack?.let {
                            IconButton(onClick = it, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = FtColors.TextPrimary)
                            }
                        }
                        Text(LIBRARY_TITLE, style = MaterialTheme.typography.headlineSmall, color = FtColors.TextPrimary)
                    }
```

Imports nuevos: `Row`, `heightIn`, `Icons`, `ArrowBack` (automirrored), `Icon`, `IconButton`, `Alignment`.
Verificar que `LibraryScreen.kt` siga ≤ 200 líneas. Si `LibraryBody` se usa en tests con argumentos
posicionales, el parámetro nuevo con default al final no los rompe.

- [ ] **Step 4: `RoleShell.kt`**

- Imports: `com.fittrainer.ui.routines.RoutinesScreen`, `com.fittrainer.ui.routines.detail.RoutineDetailScreen`.
- Antes del `Scaffold`:

```kotlin
    val openWorkout: () -> Unit = { navController.navigate(WORKOUT_ROUTE) { launchSingleTop = true } }
```

- En el `when` de las pestañas: `TodayScreen(onOpenWorkout = openWorkout)` y reemplazar la línea de la
  biblioteca por:

```kotlin
                        tab.route == STUDENT_ROUTINES_ROUTE -> RoutinesScreen(
                            onOpenRoutine = { navController.navigate(routineDetailRoute(it)) },
                            onOpenLibrary = { navController.navigate(STUDENT_LIBRARY_ROUTE) },
                        )
```

- Destinos nuevos (después de `HISTORY_DETAIL_ROUTE`) y salida de la sesión:

```kotlin
            composable(ROUTINE_DETAIL_ROUTE) {
                RoutineDetailScreen(onBack = { navController.popBackStack() }, onOpenWorkout = openWorkout)
            }
            composable(STUDENT_LIBRARY_ROUTE) {
                LibraryScreen(onBack = { navController.popBackStack() })
            }
            composable(WORKOUT_ROUTE) {
                // Vuelve a donde se entró (Hoy o el detalle de una rutina). Hoy es el inicio del grafo y siempre está
                // abajo de la pila; el navigate es solo por si algún día no lo está.
                WorkoutScreen(onExit = { if (!navController.popBackStack()) navController.navigate(STUDENT_TODAY_ROUTE) })
            }
```

- Actualizar el KDoc de `RoleShell` ("Máximo 2 niveles: pestaña → Estado del servidor") a
  "pestaña → pantalla hija (Estado del servidor, detalle del historial, detalle de rutina, biblioteca)".

- [ ] **Step 5: tests y compilación completa**

Run: `./gradlew checkFileLength assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL, todos los tests en verde.

- [ ] **Step 6: Checkpoint** (sin commit).

---

### Task 8: verificación de punta a punta

**Files:** ninguno de código. Datos de prueba en Supabase dev.

- [ ] **Step 1: segunda rutina para `alumna.card8`**

Con el MCP de Supabase (`execute_sql`, proyecto dev), primero leer el esquema real (`list_tables` de
`routines` y `routine_exercises`) y la rutina activa actual de `alumna.card8`. Insertar una rutina activa
nueva del mismo entrenador, con días distintos a la actual (que **no** incluya hoy) y 2-3 ejercicios de la
biblioteca, más una tercera **sin ejercicios** para ver el caso "no tiene ejercicios". Anotar los ids creados.

- [ ] **Step 2: backend y emulador**

Backend local (`npm run dev` en `backend/` de un worktree con `.env`), app instalada con
`./gradlew installDebug`, login `alumna.card8` / `Prueba1234`.

- [ ] **Step 3: recorrido** (spec §6)

1. Mis rutinas lista las rutinas; la de hoy tiene "HOY" y borde azul; la entrada a la biblioteca está arriba.
2. Entrar a la que no toca hoy → ejercicios con series/reps/kg/descanso → tocar uno abre la ficha.
3. "Empezar" → sesión activa → cerrar la sesión → vuelve al detalle (no a Hoy).
4. Con esa sesión abierta, entrar a otra rutina → botón apagado, leyenda con el nombre e "Ir a la sesión" abre la sesión.
5. La rutina sin ejercicios muestra "Esta rutina no tiene ejercicios".
6. Modo avión: lista y detalle se ven desde Room; la biblioteca abre con su flecha atrás; la pestaña Mis
   rutinas queda marcada en el detalle y en la biblioteca.
7. Hoy sigue igual (pull-to-refresh, offline, empezar desde Hoy y volver a Hoy).

- [ ] **Step 4: limpieza de la sesión de prueba**

Terminar la sesión abierta en la app (o descartarla) para que no quede colgada en `alumna.card8`.

- [ ] **Step 5: Checkpoint final**

`./gradlew checkFileLength assembleDebug testDebugUnitTest` en verde. Después: tarjeta a 🔍 AUDITORÍA CODEX
con el comentario `🛠️ CLAUDE · Lista para auditar`.
