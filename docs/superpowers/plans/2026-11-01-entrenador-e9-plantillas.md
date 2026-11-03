---
tags: [plan]
tarjeta: E9
---
# E9 · Plantillas de rutina: listar y asignar — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** el entrenador ve sus plantillas, le asigna una a un alumno eligiendo los días (copia, ADR 0003) y guarda una rutina como plantilla.

**Architecture:**
- **Datos:** `TrainerTemplatesRepository` cachea la lista y el detalle en Room v19, en `trainer_templates` y `trainer_templates_sync`.
- **Asignar:** `instantiate` llama a la API y guarda la rutina nueva en el caché de E8.
- **UI:** va en `ui/templates/trainer/`, con rutas en `navigation/TrainerTemplateRoutes.kt`. El backend no cambia.

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e9-plantillas-design.md`

> **Cómo quedó (01/11):**
> - **Asignar** vive en un `AssignTemplateController` (`ui/templates/trainer/assign/`), aparte del ViewModel del detalle. Lo mismo para "Guardar como plantilla": `SaveAsTemplateController` en el editor de E8, porque el ViewModel del editor estaba en el límite de 200 líneas. Para hacer lugar, el editor expone `picker` directo y el cálculo de ↑/↓ pasó a `List<String>.moved()`.
> - **`instantiate`** guarda la rutina nueva en el caché de E8 con `TrainerRoutinesRepository.store`, así el editor la abre sin esperar.
> - **"Desactivar la rutina actual"** se extrajo a `deactivateOthers` (`data/routines/trainer/DeactivateOthers.kt`). La usan el asistente de E8 y la asignación.
> - **`CheckRow`:** en el E2E apareció que el texto de la casilla no la marcaba, ni en E8 ni acá. Ahora toda la fila responde al toque y se usa en los dos lugares.
> - **Más:** `AccountMenuScreen` recibe `MenuLink`s y los del entrenador salen de `navigation/TrainerMenuLinks.kt`. `TRAINER_MORE_ROUTE` es una constante, y las rutas de plantillas desde Más dejan marcada esa pestaña.
> - **Desde Más,** después de asignar el editor queda arriba del detalle de la plantilla. Desde la ficha, las pantallas de plantillas salen del back stack y "atrás" vuelve a la ficha.

## Global Constraints

- **Archivos:** ≤ 200 líneas físicas, tests incluidos. El orden es capa → módulo → archivo, y los tests copian el árbol.
- **Room:** v19 (`AutoMigration(18, 19)`, `MigrationV19Test`, `19.json`).
- **Niveles:** `beginner | intermediate | advanced`, que se muestran como "Principiante", "Intermedio" y "Avanzado". El objetivo usa `goalLabel`.
- **Días:** los del backend, en orden de la semana, con al menos uno. El nombre va de 2 a 120 caracteres.
- **Errores:** un 409 de instantiate muestra el `message` del backend. 404 → la plantilla sale del caché. 403 por el alumno → `NotFound` con "Ese alumno ya no está en tu lista".
- **PR:** "feat(mobile): plantillas de rutina, asignarlas a un alumno y guardar una rutina como plantilla (tarjeta E9)". Base `feature/android-entrenador-rutinas` y la plantilla de PR de Pablo.

## Review Focus

1. Doble toque en "Asignar" (también después de asignada) → un solo POST → test en Task 4.
2. Plantilla con un ejercicio borrado → 409 → se ve el mensaje del backend en la hoja y no navega → test en Task 4.
3. El refresh de la lista no pierde el detalle cacheado de las que siguen → test en Task 2.
4. Días de la plantilla desordenados en `structure` ("friday", "monday") → la hoja los muestra y los manda en orden de la semana → test en Task 4.
5. Sin red con la hoja abierta → "Asignar" avisa y no llama → test en Task 4.

---

### Task 1: Red, DTOs y "desactivar las anteriores"

- **Create:** `data/api/templates/TrainerTemplatesApi.kt` y `TrainerTemplateDtos.kt`:
  - `TemplateSummaryDto(id, name, goal, level, days, exercise_count, created_at)`;
  - `TemplateDetailDto(…, structure: TemplateStructureDto(days, exercises: List<TemplateExerciseDto>))`;
  - `TemplateExerciseDto(exercise_id, sets, reps, rest_seconds, suggested_kg, tempo, notes, order, exercise: ExerciseDto?)`;
  - `InstantiateRequest(student_id, name, days)` y `FromRoutineRequest(routine_id, name, level?)`;
  - instantiate responde con `TrainerRoutineDetailResponse`.
- **Register:** en `NetworkModule`.
- **Create:** `data/routines/trainer/DeactivateOthers.kt`, con `suspend fun TrainerRoutinesRepository.deactivateOthers(trainerId, previous: List<TrainerRoutineSummary>, keepId): List<String>`.
- **Modify:** `NewRoutineViewModel` para que la use.
- **Test:** `DeactivateOthersTest.kt`:
  - desactiva todas menos `keepId`;
  - devuelve los nombres que fallaron;
  - sin anteriores no llama.

### Task 2: Room v19 y repositorio

- **Create:** `data/db/templates/trainer/TrainerTemplateEntities.kt` (la entidad y la de sync) y `TrainerTemplatesDao.kt`:
  - `observeAll`, `observeSync`, `observe(id)`;
  - `replaceAll` @Transaction, que conserva `structureJson`;
  - `saveDetail`, `forget`, `clearOwner`, `clear`.
- **Create:** en `data/templates/trainer/`:
  - `TrainerTemplate.kt`: dominio `TemplateSummary` y `TemplateDetail(summary, exercises: List<TemplateExercise>)`;
  - `TrainerTemplateMapper.kt`;
  - `TrainerTemplatesRepository.kt`;
  - `TemplateRejectedException(message)` para el 409.
- **Modify:** `FitTrainerDatabase` (v19), `DatabaseModule` y `di/templates/TrainerTemplatesModule.kt` (cleaner).
- **Test:** `TrainerTemplatesRepositoryTest.kt` y `MigrationV19Test.kt`:
  - la lista reemplaza todo y conserva el detalle de las que siguen;
  - el detalle se guarda;
  - 404 → forget + `NotFound`;
  - 409 → `TemplateRejectedException` con el mensaje;
  - instantiate devuelve el id y la rutina queda en `TrainerRoutinesRepository.observeRoutine`;
  - `saveFromRoutine` refresca la lista;
  - offline conserva.

### Task 3: Lista y detalle

- **Create:**
  - `ui/templates/trainer/TemplatesTexts.kt` (`levelLabel`, `templateLine`);
  - `list/TemplatesScreen.kt` y `list/TemplatesViewModel.kt`, con el arg opcional `studentId`, que en ese modo trae el nombre del alumno del caché de E1;
  - `detail/TemplateDetailScreen.kt` y `detail/TemplateDetailViewModel.kt`.
- **Test:**
  - `TemplatesViewModelTest`: orden por nombre, vacío sincronizado contra no bajado, error con reintento, título con alumno;
  - `TemplateDetailViewModelTest`: ejercicios en orden, 404 → gone, sin caché y sin red → "Conectate".

### Task 4: Hoja "Asignar" y "Guardar como plantilla"

- **Create:**
  - `ui/templates/trainer/assign/AssignTemplateSheet.kt` y `AssignState.kt`; la lógica vive en `TemplateDetailViewModel` o, si se pasa de 200 líneas, en un `AssignTemplateController` dentro de `assign/`;
  - `ui/routines/trainer/editor/SaveAsTemplateSheet.kt`.
- **Modify:** `RoutineEditorViewModel`: `onOpenSaveAsTemplate` / `onSaveAsTemplate`. Si se pasa de 200 líneas, se extrae a `editor/SaveAsTemplate.kt`.
- **Test:**
  - `AssignTemplateTest`:
    - días prellenados y en orden;
    - sin alumno no asigna;
    - la casilla aparece solo con activas;
    - desactiva la anterior; si falla, aviso con el nombre;
    - doble toque y después de asignada → un solo POST;
    - 409 → mensaje y no navega;
    - sin red → aviso sin llamar;
    - `done` lleva el id de la rutina nueva.
  - `SaveAsTemplateTest`: el nombre prellenado; nombre inválido → error; OK → aviso "Guardada como plantilla"; sin red → aviso.

### Task 5: Navegación, Más y ficha

- **Create:** `navigation/TrainerTemplateRoutes.kt` y `ui/routines/trainer/section/AssignChoiceSheet.kt`.
- **Modify:**
  - `AccountMenuScreen` (lista de `MenuLink`);
  - `RoleShell` (accesos del entrenador y registro de las rutas);
  - `RoleTabs.parentTab` (`trainer/templates` → Más);
  - `TrainerStudentRoutes` ("Asignar rutina" → `AssignChoiceSheet`).
- **Test:** `TabNavigationTest` y `RoleTabs`: una ruta de plantillas desde Más marca Más; desde la ficha, Alumnos.

### Task 6: Verificación y E2E

- [ ] Correr `gradlew checkFileLength assembleDebug testDebugUnitTest` y `connectedDebugAndroidTest` (MigrationV19).
- [ ] **E2E** (§6 del spec):
  - guardar como plantilla;
  - asignarla desde Más con otros días;
  - el alumno la ve en Mis rutinas;
  - el camino desde la ficha;
  - restaurar los datos.
- [ ] Anotar "Cómo quedó", pasar la tarjeta a 🔍 AUDITORÍA y comentar.
