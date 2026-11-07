# Chat IA del alumno: backend, workflow `student-ia` y panel en la web (tarjeta 13)

MIS 13 · equipo [HQlSV6vC](https://trello.com/c/HQlSV6vC). La rama sale de `feature/trainer-ai` (PR #83) para reusar el cliente de n8n, el secreto del webhook y los errores de IA.

## Decisiones (grilling 07/11 con Pablo)

| # | Pregunta | Decisión |
|---|---|---|
| Q1 | ¿Hay UI? | Sí: un **panel "Asistente" en la sesión activa de la web**, con el ejercicio actual como contexto. La del celular la arma Igna con el mismo endpoint. La pantalla A4 de la Guía (historial y atajos) queda afuera. |
| Q2 | ¿Límite de mensajes? | **20 mensajes del alumno por día** (día de Argentina). La sesión se guarda en el servidor recién al terminar (offline-first), así que el chat **no depende** de que exista: si `session_id` ya está en la base se guarda con el mensaje, y si no, el mensaje queda sin sesión (`chat_messages.session_id` admite null). |
| Q3 | ¿`suggestions[]`? | **Solo informativas:** hasta 3 ejercicios alternativos **de la biblioteca** (validados, nunca inventados) con el porqué, que se muestran como chips. Reemplazar el ejercicio en la sesión queda afuera. |
| Q4 | ¿Memoria? | Se le mandan al LLM los **últimos 6 mensajes del día** del alumno, para que entienda repreguntas como "¿y otra opción?". |
| — | n8n y KIMI | Igual que en la 15: los levanta Igna. Esta tarjeta deja el backend, el workflow exportado y la web probados con n8n simulado. |

## `POST /api/chat` (rol alumno)

**Body:** `{ "message": "string (1-500)", "session_id": "uuid (opcional)", "current_exercise_id": "uuid (opcional)" }`. `context.gym_equipment` del contrato viejo se ignora: el equipamiento sale de la ficha del alumno, que lo carga el PT.

- Si viene `session_id` y la sesión existe: tiene que ser del alumno (si no, 404 `SESSION_NOT_FOUND`) y no puede estar terminada (400 `SESSION_FINISHED`). Si no existe, se acepta y el mensaje se guarda sin sesión.
- `current_exercise_id`, si viene, tiene que ser un ejercicio accesible para el alumno (global o de su PT). Si no lo es, se ignora sin error: el chat no se corta por eso.
- **Límite:** 20 mensajes del alumno por día de Argentina, contados en `chat_messages` (`role = 'user'`). Al pasarse → **429 `CHAT_LIMIT_REACHED`** ("Llegaste al límite de consultas de hoy. Mañana podés seguir.").

**Contexto que se manda a n8n** (`N8N_STUDENT_AI_WEBHOOK_URL` con `x-webhook-secret`), **sin datos personales** (RNF-26):
- `message`;
- `exercise`: `{ name, muscle_group, equipment }` del ejercicio actual, o `null`;
- `student`: `{ goal, level, gym_equipment, injuries }` (sin nombre, email ni fecha de nacimiento);
- `alternatives`: hasta 30 ejercicios accesibles del mismo grupo muscular (o de todos, si no hay ejercicio actual) cuyo equipamiento esté en el `gym_equipment` del alumno o sea `bodyweight`, como `{ id, name, muscle_group, equipment }`;
- `history`: los últimos 6 mensajes del día, en orden, como `{ role, content }`.

**Timeout de 10 s** (RNF-04), con `AbortSignal.timeout`. Si falta la URL o el secreto, si se corta o si n8n responde algo que no es 2xx → **503 `AI_UNAVAILABLE`** ("El asistente no está disponible ahora. Seguí con tu entrenamiento."). La sesión no se toca nunca.

**Respuesta esperada de n8n:** `{ "response": "texto (1-1500)", "suggestions": [ { "exercise_id": "uuid", "reason": "texto (1-200)" } ] }`. Se valida: `response` obligatorio; `suggestions` de 0 a 3 y solo con ids de `alternatives`; las que no cumplen **se descartan, sin rechazar la respuesta**; un `response` inválido o `{ "error": … }` → **502 `AI_INVALID_RESPONSE`**.

**Guardado:** solo cuando la respuesta es válida, en una inserción: el mensaje del alumno (`role = 'user'`) y la respuesta (`role = 'assistant'`). Las fallas no se guardan y **no cuentan** para el límite.

**200 OK:** `{ "data": { "message_id": "uuid (el de la respuesta)", "response": "…", "suggestions": [ { "exercise_id", "name", "reason" } ], "remaining_today": 17 } }`.

## `GET /api/chat/today` (rol alumno)

Los mensajes del día del alumno en orden, más `remaining_today`, para que el panel recupere la conversación después de recargar: `{ "data": { "messages": [ { "id", "role", "content", "created_at" } ], "remaining_today": 17 } }`.

## Workflow `n8n/workflows/student-ia.json`

Igual que `trainer-ia`: Webhook (Header Auth, credencial "FitTrainer webhook") → Code (prompt) → HTTP Request a KIMI (credencial "KIMI", timeout de 8 s para quedar debajo de los 10 del backend, `json_object`) → Code (parseo) → Respond to Webhook.

**Prompt de sistema** (en español rioplatense neutro):
- Es el asistente de entrenamiento del alumno durante la sesión. Respuestas cortas y prácticas: hasta 3 párrafos breves.
- **Nada de consejos médicos.** Ante dolor, molestia o lesión, la respuesta es parar el ejercicio y consultar al entrenador o a un profesional de la salud. Las lesiones del alumno son restricciones.
- Para reemplazos, solo puede sugerir ejercicios de `alternatives`, por id, respetando el equipamiento.
- Fuera de tema (cualquier cosa que no sea entrenamiento): lo dice amablemente y vuelve al entrenamiento.
- La salida es solo el JSON con el esquema exacto.

El README de `n8n/` suma este workflow.

## Panel en la web (sesión activa del alumno)

- **Botón "Asistente"** en la cabecera de la sesión activa. Abre un panel lateral (en pantalla chica, una hoja inferior) que **no tapa ni frena** el registro de series ni el temporizador.
- **Conversación del día** (`GET /chat/today`): burbujas del alumno y del asistente, como en Mensajes. Las sugerencias del asistente van como chips con el nombre del ejercicio y el porqué al tocarlos (solo informativas).
- **Contexto visible:** "Preguntando sobre: Press banca plano" (el ejercicio actual de la sesión).
- **Atajos** que cargan el texto en la caja: "¿Con qué lo reemplazo?", "¿Cómo es la técnica?", "Está ocupada la máquina".
- **Contador:** "Te quedan 17 consultas hoy". En 0, la caja se deshabilita con el mensaje del límite.
- **Espera:** "Pensando…", con un tope visual de 10 s.
- **Error 503:** "El asistente no está disponible ahora. Seguí con tu entrenamiento." con Reintentar. El mensaje del alumno queda en la caja, no se pierde.
- **Sin conexión** (`navigator.onLine` falso o error de red): "El asistente necesita conexión" y la caja deshabilitada (AL-10). El resto de la sesión sigue funcionando offline como siempre.
- Archivos: `api/chat/`, `hooks/chat/`, `components/chat/` (o bajo `components/workout/` si encaja mejor con CONTRIBUTING), con tests espejo.

## Código del backend

`routes/chat/`, `controllers/chat/`, `validations/chat/`, `services/chat/` (contexto, envío, validación de la respuesta), `repositories/chat/`. El cliente de n8n de la 15 se generaliza (URL por parámetro) en vez de duplicarse. Errores nuevos: `chatLimitReached` (429) y `sessionFinished` (400) si no existen. `env.js` y `.env.example`: `N8N_STUDENT_AI_WEBHOOK_URL`. Docs: `contratos-api.md` (el módulo con esta forma; `OFFLINE_MODE` sale, porque eso lo resuelve el cliente), `setup-tecnico.md` y `plan-de-pruebas.md` (UT-15, IT-19, IT-21 e IT-22, y casos nuevos).

## Pruebas

- **Unitarias (backend):** validación del body; sesión ajena, terminada o inexistente; ejercicio inaccesible ignorado; contexto sin PII y con las alternativas filtradas por equipamiento; historial de 6; timeout, 5xx y falta de configuración → 503; validación de la respuesta (sugerencias inventadas descartadas; `response` vacío → 502); límite de 20 por día de Argentina (con el borde de medianoche); guardado solo si sale bien.
- **Integración** contra Supabase dev, con n8n simulado por un servidor local (con los helpers de la #76, como la 15): enviar → se guarda el par → `GET /chat/today` lo devuelve → el aislamiento entre alumnos.
- **Web (Vitest):** abrir y cerrar el panel sin afectar la sesión; conversación del día; atajos; sugerencias; contador y límite; 503 con Reintentar y el texto preservado; sin conexión.
- **En el navegador**, con n8n simulado: durante una sesión, "¿con qué reemplazo el press de banca?" devuelve una alternativa con el equipamiento del alumno; con n8n apagado, el mensaje amable aparece en menos de 10 s y la sesión sigue (registrar una serie después). Capturas en `docs/superpowers/specs/assets/13/`.

## Fuera de alcance

La pantalla A4 con historial completo; aplicar una sugerencia a la sesión; el chat en el celular (Igna); la prueba con KIMI real (Igna).
