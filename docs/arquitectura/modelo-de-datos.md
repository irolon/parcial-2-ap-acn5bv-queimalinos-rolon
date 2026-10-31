---
title: Modelo de datos (DER)
aliases: [Modelo de datos (DER)]
notion: https://app.notion.com/p/33c5ffbef7b5819f9136f70a90fc7949
notion_editado: 2026-10-13
migrado: 2026-10-17
tags: [arquitectura]
---

# Modelo de datos (DER)

Diagrama de entidad-relación del sistema FitTrainer. Entidades agrupadas por dominio. ⚠️ Actualizado 12/10/2026: la fuente de verdad del modelo implementado es backend/src/database/schema/ (archivos 01 a 07) (19 tablas: estas 18 + refresh_tokens). Desvíos respecto de este DER: session_sets usa exercise_id (not null, ejercicio realmente ejecutado) + original_exercise_id (el planificado si hubo sustitución) en lugar de substituted_exercise_id, y routine_exercise_id es opcional con set null; sessions.routine_id y chat_messages.session_id son nullable con set null; notifications agrega user_role (trainer/student), data (jsonb) y push_sent_at, y se suma la tabla push_tokens (tarjeta 44); el id de sessions y session_sets lo genera el cliente mobile. Todas las tablas tienen RLS activado sin políticas (ADR 0001).

---

## Entidades por dominio

### Usuarios (azul)

**trainers**

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| email | varchar | |
| name | varchar | |
| specialty | varchar | |
| avatar_url | text | |
| created_at | timestamptz | |

**students**

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| trainer_id | uuid | FK → trainers |
| name | varchar | |
| email | varchar | |
| goal | enum | tonify / weight_loss / hypertrophy / strength |
| birth_date | date | |
| avatar_url | text | |
| active | boolean | |
| gym_equipment | text[] | equipamiento disponible — usado por la IA del alumno |
| injuries | text | lesiones / restricciones a tener en cuenta |
| level | enum | beginner / intermediate / advanced |
| created_at | timestamptz | |

**body_metrics**

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| student_id | uuid | FK → students |
| weight_kg | numeric | |
| height_cm | numeric | |
| body_fat_pct | numeric | |
| waist_cm | numeric | |
| hip_cm | numeric | |
| chest_cm | numeric | |
| recorded_at | timestamptz | |

**invitations** *(onboarding por WhatsApp o QR)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| trainer_id | uuid | FK → trainers |
| token | varchar | único, un solo uso |
| student_name | varchar | |
| student_phone | varchar | opcional, para enviar por WhatsApp |
| student_goal | enum | |
| delivery_channel | enum | whatsapp / qr / both |
| expires_at | timestamptz | expira en 72hs |
| used_at | timestamptz | null = no usado aún |

---

### Entrenamiento (verde)

**exercises** *(biblioteca de ejercicios)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| trainer_id | uuid | FK → trainers (null si es global) |
| name | varchar | |
| muscle_group | enum | |
| equipment | varchar | |
| description | text | |
| video_url | text | |
| is_global | boolean | true = disponible para todos los trainers |

**routine_templates** *(plantillas reutilizables del PT, generadas por IA o creadas a mano)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| trainer_id | uuid | FK → trainers |
| name | varchar | |
| goal | enum | |
| level | enum | beginner / intermediate / advanced |
| frequency_per_week | int | |
| generated_by_ai | boolean | true si fue propuesta inicial del asistente IA del entrenador |
| structure | jsonb | estructura completa de la plantilla (días, ejercicios, series, reps) |
| created_at | timestamptz | |

**routines**

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| trainer_id | uuid | FK → trainers |
| student_id | uuid | FK → students |
| template_id | uuid | FK → routine_templates (null si fue manual) |
| name | varchar | |
| goal | enum | |
| days | text[] | ej: ['monday','wednesday','friday'] |
| active | boolean | |
| created_at | timestamptz | |

**routine_exercises** *(tabla pivote N:M)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| routine_id | uuid | FK → routines |
| exercise_id | uuid | FK → exercises |
| sets | int | |
| reps | int | |
| rest_seconds | int | |
| suggested_kg | numeric | |
| tempo | varchar | ej: '3-1-2-0' |
| notes | text | |
| order | int | orden dentro de la rutina |

---

### Sesiones (violeta)

**sessions** *(sesión completada)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| student_id | uuid | FK → students |
| routine_id | uuid | FK → routines |
| started_at | timestamptz | |
| finished_at | timestamptz | |
| rpe | int | escala 1-10 (esfuerzo percibido) |
| notes | text | nota libre del alumno |
| trainer_comment | text | feedback del PT |
| has_modifications | boolean | true si el alumno modificó algo de la rutina original (sustituyó ejercicio, cambió series/reps) |

**session_sets** *(cada serie ejecutada)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| session_id | uuid | FK → sessions |
| exercise_id | uuid | FK → exercises (ejercicio realmente ejecutado) |
| original_exercise_id | uuid | FK → exercises (el planificado; null si no hubo sustitución) |
| routine_exercise_id | uuid | FK → routine_exercises (opcional, set null) |
| set_number | int | |
| actual_reps | int | reps reales ejecutadas |
| actual_kg | numeric | peso real usado |
| completed | boolean | |
| executed_at | timestamptz | |

---

### Gamificación (rojo)

**achievements** *(catálogo global de logros disponibles)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| code | varchar | único, ej: 'FIRST_PR', 'STREAK_7_DAYS' |
| name | varchar | |
| description | text | |
| icon_url | text | |
| category | enum | streak / volume / consistency / pr / milestone |
| criteria | jsonb | regla de desbloqueo (ej: { type: 'streak', days: 7 }) |

**student_achievements** *(logros desbloqueados por cada alumno)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| student_id | uuid | FK → students |
| achievement_id | uuid | FK → achievements |
| unlocked_at | timestamptz | |
| context | jsonb | info adicional (ej: ejercicio del PR, peso alcanzado) |

**challenges** *(desafíos disponibles, globales o creados por PT)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| trainer_id | uuid | FK → trainers (null si es global) |
| name | varchar | |
| description | text | |
| goal_type | enum | sessions_count / weight_target / streak / volume |
| goal_value | numeric | meta numérica (ej: 12 sesiones, 100 kg) |
| duration_days | int | plazo del desafío |
| reward_achievement_id | uuid | FK → achievements (logro al completarlo) |

**student_challenges** *(challenges asignados al alumno y su progreso)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| student_id | uuid | FK → students |
| challenge_id | uuid | FK → challenges |
| started_at | timestamptz | |
| ends_at | timestamptz | |
| current_progress | numeric | avance acumulado |
| status | enum | active / completed / failed / abandoned |
| completed_at | timestamptz | |

Índice único parcial `uq_student_challenges_active` sobre (`student_id`, `challenge_id`) donde `status = 'active'`: un alumno no puede tener el mismo desafío activo dos veces (409 `CHALLENGE_ALREADY_ACTIVE`).

**student_streaks** *(racha guardada del alumno; derivada, se recalcula desde el historial, ver [[adr/0005-racha-contra-dias-asignados|ADR 0005]])*

| Campo | Tipo | Clave |
|---|---|---|
| student_id | uuid | PK, FK → students (on delete cascade) |
| current_days | int | racha actual (días asignados seguidos entrenados) |
| longest_days | int | mejor racha del historial |
| last_trained_date | date | última fecha (día de Buenos Aires) con sesión cerrada |
| updated_at | timestamptz | |

Tipos de `achievements.criteria` que entiende el evaluador: `sessions_count {value}`, `streak {days}`, `pr_count {value}`, `full_week {count}` y `challenge {}` (este último lo otorga un desafío completado, no el evaluador). Un tipo desconocido se ignora con un log.

---

### Chat IA (amarillo)

**chat_messages** *(historial del asistente del alumno)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| session_id | uuid | FK → sessions |
| student_id | uuid | FK → students |
| role | enum | user / assistant |
| content | text | |
| created_at | timestamptz | |

**ai_routine_generations** *(historial de generaciones del asistente del entrenador)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| trainer_id | uuid | FK → trainers |
| student_id | uuid | FK → students (opcional, si fue para un alumno específico) |
| input_params | jsonb | parámetros enviados al LLM (objetivo, frecuencia, equipamiento, etc.) |
| generated_routine | jsonb | rutina propuesta por la IA |
| was_used | boolean | true si el PT terminó asignándola (con o sin ediciones) |
| routine_template_id | uuid | FK → routine_templates (null si no se guardó como plantilla) |
| created_at | timestamptz | |

---

### Agenda (naranja)

**appointments** *(turnos PT–alumno)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| trainer_id | uuid | FK → trainers |
| student_id | uuid | FK → students |
| scheduled_at | timestamptz | |
| duration_min | int | |
| status | enum | pending / confirmed / cancelled |
| notes | text | |

**notifications**

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → trainers o students (según `user_role`; sin FK dura) |
| user_role | varchar | trainer / student |
| type | enum | inactivity / appointment / comment / pr / achievement / routine_modified |
| title | varchar | máx. 150 caracteres |
| body | text | opcional |
| data | jsonb | contexto para navegar (`student_id`, `session_id`, `achievement_code`, `exercise_ids`, `missed_days`, `days_since`). `{}` por defecto, nunca null |
| read | boolean | |
| push_sent_at | timestamptz | cuándo salió el push a algún dispositivo; null si no se envió (sin credenciales, sin tokens, política "solo base" o error). No hay reintentos |
| created_at | timestamptz | |

Índice parcial `idx_notifications_inactivity` sobre `(created_at desc) where type = 'inactivity'`: lo usa el job nocturno para traer los avisos recientes y respetar el máximo de un aviso de inactividad por alumno cada 7 días. La tabla es la fuente de verdad; el push es un aviso best-effort ([[adr/0006-notificaciones-tabla-fuente-de-verdad-fcm-v1|ADR 0006]]).

Índice único parcial `uq_notifications_session` sobre `(type, user_id, data->>'session_id') where type in ('pr', 'routine_modified')`: un aviso de récords y uno de "rutina modificada" por sesión y destinatario, aunque dos lotes de series de la misma sesión disparen el aviso a la vez.

**push_tokens** *(dispositivos que reciben push)*

| Campo | Tipo | Clave |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | trainers o students según `user_role` (sin FK dura, como `notifications`); índice `idx_push_tokens_user` |
| user_role | varchar | trainer / student |
| token | text | único: si el token pasa a otro usuario, se reasigna |
| platform | varchar | android / web |
| created_at | timestamptz | |
| last_seen_at | timestamptz | se actualiza cada vez que el cliente registra el token |

RLS activado sin políticas (ADR 0001). El backend borra el token solo cuando FCM lo da por inválido (`UNREGISTERED` o token mal formado).

---

## Relaciones principales

| Desde | Cardinalidad | Hacia | Descripción |
|---|---|---|---|
| trainers | 1 ──── N | students | Un trainer tiene muchos alumnos |
| trainers | 1 ──── N | exercises | Biblioteca propia por trainer |
| trainers | 1 ──── N | routine_templates | Plantillas reutilizables del trainer |
| trainers | 1 ──── N | invitations | Invitaciones (WhatsApp/QR) generadas |
| trainers | 1 ──── N | challenges | Challenges personalizados creados por el PT |
| trainers | 1 ──── N | ai_routine_generations | Historial de uso del asistente IA del entrenador |
| students | 1 ──── N | body_metrics | Historial de medidas corporales |
| students | 1 ──── N | routines | Un alumno puede tener varias rutinas |
| students | 1 ──── N | student_achievements | Logros desbloqueados |
| students | 1 ──── N | student_challenges | Challenges asumidos |
| routine_templates | 1 ──── N | routines | Una plantilla puede instanciarse en muchas rutinas |
| routines | N ──── M | exercises | Vía routine_exercises (tabla pivote) |
| students | 1 ──── N | sessions | Historial de sesiones del alumno |
| sessions | N ──── 1 | routines | Cada sesión ejecuta una rutina |
| sessions | 1 ──── N | session_sets | Cada sesión tiene N series registradas |
| sessions | 1 ──── N | chat_messages | Historial del chat IA por sesión |
| achievements | 1 ──── N | student_achievements | Catálogo desbloqueado por alumnos |
| challenges | 1 ──── N | student_challenges | Catálogo asumido por alumnos |

---

> **Notas:**
> - La tabla `routine_exercises` es la pivote de la relación N:M entre `routines` y `exercises`. Allí van los parámetros específicos de cada ejercicio dentro de una rutina (series, reps, descanso, peso sugerido).
> - La tabla `session_sets` es donde se persiste todo lo que el alumno ejecutó realmente — es la fuente de verdad para el historial de progreso.
> - `original_exercise_id` (junto con `exercise_id`) en `session_sets` permite registrar cuando el alumno reemplaza un ejercicio por otro durante la sesión (sugerido por el asistente IA o por decisión propia). Cuando esto ocurre, `sessions.has_modifications = true` y el PT recibe una notificación (llega con la tarjeta 20, push).
> - `routine_templates` puede ser creada manualmente o por el asistente IA del entrenador (campo `generated_by_ai`). Esto permite reutilizar y refinar rutinas exitosas.
> - El sistema de gamificación se compone de logros (catálogo + tabla pivote por alumno) y challenges (objetivos con plazo). Los logros se evalúan al cerrar una sesión (en el mismo request, sin romper la respuesta si falla) y en el job diario de las 03:00 (hora de Buenos Aires); los challenges actualizan su progreso en esos mismos dos momentos y el job diario marca `failed` los vencidos.
