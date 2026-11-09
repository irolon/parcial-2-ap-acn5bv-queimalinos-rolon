# Tarjeta 14 · Chat IA del alumno en el celular — diseño

Tablero *MIS TAREAS*, tarjeta 14 ("Chat IA del alumno en mobile", https://trello.com/c/gb7eWLGt). Rama `feature/android-chat-ia`, worktree `fittrainer-chat-ia`, apilada sobre `feature/ai-rag-nvidia` (PR #90, que a su vez va sobre la #83 de Pablo): ahí está el backend del chat. La PR va contra `feature/ai-rag-nvidia` y pasa a `develop` cuando entre la #90. Room pasa a la **v25**.

Contrato del backend (rama de la #90, `backend/src/routes/chat/`), spec de Pablo `2026-11-07-student-ai-chat-design.md`:

- `POST /chat` (solo alumno) con `{ message (1-500), session_id?, current_exercise_id? }` → `{ data: { message_id, response, suggestions: [{ exercise_id, name, reason }] (hasta 3, siempre de la biblioteca), remaining_today } }`.
- `GET /chat/today` → `{ data: { messages: [{ id, role, content, created_at }], remaining_today } }` (sin sugerencias).
- Errores: 429 `CHAT_LIMIT_REACHED` (20 por día de Argentina), 429 `CHAT_IN_PROGRESS` (una consulta a la vez), 429 `RATE_LIMIT_EXCEEDED` con `Retry-After` (30 intentos por hora), 503 `AI_UNAVAILABLE`, 502 `AI_INVALID_RESPONSE`, 400 `SESSION_FINISHED`, 404 si la sesión es de otro. Un `session_id` que el servidor no conoce se ignora. El backend corta a n8n a los 16 s.

## Objetivo y criterio de aceptación

El alumno, en medio de la sesión, abre el asistente, pregunta con un acceso rápido y vuelve a la serie sin perder nada.

**Criterio (de la tarjeta):**
- Durante una sesión, el alumno toca el botón de IA, usa un acceso rápido, recibe la respuesta y vuelve a la serie sin perder el estado.
- En modo avión el botón está deshabilitado con la explicación.

## Decisiones

Debatidas con Igna el 09/11.

| # | Decisión |
|---|---|
| 1 | **Sugerencias accionables.** Cada sugerencia es una tarjeta (nombre, motivo y botón «Reemplazar»). Al tocarlo se reemplaza el ejercicio actual con el mismo camino que el reemplazo manual (`WorkoutViewModel.onReplace`), se cierra la hoja y se muestra el aviso de siempre. Sin carga sugerida: el backend no la devuelve. |
| 2 | **Accesos rápidos.** «¿Con qué lo reemplazo?» y «¿Cómo se hace?» se envían al tocarlos. «Me duele…» no se envía: completa la caja con «Me duele ___ al hacer <ejercicio>» y deja el cursor en el hueco. |
| 3 | **Voz.** Botón de micrófono en la caja que abre el dictado del sistema (`RecognizerIntent`, sin permiso de micrófono). El texto dictado queda en la caja; no se envía solo. Si el celular no tiene reconocedor, el botón no aparece. |
| 4 | **Entrada.** Un tercer botón «✦ IA» en `BottomActions`, junto a «Técnica» y «Reemplazar», con toque mínimo de 44 px. El chat existe **solo dentro de la sesión activa**. |
| 5 | **Solo con red** (como la mensajería, excepción de AGENTS.md): `POST /chat` no acepta un id del cliente y cada reintento gasta cupo y una llamada a KIMI. Sin cola ni reintento automático. Sin red, el botón «✦ IA» se ve apagado pero se puede tocar y explica: «Necesitás conexión para usar el asistente. Tu sesión sigue guardándose sin red.» |
| 6 | **Timeout del cliente: 20 s** (la tarjeta decía 10 s; el backend corta a los 16 s desde el 09/11, decisión de Igna). Al pasarse: «El asistente tardó demasiado. Seguí con tu entrenamiento y probá de nuevo.» |
| 7 | **Room es la fuente de verdad.** La conversación del día vive en Room (v25); la hoja lee de ahí y la refresca con `GET /chat/today` al abrirse. Sin red se ve lo que ya se preguntó hoy. |

## Datos

- **API** — `data/api/chat/AiChatApi.kt` y `AiChatDtos.kt`: `POST chat` y `GET chat/today`. Usa su propio `OkHttpClient` (derivado del autenticado, mismo `AuthInterceptor` y `TokenAuthenticator`) con `readTimeout` de 20 s; el resto de la app sigue con `API_TIMEOUT_SECONDS`. `session_id` y `current_exercise_id` se omiten cuando son null.
- **Room v25** (`AutoMigration(24, 25)` y `schemas/.../25.json`) — `data/db/aichat/`:
  - `ai_chat_messages`: `id` (el del servidor, PK), `owner_id`, `role` (`user` | `assistant`), `content`, `created_at` (instante UTC), `suggestions_json` (null salvo en respuestas con sugerencias). Índice por `(owner_id, created_at)`.
  - `AiChatDao`: observar los mensajes de un dueño entre dos instantes, reemplazar los del día (transacción) e insertar el par de un envío. Se borra en el logout con el resto de las cachés (`CacheCleanersModule`).
  - La respuesta se guarda con su id real (`message_id` del `POST`). La pregunta del alumno no trae id del servidor: se guarda con un id local `local-<uuid>` hasta que el próximo `refresh` reemplaza el día con los ids reales.
- **Repositorio** — `data/aichat/AiChatRepository.kt`, sin nada de UI:
  - `observeToday(ownerId)`: `Flow` de los mensajes del día de Argentina (mismos límites que el backend).
  - `refresh(ownerId)`: `GET /chat/today`, reemplaza el día en Room y devuelve `remaining_today`. Como el endpoint no trae sugerencias, se conservan las que ya estaban en Room para las respuestas que siguen, por id.
  - `send(ownerId, message, sessionId, exerciseId)`: un solo `POST`. Si sale bien, inserta pregunta y respuesta (con sus sugerencias) y devuelve `remaining_today`. Ante 400 `SESSION_FINISHED` reintenta **una vez** sin `session_id` (ese error sale antes de n8n: no gasta cupo). Nada se guarda si falla.
  - Errores → `AiChatError`: `Offline`, `Timeout`, `DailyLimit`, `InProgress`, `TooManyAttempts(retryAfterSeconds)`, `Unavailable(message)` (502/503, con el mensaje del backend) y `Unknown`.
- **DI** — `di/aichat/AiChatModule.kt`.

## Pantalla

- **Botón «✦ IA»** en `BottomActions` (`ui/workout/components/`), habilitado según `ConnectivityObserver` (decisión 5).
- **Hoja** `AiChatSheet` (ModalBottomSheet casi a pantalla completa) en `ui/workout/aichat/`, abierta desde `WorkoutScreen`. La sesión no se toca: timer, cursor y series siguen en `WorkoutViewModel`, y al cerrar la hoja el alumno está en la misma serie.
  - **Cabecera:** «Asistente IA · <ejercicio actual>» y, si quedan 5 o menos, «Te quedan N consultas hoy».
  - **Lista:** los mensajes del día, más viejos arriba (IA a la izquierda, alumno a la derecha), con scroll al último. Bajo cada respuesta, sus tarjetas de sugerencia. Vacía: una línea que explica qué se puede preguntar.
  - **Chips** (decisión 2), sobre la caja.
  - **Caja:** hasta 500 caracteres, micrófono (decisión 3) y Enviar.
  - **Mientras espera:** burbuja «Pensando…» con tres puntos; caja, chips y Enviar deshabilitados (un segundo envío no sale).
  - **Si falla:** mensaje del error arriba de la caja y el texto queda en la caja para reintentar a mano.
  - **Sin red con la hoja abierta:** se ve la conversación; caja y chips apagados con el aviso de la decisión 5.
  - **Tope del día:** caja y chips apagados con «Llegaste al límite de consultas de hoy. Mañana podés seguir.»
- **«Reemplazar» de una sugerencia:** busca el ejercicio por id en la biblioteca de Room; si no está (el alumno nunca abrió la biblioteca o está vieja), la refresca una vez y vuelve a buscar. Queda apagado, con el motivo, si `workout.canReplace(cursor)` es falso o el ejercicio no aparece.
- **`AiChatViewModel`** (Hilt, uno por hoja): lee de Room, llama a `refresh` al abrirse y a `send`; no conoce Retrofit. Recibe de la sesión el `session_id`, el ejercicio actual y si se puede reemplazar. Los textos van en `AiChatTexts.kt`.

## Pruebas

- **Unitarias** (`testDebugUnitTest`, mismo árbol que el código):
  - Repositorio: envío exitoso guarda el par; cada código HTTP → su `AiChatError`; timeout; `SESSION_FINISHED` reintenta una sola vez sin `session_id`; `refresh` reemplaza el día y conserva sugerencias.
  - ViewModel: chips que envían y chip que completa la caja; «Pensando…» y bloqueo del segundo envío; el texto se conserva si falla; tope del día; sin red la caja se apaga; «Reemplazar» apagado cuando corresponde.
  - Migración de Room 24 → 25.
- `gradlew checkFileLength assembleDebug testDebugUnitTest`.
- **Manual en el emulador**, con backend y n8n de `fittrainer-ia-rag`: el criterio completo (sesión → «✦ IA» → chip → respuesta → «Reemplazar» → misma serie con el timer intacto); modo avión; corte a los 20 s con n8n frenado; tope del día.

## Fuera de alcance

Carga sugerida en el reemplazo, chat IA fuera de la sesión, envíos offline o en cola, cambios en el backend. Estimación: 12-14 h.
