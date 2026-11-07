# n8n · workflows de IA

| Workflow | Tarjeta | Archivo | Variable del backend |
|---|---|---|---|
| `trainer-ia` | 15 (asistente del entrenador) | `n8n/workflows/trainer-ia.json` | `N8N_TRAINER_AI_WEBHOOK_URL` |
| `student-ia` | 13 (chat del alumno) | `n8n/workflows/student-ia.json` | `N8N_STUDENT_AI_WEBHOOK_URL` |

Los dos usan **las mismas dos credenciales** (`FitTrainer webhook` y `KIMI`) y el mismo `N8N_WEBHOOK_SECRET`. El de `student-ia` está [más abajo](#workflow-student-ia).

## Workflow `trainer-ia`

Workflow del asistente IA del entrenador (tarjeta 15). El backend (`POST /api/trainer-ai/generate-routine`) le manda a n8n el contexto **sin datos personales** (parámetros, biblioteca de ejercicios, plantillas recientes y plantilla base); n8n arma el prompt, le pide a KIMI (Moonshot) una propuesta en JSON y la devuelve. El backend la valida contra el esquema y la biblioteca antes de guardarla. Spec: `docs/superpowers/specs/2026-11-06-trainer-ai-design.md`.

Archivo: `n8n/workflows/trainer-ia.json`.

### Nodos

1. **Webhook trainer-ia**: `POST /webhook/trainer-ia`, autenticado con la credencial *Header Auth* `FitTrainer webhook` (header `x-webhook-secret`). Responde desde un nodo *Respond to Webhook*.
2. **Armar prompt** (Code): prompt de sistema en español (rol, seguridad, solo ids de la biblioteca, 1 a 7 bloques, días sin repetir, total de días = `frequency_per_week`, esquema de salida) y prompt de usuario con el contexto. Acá están el **modelo** y la temperatura.
3. **KIMI chat completions** (HTTP Request): `POST https://api.moonshot.ai/v1/chat/completions` con la credencial `KIMI`, `response_format: { type: "json_object" }`, temperatura 0.3 y timeout de **25 s** (el backend corta a los 30 s).
4. **Parsear JSON** (Code): toma `choices[0].message.content`, saca los ```` ``` ```` si vienen y hace `JSON.parse`.
5. **Responder propuesta** / **Responder error KIMI** (Respond to Webhook).

### Qué recibe el backend

| Caso | Respuesta de n8n | Qué hace el backend |
|---|---|---|
| Todo bien | 200 con `{ "routines": [...], "rationale": "..." }` | Valida; si pasa, guarda y responde 200 |
| KIMI devolvió algo que no es JSON | 200 con `{ "error": "INVALID_JSON" }` | 502 `AI_INVALID_RESPONSE` |
| KIMI falló (timeout de 25 s, 401 por key mala, 429, 5xx) | **502** con `{ "error": "LLM_UNAVAILABLE" }` | 503 `AI_UNAVAILABLE` |
| Secreto incorrecto | 403 de n8n | 503 `AI_UNAVAILABLE` |
| Workflow inactivo o URL mal | 404 de n8n | 503 `AI_UNAVAILABLE` |
| Error inesperado dentro del workflow | 500 de n8n | 503 `AI_UNAVAILABLE` |

### Puesta en marcha

#### 1. Importar

En n8n: **Workflows → Import from file** y elegí `n8n/workflows/trainer-ia.json`.

#### 2. Crear las dos credenciales

En **Credentials → Add credential → Header Auth**:

| Nombre (exacto) | Header name | Value |
|---|---|---|
| `FitTrainer webhook` | `x-webhook-secret` | Un secreto largo y aleatorio. **El mismo** que `N8N_WEBHOOK_SECRET` en `backend/.env`. |
| `KIMI` | `Authorization` | `Bearer <tu API key de Moonshot>` |

La key de KIMI se saca en [platform.moonshot.ai](https://platform.moonshot.ai) → API Keys. **Vive solo en la credencial de n8n**: nunca va al repo, ni al backend, ni a un `.env` commiteado.

Después de importar, abrí el nodo **Webhook trainer-ia** y el nodo **KIMI chat completions** y verificá que cada uno tenga elegida su credencial (si n8n no la encontró por nombre, elegila del desplegable).

Para generar un secreto: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

#### 3. Activar

Guardá y prendé el switch **Active**. La URL de producción es `/webhook/trainer-ia` (la de `/webhook-test/...` solo anda mientras tenés el editor en "Listen for test event").

#### 4. Configurar el backend

En `backend/.env`:

```env
# n8n corriendo en tu máquina, backend fuera de Docker
N8N_TRAINER_AI_WEBHOOK_URL=http://localhost:5678/webhook/trainer-ia
# backend en el contenedor api y n8n como servicio del docker-compose
# N8N_TRAINER_AI_WEBHOOK_URL=http://n8n:5678/webhook/trainer-ia
N8N_WEBHOOK_SECRET=<el mismo valor que la credencial "FitTrainer webhook">
```

Sin `N8N_TRAINER_AI_WEBHOOK_URL` la app arranca igual y el asistente responde 503.

### Probarlo con curl

```bash
curl -s -X POST http://localhost:5678/webhook/trainer-ia \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: <tu secreto>" \
  -d '{
    "goal": "hypertrophy",
    "level": "beginner",
    "frequency_per_week": 3,
    "session_duration_min": 45,
    "available_equipment": ["dumbbell", "bodyweight"],
    "injuries": "Molestia en el hombro derecho",
    "preferences": null,
    "library": [
      { "id": "11111111-1111-4111-8111-111111111111", "name": "Sentadilla goblet", "muscle_group": "legs", "equipment": "dumbbell" },
      { "id": "22222222-2222-4222-8222-222222222222", "name": "Remo con mancuerna", "muscle_group": "back", "equipment": "dumbbell" },
      { "id": "33333333-3333-4333-8333-333333333333", "name": "Flexiones de brazos", "muscle_group": "chest", "equipment": "bodyweight" },
      { "id": "44444444-4444-4444-8444-444444444444", "name": "Plancha", "muscle_group": "core", "equipment": "bodyweight" }
    ],
    "previous_templates": [],
    "base_template": null
  }'
```

En PowerShell, guardá el body en `body.json` y usá `curl.exe ... --data-binary "@body.json"`.

Una respuesta válida se ve así (los `exercise_id` son solo de la biblioteca, los días no se repiten y suman 3):

```json
{
  "routines": [
    {
      "name": "Cuerpo completo",
      "days": ["monday", "wednesday", "friday"],
      "exercises": [
        { "exercise_id": "11111111-1111-4111-8111-111111111111", "sets": 3, "reps": 12, "rest_seconds": 90, "suggested_kg": null, "notes": "Bajada controlada" },
        { "exercise_id": "22222222-2222-4222-8222-222222222222", "sets": 3, "reps": 12, "rest_seconds": 90, "suggested_kg": null, "notes": "Sin dolor en el hombro" },
        { "exercise_id": "44444444-4444-4444-8444-444444444444", "sets": 3, "reps": 30, "rest_seconds": 60, "suggested_kg": null, "notes": "30 segundos" }
      ]
    }
  ],
  "rationale": "Principiante con 3 días: cuerpo completo para repetir los patrones básicos; se evitan las flexiones por la molestia en el hombro."
}
```

Sin el header o con otro secreto, n8n responde 403.

### Cambiar el modelo

El modelo está en la primera línea del nodo **Armar prompt**: `const MODEL = 'kimi-k2-turbo-preview';`. Se puede cambiar por otro de la lista de [platform.moonshot.ai](https://platform.moonshot.ai) (por ejemplo `kimi-k2-0905-preview` o `moonshot-v1-32k`) que soporte `response_format: json_object`. Si el modelo elegido tarda más, tené en cuenta que el timeout del nodo HTTP es de 25 s y el del backend de 30 s.

### Re-exportar después de editar

1. En el editor del workflow: menú **⋯ → Download**.
2. Reemplazá `n8n/workflows/trainer-ia.json` con el archivo bajado.
3. Antes de commitear, revisá el diff: las credenciales tienen que ir **solo por nombre** (`"name": "FitTrainer webhook"`, `"name": "KIMI"`); nunca keys, secretos ni headers con valores. Si el export trae ids de credenciales o de instancia nuevos, se pueden dejar los genéricos del repo (`fittrainer-webhook`, `kimi`). Dejá `"active": false` y `"pinData": {}` (los datos fijados pueden traer ejecuciones reales).
4. Las credenciales nunca se exportan desde **Credentials**: se crean a mano en cada instancia.

## Workflow `student-ia`

Chat IA del alumno durante la sesión (tarjeta 13). El backend (`POST /api/chat`) le manda a n8n el mensaje y el contexto **sin datos personales**; n8n arma el prompt con la conversación previa, le pide a KIMI una respuesta en JSON y la devuelve. El backend valida `response` y descarta las sugerencias que no estén en `alternatives`. Spec: `docs/superpowers/specs/2026-11-07-student-ai-chat-design.md`.

Archivo: `n8n/workflows/student-ia.json`. Misma estructura que `trainer-ia`:

1. **Webhook student-ia**: `POST /webhook/student-ia`, credencial `FitTrainer webhook` (header `x-webhook-secret`).
2. **Armar prompt** (Code): prompt de sistema en español rioplatense neutro (asistente en plena sesión, hasta 3 párrafos breves, nada de consejos médicos y ante dolor o lesión parar y consultar al entrenador o a un profesional, lesiones como restricciones, reemplazos solo de `alternatives` por id respetando el equipamiento, fuera de tema se redirige al entrenamiento, esquema de salida). El prompt de sistema es **fijo**: el ejercicio, el alumno (objetivo, nivel, equipamiento y lesiones, que es texto libre) y las `alternatives` van aparte, como JSON (`JSON.stringify`) en un mensaje de datos que empieza con "DATOS DE CONTEXTO (JSON)", y el sistema aclara que esos campos son datos y nunca instrucciones (así un "ignorá las reglas…" en las lesiones no cambia las reglas). El `history` va como turnos previos del chat (`user` / `assistant`, hasta 6) para que entienda repreguntas como "¿y otra opción?". Acá están el **modelo** (`kimi-k2-turbo-preview`), la temperatura (0.4) y `max_tokens` (600).
3. **KIMI chat completions** (HTTP Request): mismo endpoint y credencial `KIMI`, `json_object`, timeout de **8 s** (el backend corta a los 9 s).
4. **Parsear JSON** (Code): igual que en `trainer-ia`.
5. **Responder respuesta** / **Responder error KIMI** (Respond to Webhook).

### Qué recibe el backend

| Caso | Respuesta de n8n | Qué hace el backend |
|---|---|---|
| Todo bien | 200 con `{ "response": "...", "suggestions": [...] }` | Valida, guarda el par de mensajes y responde 200 |
| KIMI devolvió algo que no es JSON | 200 con `{ "error": "INVALID_JSON" }` | 502 `AI_INVALID_RESPONSE` |
| KIMI falló (timeout de 8 s, 401, 429, 5xx) | **502** con `{ "error": "LLM_UNAVAILABLE" }` | 503 `AI_UNAVAILABLE` |
| Secreto incorrecto, workflow inactivo o error interno | 403 / 404 / 500 de n8n | 503 `AI_UNAVAILABLE` |

### Puesta en marcha

1. **Importar:** **Workflows → Import from file** → `n8n/workflows/student-ia.json`.
2. **Credenciales:** las mismas de `trainer-ia` (`FitTrainer webhook` y `KIMI`); si ya existen, no se crean de nuevo. Abrí **Webhook student-ia** y **KIMI chat completions** y verificá que cada uno tenga elegida la suya.
3. **Activar:** guardá y prendé **Active**. La URL de producción es `/webhook/student-ia`.
4. **Backend** (`backend/.env`):

```env
N8N_STUDENT_AI_WEBHOOK_URL=http://localhost:5678/webhook/student-ia
# con el backend en Docker y n8n como servicio del docker-compose
# N8N_STUDENT_AI_WEBHOOK_URL=http://n8n:5678/webhook/student-ia
N8N_WEBHOOK_SECRET=<el mismo valor que la credencial "FitTrainer webhook">
```

Sin `N8N_STUDENT_AI_WEBHOOK_URL` la app arranca igual y el chat responde 503.

### Probarlo con curl

```bash
curl -s -X POST http://localhost:5678/webhook/student-ia \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: <tu secreto>" \
  -d '{
    "message": "Está ocupada la banca, ¿con qué lo reemplazo?",
    "exercise": { "name": "Press banca plano", "muscle_group": "chest", "equipment": "barbell" },
    "student": { "goal": "hypertrophy", "level": "beginner", "gym_equipment": ["dumbbell", "bodyweight"], "injuries": null },
    "alternatives": [
      { "id": "55555555-5555-4555-8555-555555555555", "name": "Press con mancuernas", "muscle_group": "chest", "equipment": "dumbbell" },
      { "id": "33333333-3333-4333-8333-333333333333", "name": "Flexiones de brazos", "muscle_group": "chest", "equipment": "bodyweight" }
    ],
    "history": []
  }'
```

Para probar la memoria, repetí con `"message": "¿y otra opción?"` y en `history` el mensaje anterior (`{ "role": "user", ... }`) y la respuesta (`{ "role": "assistant", ... }`).

Una respuesta válida se ve así (`exercise_id` solo de `alternatives`, de 0 a 3 sugerencias):

```json
{
  "response": "Si la banca está ocupada, hacé el press con mancuernas en el piso o en otro banco: trabaja el mismo patrón y podés mantener las series y repeticiones que tenías.\n\nSi tampoco hay lugar, las flexiones de brazos son una buena opción sin equipo.",
  "suggestions": [
    { "exercise_id": "55555555-5555-4555-8555-555555555555", "reason": "Mismo patrón de empuje con el equipamiento que tenés" },
    { "exercise_id": "33333333-3333-4333-8333-333333333333", "reason": "Sin equipo, para no esperar" }
  ]
}
```

El modelo se cambia igual que en `trainer-ia` (primera línea de **Armar prompt**), pero acá el timeout es de 8 s: conviene un modelo rápido. Para re-exportar, seguí los mismos pasos de arriba reemplazando `n8n/workflows/student-ia.json`.
