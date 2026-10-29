# Editor de rutinas en la web — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** listado de rutinas y editor `/pt/rutinas/nueva` (biblioteca a la izquierda, tabla editable con arrastre dnd-kit + teclado, cabecera con días, validación, borrador automático, asignar a un alumno, plantillas).

**Architecture:** el estado del editor es un objeto puro manipulado por funciones de `utils/routines/` (agregar, quitar, mover, actualizar, validar, armar bodies, serializar el borrador); la página lo guarda en `useState`/`useReducer` y lo persiste con un hook de borrador sobre `localStorage`. dnd-kit solo dispara `moveExercise`. React Query para `/routines`, `/routine-templates`, `/exercises` y `/students`.

**Tech Stack:** React 19, React Router 7, TanStack Query 5, Tailwind 4, Radix Dialog, `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2 (nuevos), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-25-web-routine-editor-design.md`

## Global Constraints

- Rama apilada sobre `feature/web-students-panel` (PR #28): se reutilizan `listStudents`/`useStudentsQuery`, `usePageHeader`, `utils/students/studentOptions.js` (`GOAL_OPTIONS` incluye `''` "Sin definir", **no válido** para una rutina: filtrarlo), `utils/students/routineDays.js`, `profileHref`.
- `CONTRIBUTING.md`: ≤ 200 líneas por archivo (tests incluidos); capa → módulo (`routines`, `routine-templates`) → archivo; ≤ 10 archivos por carpeta (`components/shared/ui` está llena); tests espejan `src`; test dividido en carpeta con el nombre de la unidad; helpers en `tests/helpers/routines/`.
- Commits Conventional Commits en español, **sin atribución de IA ni Co-Authored-By**. Dependencias con versión exacta.
- Límites del backend por ejercicio: `exercise_id` uuid; `sets`, `reps` enteros > 0; `rest_seconds` entero ≥ 0 o `null`; `suggested_kg` número ≥ 0 o `null`; `tempo` ≤ 20 o `null`; `notes` ≤ 500 o `null`. Rutina: `name` 2–120, `goal` ∈ `tonify|weight_loss|hypertrophy|strength` (obligatorio), `days` ≥ 1 sin repetir de `sunday..saturday`. Plantilla: `structure.exercises` 1–50, `level` opcional.
- Valores por defecto al agregar un ejercicio: `sets 3`, `reps 10`, `rest_seconds 90`, resto vacío.
- Clave del borrador: `fittrainer.routine-draft.<trainerId>`; debounce ≈ 1000 ms.
- Textos en español rioplatense. Verificación por tarea: `cd frontend && npm run lint && npm test` en verde (si `ExerciseLibraryPage/form.test.jsx` tarda por carga, re-correr una vez y anotarlo).

## Review Focus

1. **Borrador con ejercicios que ya no existen** (borrados de la biblioteca entre sesiones): se quitan al restaurar y se avisa; no crashea si `useExercisesQuery` todavía carga → test en Task 1 (función pura) y Task 3.
2. **`localStorage` que tira** (modo privado, cuota llena): el editor funciona igual y no muestra errores raros → test en Task 1/3.
3. **El orden que se manda al asignar** es exactamente el de la tabla después de arrastrar/Subir/Bajar (y el `order` resultante es 0..n-1) → test en Task 4 y Task 5.
4. **Doble click en "Asignar"**: un solo `POST /routines` → test en Task 5.
5. **Usar una plantilla con el editor ya cargado**: pide confirmación y no mezcla ejercicios; si se cancela, el editor queda igual → test en Task 5.

---

### Task 1: API, estado puro del editor, borrador y hooks

**Files:**
- Create: `frontend/src/api/routines/routines.api.js` (`listRoutines()` → `GET /routines` → `data`; `createRoutine(body)` → `POST /routines` → `data`)
- Create: `frontend/src/api/routine-templates/routine-templates.api.js` (`listTemplates()`, `getTemplate(id)`, `createTemplate(body)`)
- Create: `frontend/src/utils/routines/editorState.js`, `frontend/src/utils/routines/routineForm.js`, `frontend/src/utils/routines/draft.js`
- Create: `frontend/src/hooks/routines/useRoutines.js` (`ROUTINES_KEY = ['routines']`; `useRoutinesQuery()`; `useCreateRoutine()` invalida `['routines']` y `['students']`), `frontend/src/hooks/routine-templates/useRoutineTemplates.js` (`TEMPLATES_KEY = ['routine-templates']`; `useTemplatesQuery()`, `useTemplateQuery(id, { enabled })`, `useCreateTemplate()`)
- Create: `frontend/src/hooks/routines/useRoutineDraft.js`
- Tests: `frontend/tests/api/routines/…`, `frontend/tests/api/routine-templates/…`, `frontend/tests/utils/routines/{editorState,routineForm,draft}.test.js`, `frontend/tests/hooks/routines/useRoutineDraft.test.jsx`; helper `frontend/tests/helpers/routines/fixtures.js`

**Interfaces:**
- `editorState.js`:
  - `EMPTY_ROUTINE = { name: '', goal: '', days: [], templateId: null, templateName: null, exercises: [] }`; cada ejercicio: `{ key, exercise_id, sets, reps, rest_seconds, suggested_kg, tempo, notes }` (`key` único estable para dnd/React, p. ej. contador o `crypto.randomUUID()`; los numéricos se guardan como **string** del input).
  - `addExercise(state, exerciseId)` (al final, con los defaults), `removeExercise(state, key)`, `moveExercise(state, fromIndex, toIndex)` (equivalente a `arrayMove`), `moveBy(state, key, delta)` (±1, sin salirse), `updateExercise(state, key, field, value)`, `updateHeader(state, field, value)`, `toggleDay(state, day)`.
  - `fromTemplate(template, exercisesById)` → `{ state, missing: number }` (precarga nombre, goal, days, `templateId`, `templateName`, ejercicios en orden; descarta los que no están en `exercisesById` o tienen `exercise: null`).
- `routineForm.js`:
  - `validateRoutine(state) → { header: { name?, goal?, days? }, exercises: { [key]: { [field]: msg } }, form?: string, count: number }` con los límites de Global Constraints (`form`: "Agregá al menos un ejercicio"). Mensajes: "El nombre debe tener entre 2 y 120 caracteres", "Elegí un objetivo", "Elegí al menos un día", "Tiene que ser un entero mayor que 0", "No puede ser negativo", "Hasta 20 caracteres", "Hasta 500 caracteres".
  - `buildRoutineBody(state, studentId)` → `{ student_id, name (trim), goal, days, template_id?, exercises: [{ exercise_id, sets, reps, rest_seconds, suggested_kg, tempo, notes, order }] }` (números con `Number`, vacíos → `null`, `order` = índice).
  - `buildTemplateBody(state, { name, goal, level })` → `{ name, goal, level: level || null, structure: { version: 1, days, exercises: [...sin template_id, con order] } }`.
  - `serverErrorsFor(error, state)` → mismo formato que `validateRoutine` a partir de `details` (`exercises[i].campo` → la fila `i` del estado; `name`/`goal`/`days` → cabecera); el resto → `form` con `fieldErrorsFrom`.
- `draft.js`: `DRAFT_KEY = (trainerId) => \`fittrainer.routine-draft.${trainerId}\``; `serializeDraft(state)` (sin `key`, sin datos de ejercicio), `restoreDraft(raw, exercisesById)` → `{ state, missing } | null` (JSON inválido → `null`); `readDraft(trainerId)`, `writeDraft(trainerId, state)`, `clearDraft(trainerId)` que **nunca tiran** (try/catch).
- `useRoutineDraft(trainerId, state, { delay = 1000 })` → `{ savedAt: Date | null }`: escribe con debounce cuando cambia `state` (no si está vacío == `EMPTY_ROUTINE`).

- [ ] **Step 1: Tests que fallan** — editorState (agregar con defaults, quitar, mover 0→2, `moveBy` en bordes, toggleDay, `fromTemplate` con un ejercicio faltante → `missing: 1`); routineForm (cada mensaje; body con números, `null`s y `order` 0..n-1; template body; `serverErrorsFor` con `exercises[1].reps`); draft (ida y vuelta; ejercicio borrado → `missing`; JSON roto → `null`; `localStorage.setItem` que tira → no tira — Review Focus 1 y 2); `useRoutineDraft` con timers falsos escribe una vez tras 1 s; API (paths/métodos/`data`).
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** verde.
- [ ] **Step 5: Commit** `feat(web): API y estado del editor de rutinas`.

---

### Task 2: Rutas, listado de rutinas y "Asignar rutina" en la ficha

**Files:**
- Modify: `frontend/src/routes/routeTable.js` (`ROUTINES_PATH = \`${TRAINER_NAV.base}/rutinas\``; `NEW_ROUTINE = { path: \`${ROUTINES_PATH}/nueva\` }`; `newRoutineHref(studentId?)` → con `?alumno=<id>`), `frontend/src/routes/router.jsx` (`elements.rutinas = <RoutinesPage/>`; página `NEW_ROUTINE.path` → `<RoutineEditorPage/>`, por ahora un placeholder mínimo que completa Task 3)
- Modify: `frontend/src/utils/students/routineDays.js` (exportar `DAY_OPTIONS` = `[{ value: 'monday', short: 'L', label: 'Lunes' }, … , { value: 'sunday', short: 'D', label: 'Domingo' }]` en orden lunes→domingo y reutilizarlo en `formatRoutineDays`)
- Create: `frontend/src/pages/routines/RoutinesPage.jsx`, `frontend/src/pages/routines/RoutineEditorPage.jsx` (placeholder)
- Modify: `frontend/src/components/students/profile/ProfileActions.jsx` (+ botón "Asignar rutina" → `newRoutineHref(student.id)`, solo si el alumno está activo)
- Modify: `docs/arquitectura/contratos-api.md` (`PATCH /routines/:id` no recibe ejercicios: la nota de límites por ejercicio no le aplica), `docs/tarjetas.md` (fila 26)
- Tests: `frontend/tests/pages/routines/RoutinesPage.test.jsx`, `frontend/tests/routes/…`, test de la ficha para el botón; helper `frontend/tests/helpers/routines/routines.js` (`stubRoutinesApi({ routines, students, exercises, templates, handlers })` sobre `stubFetch`)

**Interfaces:**
- `RoutinesPage`: `useRoutinesQuery()` + `useStudentsQuery({ active: true })` (y si una rutina es de un alumno dado de baja, mostrar "Alumno dado de baja"); fila: nombre, alumno (link `profileHref`), días (`formatRoutineDays`), pill Activa/Inactiva; botón "Nueva rutina" → `NEW_ROUTINE.path`; estados loading/error/vacío ("Todavía no armaste rutinas" + "Nueva rutina").
- `usePageHeader` no hace falta en el listado (usa el `handle` del ítem del menú).

- [ ] **Step 1: Tests que fallan:** listado con nombre del alumno y días en español; vacío con botón; "Nueva rutina" navega al editor; ficha de un alumno activo muestra "Asignar rutina" con `href` `/pt/rutinas/nueva?alumno=<id>` y uno dado de baja no; `DAY_OPTIONS` en orden.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** verde.
- [ ] **Step 5: Commit** `feat(web): listado de rutinas y acceso al editor`.

---

### Task 3: Editor — cabecera, biblioteca a la izquierda, tabla editable y borrador

**Files:**
- Modify: `frontend/src/pages/routines/RoutineEditorPage.jsx`
- Create: `frontend/src/components/routines/editor/` (`RoutineHeader.jsx`, `DayPicker.jsx`, `ExerciseTable.jsx`, `ExerciseRow.jsx`, `RowMenu.jsx`, `DraftBanner.jsx`) y `frontend/src/components/routines/library/` (`LibraryPanel.jsx`, `LibraryItem.jsx`)
- Tests: `frontend/tests/pages/routines/RoutineEditorPage/{build,validation,draft}.test.jsx`

**Interfaces:**
- Consumes: Task 1 (estado, validación, `useRoutineDraft`, `readDraft`, `restoreDraft`, `clearDraft`), `useExercisesQuery`, `utils/exercises/*` (`filterExercises`, `muscleGroupsIn`, `INITIAL_FILTERS`, `muscleLabel`, `thumbnailUrl`), `usePageHeader`, `GOAL_OPTIONS` (sin `''`), `DAY_OPTIONS`, `useAuthStore` (id del entrenador).
- Layout: `grid lg:grid-cols-[280px_minmax(0,1fr)]` con `min-w-0` en los hijos; **biblioteca a la izquierda**. En < lg la biblioteca se muestra arriba colapsada tras un botón "Agregar ejercicio" (`aria-expanded`).
- `LibraryPanel`: buscador (`aria-label="Buscar ejercicio"`), chips de músculo (radiogroup "Grupo muscular"), select "Equipamiento", lista de `LibraryItem` (miniatura 36 px o placeholder, nombre, músculo, botón `aria-label="Agregar <nombre>"`).
- `RoutineHeader`: `Input` "Nombre de la rutina", `Select` "Objetivo" (opción vacía "Elegí un objetivo"), `DayPicker` (7 chips `role="checkbox"` con `aria-label` "Lunes"…), errores debajo de cada uno; "Desde: <plantilla>" si `templateName`.
- `ExerciseTable`: `<table>` dentro de `overflow-x-auto`; columnas `#`, (asa — la agrega Task 4), Ejercicio, Series, Reps, Descanso (s), Peso (kg), Tempo, Nota, menú. Inputs con `aria-label="<Campo> de <nombre del ejercicio>"`, error por celda (`aria-invalid` + texto). `RowMenu` (botón `aria-label="Opciones de <nombre>"`) con "Subir", "Bajar" (deshabilitados en los bordes) y "Quitar". Vacío: "Agregá ejercicios desde la biblioteca".
- Página: estado con `useReducer`/`useState` sobre las funciones de Task 1; al montar, si hay borrador y la biblioteca cargó → restaurar y mostrar `DraftBanner` ("Recuperamos tu borrador" + "Descartar", que pide confirmación y limpia); topbar `usePageHeader({ title: name ? \`Nueva rutina — ${name}\` : 'Nueva rutina', subtitle: \`RUTINAS › CREAR${savedAt ? ' · AUTO-GUARDADO · HACE <n>S' : ''}\` })`; botón "Asignar a alumno" que valida (resumen "Revisá N campos" con `role="alert"`) — la acción de asignar llega en Task 5 (callback).

- [ ] **Step 1: Tests que fallan:** agregar 2 ejercicios desde la biblioteca filtrando por músculo; editar series/reps/peso; Subir/Bajar/Quitar desde el menú; validación bloquea con errores en cabecera y celdas (reps 0, sin días, sin ejercicios); borrador: tras cambiar algo y avanzar 1 s (timers falsos) se escribe `fittrainer.routine-draft.t-1`; recargar (re-render) restaura con el aviso; "Descartar" con confirmación limpia; borrador con un ejercicio inexistente → se quita y se avisa (Review Focus 1); `localStorage` que tira → el editor sigue (Review Focus 2); topbar con el nombre.
- [ ] **Step 2:** FAIL → **Step 3:** implementar (archivos ≤ 200 líneas) → **Step 4:** verde.
- [ ] **Step 5: Commit** `feat(web): editor de rutinas con biblioteca, tabla editable y borrador`.

---

### Task 4: Arrastrar para reordenar (dnd-kit, mouse y teclado)

**Files:**
- Modify: `frontend/package.json` (+ `@dnd-kit/core` `6.3.1`, `@dnd-kit/sortable` `10.0.0`, `@dnd-kit/utilities` `3.2.2`), `package-lock.json`
- Create: `frontend/src/components/routines/editor/SortableRow.jsx` (o integrar en `ExerciseRow`), `frontend/src/components/routines/editor/dndAnnouncements.js`
- Modify: `ExerciseTable.jsx` (`DndContext` + `SortableContext` con `verticalListSortingStrategy`, sensores `PointerSensor` y `KeyboardSensor` con `sortableKeyboardCoordinates`; `onDragEnd` → `moveExercise`)
- Tests: `frontend/tests/pages/routines/RoutineEditorPage/reorder.test.jsx`, `frontend/tests/components/routines/editor/dndAnnouncements.test.js`

**Interfaces:**
- Asa por fila: `<button>` con `aria-label="Mover <nombre>"` y los `attributes`/`listeners` de `useSortable`; `aria-roledescription` de dnd-kit traducido.
- `dndAnnouncements(namesByKey)` → objeto `announcements` en español: "Levantaste <nombre>. Está en la posición 2 de 6.", "Moviste <nombre> a la posición 3 de 6.", "Soltaste <nombre> en la posición 3 de 6.", "Cancelaste. <nombre> volvió a la posición 2 de 6.", y `screenReaderInstructions` ("Para mover un ejercicio, enfocá el asa y presioná Espacio…").
- En jsdom `getBoundingClientRect` vale 0: el test de teclado mockea `Element.prototype.getBoundingClientRect` para las filas (top según índice) o, si no es viable, verifica el reorden por teclado a través de `onDragEnd` y deja el arrastre real para el E2E — documentar la elección en el reporte.

- [ ] **Step 1: Tests que fallan:** con 3 ejercicios, foco en "Mover B", Espacio, Flecha abajo, Espacio → el orden de la tabla es A, C, B y el `aria-live` anuncia "Soltaste B en la posición 3 de 3"; Esc cancela; anuncios en español (unit); el orden resultante se refleja en `buildRoutineBody` (Review Focus 3).
- [ ] **Step 2:** FAIL → **Step 3:** `npm install --save-exact @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2` e implementar → **Step 4:** verde, sin warnings.
- [ ] **Step 5: Commit** `feat(web): reordenar ejercicios arrastrando, también con teclado`.

---

### Task 5: Asignar a un alumno y plantillas

**Files:**
- Create: `frontend/src/components/routines/dialogs/` (`AssignRoutineDialog.jsx`, `UseTemplateDialog.jsx`, `SaveTemplateDialog.jsx`)
- Modify: `frontend/src/pages/routines/RoutineEditorPage.jsx` (botones "Usar plantilla", "Guardar como plantilla", "Asignar a alumno"; un solo estado `dialog`; si es > 200 líneas, extraer a `components/routines/dialogs/RoutineDialogs.jsx`)
- Tests: `frontend/tests/pages/routines/RoutineEditorPage/{assign,templates}.test.jsx`

**Interfaces:**
- Consumes: `useCreateRoutine`, `useTemplatesQuery`, `useTemplateQuery`, `useCreateTemplate`, `useStudentsQuery({ active: true })`, `buildRoutineBody`, `buildTemplateBody`, `serverErrorsFor`, `fromTemplate`, `clearDraft`, `profileHref`, `Dialog` (`dismissible={!pending}`).
- `AssignRoutineDialog({ state, preselectedStudentId, onAssigned })`: select "Alumno" con los activos (preseleccionado por `?alumno=`), botón "Asignar" (`loading`, guarda contra doble envío); éxito → `clearDraft`, `onAssigned(student)` → navegar a `profileHref(student.id)`; errores: 400 → se cierran los detalles en la tabla (`serverErrorsFor`) y el modal muestra "Revisá los datos de la rutina"; 403/404 → mensaje del backend.
- `UseTemplateDialog({ hasContent, onLoad })`: lista de plantillas (nombre, objetivo, días, "N ejercicios"), elegir una → si `hasContent`, confirmación "Vas a reemplazar lo que armaste" → `getTemplate` → `fromTemplate` → `onLoad(state, missing)`; con `missing > 0` el editor avisa "Quitamos N ejercicios que ya no están en la biblioteca". Vacío: "Todavía no tenés plantillas".
- `SaveTemplateDialog({ state })`: nombre (default el de la rutina), objetivo (default el de la rutina), nivel opcional; valida que haya 1–50 ejercicios y ≥ 1 día; `POST /routine-templates` → "Plantilla guardada" y cierra.

- [ ] **Step 1: Tests que fallan:** asignar con 3 ejercicios reordenados → un solo `POST /routines` (doble click, Review Focus 4) con body exacto (orden, números, `null`s, `template_id` si vino de plantilla), borrador limpio y navegación a la ficha; `?alumno=` preselecciona; 400 con `exercises[1].reps` marca la celda; usar plantilla con el editor vacío precarga; con contenido pide confirmación y "Cancelar" deja todo igual (Review Focus 5); ejercicio faltante → aviso; guardar como plantilla → body con `structure` y aviso.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npm run lint && npm test` verde.
- [ ] **Step 5: Commit** `feat(web): asignar la rutina a un alumno y usar o guardar plantillas`.
