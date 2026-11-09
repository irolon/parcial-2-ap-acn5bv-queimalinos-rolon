# GX8 · Nivel de la rutina y plantilla inicial al invitar (E4 + E5) — diseño

Ticket 8 de 9 del lote GX. Una PR. Rama sugerida: `feature/routine-level-initial-template`. **Sale después de la #83, la #84 y la #89** (ver el chequeo).

## Contexto

Guía Web (`src/guia-web-hifi.jsx`):

- **E4 · Crear rutina**, funcionalidad 4, "Metadatos de la rutina": "Días asignados, duración estimada y nivel, que gobiernan qué ve el alumno cada día." Días ya está; la duración la suma la #89 (GW5); falta el **nivel**. Referencia: fila de metadatos de `PTCrearRutina` (`src/pt-screens.jsx`: PLANTILLA · DÍAS · DURACIÓN EST. · NIVEL "Intermedio").
- **E5 · Generar QR de invitación**, funcionalidad 2, "Plantilla inicial opcional": "Se puede asignar ya un plan, así el alumno entra y tiene qué entrenar el primer día." Referencia: bloque "PLANTILLA INICIAL (OPCIONAL)" de `PTGenerarQR` (ícono, "Push/Pull/Legs · Hipertrofia", "4 DÍAS · INTERMEDIO", botón "Cambiar").

Hoy `routines` no tiene nivel (`03-routines.sql`: `name, goal, days, active`), `routine_templates.level` sí (`beginner | intermediate | advanced`, `TEMPLATE_LEVELS`), igual que `students.level` e `invitations.student_level`. `invitations` no guarda plantilla. `POST /routine-templates/:id/instantiate` (`instantiate` en `routine-templates.service.js`) ya copia una plantilla a una rutina de un alumno, con días opcionales.

## Decisiones

| # | Decisión |
|---|---|
| 1 | **Nivel de la rutina** (tomada por Pablo): lo elige el PT en el editor, con los valores del nivel de las plantillas; **opcional** (`null` = sin definir, como en plantillas). Se ve en la ficha del PT y del lado del alumno (Hoy y Mis rutinas). |
| 2 | Al crear desde plantilla **hereda su nivel**: en el editor (`fromTemplate`) y en `instantiate`. Guardar una rutina como plantilla precarga el nivel de la rutina en el diálogo; en `POST /routine-templates/from-routine` sin `level` se usa el de la rutina. |
| 3 | **Plantilla inicial al invitar** (tomada por Pablo): el PT elige una plantilla propia (opcional) y los días; se guardan en la invitación. Al darse de alta el alumno (`POST /students` con el token) se le crea sola la rutina con `instantiate`. Migración en `invitations`. |
| 4 | Días de la plantilla inicial: precargados con los de la plantilla (`structure.days`) y editables con el mismo `DayPicker` del editor; al menos uno. Si se manda `template_id` sin días, se usan los de la plantilla al momento del alta. |
| 5 | La plantilla se valida al **invitar** (propia y existente → si no, 404 `TEMPLATE_NOT_FOUND`) y se copia al **alta** (la plantilla puede cambiar en esas 48 h: vale la versión del alta, coherente con ADR 0003 "las plantillas se copian"). |
| 6 | **El alta nunca falla por la rutina inicial.** Si al alta la plantilla ya no existe (FK `on delete set null`), tiene ejercicios borrados (409 de `instantiate`) o falla el insert, el alumno se crea igual, sin rutina, y se registra un `console.warn`. El PT lo ve en la ficha ("Sin rutina asignada") y asigna a mano. |
| 7 | `GET /invitations/:token` (pública) **no** expone la plantilla: el alumno la ve al entrar, en Hoy. |
| 8 | Una sola migración para las dos columnas nuevas de este ticket. |

## Diseño

**Editor (E4)**: `RoutineHeader` pasa de 2 a 3 campos en fila (`sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]`): Nombre, Objetivo y **Nivel** (`Select` con `LEVEL_OPTIONS` de `utils/students/studentOptions.js`: "Sin definir", Principiante, Intermedio, Avanzado). Sin validación en el cliente (es opcional). El estado del editor suma `level: ''`; viaja en el borrador local (`draft.js`) y en `buildRoutineBody` (`level || null`). `fromTemplate` lo toma de `template.level`. `SaveTemplateDialog` arranca con `level: state.level`.

**Ficha (E3)**: `ActiveRoutineCard` muestra debajo de los días "Nivel: Intermedio" (`levelLabel`); sin nivel no muestra nada.

**Alumno**: en Hoy (`RoutineHero`), la línea mono del resumen suma "· INTERMEDIO" al final; en Mis rutinas (`RoutineCard`), la línea de días queda "Lun · Mié · Vie · Intermedio". Sin nivel, como hoy.

**Invitar (E5)**: `StudentForm` suma, debajo de Objetivo y Nivel, `InitialTemplateField`: rótulo mono "PLANTILLA INICIAL (OPCIONAL)", un `Select` con "Sin plantilla" y las plantillas del PT (`useTemplatesQuery`; etiqueta "Push A · 4 días · Intermedio") y, con una elegida, el `DayPicker` precargado con sus días. El formulario sigue no controlado: el campo guarda su estado y escribe `<input type="hidden" name="template_id">` y uno `name="routine_days"` por día, que `buildInvitationBody` lee con `getAll`. Estados del select: cargando, deshabilitado con "Cargando plantillas…"; error, deshabilitado con "No pudimos cargar tus plantillas" (la invitación se puede generar igual); sin plantillas, "Todavía no tenés plantillas" y el select oculto. Errores del backend en `template_id` / `routine_days` se muestran en el campo (`FIELDS` de `invitationForm.js`). El paso 2 (QR y WhatsApp) no cambia.

**Alta (`POST /students`)**: después de crear al alumno y antes de emitir los tokens, `students.service.registerFromInvitation` llama a `assignInitialRoutine(invitation, student)` (servicio nuevo): si la invitación tiene `template_id`, `instantiate(invitation.trainer.id, template_id, { student_id, days: routine_days ?? undefined })`; ante cualquier error, `console.warn('[invitations] rutina inicial no creada', …)` y sigue (decisión 6). La respuesta del alta no cambia.

## Datos

**Migración** `backend/src/database/migrations/2026-11-09-routine-level-initial-template.sql` (re-ejecutable; también en `schema/03-routines.sql`, después de `routine_templates`, igual que `routines_template_id_fkey`):

```sql
alter table routines add column if not exists level varchar(20)
  check (level in ('beginner', 'intermediate', 'advanced'));
alter table invitations add column if not exists template_id uuid
  references routine_templates (id) on delete set null;
alter table invitations add column if not exists routine_days text[]
  check (routine_days <@ array['sunday','monday','tuesday','wednesday','thursday','friday','saturday']::text[]);
```

Las rutinas existentes quedan con `level null` (sin definir). `checks/schema-checks.sql` suma `routines.level` y las dos columnas de `invitations` a la lista de columnas esperadas.

**Contrato** (`docs/arquitectura/contratos-api.md`, todo aditivo):
- `POST /routines` y `PATCH /routines/:id`: `level` opcional, `null` o uno de `beginner | intermediate | advanced` (otro → 400 en `level`).
- `GET /routines/:id`, `GET /routines`, `GET /routines/today`, `GET /routines/mine` y `active_routine` de `GET /students/:id`: suman `level`.
- `POST /routine-templates/:id/instantiate`: la rutina hereda `level` de la plantilla. `POST /routine-templates/from-routine`: sin `level`, el de la rutina.
- `POST /invitations`: `template_id` (uuid, opcional) y `routine_days` (arreglo no vacío de días sin repetir; solo con `template_id`, si no 400). Plantilla ajena o inexistente → 404 `TEMPLATE_NOT_FOUND`.
- `POST /students`: si la invitación tenía plantilla, el alumno arranca con esa rutina activa (sin cambios en la respuesta).

`docs/arquitectura/modelo-de-datos.md`: `routines.level` e `invitations.template_id`, `invitations.routine_days`.

## Archivos que toca

**Backend**
- Crea la migración de arriba y `backend/src/services/students/initial-routine.service.js` (`assignInitialRoutine`).
- Modifica `src/database/schema/03-routines.sql` (121, +10), `src/database/checks/schema-checks.sql` (151; 159 tras la #83; +~10).
- Modifica `src/models/routines/routine.model.js` (100: `ROUTINE_LEVELS`, `level` en `ROUTINE_COLUMNS`, `toTodayRoutine` y `toStudentRoutines`: ~104), `src/validations/routines/routines.validation.js` (172, `level` en create y update: ~184), `src/services/routines/routines.service/routines.service.js` (119, +1 en `create`), `src/repositories/routines/routines.repository.js` (170, `level` en el select de `findActiveRoutineSummary`), `src/services/routine-templates/routine-templates.service.js` (150, `level` en `instantiate` y `createFromRoutine`, sin líneas nuevas).
- Modifica `src/validations/invitations/invitations.validation.js` (83, ~100; usa `isUuid` de `shared/utils/validators.js` y `validateDays` de `validations/routines/routines.validation.js`), `src/services/invitations/invitations.service.js` (82, valida con `getOwnedTemplate`: ~88), `src/repositories/invitations/invitations.repository.js` (89, insert y select: ~92), `src/services/students/students.service.js` (151, +3).
- `src/repositories/students/students.repository.js` (**200 líneas**) **no se toca**.

**Web**
- Crea `frontend/src/components/invitations/InitialTemplateField.jsx`.
- Modifica `frontend/src/components/routines/editor/RoutineHeader.jsx` (47; 49 tras la #89; ~58), `frontend/src/utils/routines/editorState.js` (86, +2), `frontend/src/utils/routines/draft.js` (61, +2), `frontend/src/utils/routines/routineForm.js` (94, +1), `frontend/src/components/routines/dialogs/SaveTemplateDialog.jsx` (88, 1 línea), `frontend/src/components/students/profile/ActiveRoutineCard.jsx` (21, +3), `frontend/src/components/student/today/RoutineHero.jsx` (32, +2), `frontend/src/components/student/routines/RoutineCard.jsx` (25, +2), `frontend/src/components/invitations/StudentForm.jsx` (85, +2), `frontend/src/pages/invitations/invitationForm.js` (47, +6).

**Tests (backend)**: crea `tests/unit/services/students/initial-routine.service.test.js`; modifica `tests/unit/validations/routines/routines.validation.test.js` (110, +20), `tests/unit/models/routines/routine.model.test.js` (86, +10), `tests/unit/services/routine-templates/routine-templates.service/instantiate.test.js` (105, +12) y `from-routine.test.js` (147, +12), `tests/unit/services/invitations/invitations.service.test.js` (152, +25), `tests/unit/validations/invitations/invitations.validation.test.js` (64, +30), `tests/unit/services/students/students.service/register-from-invitation.test.js` (134, +20).

**Tests (web)**: crea `frontend/tests/pages/routines/RoutineEditorPage/level.test.jsx`, `frontend/tests/components/invitations/InitialTemplateField.test.jsx`; modifica `frontend/tests/utils/routines/editorState.test.js`, `draft.test.js`, `routineForm.test.js`, `frontend/tests/pages/invitations/invitationForm.test.js`, `frontend/tests/pages/invitations/NewStudentPage/form.test.jsx` (manda `template_id` y días), `frontend/tests/pages/student/MyRoutinesPage.test.jsx` y `frontend/tests/pages/student/TodayPage/content.test.jsx` (el nivel).

**Chequeo contra PRs abiertas.**
- **#89** (GW5): modifica `RoutineHeader.jsx` (suma `EstimatedDuration` debajo de `DayPicker`) y `TodayPage/content.test.jsx`. Este ticket cambia la grilla de arriba del mismo archivo: **después de la #89**. `components/routines/editor/` queda en 10 archivos con la #89: por eso el nivel va dentro de `RoutineHeader` y no en un `LevelPicker.jsx` nuevo (sería el 11°).
- **#84** (IA web): modifica `editorState.js` (la misma línea de `EMPTY_ROUTINE`, suma `aiBlock`), `draft.js` (`serializeDraft`/`restoreDraft`) y `RoutineEditorPage.jsx`. **Después de la #84**; este ticket no toca `RoutineEditorPage.jsx` (el nivel entra por `RoutineHeader` y `editor.updateHeader`). Seguimiento: el bloque de la IA que llega al editor (`blockEditor.js`) podría precargar el nivel de la propuesta; queda para después de las dos.
- **#83** (IA backend): modifica `checks/schema-checks.sql` (bloques al medio) y los dos docs de arquitectura. Lo nuevo va **al final** de cada uno; con la #83 adentro, `schema-checks.sql` queda en ~170 líneas. Sus plantillas de la IA ya guardan `level` (`save.service.js`): heredan bien al instanciarlas.
- **#76** (suite de backend): modifica `tests/unit/models/routines/routine.model.test.js` y `tests/unit/repositories/routines/routines.repository.test.js`. Si sigue abierta, el test del modelo se rebasa a mano (agregados, sin cambios de lo existente).
- **#85 / #90 / #91**: tocan `contratos-api.md` en otras secciones (chat, IA, overview); sin solapamiento de código.

## Pruebas

**Jest (backend)**
- Validación de rutinas: `level` válido, `null`, ausente y uno inválido (400 con `field: 'level'`), en create y update.
- Modelo: `toTodayRoutine` y `toStudentRoutines` devuelven `level`.
- `instantiate`: la rutina sale con el `level` de la plantilla (y `null` si la plantilla no tiene). `createFromRoutine`: sin `level` en el body usa el de la rutina; con `level` lo pisa.
- Invitaciones: `template_id` sin días guarda `routine_days null`; días sin plantilla → 400; día repetido o inválido → 400; plantilla ajena → 404 `TEMPLATE_NOT_FOUND`; el insert lleva las dos columnas.
- `assignInitialRoutine`: sin plantilla no llama a `instantiate`; con plantilla lo llama con el trainer, el alumno y los días; si `instantiate` tira, devuelve `null` y avisa.
- Alta: con plantilla crea la rutina; con `instantiate` fallando el alta responde 201 igual y la invitación queda usada.

**Vitest**
- Editor: elegir "Intermedio" lo manda en `POST /routines`; "Usar plantilla" precarga el nivel; el borrador lo restaura; "Guardar como plantilla" arranca con el nivel de la rutina.
- `InitialTemplateField`: lista las plantillas; al elegir una precarga sus días; sacar todos los días muestra el error del backend; sin plantillas, el texto; error de carga no bloquea el envío.
- `invitationForm`: arma `template_id` y `routine_days`; sin plantilla no los manda.
- Hoy y Mis rutinas muestran el nivel; sin nivel, como hoy. La ficha muestra "Nivel: …".

**Navegador:** PT de QA con dos plantillas (una con nivel). Invitar a un alumno con plantilla y L/M/V, registrarlo por el link y ver la rutina en Hoy con su nivel; crear otra rutina en el editor con nivel y verla en la ficha y en Mis rutinas. Capturas en `docs/superpowers/specs/assets/gx8/` (`01-editor-nivel.jpg`, `02-invitar-plantilla.jpg`, `03-alumno-hoy-con-rutina-inicial.jpg`, `04-mis-rutinas-nivel.jpg`, `05-ficha-nivel.jpg`, `06-invitar-angosto-375.jpg`).

## Criterio de aceptación

- El PT elige el nivel en el editor (o lo hereda de la plantilla) y se ve en la ficha, en Hoy y en Mis rutinas.
- Al invitar se puede elegir una plantilla y sus días; el alumno que se registra con ese link entra y ya tiene rutina para el primer día.
- Si la rutina inicial no se puede crear, el alumno se registra igual.
- Migración corrida en Supabase y `schema-checks.sql` sin filas; contrato y modelo de datos al día en la misma PR.
- Lint y tests en verde (backend y web); ningún archivo pasa de 200 líneas.

## Estimación

**16 h**: migración, schema y checks 1 h; nivel en backend (validación, modelo, plantillas) 2 h; plantilla inicial en backend (validación, invitación, alta) 3 h; nivel en la web (editor, ficha, alumno) 2 h; campo de plantilla al invitar 2,5 h; tests backend y web 3 h; docs 1 h; navegador y capturas 1,5 h.

## Fuera de alcance

- Editar el nivel de una rutina ya asignada desde la web (la web no edita rutinas; `PATCH /routines/:id` lo acepta para el celular).
- Filtrar o agrupar rutinas por nivel; que el nivel cambie qué ve el alumno (más allá de mostrarlo).
- Mostrar la plantilla en `GET /invitations/:token` o en la pantalla de registro; avisar al PT si la rutina inicial no se creó.
- "12 SEMANAS" (vigencia de la plantilla) del prototipo: no existe en el modelo.

## Tarjetas para el celular (Igna)

1. **Nivel en las rutinas del alumno**: mostrar `level` en Hoy y en Mis rutinas (llega en `GET /routines/today` y `GET /routines/mine`; campo nuevo y opcional, el `Json { ignoreUnknownKeys }` no se rompe). Si el caché offline de rutinas (Room) lo guarda, necesita migración de Room.
2. **Nivel en el editor de rutinas del PT** (`ui/routines/trainer`): selector opcional; `POST /routines` y `PATCH /routines/:id` con `level`; al partir de plantilla, heredarlo. Mostrarlo en la ficha (`active_routine.level` de `GET /students/:id`).
3. **Plantilla inicial al invitar** (`ui/invitations/InviteScreen`): elegir plantilla (`GET /routine-templates`) y días, y mandarlos en `POST /invitations` (`template_id`, `routine_days`). El alta desde el celular (`POST /students`) no cambia: la rutina se crea sola.
