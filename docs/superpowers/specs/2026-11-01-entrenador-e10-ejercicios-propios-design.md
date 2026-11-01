---
tags: [spec]
tarjeta: E10
---
# Spec — E10 · Biblioteca: ejercicios propios del entrenador

- **Tarjeta:** [E10 del tablero del entrenador](https://trello.com/c/HC6qcMuE).
- **Fecha:** 2026-11-01.
- **Rama:** `feature/android-entrenador-ejercicios`, apilada sobre `feature/android-entrenador-plantillas` (E9, PR #63).
- **Diseño:** el prototipo no tiene esta pantalla. Reusa los componentes de la biblioteca del alumno (tarjeta 9): `ExerciseRow`, `MuscleChips` y `ExerciseDetailSheet`.

> **Cómo quedó (01/11):**
> - **El formulario puro** (`ExerciseForm.kt`) vive en `ui/exercises/trainer/form/`, no en `data/`: usa las listas de grupos y equipos de `ui/components/exercise/`, y data no depende de UI. El repositorio recibe el `JsonObject` armado.
> - **`TrainerExercise`** sigue en `TrainerExercisesRepository.kt`, como en E8. Los errores nuevos están en `data/exercises/trainer/ExerciseErrors.kt`.
> - **La biblioteca** reusa el `CatalogPicker` de E8 (búsqueda y grupo) y le suma "Solo míos". `ExerciseDetailSheet` suma el slot `actions` para "Editar" y "Eliminar".
> - **Al borrar**, la hoja se cierra siempre, así el aviso (también el 409) queda a la vista.
> - **La URL del video** se valida un poco más estricta que en el backend (no acepta espacios).

## 1. Objetivo

El entrenador ve su biblioteca (ejercicios globales y propios) y da de alta, edita y borra sus ejercicios propios: nombre, grupo muscular, equipo, descripción y video.

**Criterio de aceptación:** el entrenador crea un ejercicio propio desde el celular y lo puede usar en una rutina (E8).

## 2. Decisiones (debate del 01/11)

1. **Dónde vive:** la entrada **"Biblioteca"** va en Más, debajo de "Plantillas" (`TrainerMenuLinks`).
2. **Datos:** se reusa la tabla `trainer_exercises` de E8, que ya trae `isGlobal`. **Room no cambia (v19).** Un ejercicio creado o editado se guarda en esa tabla con la respuesta del servidor, así el selector de E8 lo ve al instante. Eso cumple el criterio de aceptación sin tocar E8.
3. **Pantalla Biblioteca:**
   - búsqueda (la misma de E8, sin tildes y por todas las palabras) y `MuscleChips`;
   - un chip **"Solo míos"**;
   - cada fila muestra "Pecho · Barra" y la etiqueta **PROPIO** en los del entrenador;
   - tocar una fila abre `ExerciseDetailSheet` y, si es propio, suma **Editar** y **Eliminar**;
   - "Nuevo ejercicio" va arriba.
4. **Formulario** (pantalla aparte, alta y edición). Las reglas son las del backend:
   - nombre de 2 a 120 caracteres;
   - grupo muscular obligatorio (chips con los 11 grupos);
   - equipo opcional (chips con los 7, tocar el elegido lo quita);
   - descripción de hasta 1000 caracteres;
   - video: URL `http(s)` de hasta 500 caracteres, solo URL (no se suben archivos).
   - Al editar, el PATCH lleva solo lo que cambió, con `null` explícito al vaciar.
5. **Eliminar:** pide confirmación.
   - 409 `EXERCISE_IN_USE` (el ejercicio está en una rutina o en una sesión) → se muestra el mensaje del backend y el ejercicio sigue.
   - 404/403 → sale del caché.
6. **Offline:** la lista sale de Room. Crear, editar y borrar son solo con red: los botones se deshabilitan y aparece el aviso.
7. **Etiquetas del equipo:** se suma `equipmentLabel` ("Barra", "Mancuernas", "Máquina", "Polea", "Peso corporal", "Kettlebell", "Banda") en `ui/components/exercise/`. La usan esta pantalla y la hoja de detalle, que hasta ahora mostraba "barbell" tal cual (eso también mejora la biblioteca del alumno).

## 3. Backend

No cambia. Usa:
- `GET /exercises?include_global=true`;
- `POST /exercises`: 201 con la fila;
- `PATCH /exercises/:id`: la fila;
- `DELETE /exercises/:id`: 204, o 409 `EXERCISE_IN_USE`.

## 4. Mobile

- **Red:** `TrainerExercisesApi` suma `create`, `update(id, JsonObject)` y `delete(id): Response<Unit>`.
- **Repositorio:** `TrainerExercisesRepository` suma `create(form)`, `update(id, patch)` y `delete(id)`. Todas devuelven `Result` y guardan o borran la fila en Room.
  - 400 → `ExerciseRejectedException(fields, message)`;
  - 409 → `ExerciseInUseException(message)`;
  - 403/404 → sale del caché y devuelve `NotFound`.
- **Formulario puro:** `data/exercises/trainer/ExerciseForm.kt`, con validación, armado del body del POST y diff del PATCH.
- **UI** (`ui/exercises/trainer/`):
  - `library/TrainerLibraryScreen` y su ViewModel;
  - `form/ExerciseFormScreen` y su ViewModel, con el arg opcional `exerciseId` (con id es edición);
  - `components/` (fila con "PROPIO", chips de grupo y de equipo).
- **Rutas:** `trainer/exercises`, `trainer/exercises/new` y `trainer/exercises/{exerciseId}/edit`, que heredan la pestaña Más.

## 5. Pruebas

- **Unitarias:**
  - el formulario (reglas, URL inválida, vaciar → `null`, sin cambios → sin patch);
  - el repositorio (alta y edición guardan en Room, 409 conserva, 404 borra, 400 por campo);
  - ViewModels: biblioteca ("Solo míos", búsqueda, borrar con 409) y formulario (validación, doble toque, sin red, edición con diff).
- **E2E en el emulador:**
  1. Crear "Curl E2E E10" (Bíceps, Mancuernas, con video).
  2. Abrir el editor de una rutina y agregarlo desde el selector (criterio de aceptación).
  3. Editarlo.
  4. Intentar borrarlo estando en la rutina (409 con mensaje).
  5. Quitarlo de la rutina y borrarlo.
  6. Restaurar los datos.
