# Gamificación en el backend — logros, rachas y desafíos

- **Tarjeta de equipo:** [S5] Gamificación backend — logros, rachas y desafíos (https://trello.com/c/v4zsogFe), fuente de verdad del alcance y del criterio de aceptación.
- **Tablero personal:** "17 · Gamificación backend — logros, rachas y desafíos".
- **Fecha:** 2026-10-30 · **Rama:** `feature/gamification`, apilada sobre `feature/sessions-history` (PR #33) para reusar `session_records`.

## 1. Objetivo y criterio de aceptación

Motor de gamificación completo: catálogo de logros con la regla como dato, desbloqueo automático, racha contra los días asignados y desafíos con plazo.

**Criterio de aceptación (tarjeta de equipo):** un alumno cierra su primera sesión y desbloquea "Primera sesión". Completa 7 días de su plan y desbloquea la racha. Reejecutar el evaluador no duplica logros. Un desafío vencido pasa a `failed` con el cron.

**Checklist de la tarjeta de equipo:** seed de ~10 logros · evaluador genérico que lee `achievements.criteria` · evaluación post-sesión (racha, récords, contador) · regla de la racha definida y escrita · único (`student_id`, `achievement_id`) · CRUD de challenges + asignación con `started_at`/`ends_at` · cron diario (desafíos vencidos y rachas rotas).

## 2. Decisiones (grilling del 2026-10-30)

| # | Tema | Decisión |
|---|---|---|
| Q1 | Regla de la racha | Días **asignados** seguidos entrenados (día calendario AR, contra los `days` de las rutinas activas actuales, unión si hay varias). Día asignado sin sesión cerrada → corta. Día no asignado → no corta; si se entrenó, suma +1. Hoy no corta hasta que termina. Sin rutina activa, todos los días son asignados. ADR 0005 (reemplaza "días consecutivos" del ADR-007 y de los docs) |
| Q2 | Guardado | Tabla `student_streaks` (`student_id` PK, `current_days`, `longest_days`, `last_trained_date`, `updated_at`), **recalculada desde el historial** (no incremental) al cerrar sesión y en el cron. Cálculo = función pura en `models/` |
| Q3 | Cuándo se evalúa | Síncrono en `PATCH /sessions/:id` con `finished_at`, en `POST /sessions` que llega cerrado y en `POST /sessions/:id/sets` sobre sesión cerrada. Si falla se loguea y la respuesta sale igual. Los tres suman `unlocked_achievements` dentro de `data` (aditivo): el `PATCH` al cerrar, `POST /sessions` si queda cerrada y `POST /sessions/:id/sets` si la sesión está cerrada y se guardó ≥ 1 serie; en otro caso `[]`. El celular no usa el `PATCH`: sube la sesión cerrada con `POST /sessions` |
| Q4 | Récords | Rama apilada sobre la #33; `session_records`. "Primer PR" = primera sesión con algún récord (la primera vez de un ejercicio no es récord) |
| Q5 | Catálogo | 10 logros + "Desafío cumplido" (Q12). Tipos de `criteria`: `sessions_count {value}`, `streak {days}`, `pr_count {value}`, `full_week {count}`, `challenge {}`. Evaluador = mapa `type → función`. `icon_url` null (el cliente elige por `category`). Seed idempotente por `code` |
| Q6 | Desafíos | `GET /challenges`, `POST/PATCH/DELETE /challenges/:id` (trainer dueño; borrar con **cualquier** asignación → 409 `CHALLENGE_IN_USE`, para conservar el historial; cambiar la meta con asignaciones activas → 409), `POST /students/:id/challenges` (PT o el alumno; desafío global o de su entrenador), `POST /challenges/:id/assignments {student_ids}`. `ends_at = started_at + duration_days` (`duration_days` obligatorio). Asignación activa repetida → 409 (índice único parcial) |
| Q7 | Progreso | En la ventana [`started_at`, `ends_at`]: `sessions_count` = sesiones cerradas; `volume` = Σ reps × kg; `streak` = mejor racha dentro de la ventana; `weight_target` = último peso, dirección inferida del peso al empezar. Recalculado post-sesión y en el cron. Meta → `completed` + `completed_at` + logro `reward_achievement_id` |
| Q8 | Cron | Scheduler propio (`setTimeout` a las 03:00 ART, se reprograma), `CRON_ENABLED` (apagado en tests). Mismo trabajo que `npm run gamification:daily`: recalcula racha y progreso de alumnos activos; después, vencidos → `failed` **con 2 días de gracia** (`CHALLENGE_GRACE_DAYS`). Idempotente |
| Q9 | Notificaciones | Fuera (tarjeta 20). El evaluador devuelve lo desbloqueado para engancharse después |
| Q10 | Lectura | `GET /achievements` (catálogo), `GET /students/:id/achievements` (desbloqueados), `GET /students/:id/streak`. Permisos con `assertCanAccessStudent` |
| Q11 | Histórico | Se otorga lo merecido (próxima sesión o primer cron). `context`: `{session_id}`; en PR `{session_id, exercise_id}` |
| Q12 | Desafíos de ejemplo | Seed de 3 globales: "12 sesiones en 30 días", "Racha de 14 días", "10 toneladas en 4 semanas" (este último premia "Desafío cumplido") |
| Q13 | Semana completa sin rutina | Sin rutina activa `full_week` no se gana; la racha sigue con días corridos |

## 3. Reglas en detalle

### 3.1 Racha (`computeStreak(trainedDates, assignedDays, today)`)

- `trainedDates`: fechas AR (`YYYY-MM-DD`) con al menos una sesión cerrada (`finished_at` no nulo).
- `assignedDays`: conjunto de días de la semana (`sunday`…`saturday`) de las rutinas activas; vacío → todos.
- Se recorre desde hoy hacia atrás: hoy suma si se entrenó y nunca corta; cada día anterior asignado sin entrenar corta; un día no asignado entrenado suma 1, sin entrenar se saltea.
- `longest_days`: la mayor racha del historial con la misma regla (recorrido completo de la primera fecha entrenada a hoy).
- `last_trained_date`: la última fecha entrenada.

### 3.2 Logros

| code | name | category | criteria |
|---|---|---|---|
| `FIRST_SESSION` | Primera sesión | milestone | `{type:'sessions_count', value:1}` |
| `SESSIONS_10` | 10 sesiones | milestone | `{type:'sessions_count', value:10}` |
| `SESSIONS_50` | 50 sesiones | milestone | `{type:'sessions_count', value:50}` |
| `SESSIONS_100` | 100 sesiones | milestone | `{type:'sessions_count', value:100}` |
| `STREAK_7_DAYS` | Racha de 7 días | streak | `{type:'streak', days:7}` |
| `STREAK_30_DAYS` | Racha de 30 días | streak | `{type:'streak', days:30}` |
| `FIRST_PR` | Primer récord | pr | `{type:'pr_count', value:1}` |
| `PR_10` | 10 récords | pr | `{type:'pr_count', value:10}` |
| `FIRST_FULL_WEEK` | Primera semana completa | consistency | `{type:'full_week', count:1}` |
| `FULL_WEEKS_4` | 4 semanas completas | consistency | `{type:'full_week', count:4}` |
| `CHALLENGE_DONE` | Desafío cumplido | milestone | `{type:'challenge'}` (no lo otorga el evaluador) |

- `sessions_count`: sesiones cerradas. `streak`: `longest_days` ≥ días. `pr_count`: sesiones con al menos un récord (`session_records` sobre todas las sesiones cerradas). `full_week`: semanas (lunes–domingo AR, ya terminadas o la actual si ya se cumplió) en las que se entrenaron **todos** los días asignados; sin rutina activa no cuenta.
- Insert con `on conflict (student_id, achievement_id) do nothing`; se devuelven solo los realmente insertados.
- Tipo de `criteria` desconocido → se ignora con log (no rompe).

### 3.3 Desafíos

- `progress_pct = min(100, current_progress / goal_value × 100)` a 1 decimal; en `weight_target`, distancia recorrida desde el peso inicial sobre la distancia total.
- `weight_target` sin peso inicial (ninguna medida antes de `started_at`) → toma la primera medida dentro de la ventana; sin medidas, progreso 0.
- Activo vencido hace más de `CHALLENGE_GRACE_DAYS` (2 días: `ends_at < now - 2 días`) sin meta → `failed` (en el cron; la evaluación post-sesión no falla desafíos). Durante la gracia la asignación sigue `active` y el evaluador la sigue actualizando contando **solo las sesiones dentro de la ventana** [`started_at`, `ends_at`], así que una sesión hecha a tiempo pero sincronizada tarde (offline) todavía la completa.
- `weight_target` que arranca en la meta (el peso inicial ya es el objetivo): `createAssignment` no evalúa (devuelve `progress_pct: 0` y `active`); se completa en la **próxima evaluación** (post-sesión o cron), no al asignarlo.
- Editar un desafío: cambiar `goal_type` o `goal_value` con asignaciones activas → 409 `CHALLENGE_IN_USE` (la meta nueva recalcularía a todos). Borrarlo con cualquier asignación (activa, completada, fallida o abandonada) → 409 `CHALLENGE_IN_USE`: `student_challenges.challenge_id` es `on delete cascade` y borraría el historial; no hay borrado en cascada intencional.

## 4. Endpoints

Todos bajo `/api`, con `{ data }`; errores `{ error: { code, message, details } }`.

| Método y ruta | Roles | Notas |
|---|---|---|
| `GET /achievements` | trainer, student | catálogo ordenado por category y code |
| `GET /students/:id/achievements` | trainer, student | `[{ id, achievement:{code,name,description,icon_url,category}, unlocked_at, context }]` desc por `unlocked_at` |
| `GET /students/:id/streak` | trainer, student | `{ current_streak_days, longest_streak_days, last_session_date }` (lee `student_streaks`; si no hay fila, la calcula y la guarda) |
| `GET /challenges` | trainer, student | globales + del trainer (el alumno: del suyo). Query `goal_type`, `active_only` (no aplica: todos los desafíos están vigentes; se acepta y se ignora — ver §7) |
| `POST /challenges` | trainer | `{ name, description?, goal_type, goal_value>0, duration_days>0, reward_achievement_id? }` → 201 |
| `PATCH /challenges/:id` | trainer dueño | campos parciales; global o ajeno → 403/404 `CHALLENGE_NOT_FOUND`; cambio de `goal_type`/`goal_value` con asignaciones activas → 409 `CHALLENGE_IN_USE` |
| `DELETE /challenges/:id` | trainer dueño | con cualquier asignación (aun terminada) → 409 `CHALLENGE_IN_USE`; 204 |
| `POST /challenges/:id/assignments` | trainer | `{ student_ids:[1..50] }` → 201 `{ created:[…], skipped:[{student_id, reason}] }` (ya activo / no es alumno suyo) |
| `POST /students/:id/challenges` | trainer, student | `{ challenge_id }` → 201 con la asignación; ya activo → 409 `CHALLENGE_ALREADY_ACTIVE` |
| `GET /students/:id/challenges` | trainer, student | `[{ id, challenge:{…}, started_at, ends_at, current_progress, goal_value, progress_pct, status, completed_at }]` |
| `PATCH /sessions/:id` (existente) | student | suma `unlocked_achievements: [{code,name,category}]` dentro de `data` |
| `POST /sessions` (existente) | student | si queda cerrada, evalúa y suma `unlocked_achievements` (si no, `[]`) |
| `POST /sessions/:id/sets` (existente) | student | sesión cerrada y ≥ 1 serie guardada → evalúa y suma `unlocked_achievements` (si no, `[]`) |

Desafío visible para un alumno = global o de su entrenador; si no → 404 `CHALLENGE_NOT_FOUND`.

## 5. Base de datos

Migración `backend/src/database/migrations/2026-10-30-gamification.sql` (y lo mismo en `schema/05-gamification.sql`):

- `create table if not exists student_streaks (student_id uuid primary key references students on delete cascade, current_days int not null default 0, longest_days int not null default 0, last_trained_date date, updated_at timestamptz not null default now())`.
- `create unique index if not exists uq_student_challenges_active on student_challenges (student_id, challenge_id) where status = 'active'`.
- RLS activado sin políticas en `student_streaks` (`07-rls.sql`), y en `checks/schema-checks.sql` y `check-anon-access.js`.
- Seeds `seeds/achievements.sql` (upsert por `code`) y `seeds/challenges.sql` (globales, idempotente por nombre con `trainer_id is null`).

## 6. Diseño interno

- Módulo `gamification` (routes → controllers → services → repositories → validations → models). Subrutas en `students.routes.js` (`/:id/achievements`, `/:id/streak`, `/:id/challenges`) y `/api/achievements`, `/api/challenges` en `app.js`.
- `models/gamification/`: `streak.js` (racha y semanas completas, puras), `criteria.js` (mapa de evaluadores), `challenge-progress.js` (puro), constantes.
- `services/gamification/evaluate.service.js`: `evaluateStudent(studentId)` → arma los datos (fechas entrenadas, días asignados, cantidad de sesiones, sesiones con récord), guarda la racha, otorga logros, actualiza desafíos activos y devuelve `{ unlocked }`. Lo llaman sessions y el job diario. La actualización de desafíos va en su propio try/catch (log `[gamification] desafíos`): si falla, los logros comunes igual se insertan.
- `jobs/`: `daily-gamification.js` (trabajo) y el scheduler arrancado en `server.js` si `CRON_ENABLED`; script `scripts/gamification-daily.js` + `npm run gamification:daily`.
- Helper de fecha local AR (`YYYY-MM-DD`) en `shared/utils/dates.js` (o donde ya haya utilidades de fecha).

## 7. Fuera de alcance

- Notificaciones de logro/desafío → tarjeta 20. UI de logros y creación de desafíos → tarjetas 18 (web) y de Igna (mobile).
- `active_only` de `GET /challenges` del contrato: el schema no tiene estado de vigencia en `challenges`; se acepta y se documenta que no filtra.

## 8. Documentación

- ADR `docs/adr/0005-racha-contra-dias-asignados.md`.
- `contratos-api.md` (módulo Gamificación reescrito + `unlocked_achievements`), `modelo-de-datos.md` (`student_streaks`, índice), `backend/README.md`, `schema/README.md`, `docs/tarjetas.md`, `.env.example` y `docs/proceso/setup-tecnico.md` (`CRON_ENABLED`).

## 9. Verificación

- `npm run lint` y `npm test` en `backend/`. Tests de racha (asignados/no asignados, hoy, sin rutina, longest), semanas completas, cada tipo de criterio, progreso de desafíos (los 4 tipos), idempotencia del otorgamiento, permisos de todos los endpoints, hook en sessions sin romper la respuesta si el evaluador falla, job diario.
- Supabase dev: aplicar migración y seeds; con la alumna QA (6 semanas de sesiones) correr el job → logros esperados (Primera sesión, 10 sesiones, racha, PRs) y reejecutar sin duplicar; cerrar una sesión nueva → `unlocked_achievements`; un desafío con `ends_at` en el pasado → `failed` tras el job.
