---
tags: [plan]
tarjeta: E6
---
# E6 · Medidas corporales del alumno — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** historial de medidas del alumno (offline) y alta y baja de medidas (online) desde la ficha.

**Architecture:** `StudentMetricsRepository` cachea `GET /students/:id/metrics` en `trainer_student_metrics` (Room v16). `add` y `delete` llaman a la API y actualizan el caché; después disparan en segundo plano el refresh de la ficha (E3) y del gráfico corporal (E5).

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e6-medidas-design.md`

> **Cómo quedó (01/11):**
> - El refresco del gráfico corporal (E5) no aplica todavía: los gráficos pasaron a **E5b**.
> - La ficha se refresca desde el ViewModel después de guardar o borrar (`detailRepository.refresh`), no desde el repositorio con un scope de aplicación: develop no tiene uno.
> - El `id` del POST se genera al abrir la hoja: un doble toque o un reintento usan el mismo id y el backend no duplica.
> - Las tablas son `trainer_student_metrics` (PK trainerId, id) y `trainer_student_metrics_sync` (PK trainerId, studentId).
> - Un 403 (alumno ajeno) es `DataError.NotFound`.

## Global Constraints

- ≤ 200 líneas; capas (`data/students/metrics/`, `ui/students/metrics/`).
- Room v16 (`AutoMigration(15, 16)`, `MigrationV16Test`).
- Reglas del `POST` (copiar los rangos exactos de `docs/arquitectura/contratos-api.md`, sección Medidas): al menos una medida; `recorded_at` con zona, no futuro.
- IMC: el del backend.
- PR: "feat(mobile): medidas corporales del alumno para el entrenador (tarjeta E6)", base `feature/android-entrenador-progreso`.

## Review Focus

1. Coma decimal ("80,5") en el teclado argentino → se parsea bien → test en Task 1.
2. Borrar una medida que ya no existe (404) → igual sale del caché → test en Task 2.
3. Guardar dos veces con doble toque → una sola medida → test del ViewModel en Task 3.
4. Fecha editada a un día anterior → `recorded_at` a las 12:00 de ese día en Argentina, no a medianoche UTC (que caería el día anterior) → test en Task 1.
5. Después de guardar, la "Última medición" de la ficha cambia sin salir y volver a entrar → test en Task 2 (dispara el refresh de la ficha).

---

### Task 1: Formulario y API

**Files:**
- Modify: `data/api/students/StudentsApi.kt` (`metrics(id)`, `addMetric(id, body)`, `deleteMetric(id, metricId): Response<Unit>`), DTOs
- Create: `data/students/metrics/MetricForm.kt` (parseo con coma, validación y armado del request)
- Test: `MetricFormTest.kt`
- [ ] **Tests:**
  - "80,5" → 80.5;
  - vacío → null;
  - todo vacío → error;
  - fuera de rango → error del campo;
  - fecha futura → error;
  - fecha pasada → `YYYY-MM-DDT12:00:00-03:00`.
- [ ] Implementar → verde.

### Task 2: Room v16 y repositorio

**Files:**
- Create: `data/db/students/metrics/TrainerStudentMetricEntity.kt` + DAO, `data/students/metrics/StudentMetricsRepository.kt`, `StudentMetric.kt`
- Modify: `FitTrainerDatabase.kt` (v16), `di/StudentsModule.kt`
- Test: `StudentMetricsRepositoryTest.kt`, `MigrationV16Test.kt`

**Interfaces:**
- Produces:
  - `observe(trainerId, studentId): Flow<MetricsCache>`;
  - `refresh(...)`;
  - `add(trainerId, studentId, form): Result<Unit>`: inserta la respuesta y lanza `detailRepository.refresh` y `progressRepository.refreshBody(Student(...))` sin bloquear (`applicationScope`);
  - `delete(trainerId, studentId, metricId): Result<Unit>`: 204 o 404 → la saca del caché; otro error → no toca nada;
  - `clearUserData`.
- [ ] **Tests:**
  - refresh;
  - add inserta y pide el refresh de la ficha;
  - delete con 204 y con 404;
  - error de red;
  - dueño.
- [ ] Implementar → verde.

### Task 3: UI

**Files:**
- Create: `ui/students/metrics/StudentMetricsScreen.kt` + ViewModel + UiState, `components/MetricRow.kt`, `components/NewMetricSheet.kt`, `MetricsTexts.kt`
- Modify: `ui/students/detail/components/LatestMetricsCard.kt` ("Ver historial" y "+ Nueva medida"), rutas en `RoleTabs.kt`/`RoleShell.kt` (`trainer/students/{studentId}/metrics`)
- Test:
  - ViewModel (sin red deshabilita; doble guardar → una llamada; confirmación de borrado);
  - textos ("80,5 kg · IMC 24,1 · 18 %", "por vos" o "por el alumno").
- [ ] Tests → implementar → verde. `gradlew checkFileLength assembleDebug testDebugUnitTest`.

### Task 4: E2E, auditoría y PR

- [ ] **E2E:**
  - cargar peso 80,5 y cintura 82 al alumno al día;
  - ver la medida en el historial, en "Última medición" y en el gráfico de peso (E5);
  - borrarla;
  - modo avión → historial visible y botón deshabilitado.
- [ ] Verificación; auditoría.
- [ ] Con el ✅: commit, push y PR con base `feature/android-entrenador-progreso`; tarjeta a ⏳ PENDIENTES.
