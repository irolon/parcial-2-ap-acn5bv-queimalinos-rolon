# GX5 · Asistente IA del alumno en la web (A4) — diseño

Ticket 5 de 9 del lote GX. Una PR (backend + web) y una tarjeta para Igna. Rama sugerida: `feature/student-ai-assistant`. **Depende de la #85 y de la #90** (ver "Rama y orden").

## Contexto

Guía Web, pantalla **A4 · Asistente IA** (`guia-web-hifi.jsx`), "con el historial navegable que en el teléfono no cabe":

1. **Consultas guardadas**: el alumno recupera lo que ya preguntó.
2. **Contexto de sesión explícito**: sobre qué rutina y ejercicio está consultando.
3. **Respuestas accionables**: las alternativas llegan como opciones aplicables.
4. **Consultas frecuentes precargadas**: atajos.

Referencia visual: `AW_Chat` en `alumno-web-2.jsx`: a la izquierda "CONSULTAS GUARDADAS" (título y antigüedad) y "Nueva consulta"; en el centro un chip "CONTEXTO · PUSH DÍA 3 · PRESS BANCA" y las alternativas con "Usar"; abajo, los atajos y la caja.

La #85 (tarjeta 13) dejó `POST /chat`, `GET /chat/today` y el panel "Asistente" dentro de la sesión activa (`AssistantPanel`); su spec dejó afuera, a propósito, la A4 y "aplicar una sugerencia". Además, **las sugerencias no se guardan** (al recargar, las respuestas pierden sus chips; `keepSuggestions` en `utils/chat/chatDay.js` lo emparcha en la caché), `chat_messages` no guarda sobre qué ejercicio se preguntó y no hay historial más allá de hoy.

La web no tiene sustitución de ejercicio: `setBody` manda `original_exercise_id: null` ("sin sustitución en la web"). El celular sí la tiene (`WorkoutRepository.replaceExercise`, que exige `canReplace`: sin series hechas), y el backend la acepta: valida `original_exercise_id`, marca `has_modifications` y avisa al PT (`onSessionModified`).

## Decisiones

| # | Decisión |
|---|---|
| 1 | **Aplicar** reemplaza el ejercicio **solo en la sesión de hoy**, como el `replaceExercise` del celular: la rutina del PT no se toca. Se puede si el ejercicio no tiene series registradas. Las series nuevas viajan con `exercise_id` = la alternativa y `original_exercise_id` = el planificado. Se mantienen series, reps y descanso del plan; la carga sugerida queda vacía. |
| 2 | Se guarda lo que hoy se pierde: `chat_messages.suggestions` (jsonb, en la respuesta) y `chat_messages.exercise_id` (en la consulta, el ejercicio actual si era accesible). Es una migración aditiva. `GET /chat/today` empieza a devolverlos y `keepSuggestions` queda como respaldo. |
| 3 | **Historial por día**: `GET /chat/history?before=YYYY-MM-DD&days=7` trae días completos (día argentino) anteriores a `before`, paginados por cursor de fecha. Hoy sigue saliendo de `GET /chat/today`, que trae el contador. |
| 4 | **Contexto** de cada consulta: la rutina (vía `session_id` → `sessions.routine_id`) y el ejercicio (`exercise_id`). Con la GX4, la sesión existe desde el inicio y la rutina aparece; sin la GX4 suele quedar solo el ejercicio. La serie no se guarda. |
| 5 | Página **"Asistente IA"** en el menú del alumno (`/alumno/asistente`, ícono `Sparkles`), después de Historial, como en `AlSidebar`. |
| 6 | Los días anteriores son **de solo lectura** (sin caja). Solo se aplican sugerencias **de hoy** y solo si hay una sesión en curso **en esta web** que tenga ese ejercicio. |
| 7 | **"Aplicar" vive en `SuggestionChips`**, compartido: funciona igual en el panel de la sesión (#85) y en la página. |
| 7b | **"Aplicar" solo en la sugerencia del ejercicio actual** (09/11, de la review de la #96 del celular): cada respuesta guarda el `exercise_id` con que se preguntó, y "Aplicar" se habilita solo si coincide con el ejercicio actual de la sesión en curso. Las sugerencias de otros ejercicios, de otra sesión o de días pasados se muestran como texto. Test: sugerencia pedida en el ejercicio A con el cursor en B → no se puede aplicar. |
| 8 | **Rama y orden:** la rama sale de `develop` cuando entren #83, #85 y #90 (la cadena del chat). Si al empezar siguen abiertas, sale de `feature/ai-rag-nvidia` y la PR apunta ahí: es apilada, la excepción de CONTRIBUTING. Al mergear la #90 se re-apunta a `develop`. No sale de la #85 sola porque la #90 reescribe `chat.service.js`, `chat-message.model.js` y `context.service.js`, que esta PR también toca. Conviene que entre después de la GX4 (ver Chequeo). |

## Diseño

**Página `AssistantPage`** (`lg`: dos columnas, 260 px + conversación).

- **Columna "Consultas guardadas"** (`ChatDayList`):
  - "Nueva consulta" (primario) selecciona Hoy y enfoca la caja.
  - Debajo, Hoy primero y después los días del historial. Cada día muestra la primera consulta (`truncate`, `title` entero) y en mono "HOY", "AYER" o "05/11".
  - El seleccionado lleva el borde de acento del prototipo.
  - Al pie, "Ver días anteriores" si hay `next_before`.
  - Vacío: "Todavía no le preguntaste nada al asistente."
  - Debajo de `lg` la columna pasa a un `Select` "Día" sobre la conversación.
- **Conversación** (`ChatDayView`): `ChatLog` de la #85. Antes de cada consulta con contexto va un `ContextChip` centrado, "CONTEXTO · PUSH · PRESS BANCA" (lo que haya), como en el prototipo.
- **Hoy**:
  - Abajo, `ChatComposer` con los atajos del prototipo: "¿Cuánto debería subir?", "Técnica correcta", "Calentamiento", "Estiramiento post". La prop nueva `shortcuts`; el panel sigue con los suyos.
  - Arriba de la caja, de qué se va a preguntar:
    - con sesión en curso en esta web: "Preguntando sobre: Press banca (Push)", el ejercicio a la vista;
    - si no: "Consulta general: no tenés una sesión en curso".
  - La consulta viaja con `sessionId` y `exerciseId` de esa sesión.
  - Límite, sin conexión, 503 y 429: los avisos de la #85 (`noticeFor`, `chatProblem`).
- **Días anteriores**: la conversación sola y una línea "Las consultas de días anteriores son de solo lectura." Se cargan con "Ver días anteriores" (`useInfiniteQuery`).

**Aplicar** (`ApplySuggestion`, dentro de `SuggestionChips`, debajo del porqué del chip abierto). `useApplySuggestion(message)` lo muestra si el mensaje es de hoy, hay `workout` en curso (`useActiveWorkout`) sin terminar, `message.exercise_id` coincide con un ejercicio de la sesión (`exerciseId` u `originalExerciseId`) y la sugerencia no es ese mismo ejercicio. Estados:

- **Se puede**: botón ghost "Aplicar a la sesión de hoy" (ícono `Repeat`). Al tocarlo, `replace(index, { id, name })` y el texto "Listo: hoy hacés Press inclinado en lugar de Press banca."
- **El ejercicio ya tiene series**: texto "Ya registraste series de Press banca: no se puede cambiar." sin botón.
- **Sin sesión en curso**: nada; el chip queda informativo como hoy.

**Sesión web.** Lo nuevo en el estado y la subida:

- `replaceExercise(state, index, { id, name })` en `workoutState/workoutSwap.js`. Si el ejercicio no tiene series, `exerciseId` pasa a la alternativa, `originalExerciseId` queda con el planificado (o `null` si se vuelve al original, como `original.takeIf { it != replacement.id }` del celular), `name` cambia, `originalName` guarda el del plan y `suggestedKg` y `lastKg` quedan en `null`. Con series, devuelve el mismo estado.
- `registerSet` copia `originalExerciseId` a la serie y `setBody` lo manda como `original_exercise_id`.
- `ExercisePanel` muestra debajo del nombre, en mono, "EN LUGAR DE PRESS BANCA" si hay `originalName`.

## Datos

- **Migración `backend/src/database/migrations/2026-11/2026-11-09-chat-history.sql`** (lo mismo en el bloque de `chat_messages` de `schema/06-ai-and-agenda.sql`): `exercise_id uuid references exercises (id) on delete set null` y `suggestions jsonb not null default '[]'`. Sin índice nuevo: `idx_chat_messages_student (student_id, created_at)` alcanza. Se actualiza `modelo-de-datos.md` (§chat_messages).
- **Guardado** (`exchangeRows`): la consulta lleva `exercise_id` (el `findCurrentExercise`, o `null`); la respuesta lleva `suggestions: [{ exercise_id, name, reason }]` ya validadas.
- **`GET /chat/today`** (aditivo): cada mensaje suma `exercise: { id, name } | null`, `routine_name` y `suggestions` (`[]` en las del alumno).
- **Nuevo `GET /chat/history`** (rol `student`). Query: `before` (`YYYY-MM-DD`, opcional; por defecto hoy, que queda afuera) y `days` (1–14, por defecto 7). Lee los mensajes con `created_at` anterior al inicio de `before` (hora argentina), de los más nuevos a los más viejos, con tope `days × CHAT_DAILY_LIMIT × 2`; agrupa por día argentino y descarta el más viejo si pudo quedar cortado por el tope.
  **200**: `{ data: { days: [{ date, messages: [mensaje como en today] }], next_before } }` (días del más nuevo al más viejo, mensajes en orden; `next_before` = el día más viejo devuelto, o `null` si no hay más). **Errores:** 400 `VALIDATION_ERROR`.
- **`contratos-api.md`**: §Chat (`GET /chat/today` y el endpoint nuevo).

## Archivos que toca

Las líneas de los archivos de la #85 y la #90 se miden en `feature/ai-rag-nvidia`.

**Backend**

- Crea:
  - `models/chat/chat-history.js` (`groupByDay(rows, days, limitPerDay)`);
  - `services/chat/history.service.js` (`getHistory`);
  - `database/migrations/2026-11/2026-11-09-chat-history.sql`;
  - tests en `tests/unit/`: `models/chat/chat-history.test.js`, `services/chat/history.service.test.js` y `validations/chat/chat.validation/history.test.js`.
- Modifica:
  - `models/chat/chat-message.model.js` (47: columnas con embebidos y `HISTORY_DAYS_MAX`);
  - `repositories/chat/chat-messages.repository.js` (26: `findMessagesBefore`);
  - `services/chat/chat.service.js` (98: `exchangeRows` y `getToday`);
  - `validations/chat/chat.validation.js` (24: `validateHistoryQuery`);
  - `controllers/chat/chat.controller.js` (12);
  - `routes/chat/chat.routes.js` (16);
  - `database/schema/06-ai-and-agenda.sql`;
  - tests: `chat.service/send.test.js`, `limit-and-today.test.js`, `chat-messages.repository.test.js` y `chat.routes.test.js`.

**Web**

- Crea:
  - `frontend/src/pages/student/AssistantPage.jsx`;
  - en `frontend/src/components/chat/history/`: `ChatDayList.jsx`, `ChatDayView.jsx`, `ContextChip.jsx`;
  - `frontend/src/components/chat/ApplySuggestion.jsx`. `components/chat` queda con 8 archivos y la subcarpeta;
  - en `frontend/src/hooks/chat/`: `useChatHistory.js` y `useApplySuggestion.js`;
  - `frontend/src/utils/chat/chatHistory.js` (`dayLabel`, `dayTitle`, `contextLabel`, `canApply`);
  - `frontend/src/utils/workout/workoutState/workoutSwap.js`.
- Modifica:
  - `api/chat/chat.api.js` (39: `getChatHistory`);
  - `utils/chat/chatDay.js` (44: `appendExchange` guarda `exercise_id`);
  - `components/chat/SuggestionChips.jsx` (45) y `ChatBubble.jsx` (22: le pasa el mensaje);
  - `components/chat/ChatComposer.jsx` (72: prop `shortcuts`);
  - `components/chat/AssistantPanel.jsx` (137: +1, pasa el contexto de hoy);
  - `utils/workout/workoutState/workoutState.js` (172 → 174: re-export y `originalExerciseId` en `registerSet`);
  - `utils/workout/uploadPayload.js` (97);
  - `hooks/workout/useActiveWorkout.js` (116, más lo de la GX4: `replace`);
  - `components/workout/session/ExercisePanel.jsx` (144);
  - `routes/routeTable.js` (90) y `routes/router.jsx` (112).
- Tests (crea):
  - `frontend/tests/utils/workout/workoutState/swap.test.js`;
  - `frontend/tests/utils/chat/chatHistory.test.js`;
  - `frontend/tests/hooks/chat/useApplySuggestion.test.jsx`;
  - `frontend/tests/components/chat/AssistantPanel/apply.test.jsx`;
  - en `frontend/tests/pages/student/AssistantPage/`: `history.test.jsx`, `today.test.jsx` y `apply.test.jsx`.
- Tests (modifica):
  - `frontend/tests/utils/workout/uploadPayload.test.js`;
  - `frontend/tests/helpers/chat/chat.jsx` (history y los campos nuevos);
  - `frontend/tests/routes/routeTable.test.js`.

**Chequeo contra PRs abiertas.**

- **#85 y #90**: casi todo `chat` es de ellas (ver decisión 8). La #90 cambia `chat.service.js`, `chat-message.model.js`, `context.service.js`, `chat-context.repository.js`, `send.test.js` y `chat-service.setup.js`. Partiendo de su rama no hay conflicto.
- **#83**: toca `schema/06-ai-and-agenda.sql` (bloque `ai_routine_generations`); el de `chat_messages` es otro bloque. También toca `contratos-api.md`, como la #85 y la #90 en §Chat: se edita sobre la versión de la #90.
- **#84**: `routeTable.js` y `router.jsx`, pero en el bloque del PT (`AI_ROUTINE`). Esta PR toca `STUDENT_NAV` y el mapa del alumno: merge automático esperado.
- **GX4**: también toca `useActiveWorkout.js`, en otras funciones. Si entra antes, se mergea `develop`.
- **GX6**: también suma una ruta del alumno en los mismos archivos. Es un conflicto trivial: lo resuelve la segunda en entrar.
- **#76 y #92**: si la #92 entra antes, suma la fila de `GET /chat/history` a `auditoria-seguridad.md`.

## Pruebas

**Jest (backend)**

- `groupByDay`: días argentinos (un mensaje 23:59 AR va a ese día), orden, descarte del día cortado por el tope y `next_before`.
- `getHistory`: `before` por defecto excluye hoy; `days` 1–14; aislamiento: solo los del alumno.
- `validateHistoryQuery`: fecha inválida, `days` 0 o 15 → 400.
- `sendMessage` guarda `exercise_id` (y `null` si el ejercicio no era accesible) y `suggestions` validadas.
- `getToday` devuelve `exercise`, `routine_name` y `suggestions`.

**Vitest (web)**

- `replaceExercise`: cambia id y nombre y guarda el original; volver al original deja `originalExerciseId` en `null`; con series no cambia nada; las series nuevas llevan `originalExerciseId`. `setBody` manda `original_exercise_id`.
- `canApply`: hoy y no ayer; ejercicio presente y sin series; la misma sugerencia que el ejercicio no se aplica.
- **Página**: Hoy primero, con caja y atajos (un atajo carga su texto); un día anterior en solo lectura con su `ContextChip`; "Ver días anteriores" pide `before`; el vacío; el `Select` en 375 px.
- **Aplicar** desde la página y desde el panel: cambia el nombre en la sesión y muestra "Listo…". Con series, el texto de bloqueo. Sin sesión en curso, sin botón.

**Navegador**, con n8n simulado (como la #85): una sesión en curso; en el panel, "¿con qué reemplazo el press banca?" → Aplicar → el panel de la sesión dice "EN LUGAR DE PRESS BANCA". Después: registrar una serie y terminar (el detalle del historial muestra la sustitución y al PT le llega el aviso); recargar (los chips siguen); en `/alumno/asistente`, el día de ayer (seed de QA) en solo lectura.

Capturas en `docs/superpowers/specs/assets/gx5/`: `01-asistente-hoy.jpg`, `02-dia-anterior.jpg`, `03-aplicar-panel.jpg`, `04-sesion-reemplazo.jpg`, `05-angosto-375.jpg`.

## Criterio de aceptación

- El alumno ve sus consultas por día, con el contexto de cada una, y pregunta desde la página con atajos.
- Las sugerencias sobreviven a una recarga.
- Durante una sesión web, "Aplicar" reemplaza el ejercicio solo en esa sesión. La rutina del PT no cambia; el historial muestra el reemplazo y el PT recibe el aviso de sustitución.
- Contrato y modelo actualizados. Lint y tests en verde, y ningún archivo pasa de 200 líneas.

## Estimación

**15 h**: migración, guardado y `GET /chat/history` 3 h, tests de backend 1,5 h, docs 0,5 h, sustitución en la sesión web 1,5 h, Aplicar (hook y componente) 1,5 h, página (lista, día, contexto, atajos, angosto) 3,5 h, tests de la web 2,5 h, navegador y capturas 1 h.

## Fuera de alcance

- La carga equivalente ("22,5 kg × 10" del prototipo): n8n no la devuelve. Haría falta cambiar el workflow.
- Deshacer un reemplazo con un botón propio (se puede aplicar el original desde otra sugerencia).
- Reemplazar sin la IA (un buscador de la biblioteca en la sesión web).
- Guardar la serie en el contexto. Buscar dentro del historial.
- Aplicar sobre una sesión del celular desde la web.

## Tarjetas para el celular (Igna)

1. **Asistente en la sesión del celular** (si no hay ya una tarjeta del chat mobile): panel con `POST /chat` y `GET /chat/today` (que ahora trae `suggestions` y `exercise`), como el de la web. Cada sugerencia de hoy lleva "Aplicar", que llama al `WorkoutRepository.replaceExercise` que ya existe (respeta `canReplace`).
2. **Historial del asistente** (opcional en el celular, la Guía lo pone en la web): lista por día con `GET /chat/history?before&days`.
