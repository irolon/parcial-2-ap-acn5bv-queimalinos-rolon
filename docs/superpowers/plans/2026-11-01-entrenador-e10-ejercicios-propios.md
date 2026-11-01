---
tags: [plan]
tarjeta: E10
---
# E10 · Biblioteca: ejercicios propios del entrenador — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** biblioteca del entrenador en Más, con alta, edición y baja de ejercicios propios, que se pueden usar enseguida en una rutina (E8).

**Architecture:**
- **Datos:** `TrainerExercisesRepository` (de E8) suma `create`, `update` y `delete` sobre `trainer_exercises`. Room no cambia.
- **UI:** va en `ui/exercises/trainer/`, con rutas en `navigation/TrainerExerciseRoutes.kt`.
- **Backend:** no cambia.

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e10-ejercicios-propios-design.md`

> **Cómo quedó (01/11):**
> - **El formulario puro** (`ExerciseForm.kt`) vive en `ui/exercises/trainer/form/`, no en `data/`: usa las listas de grupos y equipos de `ui/components/exercise/`, y data no depende de UI. El repositorio recibe el `JsonObject` armado.
> - **`TrainerExercise`** sigue en `TrainerExercisesRepository.kt`, como en E8. Los errores nuevos están en `data/exercises/trainer/ExerciseErrors.kt`.
> - **La biblioteca** reusa el `CatalogPicker` de E8 (búsqueda y grupo) y le suma "Solo míos". `ExerciseDetailSheet` suma el slot `actions` para "Editar" y "Eliminar".
> - **Al borrar**, la hoja se cierra siempre, así el aviso (también el 409) queda a la vista.
> - **La URL del video** se valida un poco más estricta que en el backend (no acepta espacios).

## Global Constraints

- **Archivos:** ≤ 200 líneas físicas, tests incluidos. El orden es capa → módulo → archivo, y los tests copian el árbol.
- **Reglas del backend:**
  - nombre de 2 a 120 caracteres;
  - `muscle_group` dentro de los 11 de `MUSCLE_ORDER`;
  - `equipment` dentro de `barbell | dumbbell | machine | cable | bodyweight | kettlebell | band`;
  - descripción ≤ 1000;
  - `video_url` `http://` o `https://`, ≤ 500.
- **Errores:** 409 `EXERCISE_IN_USE` muestra el mensaje del backend. 403/404 → `NotFound`.
- **PR:** "feat(mobile): biblioteca del entrenador con alta, edición y baja de ejercicios propios (tarjeta E10)". Base `feature/android-entrenador-plantillas`.

## Review Focus

1. Borrar un ejercicio usado en una rutina → 409 → mensaje, y el ejercicio sigue en la lista → test en Task 2 y en Task 3.
2. Recién creado → aparece en el selector de E8 sin refrescar → test en Task 2 (`observe` lo trae).
3. Editar vaciando la descripción o el video → `null` explícito; no tocar un campo no lo manda → test en Task 1.
4. URL con espacios, "www.x.com" sin esquema o "ftp://" → error en el campo antes de mandar → test en Task 1.
5. Doble toque en "Guardar" del formulario → un solo POST → test en Task 3.

---

### Task 1: Formulario puro y etiquetas

- **Create:** `ui/exercises/trainer/form/ExerciseForm.kt` (ver "Cómo quedó"):
  - `ExerciseFormInput(name, muscleGroup, equipment, description, videoUrl)`;
  - `errors(): Map<ExerciseFormField, String>`;
  - `toCreateBody()`;
  - `patch(before: TrainerExercise): JsonObject?`;
  - `exerciseFormFieldOf(apiField)`.
- **Modify:** `ui/components/exercise/ExerciseTexts.kt`: `equipmentLabel` y `EQUIPMENT_ORDER`. `ExerciseDetailSheet` muestra el equipo con la etiqueta y suma un slot `actions`.
- **Test:** `ExerciseFormTest`, `ExerciseTextsTest` (equipo).

### Task 2: Red y repositorio

- **Modify:** `TrainerExercisesApi` (`create`, `update`, `delete`) y `TrainerExercisesRepository`.
- **Create:** `data/exercises/trainer/ExerciseErrors.kt` (`ExerciseRejectedException`, `ExerciseInUseException`).
- **Test:** `TrainerExercisesRepositoryTest` (+ alta, edición, 409, 404, 400) y el fake.

### Task 3: UI y navegación

- **Create:**
  - `ui/exercises/trainer/library/TrainerLibraryScreen.kt` y `TrainerLibraryViewModel.kt`;
  - `ui/exercises/trainer/form/ExerciseFormScreen.kt` y `ExerciseFormViewModel.kt`;
  - `ui/exercises/trainer/components/…` y `TrainerExercisesTexts.kt`;
  - `navigation/TrainerExerciseRoutes.kt`.
- **Modify:**
  - `TrainerMenuLinks` (+ Biblioteca);
  - `RoleShell` (registrar las rutas);
  - `RoleTabs.parentTab` (`trainer/exercises` → Más).
- **Test:**
  - `TrainerLibraryViewModelTest`: "Solo míos", búsqueda, borrar OK y con 409, sin red;
  - `ExerciseFormViewModelTest`: alta, edición con diff, validación, 400 por campo, doble toque, sin red, `NotFound`.

### Task 4: Verificación y E2E

- [ ] Correr `gradlew checkFileLength assembleDebug testDebugUnitTest`.
- [ ] Hacer el E2E del §5 del spec.
- [ ] Anotar "Cómo quedó", pasar la tarjeta a 🔍 AUDITORÍA y comentar.
