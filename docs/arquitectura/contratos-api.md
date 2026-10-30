---
title: Contratos de API — FitTrainer
aliases: [Contratos de API — FitTrainer]
notion: https://app.notion.com/p/33c5ffbef7b58118b681c17cf31053f4
notion_editado: 2026-05-01
migrado: 2026-10-17
tags: [arquitectura]
---

# Contratos de API — FitTrainer

Referencia completa de todos los endpoints del backend. Cada contrato define el método, URL, headers requeridos, body de entrada, respuesta exitosa y posibles errores.

Esto permite que **web y mobile trabajen en paralelo** sin depender del backend para saber cómo llamar a cada endpoint.

> **Base URL (dev):** `http://localhost:3001/api`
> **Base URL (prod):** `https://api.fittrainer.app/api`

**Convención de autenticación**

Todos los endpoints protegidos requieren:

```javascript
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

Si no se incluye el token o es inválido → `401 Unauthorized`

Si el rol no tiene permiso → `403 Forbidden`

**Convención de errores**

Todos los errores siguen el mismo formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descripción legible del error",
    "details": []
  }
}
```

---

## Módulo: Auth

### POST /auth/register

Registra un nuevo Personal Trainer. No requiere autenticación.

**Body**

```json
{
  "name": "string (requerido, 2–100 chars)",
  "email": "string (requerido, formato email válido)",
  "password": "string (requerido, mínimo 8 chars, 1 mayúscula, 1 número)",
  "specialty": "string (opcional, ej: 'Fuerza y acondicionamiento')"
}
```

**201 Created** — `{ trainer, token, refresh_token }`

**Errores:** `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_EXISTS`, `500 INTERNAL_ERROR`

### POST /auth/login

**Body**

```json
{ "email": "string", "password": "string" }
```

**200 OK** — `{ user, token, refresh_token, expires_in }`

**Errores:** `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `401 ACCOUNT_DISABLED`

### POST /auth/refresh

**Body**

```json
{ "refresh_token": "string" }
```

**200 OK** — `{ token, expires_in }`

### POST /auth/logout

Revoca el refresh token. **No requiere** access token: alcanza con el `refresh_token` del body, así el logout funciona aunque el access haya vencido. **204 No Content**

**Body:** `{ "refresh_token": "string" }`

---

## Módulo: Invitaciones (WhatsApp + QR onboarding)

### POST /invitations

Genera una invitación para un nuevo alumno. El PT elige el canal de envío.

**Headers:** `Authorization: Bearer <token>` (rol: trainer)

**Body**

```json
{
  "student_name": "string (requerido, 2–100 chars)",
  "student_email": "string (requerido)",
  "student_phone": "string (opcional, requerido si delivery_channel incluye whatsapp)",
  "goal": "tonify | weight_loss | hypertrophy | strength (opcional)",
  "delivery_channel": "whatsapp | qr | both",
  "level": "beginner | intermediate | advanced (opcional)",
  "gym_equipment": ["string (opcional, hasta 30 ítems de 1–50 chars)"],
  "injuries": "string (opcional, hasta 1000 chars)"
}
```

> `goal`, `level`, `gym_equipment` e `injuries` son opcionales: si faltan o vienen en `null`, se guardan como `null` (el alumno queda sin objetivo/contexto). Si vienen, deben cumplir las reglas de arriba; `injuries` con solo espacios se guarda como `null`, y los textos de `gym_equipment` se recortan. El contexto pasa al alumno cuando acepta la invitación.

**201 Created**

```json
{
  "data": {
    "invitation_id": "uuid",
    "token": "a1b2c3d4-...",
    "join_url": "https://fittrainer.app/join?token=a1b2c3d4",
    "qr_base64": "data:image/png;base64,iVBORw0KGgo...",
    "whatsapp_share_url": "https://wa.me/5491133334444?text=Hola%20Pedro...",
    "expires_at": "2026-04-11T10:00:00Z"
  }
}
```

> `qr_base64` solo se incluye si `delivery_channel` es `qr` o `both`.
> `whatsapp_share_url` solo si es `whatsapp` o `both`.

**Errores:** `400 VALIDATION_ERROR`, `409 STUDENT_EMAIL_EXISTS`

### GET /invitations/:token

Valida un token y retorna los datos precargados. Público.

**200 OK** — `{ trainer, student_name, student_email, goal, expires_at }`

`goal` puede ser `null` si el PT no lo cargó al invitar.

**Errores:** `404 INVITATION_NOT_FOUND`, `410 INVITATION_EXPIRED`, `410 INVITATION_ALREADY_USED`

### POST /students (desde invitación)

Crea el alumno desde el token de invitación. Público.

**Body**

```json
{
  "token": "string (requerido)",
  "password": "string (requerido, mínimo 8 chars)"
}
```

**201 Created** — `{ student, token, refresh_token }`

---

## Módulo: Alumnos

### GET /students

Lista los alumnos del trainer autenticado (rol: trainer).

**Query**
- `active`: por defecto `true` (solo activos); `?active=false` trae los dados de baja.
- `search`: busca por nombre (contiene, sin distinguir mayúsculas). `%` y `_` no se escapan: funcionan como comodines.
- `page`: desde 1 (por defecto 1). `limit`: por defecto 20, máximo 100.
- Orden fijo: alta más reciente primero.

**Errores:** `403 FORBIDDEN` con rol alumno.

**200 OK**

```json
{
  "data": [
    { "id": "uuid", "name": "Tomás Rivera", "email": "t@mail.com", "goal": "hypertrophy",
      "active": true, "avatar_url": null, "created_at": "2026-10-17T12:00:00Z",
      "last_session_at": "2026-10-20T10:00:00Z" }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "total_pages": 1 }
}
```

> `last_session_at` sale de la vista `student_last_session` (el `started_at` más reciente, cuente o no como terminada); es `null` si nunca entrenó. El listado no trae `level`, `gym_equipment` ni `injuries`.

### GET /students/:id

Ficha completa. El trainer ve sus alumnos; el alumno, solo la suya.

**200 OK**

```json
{
  "data": {
    "id": "uuid", "trainer_id": "uuid", "name": "Tomás Rivera", "email": "t@mail.com",
    "goal": "strength", "level": "beginner", "birth_date": "1999-05-01", "avatar_url": null,
    "active": true, "gym_equipment": ["Mancuernas", "Banco"], "injuries": "Lumbalgia",
    "created_at": "2026-10-17T12:00:00Z",
    "latest_metrics": { "id": "uuid", "student_id": "uuid", "weight_kg": 74.5, "height_cm": 178, "body_fat_pct": null,
      "waist_cm": null, "hip_cm": null, "chest_cm": null, "recorded_at": "2026-10-20T10:00:00Z",
      "recorded_by": "trainer", "bmi": 23.5 },
    "active_routine": { "id": "uuid", "name": "Push/Pull", "days": ["monday", "thursday"] },
    "last_session_at": "2026-10-20T10:00:00Z"
  }
}
```

> `latest_metrics`, `active_routine` y `last_session_at` (timestamp de la última sesión; `null` si nunca entrenó) pueden venir en `null`. `PATCH /students/:id` devuelve la misma ficha. `active_routine` es la rutina activa más reciente.

**Errores:** `400 VALIDATION_ERROR` (`id` no es UUID), `403 FORBIDDEN` (alumno de otro trainer o inexistente: no se distingue).

### PATCH /students/:id

Actualiza un alumno. Solo el trainer dueño. Hay que mandar al menos un campo.

| Campo | Regla |
|---|---|
| `name` | 2–100 caracteres |
| `goal` | `tonify`, `weight_loss`, `hypertrophy` o `strength` |
| `level` | `beginner`, `intermediate` o `advanced` |
| `active` | booleano. `false` es la **baja**: revoca los refresh tokens del alumno y su login responde `401 ACCOUNT_DISABLED`. **No es inmediata:** el access token que ya tiene sigue valiendo hasta que vence (`JWT_EXPIRES_IN`, 1 h). `true` lo reactiva con la misma contraseña |
| `birth_date` | `YYYY-MM-DD`, no futura, o `null` |
| `gym_equipment` | lista de hasta 30 textos de 1–50 caracteres, o `null` |
| `injuries` | texto de hasta 1000 caracteres, o `null` (solo espacios → `null`) |

**200 OK** — la ficha completa en `{ data }`, con la misma forma que el GET.

**Errores:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`.

## Módulo: Medidas corporales

Rutas anidadas en el alumno: `/students/:id/metrics`. Acceden el trainer dueño y el propio alumno.

### GET /students/:id/metrics

**200 OK** — `{ data: [...] }`, el historial en orden **ascendente** por `recorded_at` (listo para graficar), sin paginación. Cada medida trae su `bmi`.

```json
{
  "data": [
    { "id": "uuid", "student_id": "uuid", "weight_kg": 74.5, "height_cm": 178, "body_fat_pct": 18,
      "waist_cm": 80, "hip_cm": 95, "chest_cm": 100, "recorded_at": "2026-10-20T13:00:00+00:00",
      "recorded_by": "trainer", "bmi": 23.5 }
  ]
}
```

**Errores:** `400 VALIDATION_ERROR` (`id` no es UUID), `403 FORBIDDEN` (alumno de otro trainer o inexistente).

### POST /students/:id/metrics

**Body** (ejemplo completo; todos los campos son opcionales, pero tiene que venir al menos una medida)

```json
{
  "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e6f",
  "weight_kg": 74.5,
  "height_cm": 178,
  "body_fat_pct": 18,
  "waist_cm": 80,
  "hip_cm": 95,
  "chest_cm": 100,
  "recorded_at": "2026-10-20T10:00:00-03:00"
}
```

- `id`: UUID generado en el cliente (opcional).
- Las medidas van como **números JSON** (`"80"` da 400), son ≥ 0 y `body_fat_pct` ≤ 100. Tiene que venir al menos una.
- `recorded_at`: ISO 8601 **con zona** (`Z` o `-03:00`); por defecto, ahora; hasta 5 minutos en el futuro (tolera el reloj adelantado del celular).
- `recorded_by` lo pone el backend según el rol.
- `id` hace el POST idempotente: un reintento con el mismo `id` responde **200** con lo ya guardado.

**201 Created** — `{ data }` con la medida (incluye `student_id`) y su `bmi`.

**Errores:** `400 VALIDATION_ERROR`, `403 FORBIDDEN` (alumno de otro trainer o inexistente), `409 METRIC_ID_CONFLICT` (el `id` ya es de otro alumno, o el insert chocó con ese `id` y la medida original ya no existe: se borró entre medio).

### DELETE /students/:id/metrics/:metricId

**204 No Content.** No hay `PATCH`: para corregir una medida se borra y se vuelve a cargar.

**Errores:**
- `400 VALIDATION_ERROR`: `id` o `metricId` no es UUID.
- `403 FORBIDDEN`: el alumno es de otro trainer o no existe, o un alumno intenta borrar una medida cargada por su entrenador.
- `404 METRIC_NOT_FOUND`: la medida no existe o no es de ese alumno.

> **IMC:** `bmi` se calcula en cada respuesta (`peso / altura²`, en metros, con 1 decimal) y no se guarda. Si la medida no trae altura, se usa la última registrada **en o antes** de esa medida; puede venir `null`. Los clientes no lo calculan.

---

## Módulo: Ejercicios

### GET /exercises

Biblioteca disponible (solo trainer). Query: `muscle_group`, `equipment` (uno de `barbell` | `dumbbell` | `machine` | `cable` | `bodyweight` | `kettlebell` | `band`; otro valor → 400), `search`, `include_global`.

**200 OK** — `{ data: [...] }`, ordenada por nombre. Cada ejercicio: `id`, `trainer_id` (null en los globales), `name`, `muscle_group`, `equipment`, `description`, `video_url`, `is_global`.

### POST /exercises

Crea ejercicio personalizado (solo trainer). Body:

- `name` (obligatorio): entre 2 y 120 caracteres.
- `muscle_group` (obligatorio): `chest` | `back` | `shoulders` | `legs` | `glutes` | `biceps` | `triceps` | `core` | `calves` | `full_body` | `cardio`.
- `equipment` (opcional): `barbell` | `dumbbell` | `machine` | `cable` | `bodyweight` | `kettlebell` | `band`.
- `description` (opcional): hasta 1000 caracteres.
- `video_url` (opcional): link `http://` o `https://` de hasta 500 caracteres.

Los tres opcionales aceptan `null` o texto vacío (quedan en `null`).

**201 Created** — el ejercicio creado.

### PATCH /exercises/:id

Edita un ejercicio propio (solo el dueño). Mismos campos y reglas que el POST, todos opcionales, con al menos uno. Enviar `null` en `equipment`, `description` o `video_url` borra el valor. Los globales no se pueden editar.

**200 OK** — el ejercicio actualizado. **403** si no es del trainer o es global; **404** si no existe.

### DELETE /exercises/:id

Elimina un ejercicio propio. **204 No Content**. **403** si no es del trainer o es global; **404** si no existe; **409 `EXERCISE_IN_USE`** si está en una rutina o en el historial de un alumno ("No podés borrar este ejercicio porque está en una rutina o en el historial de un alumno").

### Errores de validación (POST y PATCH)

400 `VALIDATION_ERROR` con `details[{ field, message }]`:

- `name`: "El nombre debe tener entre 2 y 120 caracteres".
- `muscle_group` y `equipment`: "Debe ser uno de: ...".
- `video_url`: "El video debe ser un link que empiece con http:// o https:// (máximo 500 caracteres)".
- `description`: "La descripción puede tener hasta 1000 caracteres".
- Un campo que no es texto (ni `null`): "<campo> debe ser texto".

---

## Módulo: Rutinas

### GET /routines

Rutinas del trainer, la más nueva primero. Query: `student_id`, `active`.

**200 OK** — cada rutina trae sus columnas (`id`, `trainer_id`, `student_id`, `template_id`, `name`, `goal`, `days`, `active`, `created_at`) y el alumno embebido, para que el listado no tenga que pedir `GET /students`:

```json
{
  "data": [
    {
      "id": "uuid", "student_id": "uuid", "name": "Fuerza A", "goal": "strength",
      "days": ["monday", "thursday"], "active": true,
      "student": { "name": "Ana Paz", "active": true }
    }
  ]
}
```

`student.active` es `false` si el alumno está dado de baja. El resto de los endpoints de rutinas no incluyen `student`.

### POST /routines

Crea y asigna rutina. Body: `student_id`, `template_id` (opcional), `name`, `goal`, `days`, `exercises[]`. Cada ejercicio cumple los límites de abajo. Si falla la inserción de los ejercicios, la rutina no queda creada. Un `template_id` de otro trainer o inexistente → **404 `TEMPLATE_NOT_FOUND`** (igual que el módulo de plantillas; no se revela qué ids existen).

**Límites de un ejercicio** (rutina y plantilla): `exercise_id` uuid (global o del trainer, si no 403); `sets` y `reps` enteros > 0; `rest_seconds` entero ≥ 0 o `null`; `suggested_kg` número ≥ 0 o `null`; `tempo` hasta 20 caracteres o `null`; `notes` hasta 500 o `null`; `order` entero ≥ 0 opcional.

**Orden:** los ejercicios se ordenan de forma estable por `order` (los que no lo traen usan su posición) y se **renumeran 0..n-1**: nunca quedan órdenes repetidos. En `POST /routines/:id/exercises` la renumeración es sobre la lista nueva y se desplaza después del mayor `order_index` que ya tiene la rutina: los ejercicios agregados siempre quedan al final, sin repetir órdenes.

`POST /routines` y `POST /routines/:id/exercises` aplican estos límites por ejercicio (`PATCH /routines/:id` no recibe ejercicios, así que no le aplican; antes un valor inválido se guardaba como `null`; ahora es 400). `days` (en `POST /routines` y `PATCH /routines/:id`) es un arreglo no vacío de `monday..sunday` y **rechaza días repetidos** con 400.

### PATCH /routines/:id/exercises/:routineExerciseId

Personaliza un ejercicio de una rutina asignada (trainer dueño). Body: `sets`, `reps`, `rest_seconds`, `suggested_kg`, `tempo`, `notes` (al menos uno; `null` borra los opcionales). **200 OK** devuelve la rutina completa (forma de `GET /routines/:id`). Un `routineExerciseId` que no es de esa rutina → 404 `ROUTINE_EXERCISE_NOT_FOUND`.

### DELETE /routines/:id/exercises/:routineExerciseId

Quita un ejercicio de la rutina. **204**. Mismo 404 que el PATCH. Si es el único ejercicio de la rutina → **409 `ROUTINE_NEEDS_EXERCISE`** ("La rutina tiene que tener al menos un ejercicio").

### GET /routines/today

Rutina activa del alumno para hoy. Solo alumnos.

**200 OK** — incluye `routine_id`, `name`, `goal`, `days` y `exercises[]`, cada uno con `last_session_kg`: el mayor `actual_kg` de las series completadas con repeticiones del ejercicio en la **última sesión** (por `started_at`) en que el alumno lo hizo, a 1 decimal. Es `null` si nunca lo hizo o no cargó peso. Se calcula con una sola consulta por rutina (función SQL `last_session_kg`).

---

## Módulo: Plantillas de rutinas

Solo trainer (`Authorization: Bearer <token>`). Una plantilla replica una rutina; instanciarla **copia** su contenido (ver ADR 0003). Una plantilla inexistente o de otro trainer → **404 `TEMPLATE_NOT_FOUND`**.

**Forma de `structure`:**

```json
{
  "version": 1,
  "days": ["monday", "thursday"],
  "exercises": [
    { "exercise_id": "uuid", "sets": 4, "reps": 8, "rest_seconds": 90,
      "suggested_kg": 60, "tempo": "3-1-1", "notes": "...", "order": 0 }
  ]
}
```

`days`: al menos 1, valores de `monday..sunday`, sin repetidos. `exercises`: de 1 a 50, con los límites de un ejercicio (ver `POST /routines`). `frequency_per_week` se deriva de `days.length` y no se acepta en el body; `generated_by_ai` es siempre `false` desde estos endpoints.

### GET /routine-templates

Lista las plantillas del trainer, más nuevas primero (manuales y generadas por IA). Sin `structure`; suma `days` y `exercise_count`.

**Query:** `goal`, `level`, `generated_by_ai` (`true|false`)

**200 OK**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Hipertrofia 4 días — intermedio",
      "goal": "hypertrophy",
      "level": "intermediate",
      "frequency_per_week": 4,
      "generated_by_ai": true,
      "created_at": "2026-04-08T10:00:00Z",
      "days": ["monday", "tuesday", "thursday", "friday"],
      "exercise_count": 6
    }
  ]
}
```

### GET /routine-templates/:id

Plantilla con `structure` (si la guardada está incompleta, `days`/`exercises` ausentes se devuelven como `[]` para poder corregirla con PATCH); cada ejercicio suma `exercise: { id, name, muscle_group, equipment, video_url }`.

### POST /routine-templates

Crea una plantilla. **Body:** `{ "name": "2-120", "goal": "tonify|weight_loss|hypertrophy|strength", "level": "beginner|intermediate|advanced|null (opcional)", "structure": {...} }`. Cada `exercise_id` debe ser global o del trainer (si no, 403). **201** → `{ data }`.

### POST /routine-templates/from-routine

Guarda una rutina propia como plantilla (copia `goal`, `days` y ejercicios). **Body:** `{ "routine_id": "uuid", "name": "opcional (por defecto, el de la rutina)", "goal": "opcional (pisa el de la rutina)", "level": "opcional" }`. Rutina inexistente → 404; ajena → 403. **400** si la rutina no tiene objetivo y el body no trae `goal` (`field: "goal"`, "Elegí un objetivo para la plantilla"), o si la rutina rompe las reglas de una plantilla (`days` vacíos o inválidos, 0 o más de 50 ejercicios, o límites por ejercicio). Estos errores se informan en términos de la rutina, con `field: "routine_id"` y mensajes como "El ejercicio 3 de la rutina: notes debe tener como máximo 500 caracteres", "La rutina tiene que tener entre 1 y 50 ejercicios" o "Los días de la rutina: ...". **201** → `{ data }`.

### PATCH /routine-templates/:id

Edita `name`, `goal`, `level` y/o `structure` (al menos uno). `structure` se reemplaza entera y recalcula `frequency_per_week`. No afecta las rutinas ya asignadas.

### DELETE /routine-templates/:id

**204.** Las rutinas que salieron de la plantilla quedan con `template_id = null`.

### POST /routine-templates/:id/instantiate

Crea una rutina para un alumno propio copiando la plantilla (`template_id` queda como origen; la rutina nueva convive con las otras activas del alumno).

**Body:** `{ "student_id": "uuid", "name": "2-120 (opcional)", "days": ["monday", "..."] (opcional, >= 1, sin repetidos) }`. Por defecto usa `name` y `days` de la plantilla.

**201 Created** → `{ data }` con la rutina en la forma de `GET /routines/:id`.

**Errores:** 404 `TEMPLATE_NOT_FOUND`; 403 si el alumno no es del trainer; **409 `TEMPLATE_STRUCTURE_INVALID`** ("La plantilla está incompleta: editala antes de asignarla") si la `structure` guardada no pasa la validación de plantillas (p. ej. cargada por seed o IA sin `days`/`exercises`), con los `details` de la validación; se chequea antes que los ejercicios; **409 `TEMPLATE_EXERCISES_UNAVAILABLE`** si algún ejercicio de la plantilla ya no está disponible, con `details: [{ "field": "exercise_id", "message": "<id>" }]`.

---

## Módulo: Asistente IA del entrenador

### POST /trainer-ai/generate-routine

Pide al asistente IA que genere una propuesta de rutina para un alumno.

**Headers:** `Authorization: Bearer <token>` (rol: trainer)

**Body**

```json
{
  "student_id": "uuid (opcional, si es para un alumno específico)",
  "goal": "hypertrophy | strength | weight_loss | tonify",
  "level": "beginner | intermediate | advanced",
  "frequency_per_week": 4,
  "session_duration_min": 60,
  "available_equipment": ["barbell", "dumbbell", "machine", "cable"],
  "injuries": "string (opcional, ej: 'rodilla derecha')",
  "preferences": "string (opcional, ej: 'priorizar tren superior')",
  "base_template_id": "uuid (opcional, si quiere adaptar una plantilla existente)"
}
```

**200 OK**

```json
{
  "data": {
    "generation_id": "uuid",
    "routine_proposal": {
      "name": "Hipertrofia 4 días",
      "goal": "hypertrophy",
      "days": ["monday", "tuesday", "thursday", "friday"],
      "exercises": [
        {
          "day": "monday",
          "exercise_id": "uuid",
          "exercise_name": "Press banca plano",
          "sets": 4,
          "reps": 8,
          "rest_seconds": 90,
          "suggested_kg": null,
          "notes": "Bajada controlada en 3 segundos"
        }
      ],
      "rationale": "Se priorizó volumen en pectoral y dorsal por el objetivo de hipertrofia..."
    }
  }
}
```

**Errores:** `400 VALIDATION_ERROR`, `503 AI_UNAVAILABLE` (n8n timeout 30s), `429 RATE_LIMIT_EXCEEDED`

### POST /trainer-ai/refine

Pide a la IA que refine una rutina propuesta (más volumen, sustituir ejercicio, etc.).

**Body:** `{ "generation_id": "uuid", "instruction": "string" }`

### POST /trainer-ai/save-as-template

Marca una generación IA como plantilla reutilizable.

**Body:** `{ "generation_id": "uuid", "template_name": "string" }`

---

## Módulo: Sesiones

### POST /sessions

Inicia (o cierra, o reintenta) una sesión. Solo alumnos; el `student_id` sale del token. **Idempotente por `id`** (lo genera el celular).

**Body**

```json
{ "id": "uuid", "routine_id": "uuid | null", "started_at": "ISO", "finished_at": "ISO | null", "rpe": "1-10 | null", "notes": "string (máx. 1000) | null" }
```

`id` y `started_at` son obligatorios; `finished_at` ≥ `started_at`.

- **`routine_id`:** si no es una rutina del alumno (ajena, o borrada antes de que el celular sincronice) la sesión se guarda con `routine_id = null`; el request no se rechaza.
- **201** `{ data: session }` si el `id` es nuevo.
- **200** si el `id` ya existe y es del alumno (reintento): se completan `finished_at`, `rpe` y `notes` que vengan **solo si en la base están en `null`**: nunca se pisa un valor ya guardado (las correcciones van por `PATCH`), y si no hay nada para completar se devuelve la sesión tal cual. `started_at` y `routine_id` quedan como estaban (si llegan distintos se ignoran). Un `finished_at` anterior al `started_at` guardado se ignora y se guardan los demás campos.
- **409** `SESSION_ID_CONFLICT` si el `id` es de otro alumno.

`session` = `{ id, student_id, routine_id, started_at, finished_at, rpe, notes, has_modifications }`.

### POST /sessions/:id/sets

Registra series en lote (modo offline). Solo alumnos, sobre sus propias sesiones. **Idempotente por `id` de cada serie**: reenviar el lote no duplica nada y reenviar una serie con datos nuevos la corrige. Se aceptan series aunque la sesión ya esté cerrada.

**Reemplaza** a `POST /session-sets` y a la forma "una serie por request" del contrato propuesto en la spec de sesión activa (§8): el celular manda todas las series juntas.

**Body:** `{ "sets": [ ... ] }` con 1 a 100 series.

```json
{
  "sets": [
    {
      "id": "uuid",
      "exercise_id": "uuid (el ejercicio realmente hecho)",
      "original_exercise_id": "uuid | null (el planificado, si hubo sustitución)",
      "routine_exercise_id": "uuid | null",
      "set_number": 1,
      "actual_reps": 8,
      "actual_kg": 80,
      "completed": true,
      "executed_at": "ISO 8601 con zona"
    }
  ]
}
```

`set_number` entero 1-100, `actual_reps` entero 0-1000 (0 = serie fallida), `actual_kg` 0-1000 o `null` (peso corporal), `completed` opcional (por defecto `true`). `executed_at` se guarda tal cual, sin chequear fechas futuras.

**Response 200** (siempre, si la sesión es válida; las series válidas se guardan aunque otras fallen)

```json
{
  "data": {
    "saved": [{ "id": "uuid", "created": true }],
    "failed": [{ "id": "uuid", "index": 3, "code": "EXERCISE_NOT_FOUND", "message": "…" }]
  }
}
```

`created` es `false` si la serie ya existía en esta sesión (se actualizó). `index` es la posición en `sets`. Los `id` vuelven en minúscula, aunque se hayan mandado en mayúscula.

**Qué hace el cliente con la respuesta:** un 200 no significa que todo se sincronizó. Las series en `failed` con `VALIDATION_ERROR`, `EXERCISE_NOT_FOUND` o `SET_ID_CONFLICT` son **permanentes**: reenviarlas da lo mismo, así que no se reintentan para siempre (se descartan o se marcan como error local). Si falla el request entero, depende del error:

- **sin red o 5xx:** se reintenta **todo el lote** (es idempotente, no duplica nada). El guardado no es atómico: si el request falla a medias pueden haber quedado series guardadas, y reenviar el lote igual es seguro;
- **404 `SESSION_NOT_FOUND`:** la sesión todavía no se subió; primero `POST /sessions` y después las series;
- **400 y 403:** no se reintentan (error del cliente o rol equivocado; reenviar da lo mismo).

**Códigos por serie (`failed`)**

| code | Cuándo |
|---|---|
| `VALIDATION_ERROR` | datos inválidos (el mensaje nombra el campo) o `id` repetido dentro del lote |
| `EXERCISE_NOT_FOUND` | `exercise_id` u `original_exercise_id` que el alumno no puede ver (ni globales ni de su entrenador) |
| `SET_ID_CONFLICT` | el `id` ya existe en **otra** sesión (también si apareció allí mientras se guardaba el lote); no se toca la fila. Un `id` que quedó guardado en **esta** sesión (p. ej. dos copias del mismo lote a la vez) nunca da este error: se actualiza |

Un `routine_exercise_id` que no pertenece a la rutina de la sesión (o la sesión no tiene rutina) **no falla**: la serie se guarda con `routine_exercise_id = null`.

**Errores del request:** 400 `VALIDATION_ERROR` si `sets` no es un arreglo de 1 a 100; 404 `SESSION_NOT_FOUND` si la sesión no existe o es de otro alumno.

> **Sustitución:** si alguna serie guardada tiene `original_exercise_id` no nulo y distinto de `exercise_id`, la sesión queda con `has_modifications = true` (nunca vuelve a `false` sola). La notificación al PT llega con la tarjeta de push.

### PATCH /sessions/:id

Cierra la sesión o corrige el feedback. Solo alumnos, sobre sus propias sesiones.

**Body:** al menos uno de `finished_at` (ISO, ≥ `started_at`), `rpe` (entero 1-10) y `notes` (máx. 1000). Se puede repetir (corregir RPE o notas). Los campos en `null` se ignoran (como ausentes); si todos vienen en `null` o el body está vacío, 400.

**Response 200:** `{ data: session }`. Sesión ajena o inexistente: 404 `SESSION_NOT_FOUND`.

### GET /students/:id/sessions

> Pendiente (tarjeta 12).

Historial. Trainer ve sus alumnos, alumno ve las suyas.

### PATCH /sessions/:id/comment

> Pendiente (tarjeta 12).

Trainer agrega comentario a una sesión. Body: `trainer_comment`.

---

## Módulo: Progreso

Roles `trainer` y `student`. La autorización vive en el service (ADR 0001). Métrica por defecto: ver [ADR 0004](../adr/0004-metrica-de-progreso.md).

### GET /progress/overview

Resumen para la vista de progreso: los ejercicios que el alumno entrenó y su volumen semanal. Mismas reglas de permiso que `GET /progress/exercise/:exerciseId`.

**Query:** `student_id` (UUID), `from`, `to` (`YYYY-MM-DD`, inclusivos, hora argentina; opcionales).

- **Alumno:** `student_id` opcional (por defecto, él mismo); el de otro alumno → 403.
- **Trainer:** `student_id` obligatorio (400 `VALIDATION_ERROR` si falta) y tiene que ser alumno suyo (si no, 403).
- UUID o fecha mal formados, o `from > to` → 400 `VALIDATION_ERROR`.
- `from` no puede quedar a más de 3 años (1095 días) de `to`, o de hoy en hora argentina si no hay `to` → 400 `VALIDATION_ERROR` sobre `from` ("El rango no puede superar 3 años"). Acota las filas de `weekly_volume` (una por semana). `GET /progress/exercise` no tiene este tope.

**200 OK**

```json
{
  "data": {
    "exercises": [
      { "id": "uuid", "name": "Press de banca", "muscle_group": "chest", "days": 18, "last_date": "2026-10-27" }
    ],
    "weekly_volume": [
      { "week_start": "2026-10-20", "volume_kg": 5230.5, "sessions": 3 },
      { "week_start": "2026-10-27", "volume_kg": 0, "sessions": 0 }
    ]
  }
}
```

- `exercises`: todos los ejercicios con al menos una serie que cuenta (`completed` y `actual_reps > 0`), **sin filtrar por rango**. `days` = días distintos (hora argentina) con ese ejercicio. Orden: `last_date` descendente y después `name`.
- `weekly_volume`: una fila por semana completa (lunes a domingo, hora argentina), ascendente, desde la semana de `from` hasta la de `to` (o la actual). La primera y la última semana incluyen todo su volumen aunque `from`/`to` caigan a mitad de semana (la web alinea `from` al lunes). Sin `from`, arranca en la semana de la primera serie que cuenta (`completed` y `actual_reps > 0`). `volume_kg` = Σ `actual_reps × actual_kg` de las series que cuentan (kg nulo cuenta 0), a 1 decimal; `sessions` = sesiones distintas con alguna serie que cuenta. Las semanas sin series vienen en 0. Sin ninguna sesión y sin `from` → `[]`.

### GET /progress/exercise/:exerciseId

Curva de carga de un ejercicio: un punto por día con series que cuentan (`completed` y `actual_reps > 0`), agrupado por día calendario argentino de `sessions.started_at`.

**Query:** `student_id` (UUID), `from`, `to` (`YYYY-MM-DD`, inclusivos, hora argentina). `from` y `to` son opcionales (omitidos → todo el historial). Un UUID o una fecha mal formados → 400 `VALIDATION_ERROR`.

- **Alumno:** `student_id` opcional (por defecto, él mismo); el de otro alumno → 403.
- **Trainer:** `student_id` obligatorio (400 `VALIDATION_ERROR` si falta) y tiene que ser alumno suyo (si no, 403).
- `exerciseId` tiene que ser global o del trainer del alumno; si no, 404 `EXERCISE_NOT_FOUND`.
- `from > to` → 400 `VALIDATION_ERROR`.

**200 OK**

```json
{
  "data": {
    "exercise": { "id": "uuid", "name": "Press de banca", "muscle_group": "chest" },
    "points": [
      { "date": "2026-10-20", "max_kg": 62.5, "volume_kg": 1875, "e1rm_kg": 83.3, "sets": 3, "reps": 30 },
      { "date": "2026-10-27", "max_kg": 70, "volume_kg": 1680, "e1rm_kg": 88.7, "sets": 3, "reps": 24 }
    ],
    "pr": {
      "max_kg": { "value": 70, "date": "2026-10-27" },
      "e1rm_kg": { "value": 88.7, "date": "2026-10-27" }
    },
    "default_metric": "e1rm_kg"
  }
}
```

- `points`: ascendente por `date`. `max_kg` = mayor `actual_kg` (`null` si ninguna serie tiene kg); `volume_kg` = Σ `actual_reps × actual_kg` (kg nulo cuenta 0); `e1rm_kg` = máximo por serie de Epley (`reps = 1 → kg`; `reps > 1 → kg × (1 + reps/30)`), contando solo series de hasta 12 repeticiones y con kg mayor a 0 (las de más no aportan al 1RM pero sí a `max_kg`, `volume_kg`, `sets` y `reps`; un día con solo series de más de 12 trae `e1rm_kg: null`); `sets` y `reps` = cantidad de series y suma de repeticiones. Números a 1 decimal.
- `pr`: mayor `max_kg` y mayor `e1rm_kg` del rango, con su fecha (la primera en alcanzarse); `null` cada uno si no hay valores. Sin series: `points: []` y `pr: { max_kg: null, e1rm_kg: null }`.
- `default_metric`: métrica que los clientes grafican por defecto, en escalones: `e1rm_kg` si algún punto lo tiene mayor a 0; si no, `max_kg` si algún punto tiene `max_kg > 0` (ejercicios con peso hechos siempre con más de 12 repeticiones); si no, `reps` (peso corporal, como dominadas o flexiones, con `actual_kg` nulo o 0). Sin puntos: `e1rm_kg`.
- Una serie sustituida cuenta para el ejercicio realmente hecho, no para el original.

### GET /progress/body/:studentId

Evolución corporal. Mismo permiso que `GET /students/:id/metrics` (alumno a sí mismo, trainer a sus alumnos; si no, 403).

**200 OK**

```json
{
  "data": {
    "points": [ { "id": "uuid", "recorded_at": "2026-10-01T12:00:00Z", "weight_kg": 80, "bmi": 24.9 } ],
    "summary": {
      "weight_kg": { "first": 80, "last": 76.5, "delta": -3.5 },
      "height_cm": { "first": 180, "last": 180, "delta": 0 },
      "body_fat_pct": null,
      "waist_cm": null,
      "hip_cm": null,
      "chest_cm": null,
      "bmi": { "first": 24.7, "last": 23.6, "delta": -1.1 }
    }
  }
}
```

- `points`: filas iguales a las de `GET /students/:id/metrics` (todas las columnas de medida, ascendente, con `bmi`).
- `summary`: claves `weight_kg`, `height_cm`, `body_fat_pct`, `waist_cm`, `hip_cm`, `chest_cm` y `bmi`; todas siempre presentes, con `null` (el campo nunca se cargó) o `{ first, last, delta }` (primer y último valor no nulo, diferencia a 1 decimal). Sin medidas: `points: []` y las siete claves `null`.

---

## Módulo: Gamificación

### GET /students/:id/achievements

Logros desbloqueados por el alumno.

**200 OK**

```json
{
  "data": [
    {
      "id": "uuid",
      "achievement": {
        "code": "FIRST_PR",
        "name": "Primer PR",
        "description": "Lograste tu primer Personal Record",
        "icon_url": "https://...",
        "category": "pr"
      },
      "unlocked_at": "2026-04-08T18:30:00Z",
      "context": { "exercise": "Press banca", "kg": 90 }
    }
  ]
}
```

### GET /students/:id/streak

Racha actual del alumno.

**200 OK**

```json
{
  "data": {
    "current_streak_days": 12,
    "longest_streak_days": 21,
    "last_session_date": "2026-04-08"
  }
}
```

### GET /challenges

Lista challenges disponibles (globales + del trainer). Query: `goal_type`, `active_only`.

### POST /challenges

Solo trainer. Crea un desafío personalizado para asignar a alumnos.

**Body**

```json
{
  "name": "12 sesiones en 30 días",
  "description": "Cumplí con tu plan completo",
  "goal_type": "sessions_count | weight_target | streak | volume",
  "goal_value": 12,
  "duration_days": 30,
  "reward_achievement_id": "uuid (opcional)"
}
```

### POST /students/:id/challenges

Asigna un challenge a un alumno (lo puede asignar el PT o tomarlo el alumno mismo).

**Body:** `{ "challenge_id": "uuid" }`

### GET /students/:id/challenges

Lista challenges activos y completados del alumno con su progreso.

**200 OK**

```json
{
  "data": [
    {
      "id": "uuid",
      "challenge": { /* datos del challenge */ },
      "started_at": "2026-04-01T00:00:00Z",
      "ends_at": "2026-05-01T00:00:00Z",
      "current_progress": 8,
      "goal_value": 12,
      "progress_pct": 66.7,
      "status": "active"
    }
  ]
}
```

---

## Módulo: Chat IA del alumno

### POST /chat

Envía un mensaje al asistente IA en sesión.

**Headers:** `Authorization: Bearer <token>` (rol: alumno)

**Body**

```json
{
  "session_id": "uuid",
  "message": "string (1–500 chars)",
  "context": {
    "current_exercise_id": "uuid (opcional)",
    "gym_equipment": ["barbell", "dumbbell", "cable"]
  }
}
```

**200 OK** — `{ message_id, response, suggestions[] }`

**Errores:** `503 AI_UNAVAILABLE` (n8n timeout 10s), `400 SESSION_FINISHED`, `503 OFFLINE_MODE` (sin conexión)

---

## Módulo: Notificaciones

### GET /notifications

Lista notificaciones del usuario. Query: `unread_only`, `limit`.

Tipos: `inactivity`, `appointment`, `comment`, `pr`, `achievement`, `routine_modified`.

### PATCH /notifications/:id/read

Marca como leída. **204 No Content**

---

## Health checks

### GET /health

**200 OK** — `{ status, timestamp, version }`

### GET /health/db

**200 OK** — `{ db: "connected", latency_ms }`

---

> **Nota:** Esta es la versión 1.1 del contrato (Abril 2026). Cambios respecto a v1.0:
> - Añadidos endpoints de plantillas de rutinas (`/routine-templates`: CRUD, `from-routine` e `instantiate` como copia, sin `customizations`).
> - Añadidos `PATCH` y `DELETE /routines/:id/exercises/:routineExerciseId`.
> - Añadido módulo completo de Asistente IA del entrenador (`/trainer-ai/*`).
> - Añadido módulo completo de Gamificación (`/students/:id/achievements`, `/streak`, `/challenges`).
> - Modificado `POST /invitations` para soportar canal `whatsapp | qr | both`.
> - Las series se registran con `POST /sessions/:id/sets` (lote, con sustituciones vía `original_exercise_id`).
> - Cualquier cambio futuro en endpoints existentes debe ser discutido entre los integrantes para no romper el cliente que ya lo usa.
