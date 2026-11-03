---
tags: [spec]
tarjeta: E8
---
# Spec — E8 · Ver, editar y asignar la rutina de un alumno

- **Tarjeta:** [E8 del tablero del entrenador](https://trello.com/c/506PRbol).
- **Fecha:** 2026-11-01.
- **Rama:** `feature/android-entrenador-rutinas`, apilada sobre `feature/android-entrenador-inicio` (E7, PR #58).
- **Diseño:** el prototipo solo trae el botón "Asignar rutina" en `EM_PerfilAlumno`. Las pantallas de rutina siguen el estilo del resto de la app del entrenador (tema oscuro, `SectionCard`, toque mínimo 44 dp).

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

## 1. Objetivo

Desde la ficha del alumno, el entrenador ve sus rutinas, edita los ejercicios (series, reps, descanso, kg sugerido, tempo, notas), agrega ejercicios de la biblioteca, los reordena, cambia los días y crea una rutina nueva. Pensado para el celular: lista editable, no la tabla de la web.

**Criterio de aceptación:** el entrenador cambia el descanso de un ejercicio de la rutina de un alumno desde el celular y el alumno lo ve en su Hoy.

## 2. Decisiones (debate del 01/11)

1. **Varias rutinas activas.** El backend las permite. La ficha cambia la tarjeta "Rutina" por una sección **"Rutinas"** con todas las del alumno (activas primero, después inactivas, cada grupo de la más nueva a la más vieja). Cada fila muestra el nombre, los días ("LUN · MIÉ · VIE") y la píldora ACTIVA/INACTIVA. Tocarla abre el editor.
2. **Crear o asignar:** al crear una rutina nueva aparece **"Desactivar la rutina actual"**, marcado por defecto, solo si el alumno tiene alguna activa. Con la casilla marcada, después del `POST` se hace `PATCH active=false` a cada una de las otras activas. Si alguno de esos `PATCH` falla, la rutina nueva queda creada igual y se avisa: "La rutina se creó, pero no se pudo desactivar <nombre>".
3. **Edición sin borrador.** Cada cambio se guarda al tocar "Guardar" en su hoja: ejercicio, nombre/objetivo/días o activar/desactivar. Hay un `PATCH` por cambio y Room guarda lo que devuelve el servidor.
4. **Solo con red.** La lectura queda cacheada en Room (rutinas y ejercicios). Sin conexión, el editor se ve en modo lectura con el aviso "Sin conexión · los cambios necesitan internet", igual que en la fase 2.
5. **Reordenar:** botones ↑/↓ por fila (44 dp), sin arrastrar. El cambio se ve al instante y manda el orden completo al endpoint nuevo (§3). Si falla, vuelve al orden anterior y avisa.
6. **Cambiar un ejercicio por otro** = quitarlo y agregar el nuevo. No se toca el backend.
7. **Encabezado de la ficha:** se suma el botón primario **"Asignar rutina"**, como en el prototipo, que abre "Rutina nueva". El botón "Mensaje" llega con E11. E9 le agrega "Desde plantilla" a este mismo botón.
8. **Biblioteca como selector:** "Agregar ejercicio" abre un selector con búsqueda y chips de grupo muscular (`MuscleChips`). Lee del catálogo del entrenador, `GET /exercises?include_global=true`, cacheado en Room. E10 reusa esta tabla para el CRUD.

## 3. Backend: `PUT /routines/:id/exercises/order` (nuevo)

Es un cambio chico en el módulo routines, que es de Pablo. Va con aviso en `backend/README.md` y en `docs/arquitectura/contratos-api.md`, en la misma PR.

- Solo trainer y solo sobre una rutina propia: ajena → 403, inexistente → 404, como el resto del módulo.
- **Body:** `{ "routine_exercise_ids": ["uuid", …] }`. Tiene que ser **exactamente** el conjunto de ejercicios de la rutina, sin repetidos ni faltantes. Si no, devuelve 400 `VALIDATION_ERROR` con `field: "routine_exercise_ids"`.
- Asigna `order_index = posición` (0..n-1) y devuelve el detalle como `GET /routines/:id`.
- Es atómico: la función SQL `reorder_routine_exercises` bloquea la rutina, comprueba el conjunto exacto y guarda todo en una transacción. Si el conjunto no coincide, devuelve false sin tocar nada → 400. Es idempotente: el body es el estado final.
- **Capas:** validación en `validations/routines/` (forma: arreglo de 1..100 UUID sin repetidos), service `reorderExercises` (ownership; el conjunto lo valida la función SQL) y repo `reorderRoutineExercises` (`supabase.rpc`). Hay tests de validación, de service y de repositorio.

## 4. Mobile

### 4.1 Datos (Room v18, `AutoMigration(17, 18)`)

- `trainer_routines`: PK `(trainerId, id)`. Campos: `studentId`, `name`, `goal`, `days` (CSV, como las del alumno), `active`, `createdAt`, `fetchedAt`.
- `trainer_routine_exercises`: PK `(trainerId, id)` y FK a `trainer_routines` con cascade. Campos: `routineId`, `exerciseId`, `name`, `muscleGroup`, `equipment`, `sets`, `reps`, `restSeconds`, `suggestedKg`, `tempo`, `notes`, `orderIndex`.
- `trainer_exercises`: PK `(trainerId, id)`. Campos: `name`, `muscleGroup`, `equipment`, `description`, `videoUrl`, `isGlobal`, `fetchedAt`.
- La lista de rutinas del alumno se reemplaza entera en cada refresh: se borran las de ese alumno y se insertan las nuevas, en una transacción. El detalle se reemplaza por rutina.

### 4.2 Red

- `RoutinesApi` (trainer): `list(studentId)`, `get(id)`, `create`, `update(id, JsonObject)`, `addExercises`, `updateExercise(id, reId, JsonObject)`, `removeExercise`, `reorder`.
- `ExercisesApi` (trainer): `list(includeGlobal = true)`.
- Los `PATCH` arman el `JsonObject` a mano, como `StudentPatch`: "borrar" es la clave en `null` y "no tocar" es la clave ausente.

### 4.3 Repositorios (`data/routines/trainer/`, `data/exercises/trainer/`)

- **`TrainerRoutinesRepository`:**
  - `observeStudentRoutines(trainerId, studentId)`, `observeRoutine(trainerId, id)`, `refreshList`, `refreshRoutine`.
  - Las escrituras devuelven `Result` y guardan la respuesta del servidor.
  - Tiene un `Mutex` por rutina, como en E4, para que un GET viejo no pise un `PATCH`.
  - 403/404 → borra la rutina del caché y devuelve `DataError.NotFound`. 409 de "quitar el único ejercicio" → `DataError` con el mensaje "La rutina necesita al menos un ejercicio".
- **`TrainerExercisesRepository`:** `observe(trainerId)` y `refresh`. E10 le agrega crear, editar y borrar.
- Los dos se registran como `UserDataCleaner` (`di/routines/`).
- Después de crear una rutina, activar o desactivar una, o cambiar sus días, se refresca la ficha (`TrainerStudentDetailRepository.refresh`), así se actualizan el encabezado ("4 D/SEM") y la lista de alumnos.

### 4.4 UI (`ui/routines/trainer/`)

- **`RoutinesSection`** (en la ficha, en lugar de `RoutineCard`): las filas del §2.1, el estado vacío "Sin rutinas · Asigná la primera" y un error con reintento.
- **`RoutineEditorScreen`:**
  - La cabecera muestra nombre, objetivo y días, con "Editar", que abre una hoja con nombre, objetivo (4 opciones) y chips de días.
  - Un interruptor "Activa".
  - La lista de ejercicios: nombre, "4 × 10 · 90 s · 40 kg", y ↑/↓. Tocar un ejercicio abre `RoutineExerciseSheet`.
  - "Agregar ejercicio" va al final.
- **`RoutineExerciseSheet`:**
  - Campos: series y reps (obligatorios, enteros > 0), descanso (s), kg sugerido, tempo (≤ 20) y notas (≤ 500).
  - Acciones: "Guardar" y "Quitar de la rutina".
  - La validación local es la misma que la del backend. Un 400 se muestra por campo.
- **`ExercisePickerScreen`:** búsqueda y `MuscleChips`, con filas `ExerciseRow`. Elegir uno abre la hoja con 3 × 10 por defecto. "Agregar" hace `POST /routines/:id/exercises` (en el asistente, en cambio, lo suma a la lista local).
- **`NewRoutineScreen`:** asistente de 2 pasos.
  1. Nombre (2-120), objetivo, días (al menos 1) y la casilla del §2.2.
  2. Ejercicios: la lista local con ↑/↓ y quitar, y "Agregar ejercicio". "Crear" se habilita con al menos 1 ejercicio.
  - Al terminar abre el editor de la rutina creada.
- **Rutas** en `navigation/TrainerRoutineRoutes.kt`, colgadas de la ficha:
  - `trainer/students/{studentId}/routines/new`
  - `trainer/routines/{routineId}`
  - `trainer/routines/{routineId}/add`
  - `trainer/students/{studentId}/routines/new/add`, que devuelve el ejercicio elegido por `savedStateHandle`.
- Textos en `*Texts.kt`, como el resto. Ningún archivo pasa de 200 líneas.

## 5. Errores y bordes

- **Alumno dado de baja:** se puede ver y editar su rutina. No se le crea una nueva: el botón no aparece si el alumno no está activo.
- **Rutina borrada o ajena** al abrir el editor (403/404): toast "La rutina ya no existe" y vuelve a la ficha.
- **Doble toque en Guardar:** el botón se deshabilita mientras está en curso.
- **Biblioteca vacía o sin conexión** en el selector: muestra el caché. Si no hay nada, "Conectate para cargar la biblioteca".

## 6. Pruebas

- **Backend:** tests unitarios de validación y service de `reorder` (conjunto exacto, ajena 403, inexistente 404) y test de ruta. `npm run lint` y `npm test`.
- **Mobile:**
  - Tests unitarios de los repositorios: reemplazo de la lista, `Mutex`, 403 → borrar del caché, 409 → mensaje, y reorder con reversión.
  - Tests de los ViewModels: asistente, desactivar la anterior, error de un `PATCH`, y hoja con validación.
  - Test del armado de los `JsonObject`.
  - `gradlew checkFileLength assembleDebug testDebugUnitTest`.
- **E2E en emulador** con profe.card8 y un alumno de prueba:
  1. Cambiar el descanso de un ejercicio de su rutina.
  2. Entrar como el alumno y ver el descanso nuevo en Hoy, que es el criterio de aceptación.
  3. Además: crear una rutina nueva desactivando la anterior, reordenar y agregar un ejercicio.
