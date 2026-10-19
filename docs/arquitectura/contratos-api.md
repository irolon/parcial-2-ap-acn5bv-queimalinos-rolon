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

Revoca el refresh token. Requiere auth. **204 No Content**

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

Lista alumnos del trainer autenticado.

**Query:** `active`, `search`, `page`, `limit`

**200 OK** — `{ data: [...], meta: { total, page, limit, total_pages } }`

### GET /students/:id

Perfil completo. Trainer ve sus alumnos, alumno ve su perfil.

**200 OK** — incluye `latest_metrics`, `active_routine`, `gym_equipment`, `injuries`, `level`.

### PATCH /students/:id

Actualiza alumno. Solo trainer dueño. Campos opcionales: `name`, `goal`, `active`, `birth_date`, `gym_equipment`, `injuries`, `level`.

### POST /students/:id/metrics

Agrega medición corporal.

**Body:** `weight_kg`, `body_fat_pct`, `waist_cm`, `hip_cm`, `chest_cm`, `recorded_at`.

---

## Módulo: Ejercicios

### GET /exercises

Biblioteca disponible. Query: `muscle_group`, `equipment`, `search`, `include_global`.

### POST /exercises

Crea ejercicio personalizado (solo trainer).

---

## Módulo: Rutinas

### GET /routines

Rutinas del trainer. Query: `student_id`, `active`.

### POST /routines

Crea y asigna rutina. Body: `student_id`, `template_id` (opcional), `name`, `goal`, `days`, `exercises[]`.

### GET /routines/today

Rutina activa del alumno para hoy. Solo alumnos.

**200 OK** — incluye `routine_id`, `name`, `exercises[]` con `last_session_kg` para sugerir carga.

---

## Módulo: Plantillas de rutinas

### GET /routine-templates

Lista plantillas del trainer (manuales y generadas por IA).

**Headers:** `Authorization: Bearer <token>` (rol: trainer)

**Query:** `goal`, `level`, `generated_by_ai`

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
      "created_at": "2026-04-08T10:00:00Z"
    }
  ]
}
```

### POST /routine-templates

Guarda una rutina como plantilla reutilizable.

### POST /routine-templates/:id/instantiate

Crea una rutina concreta a partir de una plantilla, asignándola a un alumno.

**Body:** `{ "student_id": "uuid", "customizations": {...} }`

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

Inicia una sesión. Solo alumnos. Body: `routine_id`.

### POST /session-sets

Registra series ejecutadas en batch (soporta modo offline).

**Body**

```json
{
  "sets": [
    {
      "session_id": "uuid",
      "routine_exercise_id": "uuid",
      "substituted_exercise_id": "uuid (null si no hubo sustitución)",
      "set_number": 1,
      "actual_reps": 8,
      "actual_kg": 80,
      "completed": true,
      "executed_at": "ISO datetime"
    }
  ]
}
```

> Si alguna serie tiene `substituted_exercise_id`, automáticamente la sesión queda con `has_modifications = true` y se notifica al PT.

### PATCH /sessions/:id

Finaliza sesión con feedback. Body: `rpe` (1-10), `notes` (opcional).

### GET /students/:id/sessions

Historial. Trainer ve sus alumnos, alumno ve las suyas.

### PATCH /sessions/:id/comment

Trainer agrega comentario a una sesión. Body: `trainer_comment`.

---

## Módulo: Progreso

### GET /progress/exercise/:exerciseId

Curva de progresión de carga para un ejercicio. Query: `student_id`, `from`, `to`.

**200 OK** — `{ exercise, history[], pr }`

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
> - Añadidos endpoints de plantillas de rutinas (`/routine-templates`).
> - Añadido módulo completo de Asistente IA del entrenador (`/trainer-ai/*`).
> - Añadido módulo completo de Gamificación (`/students/:id/achievements`, `/streak`, `/challenges`).
> - Modificado `POST /invitations` para soportar canal `whatsapp | qr | both`.
> - Modificado `POST /session-sets` para registrar sustituciones de ejercicios (`substituted_exercise_id`).
> - Cualquier cambio futuro en endpoints existentes debe ser discutido entre los integrantes para no romper el cliente que ya lo usa.
