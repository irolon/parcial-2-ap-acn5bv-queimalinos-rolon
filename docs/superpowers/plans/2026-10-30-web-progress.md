# Vista de progreso en la web — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GET /api/progress/overview` (ejercicios con datos + volumen semanal) y la vista de progreso en la web: sección en la ficha del alumno del PT y página `/alumno/progreso` del alumno, con curva por ejercicio, selector de métrica y rango, volumen semanal, KPIs, evolución corporal (alumno) y estado de datos insuficientes.

**Architecture:** dos funciones SQL nuevas en `04b-progress-overview.sql` llamadas con `supabase.rpc` desde el módulo `progress` existente; en el front, módulo `progress` (api → hooks → utils → components → pages) con un `ProgressPanel` compartido por los dos roles.

**Tech Stack:** backend Node ESM + Express + supabase-js + Jest ESM; frontend React 19 + React Router 7 + TanStack Query 5 + Recharts 3.10 + Tailwind v4 + Vitest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-30-web-progress-design.md` (decisiones Q1–Q13; leerlo antes de cada tarea).

## Global Constraints

- `CONTRIBUTING.md`: ningún archivo de código > 200 líneas (tests y `.sql` incluidos); ≤ 10 archivos por carpeta; capa → módulo (`progress`) → archivo; tests espejan `src`; suites grandes en carpeta + helpers en `tests/helpers/progress/`.
- `frontend/src/components/shared/ui` no recibe archivos nuevos: los componentes nuevos van en `components/progress/`.
- Commits Conventional Commits en español, **sin** `Co-Authored-By` ni firma de IA. No pushear.
- Zona horaria: `America/Argentina/Buenos_Aires`; fechas `YYYY-MM-DD`; semana = lunes.
- Series que cuentan: `completed = true` y `actual_reps > 0` (misma regla que `exercise_progress`).
- Umbral de datos: `MIN_POINTS = 3`.
- Métricas: `e1rm_kg` (1RM estimado), `max_kg` (Peso máximo), `volume_kg` (Volumen), `reps` (Repeticiones). Sin kg = ningún punto con `max_kg > 0`.
- Formato es-AR: coma decimal; kg a 1 decimal ("88,7 kg"); volumen ≥ 1000 kg en toneladas ("12,4 t").
- Colores: tokens de `frontend/src/styles/tokens.css` vía `var(--color-…)` (ver `components/body-metrics/WeightChart.jsx`).
- Tests de Recharts en jsdom: mockear `ResponsiveContainer` como en `frontend/tests/pages/students/StudentProfilePage/metrics.test.jsx` (l.8-15).
- Verificación por tarea: `npm run lint && npm test` en la carpeta tocada (`backend/` o `frontend/`), en verde.

## Review Focus

1. **Entrenador sin `student_id`** → 400; **alumno con `student_id` ajeno** → 403 en `/overview`.
2. **Semanas vacías** → filas con 0, no huecos; con "Todo" arranca en la semana de la primera sesión.
3. **Ejercicio de peso corporal** (`max_kg` 0/null) → arranca en Repeticiones y las métricas de kg quedan deshabilitadas.
4. **1 o 2 puntos** → mensaje "Llevás N de 3…", nunca un gráfico de 1–2 puntos.
5. **Alumno en `/alumno/progreso`** → sin selector de alumno, con su `user.id`; **PT en la ficha** → `key={id}` resetea selectores al cambiar de alumno.

---

### Task 1: Backend — `GET /api/progress/overview`

**Files:**
- Create: `backend/src/database/schema/04b-progress-overview.sql`, `backend/src/database/migrations/2026-10-30-progress-overview.sql`
- Modify: `backend/src/database/schema/README.md` (fila y orden), `backend/src/database/checks/schema-checks.sql` si lista funciones esperadas
- Modify: `backend/src/{validations,repositories,services,controllers,routes,models}/progress/*`
- Test: `backend/tests/unit/{models,validations,repositories,services,routes}/progress/…`
- Docs: `docs/arquitectura/contratos-api.md` (sección Progress), `docs/adr/0004-metrica-de-progreso.md` (volumen semanal), `backend/README.md` (tabla de endpoints)

**Interfaces:**
- SQL: `progress_exercises(p_student_id uuid)` → `{ exercise_id, name, muscle_group, days int, last_date date }`, orden `last_date desc, name`; `weekly_volume(p_student_id uuid, p_from date default null, p_to date default null)` → `{ week_start date, volume_kg numeric, sessions int }` ascendente, semanas vacías en 0 (`generate_series` desde `date_trunc('week', coalesce(p_from, primera sesión))` hasta `date_trunc('week', coalesce(p_to, hoy AR))`; sin sesiones y sin `p_from` → sin filas). `security invoker`, `revoke all … from public, anon, authenticated`, `grant execute … to service_role`.
- JS: `progressRepo.fetchProgressExercises(studentId)`, `progressRepo.fetchWeeklyVolume({ studentId, from, to })`; modelo `toOverview(exerciseRows, weekRows) → { exercises: [{ id, name, muscle_group, days, last_date }], weekly_volume: [{ week_start, volume_kg, sessions }] }` (números redondeados, fechas string); `progressService.overview(user, query)`; ruta `GET /overview` con `validateProgressOverviewQuery` (mismas reglas que la query de `/exercise`).

- [ ] **Step 1:** SQL en el schema nuevo y en la migración (idénticos).
- [ ] **Step 2:** tests que fallan: modelo (redondeo, fechas `Date` → string), validación (UUID/fechas inválidas, `from > to`), service (alumno propio sin `student_id`, alumno ajeno → 403, entrenador sin `student_id` → 400, alumno de otro entrenador → 403, llama al repo con `from`/`to` null por defecto), rutas, repositorio (rpc con los nombres de parámetros correctos; error → 500).
- [ ] **Step 3:** implementar hasta verde. Si `progress.service.js` o el test del service pasan 200 líneas, partir según CONTRIBUTING.
- [ ] **Step 4:** docs (contrato con ejemplo JSON del spec §3.1; ADR 0004: semana lunes AR, vacías en 0; README).
- [ ] **Step 5:** `cd backend && npm run lint && npm test`; commit `feat(progress): overview con ejercicios entrenados y volumen semanal`.

### Task 2: Frontend — api, hooks y utils de `progress`

**Files:**
- Create: `frontend/src/api/progress/progress.api.js`, `frontend/src/hooks/progress/useProgress.js`, `frontend/src/utils/progress/{ranges,format,metrics}.js`
- Test: `frontend/tests/api/progress/…`, `frontend/tests/hooks/progress/…` (si el repo testea hooks), `frontend/tests/utils/progress/…`

**Interfaces:**
- `getOverview(studentId, { from, to })`, `getExerciseProgress(exerciseId, studentId, { from, to })`, `getBodyProgress(studentId)` → `res.data`; query string sin claves vacías.
- `PROGRESS_KEY = ['progress']`; `useProgressOverview(studentId, range)`, `useExerciseProgress(exerciseId, studentId, range)`, `useBodyProgress(studentId)` con `enabled` cuando hay ids.
- `RANGES = [{ value: '1m', label: '1 mes' }, { value: '3m', label: '3 meses' }, { value: 'all', label: 'Todo' }]`, `DEFAULT_RANGE = '3m'`; `rangeFor(value, now = new Date()) → { from, to }` (fechas AR; `'all'` → `{ from: null, to: null }`).
- `formatKg(n)`, `formatVolume(kg)`, `formatReps(n)`, `formatShortDate('YYYY-MM-DD') → 'dd/mm'`, `formatLongDate → '27 oct 2026'`, `formatMetric(metric, value)`.
- `METRICS = [{ value: 'e1rm_kg', label: '1RM estimado' }, { value: 'max_kg', label: 'Peso máximo' }, { value: 'volume_kg', label: 'Volumen' }, { value: 'reps', label: 'Repeticiones' }]`; `hasKg(points)`; `metricOptions(points) → METRICS con disabled`; `MIN_POINTS = 3`.

- [ ] **Step 1:** tests que fallan (rangos con fecha fija y borde de medianoche AR, formato es-AR, `metricOptions` con y sin kg, api con `stubFetch`).
- [ ] **Step 2:** implementar hasta verde; `cd frontend && npm run lint && npm test`; commit `feat(web): api, hooks y utilidades de progreso`.

### Task 3: Frontend — tarjetas de gráficos

**Files:**
- Create: `frontend/src/components/progress/{MetricSelector,ExerciseCurveCard,WeeklyVolumeCard,ProgressKpis,NotEnoughData}.jsx`
- Test: `frontend/tests/components/progress/…`

**Interfaces:**
- `MetricSelector({ value, options, onChange })` — segmentado accesible (`role="radiogroup"`/botones con `aria-pressed`), opción deshabilitada con `title="Sin peso registrado"`.
- `ExerciseCurveCard({ data, metric, onMetricChange })` con `data` = respuesta de `/progress/exercise`: chip de récord (`pr.e1rm_kg` o `pr.max_kg` según métrica de kg; nada para reps/volumen), LineChart `accent` con punto `hot` en la fecha del récord, tooltip con fecha larga + valor + "3 × 10" (sets × reps del día: `sets` series, `reps` totales). Con `< MIN_POINTS` puntos → `NotEnoughData`.
- `WeeklyVolumeCard({ weeks })` — BarChart `cool`, eje "dd/mm", tooltip con semana, volumen y sesiones; menos de `MIN_POINTS` semanas con volumen > 0 → `NotEnoughData`.
- `ProgressKpis({ weeks, pr, metric })` — 3 `Stat`: sesiones del rango, volumen total del rango, récord del ejercicio.
- `NotEnoughData({ count, exerciseName })` — "Llevás {count} de 3 entrenamientos de {ejercicio}: después del tercero vas a ver tu progresión acá" (variante sin ejercicio para el volumen semanal).

- [ ] **Step 1:** tests que fallan (curva con 6 puntos dibuja 6 dots y el chip de récord; 2 puntos → mensaje "Llevás 2 de 3"; opción deshabilitada no dispara `onChange`; barras con semanas en 0; KPIs con valores formateados).
- [ ] **Step 2:** implementar hasta verde; lint + test; commit `feat(web): gráficos de curva por ejercicio y volumen semanal`.

### Task 4: Frontend — panel, páginas y rutas

**Files:**
- Create: `frontend/src/components/progress/{ProgressPanel,ProgressToolbar,BodyProgressCard}.jsx`, `frontend/src/pages/progress/MyProgressPage.jsx`
- Modify: `frontend/src/pages/students/StudentProfilePage.jsx` (sección al final, `<ProgressPanel key={id} studentId={id} />`), `frontend/src/routes/router.jsx` (`elements={{ progreso: <MyProgressPage /> }}` en la sección del alumno)
- Test: `frontend/tests/components/progress/ProgressPanel/…`, `frontend/tests/pages/progress/…`, ampliar `frontend/tests/pages/students/StudentProfilePage/…` (usar `renderRoute` + `setSession`)

**Interfaces:**
- `ProgressPanel({ studentId, showBody = false })` — estado local `range` (`DEFAULT_RANGE`), `exerciseId` (primero de `overview.exercises` si no hay elegido o el elegido ya no está), `metric` (se resetea a `default_metric` al cambiar de ejercicio). Sin ejercicios → un `EmptyState` para todo el panel ("Todavía no hay entrenamientos registrados…"). Orden: toolbar → KPIs → curva → volumen semanal → (alumno) `BodyProgressCard`.
- `ProgressToolbar({ exercises, exerciseId, onExercise, range, onRange })` — `Select` de `components/shared/ui` + selector de rango.
- `BodyProgressCard({ studentId })` — `/progress/body`: línea de peso + deltas de peso, % grasa y cintura (`+` en `good`/`-` en `hot` como el prototipo, o neutral si cuesta justificarlo); sin medidas → mensaje de Q13.
- `MyProgressPage` — título "Mi progreso" con el estilo de las demás páginas; `useAuthStore((s) => s.user).id`; `<ProgressPanel studentId={user.id} showBody />`.

- [ ] **Step 1:** tests que fallan (alumno en `/alumno/progreso` ve el panel, sin selector de alumno, pide `/progress/overview` sin `student_id` ajeno; PT en la ficha ve la sección y pide con `student_id`; cambio de ejercicio resetea la métrica; sin ejercicios → estado vacío global; body sin medidas → mensaje).
- [ ] **Step 2:** implementar hasta verde; lint + test; commit `feat(web): vista de progreso para el entrenador y el alumno`.

### Task 5: Documentación de cierre

- [ ] `docs/tarjetas.md` (fila de la tarjeta 34 con spec y plan), `frontend/README.md` si lista pantallas, `backend/src/database/schema/README.md` ya hecho en Task 1.
- [ ] Commit `docs: tarjeta 34 (vista de progreso web)`.
