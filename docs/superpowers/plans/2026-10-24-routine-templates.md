# Plantillas de rutina (Routine Templates) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** módulo `/api/routine-templates` (CRUD, guardar rutina como plantilla, instanciar por copia) y edición/borrado de ejercicios de una rutina asignada.

**Architecture:** capas del backend (routes → controllers → services → repositories, con validations y models por módulo). `structure` es un jsonb con la misma forma que una rutina. Instanciar copia la plantilla a `routines` + `routine_exercises` con compensación manual si falla el segundo insert (no hay transacciones ni RPC en el proyecto). Autorización en los services (ADR 0001).

**Tech Stack:** Node/Express (ESM), Supabase JS, Jest con `jest.unstable_mockModule`.

**Spec:** `docs/superpowers/specs/2026-10-24-routine-templates-design.md`

## Global Constraints

- `CONTRIBUTING.md`: ningún archivo de código > 200 líneas (tests incluidos); capa → módulo → archivo; el módulo nuevo se llama `routine-templates` (archivos `routine-templates.<capa>.js`); tests espejan `src` en `backend/tests/unit/<capa>/<módulo>/`; un test dividido va en carpeta con el nombre de la unidad; helpers en `backend/tests/helpers/<módulo>/`.
- Commits Conventional Commits en español, **sin atribución de IA ni Co-Authored-By**.
- Sin migraciones: el schema ya tiene `routine_templates` y `routines.template_id` (`on delete set null`).
- Errores con `{ error: { code, message, details } }` vía `Errors` de `shared/utils/errors.js`.
- Límites de un ejercicio (rutina y plantilla): `exercise_id` uuid; `sets`, `reps` enteros > 0; `rest_seconds` entero ≥ 0 o `null`; `suggested_kg` número ≥ 0 o `null`; `tempo` ≤ 20 caracteres o `null`; `notes` ≤ 500 o `null`; `order` entero ≥ 0 opcional.
- Plantilla: `name` 2–120 (trim); `goal` obligatorio ∈ `ROUTINE_GOALS`; `level` ∈ `beginner|intermediate|advanced` o `null`; `structure.version = 1`; `structure.days` ≥ 1, ∈ `DAYS`, sin repetidos; `structure.exercises` 1–50; `frequency_per_week = structure.days.length` (nunca del body); `generated_by_ai = false`.
- Verificación por tarea: `cd backend && npm run lint && npm test` en verde.

## Review Focus

1. **Compensación que falla también** (el `deleteRoutine` de compensación tira): se propaga el error original, no el de la compensación → test en Task 1.
2. **Plantilla de otro entrenador**: GET/PATCH/DELETE/instantiate dan 404 `TEMPLATE_NOT_FOUND`, nunca 403 (no revelar ids) → tests en Tasks 2 y 3.
3. **`structure` con campos extra o tipos raros** (`exercises: {}` , `days: 'monday'`, `version: 2`, propiedades desconocidas): 400 con su `field`; lo guardado solo contiene las claves conocidas → test en Task 2.
4. **Editar un ejercicio de otra rutina usando el id de mi rutina** (`/routines/A/exercises/<id de B>`): 404 `ROUTINE_EXERCISE_NOT_FOUND` aunque ambas sean mías → test en Task 1.
5. **Instanciar con `days` repetidos o vacío en el override**: 400 → test en Task 3.

---

### Task 1: Ejercicios de rutina — validador compartido, editar/borrar y compensación al crear

**Files:**
- Create: `backend/src/validations/routines/routine-exercise.validation.js` (validador de un ítem, compartido con plantillas)
- Modify: `backend/src/validations/routines/routines.validation.js` (usa el validador nuevo; suma `validateRoutineExerciseParams` y `validateUpdateRoutineExercise`)
- Create: `backend/src/repositories/routines/routine-exercises.repository.js` (`findRoutineExercise`, `updateRoutineExercise`, `deleteRoutineExercise`, `deleteRoutine`)
- Modify: `backend/src/services/routines/routines.service.js` (`createWithExercises` compartido; `updateExercise`, `removeExercise`)
- Modify: `backend/src/controllers/routines/routines.controller.js`, `backend/src/routes/routines/routines.routes.js`
- Modify: `backend/src/shared/utils/errors.js` (`routineExerciseNotFound`)
- Tests: `backend/tests/unit/validations/routines/routine-exercise.validation.test.js`, `backend/tests/unit/services/routines/routines.service/{create,routine-exercises}.test.js`, helper `backend/tests/helpers/routines/routines-service.setup.js` (sumar el repo nuevo a los mocks)

**Interfaces:**
- Produces:
  - `validateExerciseItem(item, prefix, details): SanitizedItem | null` — reglas de Global Constraints; **un valor inválido es error** (hoy `rest_seconds` inválido se convierte en `null` en silencio: eso se corrige). `SanitizedItem = { exercise_id, sets, reps, rest_seconds, suggested_kg, tempo, notes, order }` (`order` puede ser `undefined`).
  - `validateExerciseFields(body, details, { partial }): object` — para PATCH: solo `sets, reps, rest_seconds, suggested_kg, tempo, notes`; con `partial: true` todo es opcional y `null` borra los opcionales (`sets`/`reps` no aceptan `null`).
  - `createWithExercises(routineFields, exercises): Promise<{ routine, exercises }>` en `routines.service.js` (exportada para Task 3): inserta rutina, después ejercicios; si el segundo paso tira, llama a `deleteRoutine(routine.id)` y **re-lanza el error original** (si la compensación también tira, se ignora ese segundo error).
  - `Errors.routineExerciseNotFound(): AppError(404, 'ROUTINE_EXERCISE_NOT_FOUND', 'El ejercicio no es parte de esta rutina')`.
  - Rutas: `PATCH /api/routines/:id/exercises/:routineExerciseId` → 200 `{ data: <detalle de rutina> }`; `DELETE` igual → 204.

- [ ] **Step 1: Tests que fallan.**
  - validador: `sets: 0` → `exercises[0].sets`; `rest_seconds: -1` y `rest_seconds: 'x'` → error (no `null` silencioso); `suggested_kg: -5` → error; `tempo` de 21 → error; `notes` de 501 → error; ítem válido con opcionales ausentes → `null`; `order: -1` → error.
  - `validateUpdateRoutineExercise`: `{}` → `field: 'body'`; `{ suggested_kg: null }` → `{ suggested_kg: null }`; `{ sets: null }` → error; campos desconocidos se ignoran.
  - service `create`: si `addRoutineExercises` rechaza, se llama `deleteRoutine(id)` y se rechaza con el error original; si `deleteRoutine` también rechaza, el error que sale es el original.
  - service `updateExercise(trainerId, routineId, routineExerciseId, fields)`: rutina ajena → 403 (como hoy); rutina inexistente → 404; `routineExerciseId` que no es de esa rutina (`findRoutineExercise` devuelve `null`) → 404 `ROUTINE_EXERCISE_NOT_FOUND`; OK → devuelve `toRoutineDetail` de la rutina recargada.
  - service `removeExercise`: mismos casos de ownership/404; OK → llama `deleteRoutineExercise(routineExerciseId)`.
- [ ] **Step 2:** `npm test -- routine` → FAIL.
- [ ] **Step 3: Implementar.** `findRoutineExercise(routineId, routineExerciseId)` filtra por los dos ids. `routines.repository.js` no crece (las funciones nuevas van al repo nuevo). Si `routines.validation.js` pasa de 200 líneas, lo que sobra va al archivo nuevo.
- [ ] **Step 4:** `npm run lint && npm test` → verde.
- [ ] **Step 5: Commit** `feat(routines): editar y borrar ejercicios de una rutina asignada` (y, si queda separado, `fix(routines): crear rutina compensa si fallan los ejercicios`).

---

### Task 2: Módulo routine-templates — CRUD y guardar rutina como plantilla

**Files:**
- Create: `backend/src/models/routine-templates/routine-template.model.js`
- Create: `backend/src/validations/routine-templates/routine-templates.validation.js`
- Create: `backend/src/repositories/routine-templates/routine-templates.repository.js`
- Create: `backend/src/services/routine-templates/routine-templates.service.js`
- Create: `backend/src/controllers/routine-templates/routine-templates.controller.js`
- Create: `backend/src/routes/routine-templates/routine-templates.routes.js`
- Modify: `backend/src/app.js` (montar `/api/routine-templates`), `backend/src/shared/utils/errors.js` (`templateNotFound`)
- Tests: `backend/tests/unit/validations/routine-templates/…`, `backend/tests/unit/models/routine-templates/…`, `backend/tests/unit/services/routine-templates/routine-templates.service/{crud,from-routine}.test.js`, helper `backend/tests/helpers/routine-templates/routine-templates-service.setup.js`

**Interfaces:**
- Consumes: `validateExerciseItem` (Task 1); `ROUTINE_GOALS`, `DAYS`, `toRoutineDetail`/`mapRoutineExercises` de `models/routines`; `findAccessibleExerciseIds`, `findRoutineByIdWithExercises` de `repositories/routines`.
- Produces:
  - model: `ROUTINE_TEMPLATES_TABLE = 'routine_templates'`; `TEMPLATE_LEVELS`; `TEMPLATE_COLUMNS` (sin `structure`) y `TEMPLATE_DETAIL_COLUMNS` (con `structure`); `toTemplateSummary(row)` → `{ id, name, goal, level, frequency_per_week, generated_by_ai, created_at, days, exercise_count }`; `structureFromRoutine(routineDetail)` → `{ version: 1, days, exercises: [...] }` (ordena por `order_index` y lo pasa a `order`); `templateExerciseIds(structure)`.
  - validation: `validateCreateTemplate(body)`, `validateUpdateTemplate(body)` (al menos un campo), `validateFromRoutine(body)` (`routine_id` uuid, `name?`, `level?`), `validateListQuery(query)` (`goal`, `level`, `generated_by_ai` `'true'|'false'`), `validateIdParam`. La `structure` saneada solo contiene `version, days, exercises` con los ítems de `validateExerciseItem` (sin `undefined`: `order` por defecto = posición).
  - `Errors.templateNotFound(): AppError(404, 'TEMPLATE_NOT_FOUND', 'Plantilla no encontrada')`.
  - service: `list(trainerId, filters)`, `getById(trainerId, id)` (structure con `exercise: { id, name, muscle_group, equipment, video_url }` por ítem), `create(trainerId, data)`, `createFromRoutine(trainerId, data)`, `update(trainerId, id, fields)`, `remove(trainerId, id)`; `getOwnedTemplate(trainerId, id)` exportada para Task 3 (404 si no existe **o** es de otro trainer).
  - repository: `findTemplates({ trainerId, goal, level, generatedByAi })` (orden `created_at desc`), `findTemplateById(id)` (con structure), `createTemplate(fields)`, `updateTemplate(id, fields)`, `deleteTemplate(id)`, `findExercisesByIds(ids)` (para hidratar el detalle).
  - rutas: `GET /`, `POST /`, `POST /from-routine`, `GET /:id`, `PATCH /:id`, `DELETE /:id` (todas `authenticate` + `requireRole('trainer')`; `/from-routine` antes de `/:id`).

- [ ] **Step 1: Tests que fallan.**
  - validación: structure válida → saneada; `days: ['monday','monday']` → `structure.days`; `days: []` → error; 51 ejercicios → `structure.exercises`; `exercises: {}` → error; `version: 2` → error; propiedades desconocidas se descartan; `goal` ausente → error; `frequency_per_week` en el body se ignora; `level: 'pro'` → error.
  - model: `toTemplateSummary` con structure de 2 días y 3 ejercicios → `days` y `exercise_count: 3`; `structureFromRoutine` respeta el orden por `order_index`.
  - service: `create` guarda `frequency_per_week = days.length` y `generated_by_ai: false`, y valida ejercicios accesibles (403 si no); `getById` de otro trainer → 404 `TEMPLATE_NOT_FOUND`; `update` con `structure` recalcula `frequency_per_week`; `remove` llama `deleteTemplate`; `createFromRoutine` con rutina ajena → 403, inexistente → 404, OK → copia `goal`, `days`, ejercicios (sets, reps, rest, kg, tempo, notes, orden) y `name` por defecto el de la rutina.
- [ ] **Step 2:** FAIL → **Step 3:** implementar (archivos ≤ 200 líneas; dividir tests en carpeta por unidad) → **Step 4:** `npm run lint && npm test` verde.
- [ ] **Step 5: Commit** `feat(routine-templates): CRUD de plantillas y guardar rutina como plantilla`.

---

### Task 3: Instanciar plantilla (copia), ADR 0003 y docs

**Files:**
- Modify: `backend/src/services/routine-templates/routine-templates.service.js` (`instantiate`) — si pasa de 200 líneas, `services/routine-templates/instantiate.service.js`
- Modify: validación, controller y rutas de routine-templates (`POST /:id/instantiate`)
- Modify: `backend/src/shared/utils/errors.js` (`templateExercisesUnavailable(missingIds)`)
- Create: `docs/adr/0003-plantillas-se-copian.md`
- Modify: `docs/arquitectura/contratos-api.md` (módulo Plantillas completo — reemplaza el `customizations` viejo — y los dos endpoints nuevos de ejercicios de rutina, con los límites nuevos de un ejercicio), `backend/README.md` (tabla de endpoints), `docs/tarjetas.md` (fila 25 con spec y plan)
- Tests: `backend/tests/unit/services/routine-templates/routine-templates.service/instantiate.test.js`, validación de instantiate

**Interfaces:**
- Consumes: `getOwnedTemplate` (Task 2), `createWithExercises` (Task 1), `isStudentOfTrainer`, `findAccessibleExerciseIds`, `toRoutineDetail`, `findRoutineByIdWithExercises`.
- Produces:
  - `validateInstantiate(body)`: `student_id` uuid; `name?` 2–120; `days?` ≥ 1, ∈ `DAYS`, sin repetidos.
  - `instantiate(trainerId, templateId, data)`: plantilla propia (404 si no); alumno propio (403 si no); revalida ejercicios → si falta alguno, `Errors.templateExercisesUnavailable(missing)` = `AppError(409, 'TEMPLATE_EXERCISES_UNAVAILABLE', 'La plantilla tiene ejercicios que ya no están disponibles', missing.map((id) => ({ field: 'exercise_id', message: id })))`; crea con `createWithExercises({ trainer_id, student_id, template_id, name: data.name ?? template.name, goal: template.goal, days: data.days ?? structure.days, active: true }, structure.exercises)`; devuelve el detalle (`toRoutineDetail` de la rutina recargada) → 201.
  - Comentario en el service sobre la copia (con link al ADR 0003).

- [ ] **Step 1: Tests que fallan.** plantilla ajena → 404; alumno ajeno → 403; ejercicio faltante → 409 con los ids en `details`; OK → `createWithExercises` recibe `template_id`, `goal` de la plantilla, `name`/`days` de la plantilla o del body, y los ejercicios de `structure` tal cual; instancia dos veces → dos rutinas independientes (dos llamadas, la plantilla no se toca: `updateTemplate` nunca se llama); validación: `days: ['monday','monday']` y `days: []` → 400.
- [ ] **Step 2:** FAIL → **Step 3:** implementar + ADR (formato de `docs/adr/0002-sesion-web.md`: frontmatter, Estado, Fecha, Contexto, Decisión numerada, Alternativas — referencia viva, versionado de plantillas —, Consecuencias) + docs → **Step 4:** `npm run lint && npm test` verde.
- [ ] **Step 5: Commit** `feat(routine-templates): instanciar plantilla como copia (ADR 0003)` y `docs: contrato de plantillas y ejercicios de rutina`.
