# Spec — Schema completo + decisión de RLS

- **Tarjeta:** "2 · Completar el schema: 9 tablas faltantes + decidir RLS" (tablero personal de Igna) → tarjeta de equipo [S0] Schema completo de la base en Supabase + RLS (https://trello.com/c/Nwwqhdkw)
- **Fecha:** 2026-10-12
- **Fuente de verdad del modelo:** Notion, *Modelo de datos (DER)*

## 1. Objetivo

Dejar en `backend/src/database/schema.sql` y en el proyecto Supabase `Fit-Trainer` las 18 tablas del DER (más `refresh_tokens`, que no está en el DER), con FKs, índices y CHECKs, y cerrar la decisión de RLS con un modelo de seguridad que se pueda explicar en una línea y verificar.

## 2. Estado de partida

- `schema.sql` tiene 7 tablas: `trainers`, `refresh_tokens`, `students`, `invitations`, `exercises`, `routines`, `routine_exercises`.
- Faltan **12** (la tarjeta dice 9 por error): `body_metrics`, `routine_templates`, `sessions`, `session_sets`, `achievements`, `student_achievements`, `challenges`, `student_challenges`, `chat_messages`, `ai_routine_generations`, `appointments`, `notifications`.
- Ninguna tabla tiene RLS activado.
- Solo el backend accede a la base, con la `service_role` key (`backend/src/shared/supabase.js`). La web (`VITE_API_URL`) y mobile consumen la API REST, nunca Supabase directo.

## 3. Decisión de seguridad (opción C)

**RLS activado en las 19 tablas, sin políticas.** La autorización entre trainers vive en la capa Service.

- La `service_role` bypasea RLS, así que el backend funciona igual.
- Los roles `anon` y `authenticated` no tienen ninguna política → la API REST pública de Supabase (PostgREST) devuelve cero filas aunque alguien tenga la anon key, que no es secreta por diseño.
- No se escriben políticas por trainer: con la `service_role` nunca se ejecutarían y no se podrían probar.

**Respuesta de defensa:** "La base rechaza cualquier acceso que no sea del backend (RLS activo sin políticas), y el backend verifica la propiedad en cada service; los tests de ownership lo demuestran."

Se documenta en `docs/adr/0001-autorizacion-en-services-rls-deny-all.md`. Actualizar la página *Arquitectura del sistema* de Notion (que promete "RLS de Supabase + middleware de Express") queda a cargo de Igna.

## 4. Convenciones

Iguales a las del `schema.sql` actual:

- `uuid primary key default gen_random_uuid()`.
- Enums como `varchar` + `CHECK (... in (...))`, no tipos `enum` de Postgres.
- `create table if not exists` / `create index if not exists`: el archivo entero es re-ejecutable.
- Desvíos respecto del DER se explican con un comentario sobre la tabla.
- Las tablas nuevas van al final del archivo, en orden de dependencia.

## 5. Tablas nuevas

### body_metrics
`id`, `student_id` (FK students, cascade, not null), `weight_kg`, `height_cm`, `body_fat_pct`, `waist_cm`, `hip_cm`, `chest_cm` (numeric, todos opcionales, `>= 0`), `recorded_at` (timestamptz not null default now()).
Índice `(student_id, recorded_at desc)`.

### routine_templates
`id`, `trainer_id` (FK trainers, cascade, not null), `name` (varchar(120) not null), `goal` (CHECK de goals), `level` (CHECK beginner/intermediate/advanced), `frequency_per_week` (int, CHECK 1–7), `generated_by_ai` (bool not null default false), `structure` (jsonb not null default '{}'), `created_at`.
Índice `trainer_id`.
Además: FK `routines.template_id → routine_templates(id) on delete set null` (agregada con un bloque idempotente, porque `routines` ya existe).

### sessions
`id` (**generado por el cliente mobile**; el default queda como fallback), `student_id` (FK students, cascade, not null), `routine_id` (FK routines, **set null**, nullable), `started_at` (not null), `finished_at`, `rpe` (int, CHECK 1–10), `notes`, `trainer_comment`, `has_modifications` (bool not null default false).
Índice `(student_id, started_at desc)`.
**Desvío:** `routine_id` nullable con `set null` para que borrar una rutina no borre el historial.

### session_sets
`id` (**generado por el cliente mobile**), `session_id` (FK sessions, cascade, not null), `exercise_id` (FK exercises, not null, sin cascade), `original_exercise_id` (FK exercises, set null, nullable), `routine_exercise_id` (FK routine_exercises, **set null**, nullable), `set_number` (int not null, `> 0`), `actual_reps` (int, `>= 0`), `actual_kg` (numeric, `>= 0`), `completed` (bool not null default true), `executed_at` (timestamptz not null; el momento real, no el de la sincronización).
Índices `session_id`, `exercise_id`.
**Desvíos:**
- `exercise_id` (nuevo): el ejercicio realmente ejecutado. Es la base de los gráficos de progreso y sobrevive a la edición o al borrado de la rutina.
- `original_exercise_id` reemplaza a `substituted_exercise_id`: es el ejercicio planificado cuando hubo sustitución (null si no la hubo). Así `exercise_id` siempre significa "lo que se hizo".
- `routine_exercise_id` queda como referencia opcional con `set null`.

### achievements
`id`, `code` (varchar(50) not null unique), `name` (not null), `description`, `icon_url`, `category` (CHECK streak/volume/consistency/pr/milestone), `criteria` (jsonb not null default '{}').

### student_achievements
`id`, `student_id` (FK students, cascade), `achievement_id` (FK achievements, cascade), `unlocked_at` (not null default now()), `context` (jsonb).
`UNIQUE (student_id, achievement_id)`.

### challenges
`id`, `trainer_id` (FK trainers, cascade, nullable: null = global), `name` (not null), `description`, `goal_type` (CHECK sessions_count/weight_target/streak/volume), `goal_value` (numeric not null), `duration_days` (int, `> 0`), `reward_achievement_id` (FK achievements, set null).
Índice `trainer_id`.

### student_challenges
`id`, `student_id` (FK students, cascade), `challenge_id` (FK challenges, cascade), `started_at` (not null default now()), `ends_at` (not null), `current_progress` (numeric not null default 0), `status` (CHECK active/completed/failed/abandoned, default 'active'), `completed_at`.
Índice `student_id`.

### chat_messages
`id`, `session_id` (FK sessions, **set null**, nullable), `student_id` (FK students, cascade, not null), `role` (CHECK user/assistant), `content` (text not null), `created_at`.
Índice `(student_id, created_at)`.
**Desvío:** `session_id` nullable para que el chat con la IA no dependa de una sesión activa.

### ai_routine_generations
`id`, `trainer_id` (FK trainers, cascade, not null), `student_id` (FK students, set null), `input_params` (jsonb not null), `generated_routine` (jsonb not null), `was_used` (bool not null default false), `routine_template_id` (FK routine_templates, set null), `created_at`.
Índice `trainer_id`.

### appointments
`id`, `trainer_id` (FK trainers, cascade), `student_id` (FK students, cascade), `scheduled_at` (not null), `duration_min` (int not null default 60, `> 0`), `status` (CHECK pending/confirmed/cancelled, default 'pending'), `notes`, `created_at`.
Índices `(trainer_id, scheduled_at)`, `student_id`.

### notifications
`id`, `user_id` (uuid not null, sin FK), `user_role` (CHECK trainer/student, not null), `type` (CHECK inactivity/appointment/comment/pr/achievement/routine_modified), `title` (not null), `body`, `read` (bool not null default false), `created_at`.
Índice `(user_id, read, created_at desc)`.
**Desvío:** `user_role` nuevo, mismo patrón que `refresh_tokens`, porque `user_id` puede apuntar a dos tablas distintas.

## 6. Fuera de alcance

- El chat PT–alumno y la mensajería (módulos de Pablo): no están en el DER. Si se necesitan, van en una migración propia.
- Datos semilla del catálogo de logros: le corresponden al módulo de Gamificación.
- Políticas RLS por trainer (descartadas, ver §3).

## 7. Aplicación

1. Reactivar el proyecto Supabase `Fit-Trainer` (está INACTIVE). Requiere el OK de Igna en el momento.
2. Aplicar el delta (12 tablas + FK de `routines.template_id` + RLS en las 19 tablas) como migración, con el MCP de Supabase.

## 8. Criterios de aceptación

1. `list_tables` del proyecto muestra las 19 tablas en `public`, con `rls_enabled = true` en todas.
2. `get_advisors` (security) no reporta tablas de `public` sin RLS.
3. Una consulta `GET /rest/v1/<tabla>` con la anon key devuelve `[]` para cada una de las 19 tablas.
4. En `backend/`: `npm run lint` y `npm test` pasan, incluidos los tests de ownership de students, routines, exercises e invitations.
5. `schema.sql` se puede re-ejecutar entero sobre la base ya migrada sin errores.
