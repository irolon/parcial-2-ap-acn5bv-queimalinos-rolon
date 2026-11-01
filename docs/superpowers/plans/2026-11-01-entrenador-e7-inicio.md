---
tags: [plan]
tarjeta: E7
---
# E7 · Inicio del entrenador — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** la pestaña Inicio muestra los KPIs, "requieren atención" y la actividad reciente, con un endpoint nuevo y caché offline.

**Architecture:**
- **Backend:** `GET /students/overview`, con la lógica pura en `models/students/overview.js`. Reusa `adherence.js` (E1) y las reglas de estado, que se mueven a `models/students/activity.js`.
- **Mobile:** `TrainerOverviewRepository` (Room v17) y `TrainerHomeScreen`.

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e7-inicio-design.md`

> **Cómo quedó (01/11):**
> - `trainer_overview` guarda la respuesta entera como JSON (`dataJson`, PK `trainerId`) en lugar de columnas por KPI más dos JSON: es chica y se reemplaza entera.
> - Después de comentar en E4, el Inicio no se refresca desde `StudentSessionsRepository`: se refresca solo cada vez que la pestaña vuelve a estar visible (`LifecycleStartEffect`), así al volver de comentar el aviso ya no está. Evita acoplar los dos repositorios.
> - La UI va en `ui/students/overview/` (no en `ui/home/`): el Inicio sale del recurso students (`GET /students/overview`) y la organización es por recurso de la API (CONTRIBUTING.md).
> - `sessions_today.done` cuenta por la fecha argentina de `finished_at` (sesiones terminadas hoy); la adherencia sigue usando `started_at`.
> - Las reglas de estado del backend quedaron en `models/students/activity.js`, con las mismas reglas que la web y el celular.

## Global Constraints

- ≤ 200 líneas; capas.
- `GET /students/overview` va declarado **antes** de `GET /students/:id` en el router.
- Ventanas (hora argentina):
  - hoy;
  - últimos 7 días completos (`hoy-7` a `hoy-1`) y los 7 anteriores (`hoy-14` a `hoy-8`);
  - "atención · aviso": sesiones terminadas en los últimos 7 días (incluido hoy) sin `trainer_comment`.
- Tope de 10 en `attention` y en `recent`.
- Room v17 (`AutoMigration(16, 17)`, `MigrationV17Test`).
- PR: "feat: inicio del entrenador con KPIs, alertas y actividad (tarjeta E7)", base `feature/android-entrenador-medidas`.

## Review Focus

1. Un entrenador sin alumnos → todos los KPIs en 0, adherencia `null` y listas vacías; la app muestra "Invitá a tu primer alumno" → tests en Tasks 1 y 3.
2. Un alumno dado de baja con sesiones recientes → no aparece en ningún KPI ni lista → test en Task 1.
3. Una sesión comentada desde E4 → desaparece de "atención" en el siguiente refresh (y E4 dispara el refresh del overview al guardar) → test en Task 2.
4. `/students/overview` con rol alumno → 403, y no lo toma la ruta `/:id` → test de rutas en Task 1.
5. Un `recent` con `rpe` null → "Push día 3" sin "· RPE" → test de textos en Task 3.

---

### Task 1: Backend

**Files:**
- Create: `backend/src/models/students/activity.js` (estado `active` / `inactive` / `new` / `disabled` y `daysWithoutTraining`, las mismas reglas que la web), `backend/src/models/students/overview.js`
- Create: `backend/src/services/students/overview.service.js` (consultas por lote: alumnos activos con `created_at`; días de rutina de E1; sesiones terminadas de los últimos 15 días con `id, student_id, started_at, finished_at, rpe, trainer_comment, routine:routines(name)`; las últimas 10 terminadas), funciones nuevas en `repositories/students/students.repository.js` o en un `overview.repository.js` si pasa de 200 líneas
- Modify: controller, `routes/students/students.routes.js` (`router.get('/overview', authenticate, requireRole('trainer'), ...)` antes de `/:id`), contrato y `backend/README.md`
- Test: `tests/unit/models/students/overview.test.js`, `activity.test.js`, `tests/unit/services/students/overview.service.test.js`, el test de rutas de students

**Interfaces:**
- Produces: `buildOverview({ students, routineDays: Map, sessions, recent, today, now }) → data` (forma del spec §3).
- [ ] **Tests:**
  - KPIs con y sin plan;
  - `new_7d`;
  - `sessions_today` con un alumno que entrenó sin tener hoy asignado (`done` lo cuenta, `expected` no);
  - variación de la adherencia;
  - "atención": orden (riesgo por días desc, después avisos por `finished_at` desc), tope de 10, comentada que no aparece, dado de baja excluido;
  - `recent` ordenado;
  - sin alumnos.
- [ ] Implementar; `npm run lint && npm test` → verde.

### Task 2: Mobile — datos (Room v17)

**Files:**
- Create: `data/api/students/OverviewDtos.kt` (+ `StudentsApi.overview()`), `data/db/students/overview/TrainerOverviewEntity.kt` + DAO, `data/students/overview/TrainerOverview.kt` (dominio), `TrainerOverviewMapper.kt`, `TrainerOverviewRepository.kt`
- Modify: `FitTrainerDatabase.kt` (v17), `di/StudentsModule.kt`, `StudentSessionsRepository.saveComment` (al guardar, también `overviewRepository.refresh` en segundo plano)
- Test: `TrainerOverviewRepositoryTest.kt`, `TrainerOverviewMapperTest.kt`, `MigrationV17Test.kt`
- [ ] **Tests:**
  - refresh;
  - error conserva;
  - dueño;
  - mapper con `pct` null;
  - el comentario dispara el refresh del overview.
- [ ] Implementar → verde.

### Task 3: Mobile — UI

**Files:**
- Create: `ui/home/TrainerHomeScreen.kt`, `TrainerHomeViewModel.kt`, `TrainerHomeUiState.kt`, `HomeTexts.kt`, `ui/home/components/KpiGrid.kt`, `AttentionList.kt`, `RecentActivity.kt`
- Modify: `RoleShell.kt` (`trainer/home` → `TrainerHomeScreen`, con la navegación a la ficha y a la sesión)
- Test:
  - textos ("hace 12 min", "hace 1 h", "ayer", fecha; "+2"; "de 11"; "+4%" / "−3%"; "9 días sin entrenar"; "Nunca entrenó · alta hace 8 días"; "Push día 3 · RPE 8");
  - ViewModel (sin alumnos → estado de invitar; error con y sin caché; refresca al entrar).
- [ ] **UI:**
  - cabecera con la fecha en mono y "Hola, <nombre>";
  - grilla de KPIs 2 × 2 (EN RIESGO con borde y fondo coral);
  - listas con avatar e iniciales;
  - píldoras "riesgo" en coral y "aviso" atenuada;
  - pull-to-refresh.
- [ ] `gradlew checkFileLength assembleDebug testDebugUnitTest` → verde.

### Task 4: E2E, auditoría y PR

- [ ] **E2E** como `profe.card8` con los datos de prueba de E1:
  - KPIs coherentes con lo que hay en Supabase (verificar con SQL);
  - el alumno en riesgo → toque → ficha;
  - la sesión sin comentar → toque → detalle → comentar → al volver al Inicio, ya no está;
  - modo avión → "Actualizado hace X".
- [ ] Verificación; auditoría.
- [ ] Con el ✅:
  - commit, push y PR con base `feature/android-entrenador-medidas`;
  - tarjeta a ⏳ PENDIENTES;
  - **avisar a Igna que terminó la fase 2**, con el resumen de las 7 PRs, lo que quedó pendiente y la cadena de bases para mergear en orden: #44 → #48 → #51 → E1 → … → E7.
