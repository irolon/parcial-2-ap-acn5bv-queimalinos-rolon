---
tags: [plan]
tarjeta: E5
---
# E5 · Progreso del alumno — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** en la ficha, el resumen del mes (sesiones/asignados, racha, PRs) y el calendario de asistencia; y "Ver gráficos" con las cargas y medidas del alumno, reusando la tarjeta 13.

**Architecture:**
- **Backend:** endpoint nuevo `GET /students/:id/attendance?month=` en el módulo Students, con la lógica pura en `models/students/attendance.js`.
- **Mobile:**
  - `StudentProgressRepository` cachea la asistencia y la racha (Room v15);
  - `ProgressRepository` y `ChartsViewModel` pasan a recibir un `ProgressSubject` (el propio alumno, o un alumno del entrenador), con la clave de caché `trainerId:studentId` en las tablas `progress_*`;
  - la lista de ejercicios del alumno viene de `GET /progress/overview`.

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e5-progreso-design.md`

> **Alcance partido al implementar (01/11):** los gráficos dependen de la tarjeta 13 (PR #44), que sigue abierta con cambios pedidos y no está en develop (y su Room v9 choca con la de develop). Esta tarjeta (E5) entrega el **resumen del mes y la asistencia** (backend `GET /students/:id/attendance`, Room v15 `trainer_attendance`, sección "Progreso" en la ficha con meses anteriores y offline). **"Ver gráficos"** (§4.2: `ProgressSubject`, `student_id`, `trainer_progress_exercises`) pasa a la tarjeta **E5b**, que se hace cuando la #44 entre a develop.
>
> Como quedó: el ownership da **403** para un alumno ajeno (como la ficha, no 404). En la app, la tabla es `trainer_attendance` (PK trainerId, studentId, month) con la racha y los días como JSON; `StudentProgressRepository.refreshMonth` pide asistencia y racha en paralelo y guarda las dos o nada. Un error que no es de red muestra "No pudimos actualizar el progreso." con Reintentar.

## Global Constraints

- ≤ 200 líneas; capas.
- Room v15 (`AutoMigration(14, 15)`, `MigrationV15Test`).
- El alumno no cambia: los tests de la tarjeta 13 siguen verdes sin tocarlos (salvo constructores con un parámetro default).
- Todo en hora argentina. `month` es `YYYY-MM`, no futuro.
- PR: "feat: progreso del alumno para el entrenador: asistencia del mes y gráficos (tarjeta E5)", base `feature/android-entrenador-historial`.

## Review Focus

1. A las 22:00 del último día del mes en Argentina ya es el día 1 en UTC → el mes y "hoy" salen de la fecha argentina, no de la UTC → test en Task 1.
2. El caché de gráficos del alumno logueado y el del entrenador conviven en el mismo celular (cuenta compartida en la defensa): ninguno pisa al otro → test en Task 3.
3. Navegar a meses anteriores sin red → muestra lo cacheado o "Sin conexión", sin crashear → test en Task 4.
4. Un alumno sin rutina → todos los días son `rest`/`upcoming`, "0/0" sesiones, sin división por cero → tests en Tasks 1 y 4.
5. Logout del entrenador → borra también las claves `trainerId:%` de las tablas de progreso → test en Task 3.

---

### Task 1: Backend — `attendance.js` y endpoint

**Files:**
- Create: `backend/src/models/students/attendance.js`
- Modify: `backend/src/validations/students/students.validation.js` (`validateAttendanceQuery`: `month` opcional `^\d{4}-(0[1-9]|1[0-2])$` y no posterior al mes actual en Argentina), `services/students/students.service.js` (`attendance(user, studentId, month)` con el mismo ownership que `getById`; si `students.service.js` pasa de 200 líneas, va en `services/students/attendance.service.js`), `controllers/students/students.controller.js`, `routes/students/students.routes.js` (`GET /:id/attendance`, trainer o student), `repositories/students/students.repository.js` (sesiones terminadas del alumno entre dos fechas: `id, started_at`)
- Modify: contrato y `backend/README.md`
- Test: `tests/unit/models/students/attendance.test.js`, `tests/unit/services/students/students.service/attendance.test.js`, el test de validación

**Interfaces:**
- Produces:
  - `buildAttendance({ month, today, assignedDays, finishedDates, recordSessionDates }) → { month, sessions, assigned_days, prs, days: [{date, status}] }`.
  - `prs` usa la RPC `session_records` (`fetchSessionRecords` del repositorio de history o de gamification, la que ya exista) sobre las sesiones del mes.
- [ ] **Tests:**
  - mes pasado completo;
  - mes actual con hoy entrenado (`trained`) y sin entrenar (`upcoming`);
  - día asignado faltado (`missed`);
  - día no asignado entrenado → `trained`;
  - sesión no terminada que no cuenta;
  - febrero 2028 (bisiesto);
  - alumno ajeno → 404 `STUDENT_NOT_FOUND` (como `getById`);
  - el alumno pidiendo la suya → ok;
  - mes futuro → 400.
- [ ] Implementar; `npm run lint && npm test` → verde.

### Task 2: Mobile — asistencia y racha (Room v15)

**Files:**
- Modify: `data/api/students/StudentsApi.kt` (`attendance(id, month)`, `streak(id)`: `GET students/{id}/streak`, ver su DTO en el contrato)
- Create: `data/db/students/progress/TrainerAttendanceEntity.kt` (`days` como JSON) + DAO, `data/students/progress/StudentProgressRepository.kt`, `data/students/progress/AttendanceModels.kt`
- Modify: `FitTrainerDatabase.kt` (v15 + `trainer_progress_exercises`, ver Task 3), `di/StudentsModule.kt`
- Test: `StudentProgressRepositoryTest.kt`, `MigrationV15Test.kt`

**Interfaces:**
- Produces:
  - `observeMonth(trainerId, studentId, month: YearMonth): Flow<MonthProgress?>`, con `MonthProgress(sessions, assignedDays, prs, streak, days: List<DayMark>, fetchedAt)` y `DayMark(date, status)`;
  - `refreshMonth(...)`: pide asistencia y racha en paralelo y guarda las dos juntas.
- [ ] **Tests:**
  - refresh guarda;
  - un error en cualquiera de las dos conserva el caché;
  - otro dueño no ve nada.
- [ ] Implementar → verde.

### Task 3: Mobile — gráficos con `ProgressSubject` (→ E5b, cuando entre la #44)

**Files:**
- Modify (archivos de la tarjeta 13 que vienen en la cadena):
  - `data/api/progress/ProgressApi.kt` (`exercise(id, @Query("student_id") studentId: String? = null)`, `overview(@Query("student_id") studentId)`);
  - `data/progress/ProgressRepository.kt` (cada función recibe `ProgressSubject` en lugar de `ownerId`; `key = subject.cacheKey`; `observeTrainedExercises` según el sujeto: el alumno lee su historial local como hoy y el entrenador lee `trainer_progress_exercises`; `refreshTrainedExercises(subject)` nuevo, solo para `Student`);
  - `data/db/progress/ProgressDao.kt` (`clearByPrefix("$trainerId:%")`);
  - `ui/progress/charts/ChartsViewModel.kt` (el sujeto sale de la sesión o de un argumento de navegación).
- Create: `data/progress/ProgressSubject.kt` (`sealed`: `Self(ownerId)` | `Student(trainerId, studentId)`; `cacheKey` y `studentIdParam`), `data/db/progress/TrainerProgressExerciseEntity.kt`
- Test: `ProgressRepositorySubjectTest.kt` (con `Student` manda `student_id` y usa la clave compuesta; `Self` no cambia; borrado por prefijo); los tests existentes de la tarjeta 13 quedan verdes.
- [ ] Tests → implementar → verde.

### Task 4: UI

**Files:**
- Create: `ui/students/progress/` (`StudentProgressSection.kt`, `AttendanceCalendar.kt`, `StudentProgressViewModel.kt`, `ProgressTexts.kt`)
- Modify: `StudentDetailScreen.kt` (sección "Progreso"), `RoleTabs.kt`/`RoleShell.kt` (`trainer/students/{studentId}/progress` → `ChartsScreen` con `Student`)
- Test:
  - `AttendanceGridTest` (el mes que empieza en domingo da 6 celdas vacías antes, porque la grilla empieza el lunes; meses de 28, 30 y 31 días);
  - textos ("6/9", "Asistencia · noviembre");
  - ViewModel (mes anterior y siguiente sin pasar del actual, sin red con y sin caché, alumno sin plan).
- [ ] Tests → implementar → verde. `gradlew checkFileLength assembleDebug testDebugUnitTest`.

### Task 5: E2E, auditoría y PR

- [ ] **E2E:**
  - como `profe.card8`: alumno al día → resumen y calendario de noviembre y octubre;
  - "Ver gráficos" → la curva de un ejercicio y el peso;
  - modo avión → lo visto se ve;
  - como alumna.card8, sus gráficos siguen iguales.
- [ ] Verificación completa (backend y mobile); auditoría.
- [ ] Con el ✅: commit, push y PR con base `feature/android-entrenador-historial`; tarjeta a ⏳ PENDIENTES.
