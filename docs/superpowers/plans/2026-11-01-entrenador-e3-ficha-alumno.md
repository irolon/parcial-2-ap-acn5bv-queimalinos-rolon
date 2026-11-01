---
tags: [plan]
tarjeta: E3
---
# E3 · Ficha del alumno — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** tocar un alumno abre su ficha (datos, rutina activa, última medición), que se puede editar y desde la que se da de baja o se reactiva al alumno; lo ya visto se ve offline.

**Architecture:** `TrainerStudentDetailRepository` cachea `GET /students/:id` en `trainer_student_details` (Room v13). Un `PATCH` exitoso guarda la ficha devuelta y actualiza la fila de `trainer_students`. La ficha es una columna de secciones, a la que E4, E5 y E6 suman las suyas.

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e3-ficha-alumno-design.md`

## Global Constraints

- ≤ 200 líneas; capa → módulo → archivo (si `ui/students/` pasa de 10 archivos, subcarpetas `list/` y `detail/`).
- Room v13 con `AutoMigration(12, 13)` y `MigrationV13Test`.
- Reglas del PATCH:
  - `name` 2-100;
  - `goal` y `level` del enum;
  - `birth_date` YYYY-MM-DD, no futura, o null;
  - `gym_equipment` ≤ 30 × 1-50, o null;
  - `injuries` ≤ 1000, o null;
  - `active` boolean;
  - al menos un campo.
- Escrituras solo online.
- PR: "feat(mobile): ficha del alumno para el entrenador (tarjeta E3)", base `feature/android-entrenador-invitar`.

## Review Focus

1. Abrir la ficha de un alumno que ya no es del entrenador (o se borró): el backend da 404. En mobile, 404 → "Este alumno ya no está en tu lista", se borra la fila del caché y se vuelve atrás → test en Task 2.
2. Edad con fecha de nacimiento un 29/02 y hoy 28/02 de un año no bisiesto → test en Task 1.
3. Baja con un error de red a mitad → la ficha sigue "activo" y aparece un aviso; no queda un estado optimista falso → test en Task 3.
4. Borrar las lesiones (texto vacío) → manda `injuries: null`, no `""` → test en Task 1.
5. Volver a la lista después de reactivar → la fila cambia sin esperar a un refresh → test en Task 2.

---

### Task 1: Dominio, API y reglas puras

**Files:**
- Modify: `data/api/students/StudentsApi.kt` (`@GET("students/{id}") get`, `@PATCH("students/{id}") update(@Body UpdateStudentRequest)`), `StudentDtos.kt` (detalle, métrica y rutina activa)
- Create: `data/students/detail/StudentDetail.kt`, `data/students/detail/StudentPatch.kt` (diff y validación); las funciones puras de edad y cabecera van en `ui/students/detail/StudentDetailTexts.kt`
- Test: `StudentPatchTest.kt`, `StudentDetailTextsTest.kt`

**Interfaces:**
- Produces:
  - `StudentDetail(id, name, email, goal, level, birthDate: LocalDate?, active, gymEquipment: List<String>, injuries: String?, createdAt, lastSessionAt, latestMetrics: LatestMetrics?, activeRoutine: ActiveRoutine?)`;
  - `fun diffPatch(before: StudentDetail, after: EditableStudent): UpdateStudentRequest?` (null si no hay cambios; strings vacíos → null; los campos sin cambios no se mandan: se serializan con `explicitNulls` + `encodeDefaults=false`, o con un `JsonObject` armado a mano, porque hay que distinguir "borrar" de "no tocar");
  - `fun ageOn(birth: LocalDate, today: LocalDate): Int`;
  - `fun headerLine(detail, today)`: "24 AÑOS · HIPERTROFIA · 4 D/SEM".
- [ ] **Tests:**
  - edad: cumple hoy, mañana, 29/02;
  - cabecera sin fecha, sin rutina y sin objetivo;
  - diff: solo lesiones; borrar lesiones → null explícito; sin cambios → null;
  - validación de fecha futura;
  - el JSON del PATCH no contiene las claves no tocadas.
- [ ] Implementar → verde.

### Task 2: Room v13 y `TrainerStudentDetailRepository`

**Files:**
- Create: `data/db/students/TrainerStudentDetailEntity.kt` (`@TypeConverters` para `List<String>`), `data/db/students/StudentDetailDao.kt` (o métodos en `TrainerStudentsDao` si entran), `data/students/detail/TrainerStudentDetailRepository.kt`, mapper
- Modify: `FitTrainerDatabase.kt` (v13), `di/StudentsModule.kt`
- Test: `TrainerStudentDetailRepositoryTest.kt`, `MigrationV13Test.kt`

**Interfaces:**
- Produces:
  - `observe(trainerId, id): Flow<StudentDetailCache?>` (`detail` + `fetchedAt`);
  - `refresh(trainerId, id): Result<Unit>`: 404 → borra la ficha y la fila de la lista, y devuelve `DataError.NotFound`;
  - `update(trainerId, id, patch): Result<Unit>`: guarda la respuesta y actualiza `trainer_students` (`name`, `goal`, `active`) en una transacción;
  - `clearUserData`.
- [ ] **Tests:**
  - refresh guarda la ficha;
  - error conserva el caché;
  - 404 borra la ficha y la fila;
  - update exitoso cambia la ficha y la fila;
  - update fallido no toca nada;
  - dueño distinto no ve la ficha.
- [ ] Implementar → verde; migración en el emulador.

### Task 3: Pantalla, edición, baja y navegación

**Files:**
- Create:
  - `ui/students/detail/StudentDetailScreen.kt`, `StudentDetailViewModel.kt`, `StudentDetailUiState.kt`;
  - `ui/students/detail/components/` (`DetailHeader`, `RoutineCard`, `LatestMetricsCard`, `DataCard`, `DisableDialog`);
  - `ui/students/edit/EditStudentScreen.kt` + `EditStudentViewModel.kt`.
- Modify: `RoleTabs.kt` (`TRAINER_STUDENT_DETAIL_ROUTE = "trainer/students/{studentId}"` y `.../edit`; `isTabSelected` para `trainer/students/*`), `RoleShell.kt`, `StudentRow.kt` (tocable → navegar)
- Test: `StudentDetailViewModelTest.kt`, `EditStudentViewModelTest.kt`

- [ ] **Tests:**
  - refresca al entrar;
  - offline → acciones deshabilitadas;
  - baja: pide confirmación y, al confirmar, llama a `update(active=false)`;
  - baja con error → aviso y sigue activo;
  - reactivar sin confirmación;
  - la edición sin cambios deshabilita "Guardar";
  - un 400 se muestra en el campo.
- [ ] **UI:** secciones en una `LazyColumn`; la píldora de estado usa `StudentStatus` de E1. "Dar de baja" en `FtColors.Coral` y "Reactivar" en azul.
- [ ] `gradlew checkFileLength assembleDebug testDebugUnitTest` → verde.

### Task 4: E2E, auditoría y PR

- [ ] **E2E:**
  - ficha del alumno al día;
  - editar lesiones y equipamiento;
  - dar de baja → aparece en el filtro "Dados de baja" de la lista;
  - reactivar;
  - modo avión → la ficha se ve y las acciones están deshabilitadas.
- [ ] Verificación completa; auditoría.
- [ ] Con el ✅: commit, push y PR con base `feature/android-entrenador-invitar`; tarjeta a ⏳ PENDIENTES.
