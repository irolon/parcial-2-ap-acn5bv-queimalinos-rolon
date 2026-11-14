# GX5 · Asistente IA del alumno en la web — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** página "Asistente IA" del alumno con historial por día, contexto de cada consulta y "Aplicar" una sugerencia a la sesión web en curso; el backend guarda `exercise_id` y `suggestions` y suma `GET /chat/history`.

**Architecture:** migración aditiva en `chat_messages`; el repositorio lee con embebidos (`exercise`, `session → routine`) y el modelo los aplana (`toChatMessage`). `groupByDay` agrupa por día argentino y pagina por cursor de fecha. En la web, `replaceExercise` (estado puro) + `useApplySuggestion` (hook) + `ApplySuggestion` dentro de `SuggestionChips`; la página reutiliza `ChatLog` y `ChatComposer`.

**Tech Stack:** Node/Express ESM + Supabase (Jest), React + Vite + TanStack Query (Vitest + Testing Library).

**Spec:** `docs/superpowers/specs/2026-11-09-gx5-asistente-ia-alumno-design.md`

## Global Constraints

- CONTRIBUTING: ningún archivo de código (tests incluidos, `.sql` incluidos) pasa de 200 líneas; carpetas de más de 10 archivos se subdividen; lo dividido va en una carpeta con el nombre del original; los tests copian el árbol.
- Migración en `backend/src/database/migrations/2026-11/09-15/2026-11-09-chat-history.sql` (carpeta por mes, como la #94); lo mismo en el bloque `chat_messages` de `schema/06-ai-and-agenda/01-ai.sql`. No se corre contra Supabase.
- Decisión 7b: "Aplicar" solo si el `exercise_id` del mensaje es el ejercicio actual (cursor) de la sesión en curso en esta web (`exerciseId` u `originalExerciseId`), el mensaje es de hoy y la sesión no terminó. Lo demás, texto.
- Textos exactos: "Aplicar a la sesión de hoy", "Listo: hoy hacés {alt} en lugar de {plan}.", "Ya registraste series de {plan}: no se puede cambiar.", "EN LUGAR DE {PLAN}", "Preguntando sobre: {ej} ({rutina})", "Consulta general: no tenés una sesión en curso", "Las consultas de días anteriores son de solo lectura.", "Todavía no le preguntaste nada al asistente.", "Ver días anteriores", "Nueva consulta", atajos "¿Cuánto debería subir?", "Técnica correcta", "Calentamiento", "Estiramiento post".
- Commits en español, sin trailers de IA. Jest/Vitest con `--maxWorkers=2`, de a una suite.

## Review Focus

- Mensajes guardados antes de la migración (sin `exercise_id`, `suggestions` = `[]` por default): se muestran sin contexto ni chips → `toChatMessage` con fila sin embebidos (Task 1).
- Sugerencia pedida en el ejercicio A con el cursor en B → no se aplica (test de 7b en `canApply` y en el panel) (Tasks 4 y 6).
- Volver al original desde otra sugerencia deja `originalExerciseId` en `null` y borra `originalName` (Task 3).
- Respuesta que llega con la sesión ya terminada (`finishedAt`) → sin botón (Task 4).
- Página sin sesión iniciada en el store / día vacío: vacío y caja de Hoy siguen andando (Task 7).

---

### Task 1: Backend — migración, guardado y `GET /chat/today` con contexto

**Files:**
- Create: `backend/src/database/migrations/2026-11/09-15/2026-11-09-chat-history.sql`
- Modify: `schema/06-ai-and-agenda/01-ai.sql`, `checks/schema-checks.sql`, `models/chat/chat-message.model.js`, `repositories/chat/chat-messages.repository.js`, `services/chat/chat.service.js`
- Test: `tests/unit/models/chat/chat-message.model.test.js`, `repositories/chat/chat-messages.repository.test.js`, `services/chat/chat.service/send.test.js`, `limit-and-today.test.js`

**Interfaces — Produces:**
- `CHAT_MESSAGE_COLUMNS = 'id, role, content, created_at, exercise_id, suggestions, exercise:exercises (id, name), session:sessions (routine:routines (name))'`; `CHAT_SAVED_COLUMNS = 'id, role, content, created_at'` (lo que devuelve la inserción).
- `toChatMessage(row) → { id, role, content, created_at, exercise: {id,name}|null, routine_name: string|null, suggestions: [] }` (en `chat-message.model.js`).
- Las dos filas del par llevan `exercise_id` (el de `findCurrentExercise` o `null`); la del asistente lleva `suggestions` validadas, la del alumno `[]`.

- [ ] Tests: `toChatMessage` con y sin embebidos; `findDayMessages` selecciona `CHAT_MESSAGE_COLUMNS`; `insertExchange` devuelve `CHAT_SAVED_COLUMNS`; `sendMessage` guarda `exercise_id` (BENCH) y `null` si es inaccesible, y `suggestions` validadas solo en la respuesta; `getToday` devuelve `exercise`, `routine_name` y `suggestions`.
- [ ] Correr (fallan), implementar, correr (pasan), commit `feat(chat): guardar ejercicio y sugerencias de cada consulta`.

### Task 2: Backend — `GET /chat/history`

**Files:**
- Create: `models/chat/chat-history.js`, `services/chat/history.service.js`
- Modify: `chat-message.model.js` (`HISTORY_DAYS_DEFAULT = 7`, `HISTORY_DAYS_MAX = 14`), `chat-messages.repository.js`, `validations/chat/chat.validation.js`, `controllers/chat/chat.controller.js`, `routes/chat/chat.routes.js`
- Test: `tests/unit/models/chat/chat-history.test.js`, `services/chat/history.service.test.js`, `validations/chat/chat.validation/history.test.js` (y el test existente pasa a `chat.validation/body.test.js`), `routes/chat/chat.routes.test.js`, `repositories/chat/chat-messages.repository.test.js`; `tests/integration/isolation/lists.int.test.js` suma `/chat/today` y `/chat/history` a `STUDENT_LISTS`.

**Interfaces — Produces:**
- `findMessagesBefore(studentId, beforeIso, limit)`: `created_at < beforeIso`, orden `created_at desc`, `role asc`, `limit`.
- `groupByDay(rows, days, limitPerDay) → { days: [{ date, messages }], next_before }`. `rows` nuevos primero; tope = `days × limitPerDay × 2`; si `rows.length === tope` y hay más de un día, se descarta el más viejo; se devuelven a lo sumo `days` días; `next_before` = el día más viejo devuelto si hubo tope o días de más, si no `null`. Mensajes de cada día en orden cronológico (alumno antes que asistente en el mismo instante).
- `getHistory(studentId, { before, days }, now = new Date())`: `before` por defecto = hoy AR; lee desde `argentinaToUtc(before, 0)`.
- `validateHistoryQuery(query) → { before?: 'YYYY-MM-DD', days: 1..14 }` (400 `VALIDATION_ERROR`).
- Ruta `GET /chat/history`: `requireRole('student')`, `validate(validateHistoryQuery, 'query')`, `controller.history`.

- [ ] Tests: 23:59 AR va a su día; orden de días y mensajes; descarte del día cortado; `next_before` null sin más; `before` por defecto excluye hoy; aislamiento (repo con el `studentId`); fecha inválida, `days` 0, 15 o "abc" → 400.
- [ ] Correr (fallan), implementar, correr (pasan), commit `feat(chat): GET /chat/history por día`.

### Task 3: Web — sustitución en la sesión

**Files:**
- Create: `frontend/src/utils/workout/workoutState/workoutSwap.js`
- Modify: `workoutState.js` (re-export, `originalExerciseId` en `registerSet`), `uploadPayload.js` (`original_exercise_id: set.originalExerciseId ?? null`), `hooks/workout/useActiveWorkout.js` (`replace(index, { id, name })`), `components/workout/session/ExercisePanel.jsx` ("EN LUGAR DE …")
- Test: `tests/utils/workout/workoutState/swap.test.js`, `tests/utils/workout/uploadPayload.test.js`

**Interfaces — Produces:** `replaceExercise(state, index, { id, name }) → state`: sin series y sin terminar cambia `exerciseId`, `name`, `originalExerciseId` (plan, o `null` si vuelve al original), `originalName` (o `null`), `suggestedKg = lastKg = null`; si no, el mismo estado.

- [ ] Tests: cambia id/nombre y guarda el original; volver al original deja `null`; con series no cambia; la serie nueva lleva `originalExerciseId`; `setBody` manda `original_exercise_id`.
- [ ] Commit `feat(workout): reemplazar un ejercicio en la sesión web`.

### Task 4: Web — datos del chat (API, día, historial, `canApply`)

**Files:**
- Create: `frontend/src/utils/chat/chatHistory.js`, `frontend/src/hooks/chat/useChatHistory.js`
- Modify: `api/chat/chat.api.js` (`getChatHistory({ before, days })`), `utils/chat/chatDay.js` (`appendExchange(day, message, reply, now, exerciseId)` pone `exercise_id` en los dos), `hooks/chat/useChat.js` (pasa `variables.exerciseId`)
- Test: `tests/utils/chat/chatHistory.test.js`, `tests/utils/chat/chatDay.test.js`, `tests/api/chat/chat.api.test.js`

**Interfaces — Produces:**
- `askedAbout(message) → id|null` (`exercise_id ?? exercise?.id`).
- `dayLabel(date, today) → 'HOY'|'AYER'|'dd/mm'`, `dayTitle(messages) → string|null` (primera consulta), `contextLabel(message) → 'CONTEXTO · PUSH · PRESS BANCA'|null`.
- `canApply({ message, suggestion, workout, today }) → { status: 'none'|'can'|'applied'|'locked', index?, planned? }`.
- `useChatHistory()`: `useInfiniteQuery` con clave `['chat', 'history', studentId]`, `getNextPageParam = next_before ?? undefined`.

- [ ] Tests de 7b: pedida en A con el cursor en B → `none`; ayer → `none`; con series → `locked`; misma sugerencia que el ejercicio → `none`; ya aplicada → `applied`.
- [ ] Commit `feat(chat): historial y reglas de Aplicar en la web`.

### Task 5: Web — Aplicar en `SuggestionChips`

**Files:**
- Create: `frontend/src/hooks/chat/useApplySuggestion.js`, `frontend/src/components/chat/ApplySuggestion.jsx`
- Modify: `SuggestionChips.jsx` (recibe `message`), `ChatBubble.jsx` (le pasa el mensaje)
- Test: `tests/hooks/chat/useApplySuggestion.test.jsx`, `tests/components/chat/AssistantPanel/apply.test.jsx`, helper `tests/helpers/chat/chat.jsx`

**Interfaces — Produces:** `useApplySuggestion(message) → (suggestion) => { status, planned, apply() }`.

- [ ] Tests: desde el panel, Aplicar cambia el nombre en la sesión y muestra "Listo…"; con series, texto de bloqueo; sin sesión, sin botón; pedida en A con cursor en B, sin botón.
- [ ] Commit `feat(chat): aplicar una sugerencia a la sesión de hoy`.

### Task 6: Web — página Asistente IA

**Files:**
- Create: `pages/student/AssistantPage.jsx`, `components/chat/history/{ChatDayList,ChatDayView,ContextChip}.jsx`
- Modify: `ChatComposer.jsx` (prop `shortcuts`), `ChatLog.jsx` (`renderBefore` para el chip), `AssistantPanel.jsx` (sin cambios de contexto salvo lo necesario), `routes/routeTable.js` (`asistente`, `Sparkles`, después de Historial), `routes/router.jsx`
- Test: `tests/pages/student/AssistantPage/{today,history,apply}.test.jsx`, `tests/routes/routeTable.test.js`

- [ ] Tests: Hoy primero con caja y atajos (un atajo carga su texto); "Preguntando sobre" / "Consulta general"; la consulta viaja con `session_id` y `current_exercise_id`; día anterior en solo lectura con `ContextChip`; "Ver días anteriores" pide `before`; vacío; `Select` "Día" debajo de `lg`; Aplicar desde la página.
- [ ] Commit `feat(student): página Asistente IA`.

### Task 7: Docs y revisión

- [ ] `contratos-api.md` §Chat, `modelo-de-datos.md` §chat_messages, `auditoria-seguridad.md` (fila de la ruta).
- [ ] `wc -l` de todo lo tocado, suites completas, lint y build. Commit `docs(chat): contrato e historial del asistente`.
