# Schema de la base de datos

El schema de FitTrainer está repartido por dominio en siete archivos SQL.

| Archivo | Contenido |
|---|---|
| `01-auth.sql` | extensión `pgcrypto`, `trainers`, `refresh_tokens` |
| `02-students.sql` | `students`, `invitations` |
| `03-routines.sql` | `exercises`, `routines`, `routine_exercises`, `routine_templates` y la FK `routines_template_id_fkey` |
| `04-progress.sql` | `body_metrics`, `sessions`, la vista `student_last_session`, `session_sets` |
| `05-gamification.sql` | `achievements`, `student_achievements`, `challenges`, `student_challenges` |
| `06-ai-and-agenda.sql` | `chat_messages`, `ai_routine_generations`, `appointments`, `notifications` |
| `07-rls.sql` | Row Level Security (activado sin políticas en todas las tablas) |

## Cómo correrlos

- En orden, del 01 al 07, en el SQL Editor de Supabase o con el MCP. Cada
  archivo depende de tablas creadas en él o en los anteriores.
- Todos se pueden volver a correr: usan `if not exists` y los `alter` van en
  bloques idempotentes.
- Después, `../checks/schema-checks.sql` tiene que devolver 0 filas.
- Luego se carga el seed `../seeds/exercises.sql`, y `../checks/exercises-checks.sql`
  tiene que devolver 0 filas.

## Cambios nuevos

Un cambio de schema va al archivo de su dominio y también a `../migrations/`
(un archivo con fecha), para poder aplicarlo sobre una base ya creada.
