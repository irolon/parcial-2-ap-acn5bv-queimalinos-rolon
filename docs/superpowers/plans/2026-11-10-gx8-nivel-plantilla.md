# GX8 · Nivel de la rutina y plantilla inicial al invitar — plan

> Ejecución nativa (un solo agente, TDD, commit por tarea). Checkboxes `- [ ]` para el avance.

**Objetivo:** que la rutina tenga nivel (opcional, heredado de la plantilla) y que la invitación pueda llevar una plantilla inicial que se instancia sola en el alta del alumno, con aviso al PT si falla.

**Arquitectura:** una migración (`routines.level`, `invitations.template_id`, `invitations.routine_days` y el tipo `initial_routine_failed` en el check de `notifications.type`). En el backend el nivel viaja por validación → service → `ROUTINE_COLUMNS`; la plantilla inicial se valida en `invitations.service` con `getOwnedTemplate` y se copia en `students.service.registerFromInvitation` con un servicio nuevo `initial-routine.service.js` que nunca lanza. En la web, el nivel entra por `RoutineHeader` y `editorState`; la plantilla inicial por un campo nuevo `InitialTemplateField` en el formulario no controlado de la invitación.

**Stack:** Node/Express ESM + Jest (backend), React + Vite + TanStack Query + Vitest (web), Postgres/Supabase.

**Spec:** `docs/superpowers/specs/2026-11-09-gx8-rutinas-nivel-plantilla-design.md`

## Restricciones globales

- Ningún archivo de código pasa de 200 líneas (tests incluidos); carpeta con más de 10 archivos se subdivide; tests espejan el árbol.
- Niveles: `beginner | intermediate | advanced`; `null` = sin definir.
- Días: `sunday … saturday`, arreglo no vacío y sin repetidos (`validateDays`).
- `students.repository.js` (200 líneas) no se toca.
- `components/routines/editor/` ya tiene 10 archivos: el nivel va dentro de `RoutineHeader`.
- La migración termina con `notify pgrst, 'reload schema';`. No se corre SQL contra Supabase.
- Commits en español, sin trailers de IA.

## Foco de review

1. Plantilla borrada entre invitar y el alta (FK `set null` → `template_id` null): el alta no intenta nada y no avisa (no hay qué asignar). Test en Tarea 4.
2. `instantiate` tira (409 ejercicios borrados, error de BD) → alumno creado, 201, `console.warn`, notificación `initial_routine_failed` al PT; si además la notificación falla, el alta sigue igual. Tests en Tarea 4.
3. `routine_days` mandado sin `template_id`, o `template_id` sin `routine_days` → 400 en `routine_days`; `template_id` con formato inválido → 400 en `template_id`. Tests en Tarea 3.
4. Borrador local viejo (sin `level`) restaura con `level: ''`. Test en Tarea 6.
5. Error al cargar las plantillas en el formulario de invitación no bloquea "Generar QR". Test en Tarea 8.

---

### Tarea 1: Migración y schema

**Archivos:** crea `backend/src/database/migrations/2026-11/09-15/2026-11-09-routine-level-initial-template.sql`; modifica `schema/03-routines.sql` (columnas después de la FK de `routines_template_id_fkey`), `schema/06-ai-and-agenda/02-agenda-and-notifications.sql` (tipo nuevo en el check de `notifications.type`), `checks/schema-checks.sql` (al final: faltantes de `routines.level`, `invitations.template_id`, `invitations.routine_days` y el check de tipos sin `initial_routine_failed`).

- [ ] Escribir la migración (las tres columnas del spec + `drop constraint if exists notifications_type_check` / `add constraint … check (type in (…, 'initial_routine_failed'))`).
- [ ] Reflejarla en schema y checks; `npm run lint` (incluye `check-file-length` para `.sql`).
- [ ] Commit `feat(db): nivel de la rutina, plantilla inicial de la invitación y tipo initial_routine_failed`.

### Tarea 2: Nivel de la rutina en el backend

**Archivos:** `models/routines/routine.model.js` (`ROUTINE_LEVELS`, `level` en `ROUTINE_COLUMNS`, `toTodayRoutine`, `toStudentRoutines`), `validations/routines/routines.validation.js` (`level` en create → `level ?? null`, y en update), `services/routines/routines.service/routines.service.js` (`level` en `create`), `repositories/routines/routines.repository.js` (`findActiveRoutineSummary` selecciona `level`), `services/routine-templates/routine-templates.service.js` (`instantiate`: `level: template.level ?? null`; `createFromRoutine`: `level: data.level !== undefined ? data.level : routine.level ?? null`).

**Interfaces:** `ROUTINE_LEVELS = ['beginner','intermediate','advanced']`.

- [ ] Tests: validación (válido, `null`, ausente → `null` en create / no aparece en update, inválido → 400 `field: 'level'`); modelo (`toTodayRoutine` y `toStudentRoutines` devuelven `level`); `instantiate` hereda `level` (y `null`); `createFromRoutine` sin `level` usa el de la rutina, con `level` lo pisa.
- [ ] Verlos fallar, implementar, verlos pasar. Commit `feat(routines): nivel opcional de la rutina, heredado de la plantilla`.

### Tarea 3: Plantilla inicial en POST /invitations

**Archivos:** `validations/invitations/invitations.validation.js` (`template_id` uuid opcional con `isUuid` de `shared/utils/validators.js`; `routine_days` con `validateDays`, obligatorio con `template_id` y solo con él; devuelve `template_id` y `routine_days` o `null`), `services/invitations/invitations.service.js` (`getOwnedTemplate(trainerId, template_id)` antes del insert), `repositories/invitations/invitations.repository.js` (insert de `template_id`, `routine_days`; `INVITATION_WITH_TRAINER` las lee).

- [ ] Tests: validación (sin plantilla → ambos `null`; `template_id` sin días → 400 `routine_days`; días sin plantilla → 400 `routine_days`; día repetido/inválido → 400; uuid inválido → 400 `template_id`); service (plantilla ajena → 404 `TEMPLATE_NOT_FOUND` sin insertar; el insert lleva `templateId` y `routineDays`). Fila de aislamiento cruzado `POST /invitations` con `template_id: ':tpA'` → 404.
- [ ] Commit `feat(invitations): plantilla inicial opcional al invitar`.

### Tarea 4: Rutina inicial en el alta y aviso al PT

**Archivos:** crea `services/students/initial-routine.service.js` con `assignInitialRoutine(invitation, student) → Promise<routine|null>`; modifica `services/students/students.service.js`, `models/notifications/notification.model.js` (tipo), `models/notifications/push-policy.js` (`initial_routine_failed: { trainer: true }`), `models/notifications/texts.js` (`initialRoutineFailed({ studentName })` → "No pudimos asignarle la rutina inicial a {nombre}", body "Asignale una rutina desde su ficha.").

**Interfaces:** `assignInitialRoutine` llama a `instantiate(invitation.trainer.id, invitation.template_id, { student_id: student.id, days: invitation.routine_days })`; ante error: `console.warn('[invitations] rutina inicial no creada', …)`, `notify({ userId: trainerId, userRole: 'trainer', type: 'initial_routine_failed', title, body, data: { student_id }, push: shouldPush(...) })` dentro de try/catch, y devuelve `null`.

- [ ] Tests del servicio nuevo (sin plantilla no llama; con plantilla llama con trainer, alumno y días; si tira → `null`, warn y notify; si notify también tira → `null`) y del alta (llama a `assignInitialRoutine` antes de los tokens; si devuelve `null` el alta sigue y no libera la invitación). Tests de modelo de notificaciones (tipo, política, texto).
- [ ] Commit `feat(students): rutina inicial al darse de alta y aviso al PT si falla`.

### Tarea 5: Nivel en el editor (web)

**Archivos:** `utils/routines/editorState.js` (`level: ''` en `EMPTY_ROUTINE`, `fromTemplate` toma `template.level ?? ''`), `utils/routines/draft.js` (serializa/restaura `level`), `utils/routines/routineForm.js` (`buildRoutineBody` → `level: state.level || null`), `components/routines/editor/RoutineHeader.jsx` (3 campos, `sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]`, `Select` "Nivel" con `LEVEL_OPTIONS`), `components/routines/dialogs/SaveTemplateDialog.jsx` (`level: state.level ?? ''`).

- [ ] Tests: utils (`editorState`, `draft` incl. borrador sin `level`, `routineForm`); página nueva `tests/pages/routines/RoutineEditorPage/level.test.jsx` (elegir Intermedio → `POST /routines` con `level`; plantilla precarga nivel; Guardar como plantilla arranca con el nivel).
- [ ] Commit `feat(routines): nivel en el editor de rutinas (web)`.

### Tarea 6: Nivel en la ficha y del lado del alumno

**Archivos:** `ActiveRoutineCard.jsx` ("Nivel: Intermedio"), `RoutineHero.jsx` (resumen + " · INTERMEDIO"), `RoutineCard.jsx` (días + " · Intermedio"). Sin nivel, como hoy.

- [ ] Tests en `MyRoutinesPage.test.jsx`, `TodayPage/content.test.jsx` y el test de la ficha que cubra `ActiveRoutineCard`.
- [ ] Commit `feat(student-web): nivel de la rutina en Hoy, Mis rutinas y la ficha`.

### Tarea 7: Plantilla inicial al invitar (web)

**Archivos:** crea `components/invitations/InitialTemplateField.jsx` (`{ errors }` → estado propio; `useTemplatesQuery`; `Select` "Plantilla inicial" con "Sin plantilla" + "Nombre · N días · Nivel"; `DayPicker` precargado; hidden `template_id` y uno `routine_days` por día; estados cargando / error / sin plantillas); modifica `StudentForm.jsx` y `pages/invitations/invitationForm.js` (`FIELDS` + `template_id`, `routine_days`; `buildInvitationBody` con `getAll('routine_days')`, solo si hay `template_id`).

- [ ] Tests: `tests/components/invitations/InitialTemplateField.test.jsx`, `invitationForm.test.js`, `NewStudentPage/form.test.jsx` (manda `template_id` y días; error de carga no bloquea).
- [ ] Commit `feat(invitations): plantilla inicial en el formulario de invitación (web)`.

### Tarea 8: Docs y cierre

- [ ] `contratos-api.md` (rutinas, plantillas, invitaciones, alta, tipo `initial_routine_failed` en la tabla de notificaciones) y `modelo-de-datos.md`. Commit `docs: contrato y modelo de datos de GX8`.
- [ ] Suites completas de a una (backend jest + eslint; web vitest + eslint + build), `wc -l` de lo tocado, push.
