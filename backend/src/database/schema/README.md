# Schema de la base de datos

El schema de FitTrainer está repartido por dominio en diez archivos SQL (el 06 en una carpeta, dividido
por tamaño).

| Archivo | Contenido |
|---|---|
| `01-auth.sql` | extensión `pgcrypto`, `trainers`, `refresh_tokens` |
| `02-students.sql` | `students`, `invitations` |
| `03-routines.sql` | `exercises`, `routines`, `routine_exercises`, `routine_templates` y la FK `routines_template_id_fkey` |
| `04-progress.sql` | `body_metrics`, `sessions`, la vista `student_last_session`, `session_sets`, el índice `idx_session_sets_exercise_session` y las funciones `exercise_progress`, `last_session_kg` y `session_records` |
| `04b-progress-overview.sql` | las funciones `progress_exercises` y `weekly_volume` (overview de progreso); corre después de `04-progress.sql` |
| `05-gamification.sql` | `achievements`, `student_achievements`, `challenges`, `student_challenges`, `student_streaks` y el índice único de desafíos activos |
| `06-ai-and-agenda/01-ai.sql` | `chat_messages`, `ai_routine_generations` (con la RPC `save_ai_generation_templates`) |
| `06-ai-and-agenda/02-agenda-and-notifications.sql` | `appointments`, `trainer_availability` (con la RPC de reemplazo), `notifications`, `push_tokens`, `notification_preferences` (preferencias de push del alumno, GX3) |
| `06b-messages.sql` | `messages` y el bucket privado `message-images` de Storage |
| `07-rls.sql` | Row Level Security (activado sin políticas en todas las tablas) |

## Cómo correrlos

- En orden, del 01 al 07 (el 04b va después del 04; el 06 son los dos archivos de `06-ai-and-agenda/`,
  primero `01-ai.sql` y después `02-agenda-and-notifications.sql`; el 06b va después del 06), en el SQL
  Editor de Supabase o con el MCP. Cada archivo depende de tablas creadas en él o en los anteriores.
- Todos se pueden volver a correr: usan `if not exists` y los `alter` van en
  bloques idempotentes.
- Después, `../checks/schema-checks.sql` tiene que devolver 0 filas.
- Luego se cargan los seeds, todos idempotentes y en este orden: `../seeds/exercises.sql`, `../seeds/achievements.sql` y por último
  `../seeds/challenges.sql` (el tercer desafío referencia el logro `CHALLENGE_DONE`). Después `../checks/exercises-checks.sql`
  tiene que devolver 0 filas.

## Cambios nuevos

Un cambio de schema va al archivo de su dominio y también a `../migrations/AAAA-MM/`
(un archivo con fecha, en la carpeta de su mes), para poder aplicarlo sobre una base ya creada.
