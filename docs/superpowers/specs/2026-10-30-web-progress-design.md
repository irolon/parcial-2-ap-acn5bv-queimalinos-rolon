# Vista de progreso en la web — curva por ejercicio, volumen semanal y evolución corporal

- **Tarjeta de equipo:** [S4] Vista de progreso del alumno en la web (Recharts) (https://trello.com/c/IkcYj8pl), fuente de verdad del alcance y del criterio de aceptación.
- **Tablero personal:** "14 · Vista de progreso del alumno en la web (Recharts)".
- **Fecha:** 2026-10-30 · **Rama:** `feature/web-progress` (PR #34, base `develop`; la #31 ya está mergeada).

## 1. Objetivo y criterio de aceptación

Mostrarle al entrenador y al alumno que el entrenamiento sirve: curva de carga por ejercicio, volumen total por semana y evolución corporal.

**Criterio de aceptación (tarjeta de equipo):** con 6 semanas de datos, el PT abre un alumno, elige "press de banca" y ve la curva ascendente con tooltips. El alumno entra con su cuenta y ve su propio progreso sin selector. Un alumno con una sola sesión ve el mensaje motivador, no un gráfico roto.

**Checklist de la tarjeta de equipo:** curva por ejercicio con selector · peso corporal y volumen por semana · selector de métrica · estado "todavía no hay datos suficientes" · ramificación por rol (AL-06) · ejes legibles, tooltips con el dato exacto y buen contraste.

## 2. Decisiones (grilling del 2026-10-30)

| # | Tema | Decisión |
|---|---|---|
| Q1 | Dónde lo ve el PT | Sección "Progreso" al final de la ficha `/pt/alumnos/:id`. El PT "elige alumno" con el panel y las flechas que ya existen. Componente compartido `ProgressPanel`, que el alumno ve en `/alumno/progreso` con su `user.id` |
| Q2 | Lista del selector de ejercicio | Endpoint nuevo: ejercicios con series registradas del alumno, ordenados por última fecha (desc) |
| Q3 | Volumen total por semana | En el backend, en el mismo endpoint: `GET /api/progress/overview`. Funciones SQL en un archivo de schema propio |
| Q4 | Datos insuficientes | Umbral de 3 puntos por gráfico (3 días con el ejercicio en el rango; 3 semanas con sesiones, ver sección 8). Debajo: mensaje motivador con el avance ("Llevás 1 de 3…"). Sin ninguna sesión: un único estado vacío para todo el panel. El gráfico de peso de la ficha sigue igual (2 puntos) |
| Q5 | Selector de métrica | Segmentado: 1RM estimado · Peso máximo · Volumen · Repeticiones. Arranca en `default_metric`. En un ejercicio sin kg (ningún `max_kg > 0`) las tres de kg se deshabilitan con el título "Sin peso registrado". Tooltip: fecha, valor y series × reps del día. Chip de récord + punto marcado |
| Q6 | Rango | 1 mes · 3 meses (por defecto) · Todo. Aplica a la curva y al volumen semanal |
| Q7 | Qué entra del prototipo | 3 KPIs: sesiones en el rango, volumen total del rango, récord del ejercicio elegido. Para el alumno, "Peso corporal y medidas" con `/progress/body`. Afuera: racha y logros (tarjetas 17/18), "Exportar" y sparklines por ejercicio (a DESEABLES). Con Volumen o Repeticiones el KPI de récord muestra el de 1RM (o, si no hay, el de peso máximo) |
| Q8 | Home del alumno | No se toca (`/alumno/hoy` es de la tarjeta 22). Solo se reemplaza el placeholder de `/alumno/progreso` |
| Q9 | Rango de la lista de ejercicios | La lista ignora el rango (todo el historial). Por defecto, el más reciente con al menos 3 días; si ninguno, el más reciente |
| Q10 | Semanas sin entrenar | Se rellenan con 0 en SQL (`generate_series` sobre los lunes, hora argentina). Con "Todo", desde la semana de la primera sesión. Para el umbral cuentan solo las semanas con sesiones (ver sección 8) |
| Q11 | Gráficos y números | Línea del ejercicio elegido en `accent`, récord en `hot`; volumen semanal en barras `cool`. Formato es-AR: "88,7 kg"; volumen en "12,4 t" desde 1000 kg. Eje X "dd/mm"; tooltip con fecha completa |
| Q12 | Estado de los selectores | Estado local del panel (no la URL). Al cambiar de alumno vuelve a los valores por defecto |
| Q13 | Alumno sin medidas | Estado vacío: "Todavía no hay medidas cargadas. Tu entrenador o vos pueden cargarlas desde la app" |

## 3. Backend

### 3.1 `GET /api/progress/overview` (roles `trainer` y `student`)

Query: `student_id` (UUID), `from`, `to` (`YYYY-MM-DD`, inclusivos, hora argentina, opcionales). Mismas reglas que `/progress/exercise`: el alumno puede omitir `student_id` (por defecto él mismo; ajeno → 403); el entrenador lo necesita (400 si falta) y tiene que ser alumno suyo (403). Formato inválido o `from > to` → 400 `VALIDATION_ERROR`.

```json
{ "data": {
  "exercises": [
    { "id": "uuid", "name": "Press de banca", "muscle_group": "chest", "days": 18, "last_date": "2026-10-27" }
  ],
  "weekly_volume": [
    { "week_start": "2026-10-20", "volume_kg": 5230.5, "sessions": 3 },
    { "week_start": "2026-10-27", "volume_kg": 0, "sessions": 0 }
  ]
} }
```

- `exercises`: todos los ejercicios con al menos una serie que cuenta (`completed` y `actual_reps > 0`, misma regla que la curva), **sin filtrar por rango**; `days` = días distintos (hora argentina) con ese ejercicio; orden `last_date` desc y después `name`.
- `weekly_volume`: una fila por semana (lunes, hora argentina) desde la semana de `from` (o la de la primera sesión si no hay `from`) hasta la de `to` (o la actual); `volume_kg` = Σ `actual_reps × actual_kg` de las series que cuentan (kg nulo cuenta 0), a 1 decimal; `sessions` = sesiones distintas con alguna serie que cuenta. Semanas sin series → 0. Sin ninguna sesión y sin `from` → `[]`.

### 3.2 Base de datos

Archivo nuevo `backend/src/database/schema/04b-progress-overview.sql` (04-progress.sql ya está cerca del límite y lo toca también la #33) + migración `backend/src/database/migrations/2026-10-30-progress-overview.sql`:

- `progress_exercises(p_student_id uuid) returns table (exercise_id uuid, name text, muscle_group text, days int, last_date date)`.
- `weekly_volume(p_student_id uuid, p_from date default null, p_to date default null) returns table (week_start date, volume_kg numeric, sessions int)` con `generate_series` de semanas.
- Las dos `language sql stable security invoker`; `revoke all … from public, anon, authenticated` y `grant execute … to service_role` (ADR 0001).
- Usan los índices existentes (`session_sets (session_id)`, `sessions (student_id, …)`); se mira el plan con `EXPLAIN ANALYZE` sobre la alumna de QA.
- `schema/README.md`: fila del archivo nuevo y orden de ejecución.

### 3.3 Código

En el módulo `progress` existente: validación de query (reutiliza la de `/exercise` sin el param), `progressRepo.fetchProgressExercises` y `fetchWeeklyVolume` (rpc), `progressService.overview(user, query)` con `resolveStudentId` + `assertCanAccessStudent`, y el redondeo en `models/progress/` (función pura). Ruta `GET /overview`.

## 4. Frontend (`frontend/`)

Módulo `progress` (CONTRIBUTING: capa → módulo, máximo 200 líneas por archivo):

- `api/progress/progress.api.js`: `getOverview(studentId, range)`, `getExerciseProgress(exerciseId, studentId, range)`, `getBodyProgress(studentId)`.
- `hooks/progress/useProgress.js`: `PROGRESS_KEY = ['progress']` y `useProgressOverview`, `useExerciseProgress`, `useBodyProgress` (keys `[...PROGRESS_KEY, tipo, studentId, …]`, `enabled` con ids).
- `utils/progress/`: rangos (`rangeFor('1m'|'3m'|'all', hoy)` → `{from, to}` en hora argentina), formato es-AR (`formatKg`, `formatVolume`, `formatShortDate`, `formatLongDate`), `metricOptions(points)` (habilitadas/deshabilitadas) y umbral `MIN_POINTS = 3`.
- `components/progress/`: `ProgressPanel` (orquesta: rango, ejercicio, métrica; KPIs; estado vacío global), `ProgressToolbar` (selector de ejercicio con `Select` + rango), `MetricSelector` (segmentado), `ExerciseCurveCard` (LineChart + chip de récord + tooltip), `WeeklyVolumeCard` (BarChart), `ProgressKpis` (usa `Stat`), `NotEnoughData` (mensaje motivador), `BodyProgressCard` (solo alumno: peso en el tiempo + deltas de peso, % grasa y cintura).
- `pages/progress/MyProgressPage.jsx` en `/alumno/progreso` (`router.jsx`: `elements={{ progreso: … }}` en la sección del alumno). Título "Mi progreso".
- `pages/students/StudentProfilePage.jsx`: `<ProgressPanel studentId={id} />` debajo de lo que ya hay (sin `BodyProgressCard`, porque la ficha ya tiene "Evolución del peso"). `key={id}` para que al cambiar de alumno vuelva a los valores por defecto.
- Estilo: tokens de `styles/tokens.css` (`var(--color-…)` en Recharts, como `WeightChart`), `Card`, `Pill`, `EmptyState`, `QueryState`. Ejes con fuente mono legible (≥ 11 px) y contraste para proyector.

## 5. Fuera de alcance

- Racha, logros y KPIs de gamificación → tarjetas 17/18.
- "Exportar" y sparklines por ejercicio → DESEABLES.
- Home y demás pantallas del alumno en la web → tarjeta 22.
- Varias curvas superpuestas (prototipo): la tarjeta pide selector de una.

## 6. Documentación

- `docs/arquitectura/contratos-api.md`: `GET /progress/overview`.
- `docs/adr/0004-metrica-de-progreso.md`: definición del volumen semanal (semana = lunes en hora argentina, semanas vacías en 0).
- `backend/README.md` (tabla de endpoints), `backend/src/database/schema/README.md`, `docs/tarjetas.md`.

## 7. Verificación

- `npm run lint` y `npm test` en `backend/` y `frontend/`.
- Backend: modelo (redondeo de overview), validación, service (alumno propio/ajeno, entrenador con/sin `student_id`, alumno de otro entrenador), rutas, repositorio.
- Frontend: utils (rangos, formato, opciones de métrica), panel con fetch mockeado: lista y ejercicio por defecto, cambio de métrica, métricas deshabilitadas sin kg, umbral de 3 puntos (mensaje con el avance), estado vacío global, rol alumno en `/alumno/progreso` sin selector de alumno, sección en la ficha del PT.
- Supabase dev: aplicar la migración y comparar `overview` de la alumna QA (6 semanas) con un cálculo a mano.
- E2E en el navegador integrado con el backend real: PT → Lucía QA → Press de banca (curva ascendente, tooltips, cambio de métrica y rango); alumna → `/alumno/progreso`; alumno con una sola sesión → mensaje motivador. Capturas en `docs/superpowers/specs/assets/tarjeta-34/`.

## 8. Cambios tras la review (PR #34)

| Ítem | Decisión |
|---|---|
| Rango sin datos suficientes | Si el ejercicio tiene `days >= 3` en todo el historial pero menos de 3 puntos con valor en el rango: "Pocos entrenamientos en este rango: probá con Todo". Si en total tiene menos de 3 días, sigue "Llevás N de 3…" |
| Récord | Con "Todo" se llama "Récord"; con 1 mes / 3 meses, el KPI y el chip dicen "Mejor del rango" (el récord se calcula sobre los puntos del rango) |
| Métrica activa deshabilitada | Si la elegida (o la por defecto) está deshabilitada con los datos del rango, cae en la primera habilitada; si no hay ninguna, queda la por defecto y se muestra el estado de datos insuficientes |
| `metricOptions` | Deshabilita toda métrica sin ningún valor no nulo (1RM todo `null` aunque `max_kg > 0`) y las de kg sin peso registrado. Título: "Sin peso registrado" para las de kg sin kg; "Sin datos en este rango" en los demás casos |
| Volumen semanal | El umbral de 3 cuenta semanas con `sessions > 0` (el peso corporal tiene volumen 0 pero entrena) |
| Tope de `from` | `GET /progress/overview` devuelve 400 si `from` está a más de 3 años (1095 días) de `to` u hoy en Argentina. No aplica a `/progress/exercise`. La web solo manda `from` para 1 mes / 3 meses (como mucho 3 meses atrás, alineado al lunes); "Todo" no manda `from` |

