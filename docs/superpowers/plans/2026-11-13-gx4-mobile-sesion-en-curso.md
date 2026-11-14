# GX4 en el celular (M1 y M2) · Plan de implementación

> **Para agentes:** sub-skill requerida: superpowers:subagent-driven-development o superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:**
- El alumno abre la sesión en el servidor al empezar y la borra al descartar.
- El PT ve "En curso" en el Inicio, que se refresca cada 60 s, y "Entrenando ahora" en Alumnos.

**Arquitectura:**
- Un `OpenSessionNotifier` en `data/workout/` manda la apertura y el borrado "si se puede", en el alcance de la app. `WorkoutRepository` lo llama.
- `in_session` viaja en el JSON del overview, sin migración.
- `open_session` se guarda en una columna nueva de `trainer_students`, con Room en la v27.

**Stack:** Kotlin, Compose, Hilt, Retrofit y kotlinx.serialization, Room (`AutoMigration`), coroutines (`kotlinx-coroutines-test` para los tiempos) y JUnit.

**Spec:** `docs/superpowers/specs/2026-11-13-gx4-mobile-sesion-en-curso-design.md`.

Raíz del código: `mobile/app/src/main/java/com/fittrainer/`. Los tests van en `mobile/app/src/test/java/com/fittrainer/` (fakes en `testing/fakes/`), con el mismo árbol.

## Restricciones globales

- **Ningún archivo pasa de 200 líneas**, tests incluidos. Hay que cuidar en especial `FitTrainerDatabase.kt` (196), `ui/workout/WorkoutViewModel.kt` (199, no se toca) y `ui/workout/WorkoutScreen.kt` (193, no se toca).
- El orden es capa → módulo → archivo, y los tests copian el árbol del código.
- Room es la única fuente de verdad.
- **La apertura y el borrado son "si se puede":** nunca lanzan, nunca muestran un error, no se encolan ni se reintentan.
- **Textos fijos:** "En curso", "Entrenando ahora", y el renglón "Rutina · hace 12 min", o solo "hace 12 min" sin rutina, con `relativeTime` de `HomeTexts`.
- **El refresco del Inicio:** `60_000` ms, solo con la pantalla empezada.
- **Commits:** ni los agentes ni Claude commitean. Commitea Igna, sin firmas de IA.
- **Antes de terminar:** `gradlew checkFileLength assembleDebug testDebugUnitTest`, corrido desde `mobile/`.

## Foco de la revisión

1. **Descartar enseguida después de empezar,** con la apertura todavía en vuelo: el DELETE sale después del POST, nunca antes. Lo cubre la tarea 1.
2. **Retomar una sesión activa** (`start` cuando ya hay una): no se manda una apertura nueva. Lo cubre la tarea 1.
3. **Terminar con series:** no se manda el DELETE. Esa sesión ya se va a subir terminada. Lo cubre la tarea 1.
4. **Sin red, el refresco automático del Inicio** no pide y no pone el error ni el spinner. Lo cubre la tarea 3.
5. **Backend viejo, sin `in_session` ni `open_session`:** el Inicio y Alumnos quedan como hoy, sin la sección y sin "Entrenando ahora". Lo cubren las tareas 2 y 4.

---

### Tarea 1: Abrir la sesión al empezar y borrarla al descartar (M1)

**Archivos:**
- Modificar `data/api/SessionApi.kt`: `@DELETE("sessions/{id}") suspend fun discard(@Tag owner: RequiredUser, @Path("id") id: String)`.
- Crear `data/workout/OpenSessionNotifier.kt`: `@Singleton class OpenSessionNotifier @Inject constructor(private val api: SessionApi, @ApplicationScope private val scope: CoroutineScope)`.
  - `fun open(ownerId: String, sessionId: String, routineId: String?, startedAt: Instant)`:
    - lanza en `scope` un `api.create(RequiredUser(ownerId), CreateSessionRequest(sessionId, routineId, startedAt.toString(), finishedAt = null))`;
    - atrapa cualquier excepción salvo `CancellationException`;
    - guarda el `Job` en un mapa concurrente por `sessionId` y lo saca al terminar.
  - `fun close(ownerId: String, sessionId: String)`:
    - lanza en `scope`: `join()` del job de apertura de ese id, si lo hay, y después `api.discard(RequiredUser(ownerId), sessionId)`;
    - atrapa todo, incluido el 404 (`HttpException` con código 404).
  - El calificador `@ApplicationScope` está en `di/DatabaseModule.kt`. `RequiredUser` ya hace que la request no salga si la cuenta logueada es otra: ese es el "sin usuario" del spec.
- Modificar `data/workout/WorkoutRepository.kt`:
  - inyecta `OpenSessionNotifier`;
  - en `start`, solo cuando crea una sesión nueva (después de `dao.start`), `notifier.open(ownerId, workout.id, routine.id, workout.startedAt)`;
  - en `finish`, en la rama sin series, `notifier.close(ownerId, w.id)` después de `dao.deleteSession`;
  - en `discard`, `notifier.close(ownerId, it.id)` después de `dao.deleteSession`.
- Modificar `testing/fakes/sync/FakeSessionApi.kt`: implementa `discard` y registra las llamadas (y un error configurable).
- Modificar los tests que construyen `WorkoutRepository` (`WorkoutRepositoryTest`, `WorkoutRepositoryFeedbackTest`, `WorkoutRepositoryRestTest`, `WorkoutRepositorySetsTest` y cualquier otro que aparezca con `grep -rn "WorkoutRepository(" mobile/app/src/test`): les pasan un notifier con el fake y un `TestScope`.
- Tests:
  - `data/workout/OpenSessionNotifierTest.kt` (nuevo);
  - `data/workout/WorkoutRepositoryOpenTest.kt` (nuevo, para no inflar `WorkoutRepositoryTest`).

**Interfaces:**
- Produce `OpenSessionNotifier.open(...)`, `OpenSessionNotifier.close(...)` y `SessionApi.discard(...)`.

- [ ] **Paso 1:** tests de `OpenSessionNotifierTest`, con `StandardTestDispatcher` y `TestScope`:
  - `open` manda un `create` con `finishedAt == null`, el id, la rutina y `started_at` ISO;
  - si `create` tira `IOException`, no propaga nada;
  - si `create` tira `HttpException(500)`, tampoco;
  - **`close` con la apertura en vuelo** (el fake de `create` suspende hasta que lo liberan): el `discard` no sale hasta que se libera el `create`. El orden de las llamadas del fake es `[create, discard]`;
  - `close` con `discard` que tira 404 no propaga;
  - `close` sin una apertura previa igual manda `discard`.
- [ ] **Paso 2:** tests de `WorkoutRepositoryOpenTest`:
  - `start` sin sesión activa abre una vez, con el id de la sesión creada;
  - **`start` con una activa no abre**;
  - `discard` cierra con el id;
  - `finish` sin series cierra;
  - **`finish` con series no cierra.**
- [ ] **Paso 3:** `gradlew testDebugUnitTest --tests "*OpenSession*" --tests "*WorkoutRepositoryOpen*"`. Tienen que fallar.
- [ ] **Paso 4:** implementar.
- [ ] **Paso 5:** `gradlew testDebugUnitTest assembleDebug` en verde, con los tests existentes de `WorkoutRepository*` también en verde.

### Tarea 2: "En curso" en el Inicio del PT (M2, overview)

**Archivos:**
- Modificar `data/api/students/OverviewDtos.kt`:
  - `@Serializable data class InSessionDto(@SerialName("student_id") val studentId: String, val name: String? = null, @SerialName("session_id") val sessionId: String, @SerialName("routine_name") val routineName: String? = null, @SerialName("started_at") val startedAt: String)`;
  - en `OverviewDto`, `@SerialName("in_session") val inSession: List<InSessionDto> = emptyList()`.
- Modificar `data/students/overview/TrainerOverview.kt`:
  - `data class InSessionItem(val studentId: String, val name: String, val routineName: String?, val startedAt: Instant)`;
  - `TrainerOverview` suma `val inSession: List<InSessionItem> = emptyList()` como último campo;
  - `toDomain()` lo mapea. Un `started_at` ilegible descarta ese item, no rompe. Un `name` nulo pasa a "Alumno", o al texto que ya usen los otros items para un nombre nulo; buscarlo en el mismo archivo.
- Crear `ui/components/LiveDot.kt`: `@Composable fun LiveDot(modifier: Modifier = Modifier)`, un círculo de 8 dp en `FtColors.Green`.
- Crear `ui/students/overview/components/InSessionSection.kt`: `@Composable fun InSessionRow(item: InSessionItem, now: Instant, onClick: () -> Unit)`.
  - Usa el estilo de `HomeRow` (`components/HomeLists.kt`), con el `LiveDot` adelante.
  - La línea secundaria es `inSessionLine(item, now)`.
  - El `contentDescription` del renglón es `"${item.name}, entrenando ahora"`.
- Modificar `ui/students/overview/HomeTexts.kt`: `const val IN_SESSION_TITLE = "En curso"` y `fun inSessionLine(item: InSessionItem, now: Instant): String`, que da `"Pierna · hace 12 min"`, o `relativeTime(...)` solo si `routineName` es null.
- Modificar `ui/students/overview/TrainerHomeScreen.kt`: en la rama `else`, antes de `DayCard`, si `o.inSession` no está vacío, `item { SectionText(IN_SESSION_TITLE) }` (o el título de sección que use la pantalla) y un `item` por alumno con `InSessionRow(it, state.now) { nav.onStudent(it.studentId) }`.
- Tests:
  - `data/students/overview/TrainerOverviewMapperTest.kt` (nuevo, o el test de mapper que exista);
  - `ui/students/overview/HomeTextsTest.kt`.

**Interfaces:**
- Produce `LiveDot(modifier)`, que usa la tarea 4, y `TrainerOverview.inSession`.

- [ ] **Paso 1:** tests:
  - un `OverviewDto` decodificado de JSON con `in_session` (dos alumnos) da `inSession` con nombres, rutina y `startedAt` parseado;
  - **un JSON sin `in_session` da una lista vacía**;
  - `inSessionLine` con la rutina "Pierna" y 12 min da `"Pierna · hace 12 min"` (usar lo que devuelva `relativeTime` para 12 min);
  - sin rutina, solo lo de `relativeTime`.
- [ ] **Paso 2:** que fallen.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `gradlew testDebugUnitTest assembleDebug checkFileLength` en verde.

### Tarea 3: El Inicio se refresca cada 60 s mientras está abierto (M2)

**Archivos:**
- Modificar `ui/students/overview/TrainerHomeViewModel.kt`:
  - `const val HOME_AUTO_REFRESH_MS = 60_000L`, en el mismo archivo o en `HomeTexts`.
  - `fun onStart()`: hace el `refresh()` de siempre y arranca, si no está corriendo, un `Job` en `viewModelScope` con un bucle `while (isActive) { delay(HOME_AUTO_REFRESH_MS); silentRefresh() }`.
  - `fun onStop()` cancela ese job.
  - `private suspend fun silentRefresh()`:
    - no hace nada si `local.value.refreshing` o si no hay red (`connectivity.isOnline.first()`, guardando `connectivity` como propiedad);
    - si no, `repository.refresh(user.id)` e ignora el resultado;
    - **no toca `refreshing` ni `error`.**
  - Si el archivo pasa de 200 líneas, el bucle va a `ui/students/overview/HomeAutoRefresh.kt`.
- Modificar `ui/students/overview/TrainerHomeScreen.kt`: `LifecycleStartEffect` pasa a `onStopOrDispose { viewModel.onStop() }`.
- Test: `ui/students/overview/TrainerHomeViewModelTest.kt` (agregar, o crear `TrainerHomeAutoRefreshTest.kt` si se pasa de 200 líneas).

**Interfaces:**
- Produce `TrainerHomeViewModel.onStop()`.

- [ ] **Paso 1:** tests con `runTest` y el `TestDispatcher` del VM:
  - después de `onStart()` y `advanceTimeBy(60_001)`, el repositorio falso registró 2 refreshes: el de entrada y uno automático;
  - a los 120 s, 3;
  - **después de `onStop()` y otros 120 s, no aumentan;**
  - **sin red, a los 60 s no hubo un refresh automático**;
  - **un refresh automático que falla no pone `error` en `uiState`.**
- [ ] **Paso 2:** que fallen.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `gradlew testDebugUnitTest` en verde.

### Tarea 4: "Entrenando ahora" en Alumnos y Room v27 (M2, lista)

**Archivos:**
- Modificar `data/api/students/StudentDtos.kt`:
  - `@Serializable data class OpenSessionDto(val id: String, @SerialName("started_at") val startedAt: String)`;
  - en `StudentListItemDto`, `@SerialName("open_session") val openSession: OpenSessionDto? = null`.
- Modificar `data/db/students/TrainerStudentEntities.kt`: `TrainerStudentEntity` suma `val openSessionStartedAt: Long? = null` como último campo.
- Modificar el dominio `TrainerStudent` (está en `data/students/`): `val openSessionStartedAt: Instant? = null` como último campo.
- Modificar `data/students/TrainerStudentMapper.kt`: `toEntity` (parse con `parseInstant`; ilegible da null) y `toDomain` pasan el dato.
- Modificar `data/db/FitTrainerDatabase.kt`: `version = 27` y `AutoMigration(from = 26, to = 27)` con el comentario `// v27: sesión en curso del alumno (GX4), trainer_students.openSessionStartedAt.` El archivo queda en 198 líneas o menos.
- `mobile/app/schemas/.../27.json`: lo genera el build y va en la PR.
- Modificar `ui/students/StudentsUiState.kt`: `StudentRowUi` suma `val trainingNow: Boolean = false`, que `toRow` llena con `openSessionStartedAt != null`.
- Modificar `ui/students/StudentsTexts.kt`: `const val TRAINING_NOW = "Entrenando ahora"`.
- Modificar `ui/students/components/StudentRow.kt`: con `row.trainingNow`, en lugar del texto `lastTraining` (la línea 59), un `Row` con `LiveDot()` y `TRAINING_NOW` en `FtColors.Green`.
- Tests:
  - `data/students/TrainerStudentMapperTest.kt`;
  - `ui/students/StudentsTextsTest.kt`, o el test de `StudentsUiState` que exista;
  - `mobile/app/src/androidTest/java/com/fittrainer/data/db/migration/v2x/MigrationV27Test.kt` (nuevo, con el patrón de `MigrationV26Test`).

**Interfaces:**
- Consume `LiveDot` (tarea 2).

- [ ] **Paso 1:** tests:
  - un DTO con `open_session` da una entidad con `openSessionStartedAt` en epoch millis y un dominio con el `Instant`;
  - **un JSON sin `open_session` da null**;
  - `toRow` con `openSessionStartedAt` da `trainingNow == true`, y sin él da `false`.
- [ ] **Paso 2:** que fallen.
- [ ] **Paso 3:** implementar, incluida la DB v27 y `MigrationV27Test`:
  - crear la base en la v26;
  - insertar un `trainer_students` con todas las columnas de la v26;
  - migrar con `runMigrationsAndValidate(DB, 27, true)`;
  - comprobar que la fila sigue y que `openSessionStartedAt` es null.
- [ ] **Paso 4:** `gradlew testDebugUnitTest assembleDebug checkFileLength compileDebugAndroidTestKotlin` en verde, con el `27.json` generado. Si hay emulador (`adb devices`), correr también `connectedDebugAndroidTest` de `MigrationV27Test`.

### Tarea 5: Verificación, auditoría y PR

- [ ] **Paso 1:** desde `mobile/`, `gradlew checkFileLength assembleDebug testDebugUnitTest` en verde. Anotar la cantidad de tests.
- [ ] **Paso 2:** la tarjeta "GX4 mobile" en el tablero de Igna, en 🔍 AUDITORÍA CODEX, con `🛠️ CLAUDE · Lista para auditar`:
  - rama y base;
  - spec y plan;
  - qué se probó;
  - pendientes: el celular contra dev y `MigrationV27Test` en un emulador.
- [ ] **Paso 3:** con el ✅ de Codex, avisarle a Igna. El commit y la PR los hace Igna, o Claude si lo pide. La PR va contra `develop` con la plantilla y "(tarjetas GX4-M1 y M2)".
