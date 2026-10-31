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
- **201** `{ data: session }` si el `id` es nuevo (con `unlocked_achievements`, ver abajo).
- **200** si el `id` ya existe y es del alumno (reintento): se completan `finished_at`, `rpe` y `notes` que vengan **solo si en la base están en `null`**: nunca se pisa un valor ya guardado (las correcciones van por `PATCH`), y si no hay nada para completar se devuelve la sesión tal cual. `started_at` y `routine_id` quedan como estaban (si llegan distintos se ignoran). Un `finished_at` anterior al `started_at` guardado se ignora y se guardan los demás campos.
- **409** `SESSION_ID_CONFLICT` si el `id` es de otro alumno.

`session` = `{ id, student_id, routine_id, started_at, finished_at, rpe, notes, has_modifications }`.

**Logros:** si la sesión queda **cerrada** (llega con `finished_at`, o el reintento lo completa) el backend evalúa los logros, igual que el `PATCH`, y suma `unlocked_achievements` dentro de `data` (es el flujo del celular offline: sube la sesión ya cerrada). Si queda abierta, o si la evaluación falla (se loguea y la sesión se guarda igual), el arreglo es `[]`.

```json
{
  "data": {
    "id": "uuid",
    "student_id": "uuid",
    "routine_id": null,
    "started_at": "2026-10-27T10:00:00-03:00",
    "finished_at": "2026-10-27T11:00:00-03:00",
    "rpe": 7,
    "notes": null,
    "has_modifications": false,
    "unlocked_achievements": [
      { "code": "FIRST_SESSION", "name": "Primera sesión", "category": "milestone" }
    ]
  }
}
```

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
    "failed": [{ "id": "uuid", "index": 3, "code": "EXERCISE_NOT_FOUND", "message": "…" }],
    "unlocked_achievements": [
      { "code": "FIRST_PR", "name": "Primer récord", "category": "pr" }
    ]
  }
}
```

`unlocked_achievements` (aditivo, dentro de `data`): si la sesión ya está **cerrada** y se guardó al menos una serie, el backend reevalúa los logros (las series pueden crear récords) y devuelve los recién desbloqueados; en cualquier otro caso (sesión abierta, ninguna serie guardada o evaluación fallida) es `[]`.

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

> **Sustitución:** si alguna serie guardada tiene `original_exercise_id` no nulo y distinto de `exercise_id`, la sesión queda con `has_modifications = true` (nunca vuelve a `false` sola). Al pasar a `true` por primera vez se crea la notificación `routine_modified` para el PT (ver Módulo: Notificaciones).

### PATCH /sessions/:id

Cierra la sesión o corrige el feedback. Solo alumnos, sobre sus propias sesiones.

**Body:** al menos uno de `finished_at` (ISO, ≥ `started_at`), `rpe` (entero 1-10) y `notes` (máx. 1000). Se puede repetir (corregir RPE o notas). Los campos en `null` se ignoran (como ausentes); si todos vienen en `null` o el body está vacío, 400.

**Response 200:** `{ data }` con la sesión **más** `unlocked_achievements` dentro de `data`: los logros que se desbloquearon con este cierre (arreglo vacío si no hubo o si el body no trae `finished_at`). Si la evaluación de logros falla, el cierre responde igual con `[]` (se loguea). Sesión ajena o inexistente: 404 `SESSION_NOT_FOUND`.

```json
{
  "data": {
    "id": "uuid",
    "student_id": "uuid",
    "routine_id": "uuid",
    "started_at": "2026-10-27T10:00:00-03:00",
    "finished_at": "2026-10-27T11:00:00-03:00",
    "rpe": 7,
    "notes": null,
    "has_modifications": false,
    "unlocked_achievements": [
      { "code": "FIRST_SESSION", "name": "Primera sesión", "category": "milestone" }
    ]
  }
}
```

### GET /students/:id/sessions

Historial de sesiones del alumno, más recientes primero (`started_at` descendente, desempate por `id`). Roles: `trainer` (solo sus alumnos) y `student` (solo él mismo); si no → 403 `FORBIDDEN`. `id` que no es UUID → 400 `VALIDATION_ERROR`.

**Query:** `page` (desde 1, default 1) y `limit` (default 20, máximo 100). Valores inválidos caen al default.

**Response 200:**

```json
{ "data": [{
    "id": "uuid", "started_at": "ISO", "finished_at": "ISO|null", "duration_min": 54,
    "routine": { "id": "uuid", "name": "Push · día 3" },
    "rpe": 8, "notes": "…", "trainer_comment": "…|null", "has_modifications": false,
    "sets": 18, "volume_kg": 4210.5, "has_pr": true
  }],
  "meta": { "total": 57, "page": 1, "limit": 20, "total_pages": 3 } }
```

- `duration_min`: minutos enteros entre `started_at` y `finished_at`; `null` si la sesión no se cerró.
- `routine`: `null` si la sesión no tiene rutina o se borró.
- `sets`: series completadas con `actual_reps > 0`; `volume_kg`: suma de `actual_reps × actual_kg` (kg nulo cuenta 0) de esas series, a 1 decimal.
- `has_pr`: la sesión tiene al menos un récord personal. Un ejercicio es récord si su mejor 1RM estimado (Epley: `reps = 1 → kg`, `reps > 1 → kg × (1 + reps/30)`; solo cuentan series de hasta 12 repeticiones, porque Epley sobreestima por encima de eso y daría récords falsos) supera estrictamente al de todas las sesiones anteriores del alumno; la primera vez que hace un ejercicio no cuenta.
- `trainer_comment` es el comentario del entrenador y **lo ve el alumno** en su historial.
- **Campos que pueden ser `null`:** `finished_at`, `duration_min`, `routine`, `rpe`, `notes` y `trainer_comment`. La lista incluye sesiones todavía no cerradas (`finished_at: null`, y con él `duration_min: null`).

### GET /students/:id/sessions/:sessionId

Mismos roles y permisos. La sesión tiene que ser de ese alumno; si no existe o es de otro → 404 `SESSION_NOT_FOUND`. `id` o `sessionId` que no son UUID → 400 `VALIDATION_ERROR`.

**Response 200:** `{ data }` con el resumen de arriba más `exercises`:

```json
"exercises": [{
  "exercise": { "id": "uuid", "name": "Press de banca" },
  "original_exercise": { "id": "uuid", "name": "Press con mancuernas" },
  "planned": { "sets": 4, "reps": 10, "suggested_kg": 60 },
  "is_pr": true,
  "sets": [{ "id": "uuid", "set_number": 1, "actual_reps": 10, "actual_kg": 62.5, "completed": true, "executed_at": "ISO" }]
}]
```

- Agrupado por ejercicio realmente hecho (y por `original_exercise_id` si fue sustitución), en el orden del primer `executed_at`.
- `original_exercise`: `null` si no hubo sustitución.
- `planned`: plan **actual** de la rutina (`sets`, `reps`, `suggested_kg`) vía `routine_exercise_id`; `null` si la serie no tiene enlace.
- `is_pr`: el ejercicio fue récord en esa sesión.
- **Campos que pueden ser `null`:** los del resumen (`finished_at`, `duration_min`, `routine`, `rpe`, `notes`, `trainer_comment`), `original_exercise`, `planned` (y dentro de él, `sets`, `reps` y `suggested_kg` por separado) y, en cada serie, `actual_reps` y `actual_kg`.

### PATCH /sessions/:id/comment

El entrenador comenta una sesión de uno de sus alumnos. Solo `trainer` (alumno → 403 `FORBIDDEN`).

**Body:** `{ "trainer_comment": "string de hasta 1000 | null" }`. `""`, solo espacios o `null` borran el comentario (se guarda `null`); el resto se guarda recortado (`trim`); cualquier otro tipo o más de 1000 caracteres → 400 `VALIDATION_ERROR` sobre `trainer_comment`.

**Response 200:** `{ data }` con el resumen de la sesión (misma forma que un ítem de `GET /students/:id/sessions`, ya con el comentario). Sesión inexistente o de un alumno de otro entrenador → 404 `SESSION_NOT_FOUND` (nunca 403, para no revelar qué ids existen). El alumno ve el comentario en su historial.

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
- `to` no puede ser posterior a mañana en hora argentina (un día de margen) → 400 `VALIDATION_ERROR` sobre `to` ("La fecha `to` no puede ser futura"). Junto con el tope de `from`, acota `weekly_volume` aunque no se mande `from` (`?to=9999-12-31` se rechaza).

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

Logros, racha y desafíos. Todos los endpoints piden `Authorization: Bearer <token>` y responden `{ data }`. La regla de la racha está en [[adr/0005-racha-contra-dias-asignados|ADR 0005]]. Los permisos sobre un alumno siguen la regla de siempre: `trainer` solo sobre sus alumnos, `student` solo sobre sí mismo; ajeno o inexistente → 403 `FORBIDDEN`. Un `:id` que no es UUID → 400 `VALIDATION_ERROR`.

### GET /achievements

Catálogo de logros. Roles: `trainer` y `student`. Ordenado por `category` y `code`.

**200 OK**

```json
{
  "data": [
    {
      "id": "uuid", "code": "FIRST_SESSION", "name": "Primera sesión",
      "description": "Cerraste tu primera sesión de entrenamiento",
      "icon_url": null, "category": "milestone",
      "criteria": { "type": "sessions_count", "value": 1 }
    }
  ]
}
```

`icon_url` es `null` en el catálogo inicial: el cliente elige el ícono según `category`. Tipos de `criteria`: `sessions_count {value}`, `streak {days}`, `pr_count {value}`, `full_week {count}` y `challenge {}` (el logro "Desafío cumplido" no lo otorga el evaluador sino un desafío completado).

### GET /students/:id/achievements

Logros desbloqueados por el alumno, el más reciente primero. Roles: `trainer` (dueño) y `student` (el propio).

**200 OK**

```json
{
  "data": [
    {
      "id": "uuid",
      "achievement": {
        "code": "FIRST_PR",
        "name": "Primer récord",
        "description": "Lograste tu primer récord personal",
        "icon_url": null,
        "category": "pr"
      },
      "unlocked_at": "2026-04-08T18:30:00Z",
      "context": { "session_id": "uuid", "exercise_id": "uuid" }
    }
  ]
}
```

`context` depende del logro: `{ session_id }` en general y `{ session_id, exercise_id }` en los de récords. Un logro se desbloquea una sola vez por alumno.

### GET /students/:id/streak

Racha del alumno (ver ADR 0005). Mismos roles y permisos. Lee `student_streaks`; si el alumno todavía no tiene fila, la calcula y la guarda.

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

`last_session_date` es `null` si el alumno nunca cerró una sesión.

### GET /challenges

Desafíos que puede ver el usuario: globales (`trainer_id: null`) y los del entrenador; un alumno ve los globales y los de su entrenador. Roles: `trainer` y `student`. Los globales salen primero y después los propios, cada grupo ordenado por nombre.

**Query:** `goal_type` (`sessions_count | weight_target | streak | volume`; otro valor → 400 `VALIDATION_ERROR`). `active_only` se **acepta y se ignora**: `challenges` no tiene estado de vigencia, todos están disponibles.

**200 OK**

```json
{
  "data": [{
    "id": "uuid", "trainer_id": null, "name": "12 sesiones en 30 días",
    "description": "Cerrá 12 sesiones de entrenamiento en 30 días.",
    "goal_type": "sessions_count", "goal_value": 12, "duration_days": 30,
    "reward_achievement_id": null
  }]
}
```

### POST /challenges

Solo `trainer` (alumno → 403 `FORBIDDEN`). Crea un desafío propio.

**Body**

```json
{
  "name": "12 sesiones en 30 días",
  "description": "Cumplí con tu plan completo",
  "goal_type": "sessions_count | weight_target | streak | volume",
  "goal_value": 12,
  "duration_days": 30,
  "reward_achievement_id": "uuid (opcional, o null)"
}
```

- `name`: 1 a 100 caracteres. `description`: opcional, hasta 1000 o `null`. `goal_value`: número mayor a 0. `duration_days`: entero de 1 a 365 (obligatorio: define `ends_at` al asignarlo). `reward_achievement_id`: uuid de un logro existente.
- Campo inválido → 400 `VALIDATION_ERROR` con `details`; un `reward_achievement_id` que no existe también.

**201 Created:** `{ data }` con el desafío (misma forma que un ítem de `GET /challenges`, con `trainer_id` del entrenador).

### PATCH /challenges/:id

Solo `trainer`, sobre un desafío **propio**. Body parcial con cualquiera de los campos de `POST /challenges` (al menos uno, si no 400 `VALIDATION_ERROR`). Un desafío global, de otro entrenador o inexistente → 404 `CHALLENGE_NOT_FOUND`. Editarlo no cambia las asignaciones ya hechas (`ends_at` queda como estaba). Si cambia `goal_type` o `goal_value` (con un valor distinto del actual) y el desafío tiene asignaciones **activas** → 409 `CHALLENGE_IN_USE`: la meta nueva recalcularía el progreso de quienes ya lo están haciendo.

**200 OK:** `{ data }` con el desafío actualizado.

### DELETE /challenges/:id

Solo `trainer`, sobre un desafío propio. Si tiene **alguna** asignación (activa, completada, fallida o abandonada) → 409 `CHALLENGE_IN_USE`, para no perder el historial de los alumnos (`student_challenges` borra en cascada). Global, ajeno o inexistente → 404 `CHALLENGE_NOT_FOUND`.

**204 No Content.**

### POST /challenges/:id/assignments

Solo `trainer`. Asigna el desafío (global o propio) a varios alumnos suyos.

**Body:** `{ "student_ids": ["uuid", …] }` — de 1 a 50 uuids sin repetir; si no, 400 `VALIDATION_ERROR`. Desafío ajeno o inexistente → 404 `CHALLENGE_NOT_FOUND`.

**201 Created**

```json
{ "data": {
  "created": [ /* asignaciones, misma forma que GET /students/:id/challenges */ ],
  "skipped": [ { "student_id": "uuid", "reason": "not_your_student | already_active" } ]
} }
```

`started_at` es el momento de la asignación y `ends_at = started_at + duration_days`. Un alumno inactivo o que no es del entrenador se saltea con `not_your_student`; uno que ya tiene el desafío activo, con `already_active`.

### POST /students/:id/challenges

Asigna un desafío a un alumno: lo puede asignar el `trainer` dueño o tomarlo el propio `student`.

**Body:** `{ "challenge_id": "uuid" }`. El desafío tiene que ser global o del entrenador del alumno; si no existe o no es visible → 404 `CHALLENGE_NOT_FOUND`. Si el alumno ya lo tiene activo → 409 `CHALLENGE_ALREADY_ACTIVE`. `challenge_id` inválido → 400 `VALIDATION_ERROR`.

**201 Created:** `{ data }` con la asignación (misma forma que un ítem de `GET /students/:id/challenges`).

### GET /students/:id/challenges

Desafíos del alumno (activos, completados y fallidos), el más nuevo primero. Roles: `trainer` (dueño) y `student` (el propio).

**200 OK**

```json
{
  "data": [
    {
      "id": "uuid",
      "challenge": {
        "id": "uuid", "name": "12 sesiones en 30 días", "description": "…",
        "goal_type": "sessions_count", "goal_value": 12, "duration_days": 30,
        "reward_achievement_id": null
      },
      "started_at": "2026-04-01T00:00:00Z",
      "ends_at": "2026-05-01T00:00:00Z",
      "current_progress": 8,
      "goal_value": 12,
      "progress_pct": 66.7,
      "status": "active",
      "completed_at": null
    }
  ]
}
```

- `status`: `active | completed | failed | abandoned`. `completed_at` es `null` mientras no se completa.
- El progreso cuenta lo hecho dentro de la ventana `started_at`–`ends_at`: `sessions_count` = sesiones cerradas; `volume` = Σ repeticiones × kg de las series completadas; `streak` = mejor racha dentro de la ventana; `weight_target` = último peso registrado. Se recalcula al cerrar una sesión y en el job diario.
- `progress_pct` = `min(100, current_progress / goal_value × 100)` a 1 decimal; vale `100` solo si el desafío está `completed` (una meta casi cumplida se topa en `99.9`). En `weight_target` es la distancia recorrida desde el peso inicial sobre la distancia total (`0` si no hay mediciones); la dirección (bajar o subir) se infiere del peso inicial contra la meta, y `current_progress` es el último peso.
- Al alcanzar la meta pasa a `completed` y, si el desafío tiene `reward_achievement_id`, se otorga ese logro. Un desafío activo vencido sin meta pasa a `failed` en el job diario.

> **Job diario:** corre a las 03:00 (hora de Buenos Aires) dentro del server si `CRON_ENABLED` no es `false` (apagado en tests), o a mano con `npm run gamification:daily`. Recalcula racha, logros y desafíos de los alumnos activos y marca `failed` los desafíos vencidos. Es idempotente.

> **Errores propios del módulo:** 404 `CHALLENGE_NOT_FOUND`, 409 `CHALLENGE_IN_USE`, 409 `CHALLENGE_ALREADY_ACTIVE`; además 400 `VALIDATION_ERROR` y 403 `FORBIDDEN` como en el resto de la API.

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

La tabla `notifications` es la fuente de verdad; el push al celular es un aviso aparte y best-effort ([[adr/0006-notificaciones-tabla-fuente-de-verdad-fcm-v1|ADR 0006]]). Todos los endpoints piden `Authorization: Bearer <token>`, roles `trainer` y `student`, y trabajan **solo con las notificaciones y tokens del usuario autenticado**. Sin token → 401 `UNAUTHORIZED`; con un dato inválido → 400 `VALIDATION_ERROR`.

### GET /notifications

Lista las notificaciones propias, las más nuevas primero (`created_at` desc).

**Query (todos opcionales)**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `unread_only` | `"true"` o `"false"` | Solo las no leídas. Por defecto `false` |
| `limit` | entero 1–100 | Tamaño de página. Por defecto 20 |
| `before` | ISO 8601 con zona | Cursor: solo las creadas **antes** de esa fecha (exclusivo). Se obtiene de `meta.next_before` |

**200 OK**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "inactivity",
      "title": "Juan Pérez no entrena hace 10 días",
      "body": "Se salteó 4 días de su rutina. Escribile para retomar.",
      "data": { "student_id": "uuid", "missed_days": 4, "days_since": 10 },
      "read": false,
      "created_at": "2026-10-30T06:00:00.123456+00:00"
    }
  ],
  "meta": { "unread_count": 3, "next_before": "2026-10-29T06:00:00.123456+00:00" }
}
```

- `body` puede ser `null`.
- `meta.unread_count` es el total de no leídas del usuario, sin importar `unread_only`, `limit` ni `before` (sirve para el globito de la campanita).
- `meta.next_before` es el `created_at` de la última notificación de la página cuando la página vino llena (`data.length === limit`); `null` si no hay más. Es un cursor opaco: se pasa tal cual en el `before` de la próxima llamada.
- **`next_before` termina en `+00:00`: el `+` hay que codificarlo en la URL (`%2B`)**; si no, el servidor lo lee como un espacio y responde 400 `VALIDATION_ERROR`. Con `URLSearchParams` o `encodeURIComponent` se resuelve solo: `?before=2026-10-29T06%3A00%3A00.123456%2B00%3A00`.
- Errores de validación: `unread_only` distinto de `true`/`false`, `limit` fuera de 1–100 o no entero, `before` que no sea una fecha ISO con zona.

**Tipos y cuándo se crean**

| `type` | Cuándo se crea | Para quién | Push | `data` |
|---|---|---|---|---|
| `inactivity` | Job nocturno (03:00 ART): el alumno (con rutina activa) acumula 3 o más días asignados sin entrenar; máximo una por alumno cada 7 días, contados por fecha de Buenos Aires (ver CU-10 en [[producto/casos-de-uso\|Casos de uso]]) | PT del alumno | PT | `student_id`, `missed_days`, `days_since` |
| `routine_modified` | Una sesión pasa a tener sustituciones (`has_modifications`); una sola vez por sesión | PT del alumno | PT | `student_id`, `session_id` |
| `pr` | Se cierra una sesión con récords; una por sesión | Alumno y PT del alumno | Alumno (el PT solo la ve en la lista) | `student_id`, `session_id`, `exercise_ids` |
| `achievement` | Se desbloquea un logro al cerrar una sesión; una por logro, para el alumno y para el PT. Los que desbloquea el job nocturno quedan solo en la base | Alumno y PT del alumno | Alumno (con varios logros en la sesión, un único push resumen); el PT solo la ve en la lista | `student_id`, `achievement_code` |
| `comment` | El PT guarda un comentario de sesión no vacío y distinto del anterior (`PATCH /sessions/:id/comment`) | Alumno | Alumno | `session_id` |
| `appointment` | Reservado para la agenda (otra tarjeta); todavía no se crea | — | — | — |

El campo `data` es siempre un objeto (`{}` si no hay contexto) con los ids que el cliente necesita para navegar: el alumno (`student_id`), la sesión (`session_id`), el logro (`achievement_code`) o los ejercicios (`exercise_ids`, array de uuid). 

**Payload del push.** El mensaje FCM lleva `notification` (`title`, `body`) y un `data` con el de la fila más dos campos: `type` (el tipo de la notificación, para elegir la pantalla) y `notification_id` (el id de la fila, para llamar a `PATCH /notifications/:id/read` al tocarla). Todos los valores viajan como texto, como exige FCM: los arrays y objetos van serializados en JSON (por ejemplo, `exercise_ids` llega como `"[\"uuid-1\",\"uuid-2\"]"` y hay que parsearlo en la app). El push resumen de varios logros no tiene fila: lleva `type: "achievement"` y `student_id`, sin `notification_id`. La fila guardada no cambia: `type` ya es una columna y el id es el de la fila.

### PATCH /notifications/read-all

Marca como leídas todas las no leídas del usuario. **204 No Content**, también si no había ninguna.

> Está declarada antes que `/:id/read` para que no se confunda con el parámetro.

### PATCH /notifications/:id/read

Marca una notificación como leída. **204 No Content** (idempotente).

**Errores:** 400 `VALIDATION_ERROR` (`id` no es UUID), 404 `NOTIFICATION_NOT_FOUND` (no existe o es de otro usuario; no se distingue).

### POST /notifications/tokens

Registra el token de FCM del dispositivo para recibir push. Es un upsert por `token`: si el token ya existía (incluso de otro usuario, por ejemplo cuando dos personas usan el mismo celular) pasa a ser del usuario actual y se actualiza `last_seen_at`. Conviene llamarlo en cada login y cuando FCM renueva el token.

**Body**

```json
{ "token": "string (1–4096 chars)", "platform": "android | web" }
```

**201 Created** si el token era nuevo, **200 OK** si ya existía. En ambos casos:

```json
{ "data": { "token": "…", "platform": "android" } }
```

**Errores:** 400 `VALIDATION_ERROR` (`token` vacío o de más de 4096 caracteres; `platform` distinto de `android`/`web`).

### DELETE /notifications/tokens/:token

Da de baja el token del dispositivo (por ejemplo al cerrar sesión). Solo borra si el token es del usuario autenticado; si no existe o es de otro usuario responde igual. **204 No Content** siempre. El `:token` va codificado en la URL (`encodeURIComponent`).

> El backend también borra solo los tokens que FCM da por inválidos (`UNREGISTERED` o token mal formado); el cliente no tiene que hacer nada.

---

## Módulo: Mensajes

Mensajería interna 1 a 1 entre el PT y cada uno de sus alumnos (tarjeta 48). Una conversación por alumno: el PT es siempre `students.trainer_id`, no se guarda en el mensaje. No es el chat con el asistente IA (`POST /chat`, tabla `chat_messages`). Todos los endpoints piden `Authorization: Bearer <token>`; sin token → 401 `UNAUTHORIZED`. Se actualiza por polling (cada 15 s), no hay tiempo real.

**Mensaje** (forma pública, la misma en todas las respuestas):

```json
{
  "id": "uuid",
  "student_id": "uuid",
  "sender_role": "trainer",
  "body": "¡Buen entrenamiento hoy!",
  "image_url": "https://…/message-images/…?token=…",
  "broadcast_id": null,
  "read_at": null,
  "created_at": "2026-10-31T14:05:00.123456+00:00"
}
```

- `sender_role` es `trainer` o `student`. `body` e `image_url` pueden ser `null`, pero nunca los dos a la vez.
- `image_url` es una URL firmada que vence a la hora (3600 s); el `image_path` del bucket nunca sale. Si hace falta, se vuelve a pedir el historial para obtener una nueva.
- `broadcast_id` lo comparten los mensajes de un mismo envío masivo; `null` si es un mensaje normal.
- `read_at` lo completa el **otro** lado de la conversación al abrirla (`POST /messages/:studentId/read`).

**Reglas de acceso.** El PT solo accede a las conversaciones de sus alumnos; el alumno, solo a la suya (`:studentId` tiene que ser su propio id). Una conversación ajena o inexistente responde igual: 403 `FORBIDDEN`, sin distinguir. Con un `:studentId` que no es UUID → 400 `VALIDATION_ERROR`.

### GET /messages/conversations

Lista las conversaciones del PT: una por alumno **activo**, ordenadas con la más reciente primero (las que no tienen mensajes, al final por nombre). **Rol:** `trainer` (el alumno recibe 403).

**200 OK**

```json
{
  "data": [
    {
      "student": { "id": "uuid", "name": "Juan Pérez", "avatar_url": null },
      "last_message": {
        "body": "Dale, mañana lo hago",
        "has_image": false,
        "sender_role": "student",
        "created_at": "2026-10-31T14:05:00.123456+00:00"
      },
      "unread_count": 2
    }
  ]
}
```

- `last_message` es `null` si todavía no hay mensajes. `body` va completo (el recorte para la lista lo hace la web) y puede ser `null` si el último fue solo una foto (`has_image: true`).
- `unread_count` son los mensajes del alumno sin leer por el PT.

### GET /messages/unread-count

Total de mensajes sin leer para el usuario autenticado (sirve para el globito del menú). **Roles:** `trainer` y `student`.

- Para el PT: mensajes de sus alumnos **activos** sin leer. No cuenta a los inactivos, para que el globito coincida con lo que ve en la lista de conversaciones.
- Para el alumno: mensajes del PT sin leer en su conversación.

**200 OK**

```json
{ "data": { "count": 3 } }
```

### POST /messages/broadcast

Envía el mismo texto a varios alumnos del PT. Crea un mensaje por alumno, todos con el mismo `broadcast_id`, en una sola operación. **Rol:** `trainer`.

**Body** (JSON)

```json
{ "student_ids": ["uuid", "uuid"], "body": "Mañana no hay clase, feriado." }
```

- `student_ids`: lista de 1 a 200 UUID sin repetidos. `body`: obligatorio, 1–2000 caracteres (se recorta).
- Es solo texto; no admite foto.

**201 Created**

```json
{ "data": { "broadcast_id": "uuid", "sent": 2 } }
```

**Errores:** 400 `VALIDATION_ERROR` (lista vacía, de más de 200, ids no UUID o repetidos, `body` vacío o de más de 2000), 403 `FORBIDDEN` (algún id no es un alumno activo del PT: ajeno, inexistente o inactivo; no se envía a nadie), 403 si lo llama un alumno.

### GET /messages/:studentId

Historial de la conversación, paginado hacia atrás. **Roles:** `trainer` (de uno de sus alumnos) y `student` (el propio).

**Query (todos opcionales)**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `limit` | entero 1–100 | Tamaño de página. Por defecto 50 |
| `before` | ISO 8601 con zona | Cursor: solo los creados **antes** de esa fecha (exclusivo). Se obtiene de `meta.next_before` |

**200 OK**

```json
{
  "data": [ { "id": "uuid", "student_id": "uuid", "sender_role": "student", "body": "Hola profe", "image_url": null, "broadcast_id": null, "read_at": "2026-10-31T14:06:00.000000+00:00", "created_at": "2026-10-31T14:00:00.000000+00:00" } ],
  "meta": { "next_before": "2026-10-31T14:00:00.000000+00:00" },
  "counterpart": { "id": "uuid", "name": "Juan Pérez", "avatar_url": null }
}
```

- `data` viene en **orden cronológico** (el más viejo primero), listo para dibujar; la página trae los `limit` más nuevos antes del cursor.
- `meta.next_before` es el `created_at` del mensaje más viejo de la página cuando hay más atrás; `null` si no hay más. Es un cursor opaco: se pasa tal cual en el `before` de la próxima llamada. **Termina en `+00:00`: hay que codificarlo en la URL (`%2B`)** o el servidor responde 400 `VALIDATION_ERROR` (con `URLSearchParams` se resuelve solo).
- `counterpart` es la otra persona de la conversación: el alumno para el PT, el PT para el alumno (sin email).

**Errores:** 400 `VALIDATION_ERROR` (`studentId` no UUID, `limit` fuera de 1–100 o no entero, `before` que no sea una fecha ISO con zona), 403 `FORBIDDEN`.

### POST /messages/:studentId

Envía un mensaje, con texto, con foto o con las dos cosas. **Roles:** `trainer` (a uno de sus alumnos) y `student` (a su PT).

**Body.** `multipart/form-data` con dos campos opcionales (hay que mandar al menos uno):

| Campo | Tipo | Descripción |
|---|---|---|
| `body` | texto | Hasta 2000 caracteres (se recorta; vacío cuenta como ausente) |
| `image` | archivo | Una sola foto JPG, PNG o WebP de hasta 5 MB |

También acepta `application/json` `{ "body": "…" }` para mensajes de solo texto. El tipo de la foto se valida por sus bytes, no por el `Content-Type` ni la extensión que declare el cliente.

**201 Created** con el mensaje creado:

```json
{ "data": { "id": "uuid", "student_id": "uuid", "sender_role": "trainer", "body": "Mirá cómo quedó la rutina", "image_url": "https://…", "broadcast_id": null, "read_at": null, "created_at": "2026-10-31T14:05:00.123456+00:00" } }
```

**Errores**

| Status | Código | Cuándo |
|---|---|---|
| 400 | `MESSAGE_EMPTY` | Sin texto (o solo espacios) y sin foto |
| 400 | `VALIDATION_ERROR` | `body` de más de 2000 caracteres o que no es texto; más de un archivo o archivo en un campo que no es `image`; multipart mal formado (mensaje "Formulario inválido") |
| 403 | `FORBIDDEN` | Conversación ajena o inexistente |
| 413 | `IMAGE_TOO_LARGE` | La foto supera 5 MB |
| 415 | `IMAGE_TYPE_INVALID` | La foto no es JPG, PNG ni WebP (por ejemplo un PDF con `Content-Type: image/png`) |

> Si falla el guardado del mensaje, la foto ya subida se borra del bucket.

### POST /messages/:studentId/read

Marca como leídos los mensajes de la **otra** parte: el PT marca los del alumno y el alumno marca los del PT. Los propios no se tocan. Se llama al abrir la conversación. **Roles:** `trainer` y `student`.

**200 OK** (también si no había nada sin leer: `updated` es 0)

```json
{ "data": { "updated": 2 } }
```

**Errores:** 400 `VALIDATION_ERROR` (`studentId` no UUID), 403 `FORBIDDEN`.

> Las rutas fijas (`/conversations`, `/unread-count`, `/broadcast`) están declaradas antes que `/:studentId` para que no se confundan con el parámetro.

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
