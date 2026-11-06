# Asistente IA del entrenador: backend y workflow `trainer-ia` (tarjeta 15)

MIS 15 · equipo [eGaFjC21](https://trello.com/c/eGaFjC21). La UI es la tarjeta 16. El chat del alumno es la 13.

## Decisiones (grilling 06/11 con Pablo)

| # | Pregunta | Decisión |
|---|---|---|
| Q1 | ¿Quién levanta n8n? | **Igna**, como servicio del `docker-compose` (lo definió en la tarjeta del chat IA). Esta tarjeta no toca el compose. |
| Q2 | ¿Qué LLM? | El de los requerimientos: **KIMI (Moonshot)**, compatible con la API de OpenAI (RNF-23). La key la saca Igna y vive **solo en la credencial de n8n** (RNF-10). |
| Q3 | ¿Rutina igual todos los días o distinta por día? | **Las dos.** Ya están en el modelo: un alumno puede tener varias rutinas activas, cada una con sus días, y la de hoy es la más nueva que incluye el día. La IA propone **1 a 7 bloques**, cada uno con nombre, días y ejercicios, **sin repetir días entre bloques**. 1 bloque es la misma rutina en todos sus días; 2 o más es un split. Ejemplos de Pablo: "Cuerpo completo" lunes, miércoles y viernes (1 bloque), o "Pecho y tríceps" lunes, "Espalda y bíceps" miércoles y "Piernas" viernes (3 bloques); también "Tren superior" lunes y jueves con "Tren inferior" martes y viernes, o push/pull/legs en 6 días. No cambia el modelo de rutinas ni el celular. |
| Q4 | ¿Qué endpoints? | `POST /trainer-ai/generate-routine` y `POST /trainer-ai/save-as-template`. `refine` queda afuera: el PT ajusta la propuesta en el editor (tarjeta 16). |
| Q5 | ¿Qué queda hecho sin n8n? | **Backend completo**, con n8n simulado en los tests, y el **workflow `trainer-ia` exportado** en `n8n/workflows/trainer-ia.json`, listo para importar. La prueba real con n8n y KIMI queda pendiente de Igna y se anota en la PR y en la tarjeta. |

## Flujo

1. El PT pide una propuesta (la UI de la 16 precarga los datos del alumno).
2. El backend valida, enriquece el contexto y llama al webhook `trainer-ia` de n8n con el secreto y un timeout de 30 s.
3. n8n arma el prompt, llama a KIMI pidiendo JSON y devuelve la propuesta.
4. El backend **valida la propuesta contra un esquema y contra la biblioteca que mandó**. Si falla, responde 502 y no guarda nada.
5. Si es válida, la guarda en `ai_routine_generations` y la devuelve con los nombres de los ejercicios.
6. El PT la revisa y, si le sirve, la guarda como plantilla: **una plantilla por bloque**. **La IA nunca asigna**: asignar es el paso explícito del editor (tarjeta 16).

## `POST /api/trainer-ai/generate-routine` (rol trainer)

**Body**

| Campo | Regla |
|---|---|
| `student_id` | Opcional. Si viene, tiene que ser un alumno **activo del trainer** (si no, 404 `STUDENT_NOT_FOUND`). Lo que falte del body se completa con los datos del alumno: `goal`, `level`, `gym_equipment` → `available_equipment` e `injuries`. |
| `goal` | `hypertrophy \| strength \| weight_loss \| tonify`. Obligatorio, salvo que lo complete el alumno. |
| `level` | `beginner \| intermediate \| advanced`. Obligatorio, salvo que lo complete el alumno. |
| `frequency_per_week` | Entero de 1 a 7. Obligatorio. |
| `session_duration_min` | Entero de 20 a 180. Opcional (por defecto 60). |
| `available_equipment` | Subconjunto sin repetidos de `barbell, dumbbell, machine, cable, bodyweight, kettlebell, band`. Si queda vacío, solo `bodyweight`. |
| `injuries`, `preferences` | Texto opcional, hasta 500 caracteres cada uno. |
| `base_template_id` | Opcional. Una plantilla del trainer (si no, 404 `TEMPLATE_NOT_FOUND`), para adaptarla. |

**Contexto que sale hacia n8n, sin datos personales (RNF-26):**
- los parámetros resueltos de arriba (nunca nombre, email ni fecha de nacimiento del alumno);
- la **biblioteca**: los ejercicios accesibles para el trainer (globales y propios) cuyo equipamiento está en `available_equipment` o es `bodyweight`, con `{ id, name, muscle_group, equipment }` y hasta 200. Si vino `base_template_id`, se suman **siempre** los ejercicios de la plantilla base que siguen accesibles para el trainer (aunque el equipamiento o el corte alfabético los dejaran afuera), primero, sin repetir y dentro de los 200: la IA los copia de la base y, si no estuvieran, la propuesta fallaría con 502;
- `previous_templates`: las 3 plantillas más recientes del trainer, como `{ goal, level, days, exercise_names[] }`, **sin el nombre de la plantilla** (los PT suelen ponerle el nombre del alumno);
- `base_template`: la estructura de la plantilla base, si vino, con los nombres de sus ejercicios y también sin su nombre.

`injuries` (y `preferences`) es **texto libre que se manda a la IA** tal cual: la IA lo necesita para cuidar al alumno. Por eso la UI del asistente (tarjeta 16) tiene que avisarle al PT que no ponga ahí datos personales (nombre, documento, contacto).

**Webhook:** `POST ${N8N_TRAINER_AI_WEBHOOK_URL}` con el header `x-webhook-secret: ${N8N_WEBHOOK_SECRET}` y timeout de **30 s** (`AbortSignal.timeout`). Las dos variables son opcionales en `env.js`, porque la app tiene que arrancar sin IA. Para que la IA funcione hacen falta **las dos**: si falta la URL o el secreto, el backend no llama a n8n, loguea cuál falta y responde 503. Si se corta por timeout o si n8n responde algo que no es 2xx, el backend responde **503 `AI_UNAVAILABLE`** ("El asistente no está disponible ahora. Probá de nuevo o armá la rutina a mano.").

**Respuesta esperada de n8n** (lo que valida el backend):

```json
{
  "routines": [
    {
      "name": "Empuje",
      "days": ["monday", "thursday"],
      "exercises": [
        { "exercise_id": "uuid", "sets": 4, "reps": 8, "rest_seconds": 90, "suggested_kg": null, "notes": "Bajada controlada" }
      ]
    }
  ],
  "rationale": "Por qué se armó así (hasta 1000 caracteres)"
}
```

**Validación (cualquier falla → 502 `AI_INVALID_RESPONSE`, sin guardar nada; los detalles van al log, no al cliente):**
- de 1 a 7 bloques; `name` de 1 a 60 caracteres;
- `days` de `monday..sunday`, al menos 1, sin repetidos y **sin repetir días entre bloques**; el total de días de todos los bloques tiene que ser igual a `frequency_per_week`;
- de 1 a 15 ejercicios por bloque, y cada `exercise_id` tiene que estar **en la biblioteca que se mandó** (un ejercicio inventado se rechaza);
- `sets` entero de 1 a 10, `reps` entero de 1 a 50, `rest_seconds` entero de 0 a 600, `suggested_kg` `null` o número de 0 a 500, `notes` opcional de hasta 200 caracteres;
- `rationale` de 1 a 1000 caracteres;
- cualquier campo de más se descarta; un tipo incorrecto (por ejemplo `"sets": "cuatro"`) se rechaza.

**Límite:** 20 **intentos** por trainer en la última hora: cuenta cada llamada a n8n, exitosa o fallida (502/503), en una ventana deslizante en memoria del proceso, y también las generaciones guardadas en `ai_routine_generations` (así el límite sobrevive a un reinicio). Aplica a `max(guardadas, intentos) ≥ 20`. Pasado el límite, **429 `RATE_LIMIT_EXCEEDED`** con `Retry-After`. Además, **una sola generación en curso por trainer**: una segunda request mientras la primera espera a n8n es 429 `RATE_LIMIT_EXCEEDED` ("Ya hay una propuesta en curso…", `Retry-After: 30`). Las fallidas no se guardan en la base, pero cuentan como intento.

**Guardado:** una fila en `ai_routine_generations` con `trainer_id`, `student_id`, `input_params` (los parámetros resueltos, sin la biblioteca) y `generated_routine` (la propuesta validada).

**200 OK**

```json
{
  "data": {
    "generation_id": "uuid",
    "routine_proposal": {
      "routines": [ { "name": "Empuje", "days": ["monday", "thursday"], "exercises": [ { "exercise_id": "uuid", "exercise_name": "Press banca plano", "sets": 4, "reps": 8, "rest_seconds": 90, "suggested_kg": null, "notes": "…" } ] } ],
      "rationale": "…"
    }
  }
}
```

## `POST /api/trainer-ai/save-as-template` (rol trainer)

**Body:** `{ "generation_id": "uuid", "template_name": "string (1-120)" }`

- Una generación inexistente o de otro trainer → **404 `GENERATION_NOT_FOUND`**. Una ya guardada → **409 `GENERATION_ALREADY_SAVED`**.
- Se crea **una plantilla por bloque**, con `generated_by_ai = true`, `goal` y `level` de la generación, y `structure` v1 (`days` y `exercises` con `order`). El nombre es `template_name` si hay un solo bloque, o `"<template_name> · <bloque>"` (cortado a 120) si hay varios.
- Los ejercicios se revalidan como en `POST /routine-templates`: si uno dejó de existir o de ser accesible, responde **400 `TEMPLATE_EXERCISES_UNAVAILABLE`** y no crea nada.
- **Todo o nada:** o se crean todas las plantillas y se marca la generación, o no queda ninguna. Se resuelve con una función SQL en una transacción.
- La generación queda con `was_used = true`, `routine_template_id` = la primera plantilla y la columna nueva **`routine_template_ids uuid[]`** con todas (migración, más el schema y el DER actualizados).
- **201** → `{ "data": { "generation_id": "uuid", "templates": [ { "id": "uuid", "name": "…", "days": [...] } ] } }`.

## Workflow `n8n/workflows/trainer-ia.json`

- **Webhook** `POST /webhook/trainer-ia`, autenticado con una credencial *Header Auth* (`x-webhook-secret`) que se compara del lado de n8n. Es el ítem de la auditoría de la tarjeta 54.
- **Code:** arma el prompt de sistema (rol de entrenador, reglas de seguridad: sin consejos médicos y lesiones como restricciones; solo ejercicios de la biblioteca, por id; el esquema exacto de salida; la cantidad de días) y el prompt de usuario con el contexto.
- **HTTP Request** a `https://api.moonshot.ai/v1/chat/completions` con la credencial de KIMI, `response_format: { type: "json_object" }` y temperatura baja.
- **Code:** parsea el `content` a JSON (si no parsea, devuelve `{ "error": "INVALID_JSON" }` y el backend lo trata como inválido).
- **Respond to Webhook** con el JSON.
- El export **no lleva secretos**: las credenciales van por nombre (`FitTrainer webhook`, `KIMI`). `n8n/README.md` explica cómo importarlo, crear las dos credenciales, activarlo y qué URL va en `N8N_TRAINER_AI_WEBHOOK_URL`.

## Código (CONTRIBUTING: 200 líneas por archivo; capa → módulo → archivo)

- `routes/trainer-ai/`, `controllers/trainer-ai/`, `validations/trainer-ai/` (body de los dos endpoints), `services/trainer-ai/` (generar, contexto, validación de la propuesta, guardar), `repositories/trainer-ai/` (generaciones) y `shared/utils/` o `services/trainer-ai/` (cliente del webhook).
- `errors.js`: `aiUnavailable` 503, `aiInvalidResponse` 502, `generationNotFound` 404, `generationAlreadySaved` 409, `rateLimitExceeded` 429 (si la #80 entra antes con el mismo código, se reusa).
- `env.js` y `.env.example`: `N8N_TRAINER_AI_WEBHOOK_URL` (nueva) y `N8N_WEBHOOK_SECRET`.

## Pruebas

- **Unitarias:** validación del body (cada regla); completar con el alumno; contexto sin PII (el payload no trae `name`, `email` ni `birth_date` del alumno ni el nombre de ninguna plantilla); filtro de la biblioteca por equipamiento; cliente del webhook (secreto en el header, timeout → 503, 5xx → 503, sin URL o sin secreto → 503 sin llamar a n8n); validación de la propuesta (cada regla, el ejercicio inventado, `"sets": "cuatro"`, días repetidos entre bloques, total de días distinto de la frecuencia, campos de más descartados); límite → 429 (también por intentos fallidos y por una generación en curso); guardar (1 bloque y varios, nombres, 404, 409, ejercicio que ya no existe → 400 sin crear nada).
- **Integración** contra Supabase dev, con el webhook simulado por un servidor HTTP local en el test: generar → guardar → las plantillas aparecen en `GET /routine-templates` con `generated_by_ai = true`; aislamiento: un trainer no puede guardar ni ver la generación de otro (404, sin ids ajenos en el body).
- **Prueba real con n8n y KIMI:** pendiente de Igna. En la PR queda el paso a paso para correrla.

## Documentación en la misma PR

`docs/arquitectura/contratos-api.md` (el módulo con esta forma, `refine` marcado fuera de alcance), schema, migración y DER (`routine_template_ids`), `docs/proceso/setup-tecnico.md` (variables), `docs/proceso/plan-de-pruebas.md` (casos nuevos), `n8n/README.md` y `docs/proceso/auditoria-seguridad.md` (el webhook queda autenticado del lado de n8n).

## Fuera de alcance

`refine`; la UI (tarjeta 16); levantar n8n y sacar la key de KIMI (Igna); el chat del alumno (tarjeta 13).
