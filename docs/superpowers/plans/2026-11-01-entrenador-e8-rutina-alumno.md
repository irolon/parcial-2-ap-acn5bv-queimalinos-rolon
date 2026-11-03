---
tags: [plan]
tarjeta: E8
---
# E8 · Ver, editar y asignar la rutina de un alumno — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** desde la ficha, el entrenador ve las rutinas del alumno, edita los ejercicios, los reordena, agrega ejercicios de la biblioteca, cambia los días o la activa, y crea una rutina nueva.

**Architecture:**
- **Backend:** suma `PUT /routines/:id/exercises/order`.
- **Mobile:** `TrainerRoutinesRepository` cachea las rutinas del alumno y su detalle en Room v18, y `TrainerExercisesRepository` cachea el catálogo del PT.
- **Escrituras:** son solo online y guardan la respuesta del servidor.
- **UI:** va en `ui/routines/trainer/`, con rutas en `navigation/TrainerRoutineRoutes.kt`.

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e8-rutina-alumno-design.md`

> **Cómo quedó (01/11):**
> - **Selector de la biblioteca:** es una superposición dentro del editor y del asistente (`PickerContent` + `CatalogPicker`), no una ruta aparte. Así el asistente no tiene que pasar el ejercicio elegido por `savedStateHandle`. Las rutas son solo `trainer/routines/{routineId}` y `trainer/students/{studentId}/routines/new`.
> - **Refresco de la ficha:** se refresca sola cada vez que vuelve a primer plano (`LifecycleStartEffect`, como en E7), así que al volver del editor o del asistente ya muestra los días nuevos. El repositorio de rutinas no llama al de la ficha.
> - **Lock:** un `Mutex` por entrenador, no por rutina. La lista de un alumno toca varias rutinas, y un lock único evita que un GET viejo pise un PATCH.
> - **Reorder:** lo optimista lleva un `ReorderTracker`. Solo se guarda la respuesta del último reorder, y si el último falla, vuelve al último orden que confirmó el servidor.
> - **Escrituras:** si el POST o el PATCH salieron bien y lo que falla es el GET de después, el resultado es éxito, para que no se reintente y se duplique. `PATCH /routines/:id` devuelve la fila y se guarda sin otro GET. Quitar un ejercicio lo borra de Room sin GET.
> - **409** (quitar el único ejercicio) es `DataError.Http(409)`; no hizo falta un tipo nuevo.
> - **Detalle no cacheado:** se detecta porque la rutina no tiene ejercicios en Room (una rutina siempre tiene al menos uno), sin `fetchedAt`. La lista sí tiene `trainer_routines_sync`, para distinguir "Sin rutinas" de "no se bajó".
> - **Ficha:** se fue la tarjeta "RUTINA ACTIVA" (`RoutineCard`) y con ella `daysLabel`, que quedó sin uso. La reemplaza la sección "Rutinas". "Asignar rutina" va en `headerActions` y solo aparece para alumnos activos; sin red, deshabilitado.
> - **Asistente:** después de crear, no vuelve a crear aunque se toque otra vez (`done`). El test lo encontró con el dispatcher inmediato.
> - **Chips de objetivo y días:** lo elegido va en azul de marca, porque el gris por defecto casi no se distinguía.
> - **Backend:** el service se dividió en la carpeta `services/routines/routines.service/` (`routines.service.js`, `routine-access.service.js` y `routine-exercises.service.js`, re-exportados desde el primero).
> - **Reorden atómico (ronda 1 de Codex):** en lugar de un `update` por fila, la función SQL `reorder_routine_exercises` valida el conjunto y guarda todo en una transacción, con la rutina bloqueada (`schema/03-routines.sql` + migración `2026-11-01-routines-reorder.sql`, aplicada en Supabase dev).
> - **Mobile, ronda 1:** el ticket del reorder se cierra en `finally` (también al cancelar). Si el reorder falla, Room vuelve a lo que diga el servidor y, sin red, al último orden confirmado. Sin conexión, las filas del editor no abren la hoja; si la red se corta con la hoja abierta, Guardar y Quitar avisan sin llamar al servidor.

## Global Constraints

- **Archivos:** ≤ 200 líneas físicas por archivo, tests incluidos. El orden es capa → módulo → archivo, y los tests copian el árbol.
- **Room:** v18 (`AutoMigration(17, 18)`, con `MigrationV18Test` y `18.json` exportado). Nada destructivo.
- **Validación de ejercicio:** igual a la del backend. Series y reps son enteros > 0, el descanso es un entero ≥ 0, los kg son ≥ 0, el tempo tiene ≤ 20 caracteres y las notas ≤ 500. Nombre de 2 a 120 caracteres y al menos un día.
- **Objetivos:** `tonify | weight_loss | hypertrophy | strength`, que en pantalla son "Tonificar", "Bajar de peso", "Hipertrofia" y "Fuerza", con los textos que ya usa la app del alumno.
- **Días:** `monday..sunday` en minúscula. Se muestran "LUN · MAR · MIÉ · JUE · VIE · SÁB · DOM".
- **403/404** sobre rutina o alumno = `DataError.NotFound`.
- **Backend:** `npm run lint` y `npm test` en verde. El aviso va en `backend/README.md` y el contrato en `docs/arquitectura/contratos-api.md`.
- **PR:** "feat(mobile): ver, editar y asignar la rutina del alumno (tarjeta E8)", con base `feature/android-entrenador-inicio` y la plantilla de PR de Pablo.

## Review Focus

1. **Reordenar rápido** (↑ varias veces seguidas). Las respuestas no pueden llegar desordenadas y dejar un orden viejo. Los `reorder` se serializan con el `Mutex` de la rutina y cada uno manda el estado local completo → test en Task 3.
2. **Quitar el único ejercicio** → 409 → mensaje claro, y el ejercicio sigue en la lista → test en Task 3.
3. **Crear con "Desactivar la actual"** cuando falla el `PATCH` de una de las anteriores → la nueva queda creada, aparece el aviso con el nombre y no se reintenta en loop → test en Task 6.
4. **Coma decimal en kg** ("42,5") → 42.5. Un campo opcional vaciado manda `null`, y no tocarlo no manda la clave → test en Task 2.
5. **Abrir el editor sin conexión** → se ve lo cacheado y las acciones quedan deshabilitadas con el aviso. Sin caché → "Conectate para ver la rutina" → test en Task 5.

---

### Task 1: Backend — reordenar ejercicios

**Files:**
- Modify: `backend/src/validations/routines/routines.validation.js`, que suma `validateReorderExercises`. Si se pasa de 200 líneas, va a `routine-order.validation.js`.
- Modify: `backend/src/services/routines/routines.service.js`, que suma `reorderExercises`. Si se pasa de 200 líneas, el servicio se divide en `routines/routine-exercises.service.js` y se re-exporta.
- Modify: `backend/src/repositories/routines/routine-exercises.repository.js`, que suma `findRoutineExerciseIds(routineId)` y `updateOrderIndexes(routineId, ids)`.
- Modify: controller y routes, con `router.put('/:id/exercises/order', requireRole('trainer'), validate(validateIdParam,'params'), validate(validateReorderExercises), …)`.
- Modify: `docs/arquitectura/contratos-api.md` y `backend/README.md`, con el aviso para Pablo.
- Test: siguiendo la estructura existente en `backend/tests/unit/validations/routines/`, `…/services/routines/` y el test de rutas del módulo.

- [ ] **Tests de validación:**
  - el body sin `routine_exercise_ids` → 400;
  - un elemento que no es UUID → 400;
  - ids repetidos → 400;
  - un arreglo vacío → 400;
  - más de 100 → 400;
  - un arreglo válido pasa.
- [ ] **Tests del servicio,** con mocks como `routines-service.setup.js`:
  - rutina inexistente → 404;
  - rutina ajena → 403;
  - falta un id o sobra uno que no es de la rutina → 400 con `field: "routine_exercise_ids"`;
  - si todo está bien, llama a `updateOrderIndexes` con el orden recibido y devuelve `toRoutineDetail`.
- [ ] Implementar. `updateOrderIndexes` hace `Promise.all` de `update({order_index: i}).eq('routine_id', routineId).eq('id', id)`.
- [ ] Correr `npm run lint` y `npm test` en `backend/` → verde.

### Task 2: Red, DTOs, patches y formulario

**Files:**
- Create: `mobile/.../data/api/routines/TrainerRoutinesApi.kt`, con:
  - `list(@Query("student_id"))`, `get(id)`;
  - `create(CreateRoutineRequest)`, `update(id, JsonObject)`;
  - `addExercises(id, AddExercisesRequest)`;
  - `updateExercise(id, reId, JsonObject)`;
  - `removeExercise(id, reId): Response<Unit>`;
  - `reorder(id, ReorderRequest)`.
- Create: `data/api/routines/TrainerRoutineDtos.kt`:
  - `RoutineSummaryDto(id, student_id, name, goal, days, active, created_at)`;
  - `RoutineDetailDto(…, exercises: List<RoutineExerciseDto>)`;
  - `RoutineExerciseDto(routine_exercise_id, exercise{id,name,muscle_group,equipment,video_url}, sets, reps, rest_seconds, suggested_kg, tempo, notes, order_index)`;
  - los request.
- Create: `data/api/exercises/TrainerExercisesApi.kt` (`GET exercises?include_global=true`) y `TrainerExerciseDto(id, trainer_id, name, muscle_group, equipment, description, video_url, is_global)`.
- Create: `data/routines/trainer/RoutineExerciseForm.kt`. Toma el texto de los campos, devuelve `Valid(fields)` o `Invalid(Map<Field,String>)` y arma el `JsonObject` del `PATCH` solo con las claves que cambiaron (`null` si se vació).
- Create: `data/routines/trainer/RoutinePatch.kt`, que arma el patch de nombre, objetivo, días y `active`.
- Registrar las APIs en el módulo de red donde se registra `StudentsApi`.
- Test: `RoutineExerciseFormTest.kt` y `RoutinePatchTest.kt`.

- [ ] **Tests:**
  - "42,5" → 42.5;
  - reps "0" → error;
  - tempo de 21 caracteres → error;
  - descanso vaciado → `"rest_seconds": null`;
  - un campo sin cambios no aparece en el JSON;
  - sin días → error;
  - nombre de 1 carácter → error.
- [ ] Implementar → verde.

### Task 3: Room v18 y repositorios

**Files:**
- Create: `data/db/routines/trainer/TrainerRoutineEntities.kt`, con `TrainerRoutineEntity` y `TrainerRoutineExerciseEntity`. La FK `(trainerId, routineId)` va con cascade y un índice.
- Create: `data/db/routines/trainer/TrainerRoutinesDao.kt`, con:
  - `observeForStudent`, `observeRoutine` (`@Relation` o dos flows combinados);
  - `replaceForStudent(trainerId, studentId, list)` `@Transaction`;
  - `replaceRoutine(trainerId, detail)` `@Transaction`;
  - `forgetRoutine`, `clearOwner`, `clear`.
- Create: `data/db/exercises/trainer/TrainerExerciseEntity.kt` y su DAO (`observe`, `replaceAll`, `clearOwner`).
- Create: `data/routines/trainer/TrainerRoutine.kt` (dominio) y su mapper.
- Create: `data/routines/trainer/TrainerRoutinesRepository.kt`. Su API:

  ```kotlin
  fun observeStudentRoutines(trainerId: String, studentId: String): Flow<List<TrainerRoutineSummary>>
  fun observeRoutine(trainerId: String, id: String): Flow<TrainerRoutineDetail?>
  suspend fun refreshList(trainerId: String, studentId: String): Result<Unit>
  suspend fun refreshRoutine(trainerId: String, id: String): Result<Unit>
  suspend fun create(trainerId: String, request: CreateRoutineRequest): Result<String> // id nuevo
  suspend fun update(trainerId: String, id: String, patch: JsonObject): Result<Unit>
  suspend fun updateExercise(trainerId: String, id: String, reId: String, patch: JsonObject): Result<Unit>
  suspend fun addExercises(trainerId: String, id: String, items: List<NewRoutineExercise>): Result<Unit>
  suspend fun removeExercise(trainerId: String, id: String, reId: String): Result<Unit>
  suspend fun reorder(trainerId: String, id: String, ids: List<String>): Result<Unit>
  ```

  - Hay un `Mutex` por `(trainerId, routineId)`.
  - `reorder` primero escribe el `orderIndex` local (lo optimista) y después llama a la API. Si falla, vuelve a escribir el orden anterior.
  - Las escrituras que devuelven el detalle hacen `replaceRoutine` con él. `update` hace un `refreshRoutine` dentro del lock.
  - `addExercises` devuelve la lista de ejercicios agregados, así que después hace `refreshRoutine`.
  - 403/404 → `forgetRoutine` + `DataError.NotFound`. 409 → `DataException(DataError.Conflict(message))`, usando el tipo de error que ya exista. Si no hay uno para 409, se agrega.
- Create: `data/exercises/trainer/TrainerExercisesRepository.kt` (`observe`, `refresh`).
- Create: `di/routines/TrainerRoutinesModule.kt`, que registra los `@IntoSet UserDataCleaner`.
- Modify: `FitTrainerDatabase.kt` (v18, entidades nuevas, `AutoMigration(17, 18)`).
- Test: `TrainerRoutinesRepositoryTest.kt`. Si se pasa de 200 líneas, se divide en `…ReadTest` y `…WriteTest`, en `data/routines/trainer/`. Además, `TrainerExercisesRepositoryTest.kt` y `MigrationV18Test.kt`.

- [ ] **Tests:**
  - `refreshList` reemplaza las rutinas del alumno y borra una que ya no vino;
  - las de otro alumno no se tocan;
  - 403 → `forget` + `NotFound`;
  - 409 en `removeExercise` → `Conflict` con el mensaje, y el ejercicio sigue en Room;
  - `reorder` con falla vuelve al orden anterior;
  - dos `reorder` seguidos terminan con el orden del último (Review Focus 1);
  - un `refreshRoutine` que empezó antes de un `updateExercise` no pisa el valor nuevo;
  - la migración 17→18 conserva los datos.
- [ ] Implementar → verde, con `gradlew testDebugUnitTest`.

### Task 4: Ficha — sección Rutinas y botón "Asignar rutina"

**Files:**
- Create: `ui/routines/trainer/section/RoutinesSection.kt`, `RoutinesSectionViewModel.kt` y `RoutinesTexts.kt`.
- Modify: `ui/students/detail/StudentDetailScreen.kt`. Saca `RoutineCard` y agrega el parámetro `headerActions: @Composable () -> Unit = {}` debajo de `DetailHeader`.
- Modify: `navigation/TrainerStudentRoutes.kt`. Suma `item { RoutinesSection(onOpen = …, onNew = …) }` en `extraSections`, antes de progreso, y `headerActions` con el botón "Asignar rutina", que solo aparece si `detail.active` y hay conexión.
- Delete: `RoutineCard` si queda sin uso, y se actualiza la KDoc de la ficha.
- Test: `RoutinesSectionViewModelTest.kt`.

- [ ] **Tests:**
  - el orden es primero las activas y después las inactivas, cada grupo por fecha descendente;
  - días "LUN · MIÉ · VIE";
  - estado vacío;
  - error de refresh sin caché → reintento;
  - con caché, sin conexión, se ve la lista.
- [ ] Implementar → verde.

### Task 5: Editor de rutina, hoja del ejercicio y selector

**Files:**
- Create: `ui/routines/trainer/editor/RoutineEditorScreen.kt`, `RoutineEditorViewModel.kt`, `RoutineEditorUiState.kt` y `EditorTexts.kt`.
- Create: `ui/routines/trainer/editor/components/RoutineHeaderSheet.kt` (nombre, objetivo, días), `RoutineExerciseSheet.kt` y `EditorExerciseRow.kt` (fila con ↑/↓).
- Create: `ui/routines/trainer/picker/ExercisePickerScreen.kt` y `ExercisePickerViewModel.kt`, que filtran por texto, sin tildes y sin distinguir mayúsculas, y por grupo, sobre `TrainerExercisesRepository`.
- Create: `navigation/TrainerRoutineRoutes.kt`, con las rutas del spec §4.4, y se registra donde se registran las de alumnos.
- Test: `RoutineEditorViewModelTest.kt` (si se pasa de 200 líneas, se divide en el de la hoja y el de la lista) y `ExercisePickerViewModelTest.kt`.

- [ ] **Tests:**
  - **Guardar el descanso:** llama a `updateExercise` con `{"rest_seconds": 120}` y, mientras está en curso, `saving = true` deshabilita el botón;
  - **un 400:** muestra el error del campo;
  - **↑ en el primero:** no hace nada;
  - **↓:** llama a `reorder` con los ids movidos;
  - **sin conexión:** `canEdit = false` y aparece el aviso (Review Focus 5);
  - **`NotFound`:** `gone = true`;
  - **el interruptor "Activa":** manda el `PATCH` y refresca la ficha;
  - **el selector:** "press banca" encuentra "Press de banca" y el chip filtra por grupo.
- [ ] Implementar → verde.

### Task 6: Asistente "Rutina nueva"

**Files:**
- Create: `ui/routines/trainer/create/NewRoutineScreen.kt`, `NewRoutineViewModel.kt`, `NewRoutineUiState.kt` y `NewRoutineTexts.kt`. El paso 2 reusa `EditorExerciseRow` y `RoutineExerciseSheet` en modo local.
- Test: `NewRoutineViewModelTest.kt`.

- [ ] **Tests:**
  - "Siguiente" solo se habilita con nombre y días válidos;
  - "Crear" solo con al menos un ejercicio;
  - el request lleva `order` 0..n-1 en el orden local;
  - la casilla de desactivar solo aparece si hay activas, y viene marcada;
  - si está marcada, después de crear hace `PATCH active=false` a cada activa anterior;
  - si uno falla, termina igual con el aviso "La rutina se creó, pero no se pudo desactivar <nombre>" (Review Focus 3);
  - si está desmarcada, no hace ningún `PATCH`;
  - un doble toque en "Crear" hace un solo `POST`;
  - al terminar navega al editor con el id nuevo y refresca la ficha.
- [ ] Implementar → verde.

### Task 7: Verificación y E2E

- [ ] Correr `gradlew checkFileLength assembleDebug testDebugUnitTest` y, en `backend/`, `npm run lint` y `npm test`.
- [ ] **E2E en el emulador**, con el backend local apuntando a Supabase dev, entrando como profe.card8:
  - abrir la ficha de un alumno de prueba → cambiar el descanso de un ejercicio a 120 s;
  - entrar como ese alumno → Hoy muestra 120 s (criterio de aceptación);
  - crear una rutina nueva desactivando la anterior;
  - reordenar;
  - agregar y quitar un ejercicio;
  - modo avión → el editor queda en modo lectura.
- [ ] Anotar "Cómo quedó" en el spec y el plan. Después, la tarjeta pasa a 🔍 AUDITORÍA con el comentario `🛠️ CLAUDE · Lista para auditar`.
