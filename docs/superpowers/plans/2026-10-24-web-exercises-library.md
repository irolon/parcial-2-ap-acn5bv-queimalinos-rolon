# Biblioteca de ejercicios en la web — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** página `/pt/biblioteca` donde el entrenador explora, filtra en el cliente y hace el CRUD de sus ejercicios propios, más el endurecimiento del contrato de `/exercises` en el backend.

**Architecture:** el backend valida equipamiento, URL y descripción, y traduce la FK al borrar a un 409. La web trae `GET /exercises` una vez con React Query (`['exercises']`); el filtrado es una función pura en `hooks/exercises/` (la reusa la tarjeta 9); la página compone filtros, grilla y tres diálogos (formulario, detalle, borrado) sobre un `Dialog` de Radix.

**Tech Stack:** backend Node/Express + Jest (ESM, `jest.unstable_mockModule`); web React 19, React Router 7, TanStack Query 5, Tailwind 4, Vitest + Testing Library, `@radix-ui/react-dialog@1.2.0`.

**Spec:** `docs/superpowers/specs/2026-10-24-web-exercises-library-design.md`

## Global Constraints

- `CONTRIBUTING.md`: ningún archivo de código > 200 líneas (tests incluidos); capa → módulo (`exercises`) → archivo; tests espejan el árbol; helpers en `tests/helpers/<módulo>/`; ≤ 10 archivos por carpeta.
- Commits Conventional Commits en español, **sin trailers ni pies de IA**.
- Dependencias con versión exacta (sin `^`).
- Textos de UI en español rioplatense; códigos del backend en inglés.
- Etiquetas de músculo: chest Pecho, back Espalda, shoulders Hombros, legs Piernas, glutes Glúteos, biceps Bíceps, triceps Tríceps, core Core, calves Gemelos, full_body Cuerpo completo, cardio Cardio.
- Etiquetas de equipamiento: barbell Barra, dumbbell Mancuernas, machine Máquina, cable Polea, bodyweight Peso corporal, kettlebell Kettlebell, band Banda.
- Límites: nombre 2–120 (trim), descripción ≤ 1000, `video_url` http/https y ≤ 500, `equipment` ∈ `EQUIPMENT` o `null`.
- Verificación por tarea: `npm run lint` y `npm test` en el paquete tocado (`backend/` o `frontend/`) en verde.

## Review Focus

1. **URL peligrosa en datos viejos o ajenos** (`javascript:…`): "Ver video" solo se renderiza si la URL empieza con `http://`/`https://` → test en Task 5.
2. **Doble envío** del formulario (doble click en Guardar): el botón queda `loading`/deshabilitado mientras corre la mutación y sale un solo POST → test en Task 4.
3. **Borrar el último propio estando en "Propios" con un grupo elegido**: aparece el vacío de propios y el chip vuelve a "Todos" sin quedar en un estado sin chips → test en Task 5.
4. **Reabrir el modal tras un error de validación**: el formulario vuelve limpio (sin errores ni valores viejos) → test en Task 4.
5. **Nombre larguísimo** (120 caracteres sin espacios): la tarjeta lo trunca (`truncate` + `title` con el nombre completo) y no rompe la grilla → test en Task 3 (atributo `title`).

---

### Task 1: Backend — validación nueva, 409 al borrar en uso y docs

**Files:**
- Modify: `backend/src/validations/exercises/exercises.validation.js`
- Modify: `backend/src/shared/utils/errors.js` (nuevo `exerciseInUse`)
- Modify: `backend/src/repositories/exercises/exercises.repository.js` (`deleteExercise`)
- Modify: `backend/src/models/exercises/exercise.model.js:24` (el comentario de `EQUIPMENT` ya no dice que la API no lo exige)
- Create: `backend/tests/unit/validations/exercises/exercises.validation.test.js`
- Create: `backend/tests/unit/repositories/exercises/exercises.repository.test.js`
- Modify: `docs/arquitectura/contratos-api.md` (módulo Ejercicios), `backend/README.md:121-128`, `docs/tarjetas.md` (fila nueva), y el spec (§2 Backend: código `EXERCISE_IN_USE`)

**Interfaces:**
- Produces (contrato HTTP que consume la web):
  - POST y PATCH: 400 `VALIDATION_ERROR` con `details[{ field, message }]` para `equipment`, `video_url`, `description` (además de `name`/`muscle_group` como hoy).
  - POST acepta `null` en `equipment`, `description`, `video_url` (hoy da "debe ser texto").
  - DELETE de un ejercicio referenciado: **409 `EXERCISE_IN_USE`**, mensaje `No podés borrar este ejercicio porque está en una rutina o en el historial de un alumno`.
- `Errors.exerciseInUse(): AppError(409, 'EXERCISE_IN_USE', <mensaje>)`.

- [ ] **Step 1: Tests de validación que fallan** (`exercises.validation.test.js`, mismo estilo que `tests/unit/validations/invitations/invitations.validation.test.js`, con un helper `invalid(fn, body, field)` que espera `code: 'VALIDATION_ERROR'` y un detalle con ese `field`):
  - create: `equipment: 'trx'` → field `equipment`; `equipment: 'dumbbell'` se conserva; `equipment: null` → `null`.
  - create: `video_url: 'ftp://x.com/v'`, `'youtube.com/watch?v=1'`, `'javascript:alert(1)'`, `'https://'` y uno de 501 caracteres (`'https://a.com/' + 'x'.repeat(487)`) → field `video_url`; `'https://www.youtube.com/watch?v=uEtiwYaT3d0'` y `'http://example.com/v.mp4'` pasan.
  - create: `description: 'x'.repeat(1001)` → field `description`; 1000 pasa.
  - create: `description: null`, `video_url: null` → `null` (no error).
  - update: las mismas tres reglas; `{ equipment: null }` → `{ equipment: null }`; `{ video_url: '   ' }` → `{ video_url: null }`.
- [ ] **Step 2:** `cd backend && npm test -- exercises.validation` → FAIL.
- [ ] **Step 3: Implementar** en `exercises.validation.js` un validador por campo opcional reutilizado por create y update: `null`/string vacío tras trim → `null`; si no es string → "`<campo>` debe ser texto"; `equipment` ∉ `EQUIPMENT` → `Debe ser uno de: ${EQUIPMENT.join(', ')}`; `video_url` que no matchee `/^https?:\/\//i`, no parsee con `new URL()`, o tenga `hostname` vacío o > 500 → `El video debe ser un link que empiece con http:// o https:// (máximo 500 caracteres)`; `description` > 1000 → `La descripción puede tener hasta 1000 caracteres`.
- [ ] **Step 4:** `npm test -- exercises.validation` → PASS.
- [ ] **Step 5: Test del repositorio que falla** (`exercises.repository.test.js`): mockear `src/config/supabase.js` con `jest.unstable_mockModule` (ruta absoluta como en `tests/helpers/exercises/exercises-service.setup.js`) devolviendo un `supabase.from()` cuyo `.delete().eq()` resuelve `{ error }`. Casos: `{ error: { code: '23503', message: 'fk' } }` → rechaza con `objectContaining({ statusCode: 409, code: 'EXERCISE_IN_USE' })`; otro código → `statusCode: 500`; `{ error: null }` → resuelve.
- [ ] **Step 6:** FAIL → implementar en `deleteExercise` (`// 23503 = foreign_key_violation: está en una rutina o en una sesión.`) → PASS.
- [ ] **Step 7: Docs.**
  - `contratos-api.md`, módulo Ejercicios: GET (respuesta `{ data: [...] }` con los 8 campos e `is_global`), POST (campos, límites, 201), PATCH (campos opcionales, `null` borra, 403/404), DELETE (204, 403/404, 409 `EXERCISE_IN_USE`), y los mensajes de validación.
  - `backend/README.md`: en la tabla de Ejercicios, POST/PATCH dicen "valida equipamiento, URL de video y descripción" y DELETE "409 si está en uso".
  - `docs/tarjetas.md`: fila `| 21 | [Biblioteca de ejercicios en la web](https://trello.com/c/rCks8PTo) | spec | plan | Contratos de API |` con los links Obsidian al spec y al plan de esta tarjeta, ubicada en orden numérico.
  - Spec §2 "Backend": cambiar "**409 `CONFLICT`**" por "**409 `EXERCISE_IN_USE`**" (sigue la convención de códigos de dominio de `errors.js`).
- [ ] **Step 8:** `cd backend && npm run lint && npm test` → verde.
- [ ] **Step 9: Commit** `fix(exercises): valida equipamiento, video y descripción y responde 409 al borrar uno en uso`.

---

### Task 2: Web — API, etiquetas, video, filtrado y hooks de consulta

**Files:**
- Create: `frontend/src/api/exercises/exercises.api.js`
- Create: `frontend/src/components/exercises/exerciseOptions.js`
- Create: `frontend/src/components/exercises/videoUrl.js`
- Create: `frontend/src/hooks/exercises/filterExercises.js`
- Create: `frontend/src/hooks/exercises/useExercises.js`
- Test: `frontend/tests/api/exercises/exercises.api.test.js`, `frontend/tests/components/exercises/videoUrl.test.js`, `frontend/tests/components/exercises/exerciseOptions.test.js`, `frontend/tests/hooks/exercises/filterExercises.test.js`
- Create: `frontend/tests/helpers/exercises/fixtures.js`

**Interfaces:**
- `exercises.api.js` (patrón de `invitations.api.js`, devuelven `res.data`):
  - `listExercises(): Promise<Exercise[]>` → `GET /exercises`
  - `createExercise(body): Promise<Exercise>` → `POST /exercises`
  - `updateExercise(id, body): Promise<Exercise>` → `PATCH /exercises/:id` (id con `encodeURIComponent`)
  - `deleteExercise(id): Promise<void>` → `DELETE /exercises/:id`
  - `Exercise = { id, trainer_id, name, muscle_group, equipment, description, video_url, is_global }`
- `exerciseOptions.js`:
  - `MUSCLE_GROUPS: string[]` (orden del backend), `MUSCLE_LABELS`, `EQUIPMENT: string[]`, `EQUIPMENT_LABELS` (Global Constraints).
  - `muscleLabel(code): string`, `equipmentLabel(code): string|null` (desconocido → el código tal cual; `null` → `null`).
  - `MUSCLE_OPTIONS = [{ value, label }]` (11), `EQUIPMENT_OPTIONS = [{ value: '', label: 'Sin equipamiento' }, …7]` para el formulario.
- `videoUrl.js`:
  - `youTubeId(url): string|null` — hosts `youtube.com`, `www.youtube.com`, `m.youtube.com` (`/watch?v=`, `/shorts/<id>`, `/embed/<id>`) y `youtu.be/<id>`; cualquier otra cosa o URL inválida → `null`.
  - `thumbnailUrl(url): string|null` → `https://img.youtube.com/vi/<id>/hqdefault.jpg`.
  - `isSafeVideoUrl(url): boolean` → string que empieza con `http://` o `https://` (case-insensitive).
- `filterExercises.js`:
  - `ALL = 'all'`; `INITIAL_FILTERS = { muscle: 'all', equipment: '', origin: 'all', search: '' }`; `origin ∈ 'all' | 'own' | 'global'`.
  - `muscleGroupsIn(exercises): string[]` — códigos con ≥ 1 ejercicio, en el orden de `MUSCLE_GROUPS`; los desconocidos al final.
  - `effectiveMuscle(filters, groups): string` — `filters.muscle` si está en `groups`, si no `'all'`.
  - `filterExercises(exercises, filters): Exercise[]` — AND de músculo (vía `effectiveMuscle`), equipamiento exacto, origen (`own` = `!is_global`) y búsqueda por nombre normalizada (`normalize('NFD')`, sin diacríticos, minúsculas, trim); conserva el orden.
- `useExercises.js`:
  - `EXERCISES_KEY = ['exercises']`
  - `useExercisesQuery()` → `useQuery({ queryKey: EXERCISES_KEY, queryFn: listExercises })`
  - `useCreateExercise()`, `useUpdateExercise()` (`mutationFn: ({ id, body })`), `useDeleteExercise()` (`mutationFn: id`) → `useMutation` que en `onSuccess` hace `invalidateQueries({ queryKey: EXERCISES_KEY })`.
- `tests/helpers/exercises/fixtures.js`: `exercise(overrides)` y una lista `LIBRARY` con al menos: global "Press banca plano" (chest, barbell, YouTube), global "Sentadilla" (legs, barbell), global "Plancha" (core, bodyweight, sin video), propio "Press inclinado con mancuernas" (chest, dumbbell, `trainer_id: 't-1'`, `is_global: false`), propio "Elevación de talones" (calves, `equipment: null`).

- [ ] **Step 1: Tests que fallan.**
  - api: cada función llama al path/método correcto con `stubFetch` + `calls` + `bodyOf`, y devuelve `data` (DELETE → `undefined`/`null` con 204).
  - videoUrl: `watch?v=uEtiwYaT3d0`, `youtu.be/uEtiwYaT3d0`, `/shorts/uEtiwYaT3d0`, `m.youtube.com/watch?v=…` → `'uEtiwYaT3d0'`; `https://vimeo.com/1`, `'no es url'`, `null` → `null`; `isSafeVideoUrl('javascript:alert(1)') === false`, `isSafeVideoUrl('HTTPS://a.com') === true`.
  - exerciseOptions: `muscleLabel('full_body') === 'Cuerpo completo'`, `muscleLabel('yoga') === 'yoga'`, `equipmentLabel('cable') === 'Polea'`, `equipmentLabel(null) === null`, `EQUIPMENT_OPTIONS[0]` es "Sin equipamiento".
  - filterExercises: músculo `chest` → solo los de pecho; `equipment: 'barbell'` + `chest` → solo "Press banca plano"; `origin: 'own'` → los dos propios; `search: 'PRESS'` → los dos "Press"; `search: 'elevacion'` encuentra "Elevación de talones"; `muscleGroupsIn(LIBRARY)` → `['chest','legs','core','calves']`; `effectiveMuscle({ muscle: 'back' }, groups) === 'all'`.
- [ ] **Step 2:** `cd frontend && npm test -- exercises` → FAIL.
- [ ] **Step 3: Implementar** los cinco archivos con esas firmas.
- [ ] **Step 4:** `npm test -- exercises` → PASS; `npm run lint` → verde.
- [ ] **Step 5: Commit** `feat(web): API, etiquetas y filtrado de la biblioteca de ejercicios`.

---

### Task 3: Web — Dialog/Textarea, router y página de listado

**Files:**
- Modify: `frontend/package.json` (+ `"@radix-ui/react-dialog": "1.2.0"`), `package-lock.json`
- Create: `frontend/src/components/shared/ui/Dialog.jsx`, `frontend/src/components/shared/ui/Textarea.jsx`
- Modify: `frontend/src/components/shared/states/QueryState.jsx` (prop opcional `loading`)
- Modify: `frontend/src/routes/router.jsx`
- Create: `frontend/src/pages/exercises/ExerciseLibraryPage.jsx`
- Create: `frontend/src/components/exercises/ExerciseFilters.jsx`, `ExerciseCard.jsx`, `ExerciseThumb.jsx`, `ExerciseGridSkeleton.jsx`
- Test: `frontend/tests/components/shared/ui/Dialog.test.jsx`, `frontend/tests/components/shared/ui/Textarea.test.jsx`, `frontend/tests/pages/exercises/ExerciseLibraryPage.test.jsx`
- Create: `frontend/tests/helpers/exercises/library.js`

**Interfaces:**
- Consumes: todo lo de Task 2.
- `Dialog({ open, onOpenChange, title, description?, children, footer? })` — Radix `Root/Portal/Overlay/Content/Title/Description`; botón cerrar con `aria-label="Cerrar"`; sin `description` pasa `aria-describedby={undefined}` al `Content`. Estilo: overlay `bg-black/60`, contenido `bg-ink1 border-ink3 rounded-2xl`, título `font-display`.
- `Textarea({ label, error, hint, id, ...rest })` — mismo contrato y estilos que `Input` (label, `aria-invalid`, `aria-describedby`, error `role="alert"`).
- `QueryState({ query, empty, errorMessage, loading?, children })` — `loading` (nodo) reemplaza a `<LoadingState />` si viene.
- `router.jsx`: `roleSection(role, nav, pages = [], elements = {})`; cada ítem usa `elements[item.path] ?? <PlaceholderPage title={item.label} />`. El entrenador pasa `{ biblioteca: <ExerciseLibraryPage /> }`.
- `ExerciseLibraryPage` (estado: `filters`, y `dialog = null | { type: 'create' | 'edit' | 'detail' | 'delete', exercise? }`; esta tarea solo usa `detail` como placeholder: el click en una tarjeta setea el estado y los diálogos llegan en Tasks 4–5):
  - encabezado: contador `{n} EJERCICIOS` (n = total traído) y botón primario "Nuevo ejercicio" (ícono `Plus`).
  - `<ExerciseFilters filters groups onChange onClear />` — chips "Todos" + `groups` (`role="radiogroup"` con `aria-label="Grupo muscular"`, cada chip `role="radio"` + `aria-checked`), `Select` "Equipamiento" (`'' → 'Todo el equipamiento'` + 7), segmentado "Todos · Propios · Globales" (`role="radiogroup"`, `aria-label="Origen"`), buscador `type="search"` con `aria-label="Buscar ejercicio"` y placeholder "Buscar ejercicio…".
  - grilla `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4` de `<ExerciseCard exercise onOpen onEdit onDelete />` como `<ul>`/`<li>`.
  - `ExerciseCard`: botón principal (abre detalle) con `<ExerciseThumb url />`, nombre (`truncate`, `title={name}`), línea mono `PECHO · BARRA` (sin equipamiento → solo el músculo), `Pill tone="cool"` "PROPIO" si `!is_global`; si `!is_global`, botones `aria-label="Editar <nombre>"` y `aria-label="Borrar <nombre>"` (íconos `Pencil`, `Trash2`).
  - `ExerciseThumb`: `<img alt="" loading="lazy">` con `thumbnailUrl(url)`; si es `null` o la imagen falla (`onError`), placeholder rayado (`repeating-linear-gradient` con tokens `ink2/ink3`) + ícono `Video`.
  - `ExerciseGridSkeleton`: 6 tarjetas `animate-pulse` dentro de `role="status"` con "Cargando ejercicios…".
  - Vacíos: en `origin: 'own'` sin propios → `EmptyState` "Todavía no creaste ejercicios propios" + texto "Creá el primero con su video para usarlo en tus rutinas." + botón "Nuevo ejercicio"; con filtros sin resultados → "Ningún ejercicio coincide" + botón "Limpiar filtros" (vuelve a `INITIAL_FILTERS`).
- `tests/helpers/exercises/library.js`: `PAGE_PATH = '/pt/biblioteca'`, `page()` = `within(screen.getByRole('main'))`, `stubLibrary({ list = LIBRARY, handlers = {} })` que hace `stubFetch` y responde `GET /exercises` con `{ data: list }` y delega POST/PATCH/DELETE en `handlers.create/update/remove(init, url)` (default 500).

- [ ] **Step 1: Tests que fallan.**
  - Dialog: con `open` muestra `role="dialog"` con nombre = `title`; Escape y "Cerrar" llaman `onOpenChange(false)`.
  - Textarea: label asociado, error con `role="alert"` y `aria-invalid`.
  - Página (`renderRoute(PAGE_PATH)` con `setSession(TRAINER)`, `TRAINER.id === 't-1'`):
    - topbar "Biblioteca", ítem "Biblioteca" con `aria-current="page"`, contador `5 EJERCICIOS`, una sola request `GET /exercises`.
    - skeleton (`Cargando ejercicios…`) mientras la request está pendiente; error 500 → `ErrorState` y "Reintentar" vuelve a pedir.
    - **criterio de aceptación:** click en chip "Pecho" → solo las dos tarjetas de pecho; los chips son "Todos, Pecho, Piernas, Core, Gemelos".
    - escribir "elevacion" → solo "Elevación de talones" y sigue habiendo una sola request.
    - equipamiento "Barra" + Pecho → solo "Press banca plano"; "Limpiar filtros" en un filtro sin resultados restablece todo.
    - "Propios" con `list` solo de globales → "Todavía no creaste ejercicios propios" y su botón.
    - globales sin botones `Editar …`/`Borrar …`; propios con badge "PROPIO" y ambos botones.
    - la tarjeta de un nombre de 120 caracteres tiene `title` con el nombre completo.
    - miniatura: "Press banca plano" tiene `img` con `https://img.youtube.com/vi/<id>/hqdefault.jpg`; "Plancha" no tiene `img`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** `npm install --save-exact @radix-ui/react-dialog@1.2.0` e implementar archivos con esas interfaces. `ExerciseLibraryPage.jsx` ≤ 200 líneas: si no entra, el armado de vacíos va a un componente `ExerciseResults.jsx` en `components/exercises/`.
- [ ] **Step 4:** `npm run lint && npm test` → verde (los tests existentes de rutas y del sidebar siguen pasando).
- [ ] **Step 5: Commit** `feat(web): página de biblioteca con filtros en el cliente`.

---

### Task 4: Web — modal de crear y editar

**Files:**
- Create: `frontend/src/components/exercises/exerciseForm.js`
- Create: `frontend/src/components/exercises/ExerciseFormDialog.jsx`
- Modify: `frontend/src/pages/exercises/ExerciseLibraryPage.jsx` (abre `create`/`edit`)
- Test: `frontend/tests/components/exercises/exerciseForm.test.js`, `frontend/tests/pages/exercises/ExerciseLibraryPage.form.test.jsx`

**Interfaces:**
- Consumes: `useCreateExercise`, `useUpdateExercise`, `MUSCLE_OPTIONS`, `EQUIPMENT_OPTIONS`, `EQUIPMENT`, `Dialog`, `Textarea`, `Input`, `Select`, `Button`, `fieldErrorsFrom`, `NO_FIELD_ERRORS`.
- `exerciseForm.js` (patrón de `pages/invitations/invitationForm.js`):
  - `FIELDS = ['name', 'muscle_group', 'equipment', 'description', 'video_url']`
  - `buildExerciseBody(formData): { name, muscle_group, equipment|null, description|null, video_url|null }` (trim; vacío → `null`).
  - `validateExerciseBody(body): Record<field, message>` con los mensajes del backend (Task 1) más `muscle_group` vacío → `Elegí un grupo muscular`.
  - `toExerciseErrors(error)` → `fieldErrorsFrom(error, { fields: FIELDS, fallback: 'No pudimos guardar el ejercicio' })`.
  - `formDefaults(exercise?)` → valores iniciales; un `equipment` fuera de `EQUIPMENT` arranca en `''`.
- `ExerciseFormDialog({ open, exercise?, onClose })` — título "Nuevo ejercicio" / "Editar ejercicio"; formulario no controlado con `defaultValue`; campos y labels: "Nombre", "Grupo muscular" (con opción vacía "Elegí un grupo" solo al crear), "Equipamiento (opcional)", "Descripción (opcional)" (hint `Hasta 1000 caracteres`), "Link del video (opcional)" (hint `YouTube u otro link http/https`); botones "Cancelar" (ghost) y "Guardar" (`type="submit"`, `loading` mientras la mutación está pendiente); error general arriba con `role="alert"`. Crear → `create.mutateAsync(body)`; editar → `update.mutateAsync({ id, body })` con **todos** los campos. Éxito → `onClose()`. El diálogo se remonta en cada apertura (`key` en la página), así arranca limpio.

- [ ] **Step 1: Tests que fallan.**
  - exerciseForm: vacíos → `null`; nombre de 1 carácter, URL `ftp://…`, 1001 caracteres → su mensaje; `formDefaults({ equipment: 'trx' }).equipment === ''`.
  - Página:
    - "Nuevo ejercicio" → completa nombre "Remo con banda", Espalda, Banda, video `https://youtu.be/abc123def45` → un solo `POST /exercises` con el body exacto (`description: null`); al responder 201 el diálogo se cierra, se vuelve a pedir `GET /exercises` y la nueva tarjeta aparece con badge "PROPIO" (**criterio de aceptación**).
    - doble click en "Guardar" con la respuesta demorada → un solo POST.
    - 400 `VALIDATION_ERROR` con `details: [{ field: 'video_url', message: 'X' }]` → "X" debajo de "Link del video (opcional)" y el diálogo sigue abierto.
    - validación local: nombre "A" → mensaje y ningún POST.
    - cerrar con errores y volver a abrir → sin errores y campos vacíos.
    - "Editar Press inclinado con mancuernas" → título "Editar ejercicio", campos precargados; borrar el link y guardar → `PATCH /exercises/<id>` con `video_url: null` y los otros cuatro campos.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npm run lint && npm test` → verde.
- [ ] **Step 5: Commit** `feat(web): crear y editar ejercicios propios desde un modal`.

---

### Task 5: Web — detalle y borrado

**Files:**
- Create: `frontend/src/components/exercises/ExerciseDetailDialog.jsx`, `frontend/src/components/exercises/DeleteExerciseDialog.jsx`
- Modify: `frontend/src/pages/exercises/ExerciseLibraryPage.jsx`
- Test: `frontend/tests/pages/exercises/ExerciseLibraryPage.detail.test.jsx`

**Interfaces:**
- Consumes: `useDeleteExercise`, `muscleLabel`, `equipmentLabel`, `isSafeVideoUrl`, `ExerciseThumb`, `Dialog`, `fieldErrorsFrom`.
- `ExerciseDetailDialog({ exercise, onClose, onEdit, onDelete })` — título = nombre; `Pill` "PROPIO" si corresponde; filas "GRUPO" y "EQUIPAMIENTO" (`Sin equipamiento` si es `null`); bloque "DESCRIPCIÓN" (o "Sin descripción"); link "Ver video" (`target="_blank" rel="noopener noreferrer"`) solo si `isSafeVideoUrl`; si es propio, botones "Editar" y "Borrar" que pasan a esos diálogos.
- `DeleteExerciseDialog({ exercise, onClose })` — título `¿Borrar «<nombre>»?`, texto "Esta acción no se puede deshacer."; "Cancelar" y "Borrar" (`variant="danger"`, `loading`); error → `fieldErrorsFrom(error, { fields: [], fallback: 'No pudimos borrar el ejercicio' }).form` con `role="alert"` y el diálogo queda abierto; éxito → `onClose()`.

- [ ] **Step 1: Tests que fallan.**
  - click en la tarjeta "Plancha" (global) → diálogo con "Core", "Peso corporal", su descripción, sin "Ver video", sin "Editar"/"Borrar".
  - "Press banca plano" → link "Ver video" con `href` de YouTube, `target="_blank"` y `rel="noopener noreferrer"`.
  - ejercicio con `video_url: 'javascript:alert(1)'` → no hay link "Ver video".
  - propio → "Borrar" → `¿Borrar «Press inclinado con mancuernas»?` → "Borrar" → `DELETE /exercises/<id>`; 204 → diálogo cerrado y se vuelve a pedir la lista.
  - 409 `EXERCISE_IN_USE` con el mensaje del backend → ese mensaje visible y el diálogo abierto.
  - lista con los tres globales + solo el propio "Elevación de talones": en "Propios" + chip "Gemelos", borrarlo (la segunda respuesta de `GET` ya no lo trae) → aparece "Todavía no creaste ejercicios propios", el chip "Gemelos" desaparece y "Todos" queda `aria-checked="true"`.
  - desde el detalle de un propio, "Editar" abre "Editar ejercicio".
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npm run lint && npm test` → verde (frontend y backend).
- [ ] **Step 5: Commit** `feat(web): detalle del ejercicio y borrado con confirmación`.
