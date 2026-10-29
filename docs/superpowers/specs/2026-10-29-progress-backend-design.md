# Módulo Progress en el backend — progresión de cargas y evolución corporal

- **Tarjeta de equipo:** [S3] Módulo Progress backend — progresión de cargas y evolución corporal (https://trello.com/c/GAxfLyv8), fuente de verdad del alcance y del criterio de aceptación.
- **Tablero personal:** "11 · Módulo Progress backend".
- **Fecha:** 2026-10-29 · **Rama:** `feature/progress` (desde `develop`, que ya tiene Sessions).

## 1. Objetivo y criterio de aceptación

Convertir las series de `session_sets` en la curva de carga de cada ejercicio y exponer la evolución corporal del alumno.

**Criterio de aceptación (tarjeta de equipo):** con 6 semanas de sesiones cargadas, la curva de un ejercicio devuelve un punto por fecha con las tres métricas; la query corre en menos de 200 ms y usa índice; las series sustituidas no aparecen en la curva del ejercicio original.

## 2. Decisiones (grilling del 2026-10-29)

| Tema | Decisión |
|---|---|
| Dónde se agrega | Función SQL `exercise_progress` en Postgres, llamada con `supabase.rpc` (primera función del proyecto) |
| Índice | `session_sets (exercise_id, session_id)` nuevo; se valida con `EXPLAIN ANALYZE` con y sin él |
| Fecha del punto | Día calendario de `sessions.started_at` en `America/Argentina/Buenos_Aires` |
| Series que cuentan | `completed = true` y `actual_reps > 0` |
| Sustitución | La curva de X usa `exercise_id = X` (lo realmente hecho): la sustituida no ensucia el original y sí suma en el que se hizo |
| Métrica por defecto | 1RM estimado (Epley) — ADR `docs/adr/0004-metrica-de-progreso.md` |
| `/progress/body` | Endpoint fino sobre el service de medidas + resumen por campo |
| `last_session_kg` | Entra: mayor `actual_kg` de la última sesión en que el alumno hizo ese ejercicio |

## 3. Endpoints (roles `trainer` y `student`)

### 3.1 `GET /api/progress/exercise/:exerciseId`

Query: `student_id` (UUID), `from`, `to` (`YYYY-MM-DD`, inclusivos, en hora argentina).

- **Alumno:** `student_id` opcional (por defecto él mismo); si es de otro alumno → 403.
- **Entrenador:** `student_id` obligatorio (400 `VALIDATION_ERROR` si falta); tiene que ser alumno suyo → si no, 403 (`assertCanAccessStudent`).
- `exerciseId` tiene que ser un ejercicio visible para ese alumno (global o del entrenador del alumno); si no → 404 `EXERCISE_NOT_FOUND`.
- `from > to` → 400.

Respuesta 200:

```json
{ "data": {
  "exercise": { "id": "uuid", "name": "Press de banca", "muscle_group": "chest" },
  "points": [
    { "date": "2026-10-20", "max_kg": 62.5, "volume_kg": 1875, "e1rm_kg": 79.2, "sets": 3, "reps": 30 }
  ],
  "pr": { "max_kg": { "value": 75, "date": "2026-12-01" }, "e1rm_kg": { "value": 90.0, "date": "2026-12-01" } },
  "default_metric": "e1rm_kg"
} }
```

- `points` ascendente por `date`; un punto por día con al menos una serie que cuenta.
- Por punto: `max_kg` = mayor `actual_kg` (o `null` si ninguna serie tiene kg); `volume_kg` = Σ `actual_reps × actual_kg` (kg nulo cuenta 0); `e1rm_kg` = máximo por serie de Epley (`reps = 1 → kg`; `reps > 1 → kg × (1 + reps/30)`; kg nulo → la serie no aporta); `sets` y `reps` = cantidad de series y suma de repeticiones. Números redondeados a 1 decimal.
- `pr`: el mayor `max_kg` y el mayor `e1rm_kg` del rango con su fecha (el primero en alcanzarse); `null` cada uno si no hay valores. Sin series → `points: []` y `pr: { max_kg: null, e1rm_kg: null }`.

### 3.2 `GET /api/progress/body/:studentId`

Mismo permiso que `GET /students/:id/metrics` (alumno a sí mismo, entrenador a sus alumnos; 403 si no).

```json
{ "data": {
  "points": [ /* el historial de medidas tal cual GET /students/:id/metrics, ascendente, con bmi */ ],
  "summary": { "weight_kg": { "first": 80, "last": 76.5, "delta": -3.5 }, "...": "..." }
} }
```

`summary` por cada campo de medida y `bmi`: primer y último valor no nulo del historial y su diferencia (1 decimal); `null` si el campo nunca se cargó. Sin medidas → `points: []` y cada campo `null`.

### 3.3 `last_session_kg` en `GET /api/routines/today`

Para cada ejercicio de la rutina del día: el mayor `actual_kg` de las series completadas del ejercicio en la **última sesión** (por `started_at`) en que el alumno lo hizo; `null` si nunca lo hizo o no cargó peso.

## 4. Base de datos

Migración `backend/src/database/migrations/2026-10-29-progress.sql` (y lo mismo en `schema/04-progress.sql`):

- `create index if not exists idx_session_sets_exercise_session on session_sets (exercise_id, session_id);`
- `create or replace function exercise_progress(p_student_id uuid, p_exercise_id uuid, p_from date default null, p_to date default null) returns table (date date, max_kg numeric, volume_kg numeric, e1rm_kg numeric, sets int, reps int)` — `language sql stable security invoker`, join `session_sets → sessions` filtrando `sessions.student_id`, `session_sets.exercise_id`, `completed`, `actual_reps > 0` y el rango sobre `(started_at at time zone 'America/Argentina/Buenos_Aires')::date`; agrupa por esa fecha.
- `revoke all on function exercise_progress(...) from public, anon, authenticated;` y `grant execute ... to service_role;` (ADR 0001: el anon no ve nada; `db:check-anon` sigue en verde).
- Si `EXPLAIN ANALYZE` muestra que el índice nuevo no se usa o no mejora, se descarta y se documenta el plan real.
- `last_session_kg` se resuelve con una consulta por lote (los `exercise_id` de la rutina del día) — función SQL `last_session_kg(p_student_id uuid, p_exercise_ids uuid[])` en la misma migración, mismos permisos.

## 5. Diseño interno

- Módulo `progress` (routes → controllers → services → repositories → validations), montado en `/api/progress`; autorización en el service (ADR 0001) reutilizando `assertCanAccessStudent` y `findAccessibleExerciseIds`.
- `/progress/body` reutiliza `bodyMetricsService.list`; el resumen es una función pura en `models/progress/`.
- El redondeo y la forma de la respuesta se hacen en el modelo (función pura testeable); la función SQL devuelve los números crudos.
- Errores: `Errors.exerciseNotFound()` → 404 `EXERCISE_NOT_FOUND` (nuevo factory).

## 6. Fuera de alcance

- Vista de progreso en la web → tarjeta 14. Historial de sesiones → tarjeta 12.
- Detección de PR con notificaciones/logros → gamificación (tarjeta 17).

## 7. Documentación

- ADR `docs/adr/0004-metrica-de-progreso.md` (formato de los ADR existentes: Estado/Fecha, Contexto, Decisión, Alternativas, Consecuencias).
- `docs/arquitectura/contratos-api.md`: sección Progress reescrita (3.1 y 3.2) y `last_session_kg` en `/routines/today`.
- `backend/README.md`, `docs/tarjetas.md`.

## 8. Verificación

- `npm run lint` y `npm test` en `backend/`.
- Tests: fórmulas (Epley con 1 y varias reps, kg nulo, redondeo, `pr`, resumen corporal); service con permisos (alumno propio / ajeno, entrenador con y sin `student_id`, alumno de otro entrenador, ejercicio no visible → 404); `last_session_kg`.
- **Contra Supabase dev** (script con `pg` en el scratchpad): aplicar la migración; cargar 6 semanas de sesiones para una alumna de prueba (incluida una sustitución y dos sesiones el mismo día); comparar los puntos de la API con un cálculo a mano; `EXPLAIN ANALYZE` de `exercise_progress` con y sin el índice (< 200 ms, usa índice); `npm run db:check-anon`.
