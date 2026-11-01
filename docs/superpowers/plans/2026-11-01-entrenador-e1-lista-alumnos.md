---
tags: [plan]
tarjeta: E1
---
# E1 · Lista de alumnos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Checkbox (`- [ ]`) por paso.

**Goal:** la pestaña Alumnos del entrenador lista sus alumnos con estado, último entreno y adherencia de 7 días, con filtros, búsqueda y lectura offline.

**Architecture:** `GET /students` suma `days_per_week` y `adherence_7d` (calculados en lote en el backend). En mobile, `TrainerStudentsRepository` cachea la lista en Room (`trainer_students`), las reglas de estado son puras y `StudentsScreen` lee de Room.

**Tech Stack:** Node 20 + Express + Supabase (Jest) · Kotlin + Compose + Room + Hilt + Retrofit (JUnit).

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e1-lista-alumnos-design.md`

## Global Constraints

- ≤ 200 líneas físicas por archivo de código (tests y `.sql` incluidos); capa → módulo → archivo; carpetas de más de 10 archivos se subdividen.
- Room nunca destructivo: `AutoMigration` a la versión siguiente de la cadena y su caso en `androidTest/.../data/db/migration/`.
- La UI lee de Room; ningún ViewModel llama a Retrofit.
- Estados (iguales a la web): `disabled` / `inactive` (≥ 7 días) / `new` (nunca entrenó, < 7 días de alta) / `active`. Días de calendario en hora argentina.
- Adherencia: ventana de `hoy-7` a `hoy-1`; solo sesiones terminadas; `pct = round(done*100/assigned)` o `null`.
- Commits sin firmas de IA. Título de la PR con "(tarjeta E1)" y la plantilla `.github/pull_request_template.md`.

## Review Focus

1. Un alumno que entrenó a las 23:30 hora argentina (02:30 UTC del día siguiente) cuenta para el día argentino → test en Task 1.
2. Paginación: un entrenador con más de 100 alumnos trae todas las páginas antes de reemplazar el caché → test en Task 3.
3. Cambio de cuenta (otro entrenador, o un alumno, en el mismo celular): no ve el caché del anterior → test en Task 3.
4. Búsqueda con tildes y mayúsculas ("jose" encuentra "José") → test en Task 3.
5. Refresh fallido sin caché previo: pantalla de error con "Reintentar", no una lista vacía engañosa → test en Task 4.

---

### Task 0: Reacomodar la cadena (PR #51) antes de arrancar

> **Cambio del 01/11 al arrancar:** Pablo mergeó la #51 a `develop` (Room v9) antes del loop, así que este paso no se hizo. La rama sale de `develop` y la PR apunta a `develop`. E1 usa **Room v12 con `AutoMigration(9, 12)`**: la 10 y la 11 quedan para la #44 y la #48, que tienen que renumerar igual porque `develop` ya usa la 9. Cuando entren, E1 pasa a `AutoMigration(11, 12)` y se regenera `12.json`.

La #44 (v9) y la #48 (v10) ya usan esas versiones de Room; la #51 también usaba v9.

- [ ] En `C:\Users\igna_\Desktop\fittrainer-descanso`:
  1. `git fetch`;
  2. `git rebase --onto origin/feature/android-notificaciones origin/develop feature/descanso-ajustable`;
  3. resolver conflictos: `FitTrainerDatabase.kt` pasa a `version = 11` con `AutoMigration(from = 10, to = 11)`. Las entidades de la #48 y las nuevas conviven.
- [ ] Borrar `app/schemas/.../9.json` de la #51; el build genera `11.json` (el `9.json` y el `10.json` de las otras ramas quedan como estaban).
- [ ] `MigrationV9Test` → `MigrationV11Test`: crea la base en v10 y migra a 11. Con las tablas de la #44 y la #48 en la carpeta, puede pasar de 10 archivos: subdividir si hace falta.
- [ ] Correr `gradlew checkFileLength assembleDebug testDebugUnitTest` y `connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.package=com.fittrainer.data.db.migration`: tienen que pasar.
- [ ] Commit "fix(mobile): Room v11 para apilar sobre la #48 (descanso ajustable)"; `git push --force-with-lease`; `gh pr edit 51 --base feature/android-notificaciones`, y en el cuerpo de la PR la nota "Apilada sobre la #48 (Room v11)".
- [ ] Rebasar `feature/android-entrenador-alumnos` (por ahora solo docs) sobre la nueva `feature/descanso-ajustable`.

### Task 1: Backend — adherencia y días por semana en `GET /students`

**Files:**
- Create: `backend/src/models/students/adherence.js`
- Modify: `backend/src/repositories/students/students.repository.js` (dos consultas por lote nuevas)
- Modify: `backend/src/services/students/students.service.js` (`list`)
- Modify: `docs/arquitectura/contratos-api.md` (GET /students), `backend/README.md`
- Test: `backend/tests/unit/models/students/adherence.test.js`, `backend/tests/unit/services/students/students.service/list.test.js`, el test del repositorio de students (crear `backend/tests/unit/repositories/students/students.repository.test.js` si no existe, como el de history)

**Interfaces:**
- Produces:
  - `adherence7d({ assignedDays: string[], finishedDates: string[], today: 'YYYY-MM-DD' }) → { assigned, done, pct }`;
  - `daysPerWeek(assignedDays) → int`;
  - repositorio: `findActiveRoutineDays(studentIds) → Map<studentId, string[]>` y `findFinishedSessionDates(studentIds, fromIso) → Map<studentId, 'YYYY-MM-DD'[]>`. Las fechas de las sesiones se convierten con `localDate(started_at)`.

- [ ] **Tests que fallan:**
  - sin días asignados → `{assigned:0, done:0, pct:null}`;
  - lun/mié/vie con hoy jueves 2026-11-05 → `assigned 3`;
  - entrenó lun y vie → `done 2`, `pct 67`;
  - una sesión de hoy no cuenta;
  - una sesión no terminada no cuenta (la consulta filtra `finished_at`);
  - una sesión el 2026-11-02 a las 02:30Z cuenta como 2026-11-01 en Argentina;
  - el service `list` agrega `days_per_week` y `adherence_7d` a cada alumno y hace una sola llamada a cada consulta por lote.
- [ ] `npm test -- adherence students` → FAIL.
- [ ] **Implementar.** La ventana empieza en `addDays(today, -7)`, que se pasa a ISO con `-03:00` para la consulta. Si una fecha no está en `assignedDays` (`weekdayOf`), no suma ni a `assigned` ni a `done`.
- [ ] **Contrato y README:** los dos campos nuevos, su significado y "la web puede mostrar la barra de adherencia".
- [ ] `npm run lint && npm test` → verde.

### Task 2: Mobile — API, Room v12 y reglas puras

**Files:**
- Create: `data/api/students/StudentsApi.kt`, `data/api/students/StudentDtos.kt`
- Create: `data/db/students/TrainerStudentEntities.kt` (`TrainerStudentEntity`, `TrainerStudentsSyncEntity`), `data/db/students/TrainerStudentsDao.kt`
- Create: `data/students/TrainerStudent.kt` (dominio), `data/students/StudentStatus.kt`, `data/students/TrainerStudentMapper.kt`
- Modify: `data/db/FitTrainerDatabase.kt` (entidades, `version = 12`, `AutoMigration(11, 12)`, `trainerStudentsDao()`), `di/DatabaseModule.kt`, nuevo `di/StudentsModule.kt`
- Test: `test/.../data/students/StudentStatusTest.kt`, `test/.../data/students/TrainerStudentMapperTest.kt`, `androidTest/.../data/db/migration/MigrationV12Test.kt`

**Interfaces:**
- Produces:
  - `enum class StudentStatus { ACTIVE, INACTIVE, NEW, DISABLED }`;
  - `fun TrainerStudent.status(today: LocalDate): StudentStatus`;
  - `fun TrainerStudent.daysWithoutTraining(today): Int`;
  - `enum class StudentFilter { ALL, ACTIVE, AT_RISK, NEW, DISABLED }`;
  - `fun TrainerStudent.matches(filter): Boolean` (con `today`);
  - `fun TrainerStudent.matchesQuery(q: String): Boolean` (normaliza con `Normalizer` NFD y sin diacríticos);
  - `TrainerStudent(id, name, email, goal, active, createdAt: Instant, lastSessionAt: Instant?, daysPerWeek: Int, adherence: Adherence?)` con `Adherence(assigned, done, pct: Int?)`;
  - `StudentsApi.list(@Query("active") active: Boolean, @Query("page") page: Int, @Query("limit") limit: Int = 100): StudentListResponse`.
- La fecha local de `lastSessionAt` / `createdAt` se calcula con `ZoneId.of("America/Argentina/Buenos_Aires")`.

- [ ] **Tests que fallan:**
  - estados en los bordes: 6 y 7 días desde la última sesión; nunca entrenó con 6 y 7 días de alta; dado de baja gana sobre todo;
  - filtros: ALL excluye dados de baja; NEW = nunca entrenó (cualquier antigüedad);
  - query con tildes;
  - mapper: un DTO sin `adherence_7d` (backend viejo) → `adherence = null`.
- [ ] Implementar; `gradlew testDebugUnitTest --tests "*Student*"` → verde.
- [ ] `MigrationV12Test`: crea v11, migra a 12 y las tablas existen vacías.

### Task 3: Mobile — `TrainerStudentsRepository`

**Files:**
- Create: `data/students/TrainerStudentsRepository.kt`
- Modify: `di/StudentsModule.kt` (sumarlo al set de `UserDataCleaner` como los otros: `@IntoSet`)
- Test: `test/.../data/students/TrainerStudentsRepositoryTest.kt`, fakes en `test/.../testing/fakes/students/` (`FakeStudentsApi`, `FakeTrainerStudentsDao`)

**Interfaces:**
- Produces:
  - `fun observe(trainerId: String): Flow<StudentsCache>` con `StudentsCache(students: List<TrainerStudent>, lastSyncedAt: Instant?)`; `lastSyncedAt` es null si nunca sincronizó o si lo guardado es de otro dueño;
  - `suspend fun refresh(trainerId: String): Result<Unit>`: pide `active=true` y `active=false`, todas las páginas, y llama a `replaceAll` una sola vez;
  - `clearUserData(ownerId)`.

- [ ] **Tests que fallan:**
  - dos páginas de activos + una de baja → caché con todos;
  - error en la segunda página → caché anterior intacto y `Result.failure(DataException)`;
  - `observe` de otro trainerId → vacío y `lastSyncedAt` null;
  - `clearUserData("t1")` borra solo si el dueño es t1; `null` borra todo.
- [ ] Implementar con el patrón de `LibraryRepository` (`toDataError`, `CancellationException` re-lanzada).
- [ ] Tests → verde.

### Task 4: Mobile — `StudentsScreen` en la pestaña Alumnos

**Files:**
- Create: `ui/students/StudentsScreen.kt`, `StudentsViewModel.kt`, `StudentsUiState.kt`, `StudentsTexts.kt`, `ui/students/components/StudentRow.kt`, `StudentFilters.kt`, `StudentAvatar.kt`
- Modify: `navigation/RoleShell.kt` (ruta `trainer/students` → `StudentsScreen()`), `navigation/RoleTabs.kt` (constante `TRAINER_STUDENTS_ROUTE`)
- Test: `test/.../ui/students/StudentsViewModelTest.kt`, `StudentsTextsTest.kt`; `FakeTrainerSession` en `testing/fakes/students/`

**Interfaces:**
- Consumes: Tasks 2-3.
- Produces:
  - `StudentsUiState(loaded, students: List<StudentRowUi>, filter, query, counts: Counts(active, atRisk), lastSyncedAt, refreshing, error: String?, offline)`;
  - textos:
    - `lastTrainingLabel(lastSessionAt, today)`: "Hoy", "Ayer", "Hace N días" o "Nunca entrenó";
    - `headerCounts(active, atRisk)`: "N ACTIVOS · M EN RIESGO";
    - `subtitle(goal, daysPerWeek)`: "Hipertrofia · 4 d" o solo el objetivo;
    - `statusLabel(status)`: "al día", "en riesgo", "nuevo" o "de baja";
    - `goalLabel(goal)`, si la app no lo tiene ya.

- [ ] **Tests que fallan:**
  - el ViewModel refresca al iniciar;
  - filtro AT_RISK deja solo inactivos;
  - búsqueda + filtro combinados;
  - orden: en riesgo primero, después último entreno desc, después nombre;
  - contador (activos = no dados de baja);
  - error con caché → `error` y la lista igual;
  - error sin caché → estado de error;
  - textos en los bordes (0, 1 y 2 días).
- [ ] **Implementar la UI:**
  - cabecera con contador, título y buscador (`OutlinedTextField` con ícono);
  - `LazyRow` de `FilterChip`;
  - `LazyColumn` de filas;
  - pull-to-refresh (`PullToRefreshBox`);
  - "Actualizado hace X" si viene del caché y no hay red.
  - Colores de la barra: `FtColors.Green` (≥ 70), `FtColors.Brand` (≥ 50), `FtColors.Coral` (< 50).
  - Toques de 44 dp.
- [ ] `gradlew checkFileLength assembleDebug testDebugUnitTest` → verde.

### Task 5: Datos de prueba, E2E, auditoría y PR

- [ ] Datos de prueba (spec §6) por la API real contra el backend local:
  - script en el scratchpad (no en el repo);
  - `profe.card8` invita, y cada alumno se registra con `POST /students` y el token;
  - se le asigna una rutina al alumno al día (`POST /routines` como trainer);
  - se cargan sesiones con fechas pasadas como el alumno;
  - se da de baja a uno con `PATCH /students/:id {active:false}`.
- [ ] E2E en el emulador como `profe.card8`: los cuatro estados, cada filtro, la búsqueda "jose" / "José", pull-to-refresh y modo avión. Capturas en el scratchpad.
- [ ] `npm run lint && npm test` (backend); `gradlew checkFileLength assembleDebug testDebugUnitTest` y migraciones en el emulador.
- [ ] Tarjeta E1 a 🔍 AUDITORÍA CODEX con el comentario "🛠️ CLAUDE · Lista para auditar" (rama, base, carpetas, spec y plan, criterio, cómo se probó, pendientes).
- [ ] Con el ✅:
  - commit(s) sin firmas;
  - push;
  - `gh pr create --base feature/descanso-ajustable --reviewer PabloQueima`, título "feat(mobile): lista de alumnos del entrenador (tarjeta E1)", con la plantilla y "Apilada sobre la #51";
  - tarjeta a ⏳ PENDIENTES (merge y celular físico);
  - comentario con el link de la PR.
