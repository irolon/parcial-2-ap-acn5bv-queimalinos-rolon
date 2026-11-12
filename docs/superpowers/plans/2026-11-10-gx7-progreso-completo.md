# GX7 · Mi progreso completo — plan de implementación

> **Para agentes:** se ejecuta tarea por tarea con TDD (test que falla primero), un commit por tarea. Pasos con checkbox (`- [ ]`).

**Objetivo:** calendario de asistencia (Mi progreso y ficha), detalle "Por ejercicio" (Mi progreso) y métrica elegible en la progresión comparada.

**Arquitectura:** utilidades puras (`attendanceCalendar.js`, `exerciseDetail.js`, métrica en `compare.js`) + hooks sobre las mismas claves de caché de la #88 (`exerciseProgressOptions`, `[...STUDENTS_KEY, id, 'attendance', month]`) + componentes. `MyProgressPage` sube rango y métrica y los comparte entre `CompareCard` (controlada) y `ExerciseDetailCard`.

**Stack:** React + Vite + TanStack Query 5 + Tailwind 4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-09-gx7-progreso-completo-design.md`.

## Restricciones globales

- CONTRIBUTING: ≤ 200 líneas por archivo (tests incluidos); carpeta con > 10 archivos se subdivide; tests espejan `src/`; lo dividido va en carpeta con el nombre del original.
- Sin cambios de backend ni de contrato; ningún pedido nuevo respecto de la #88 para el detalle.
- Vitest siempre con `--maxWorkers=2`, solo archivos afectados; al final una corrida completa, `npx eslint .`, `npm run build`.
- Commits en español, Conventional Commits, sin trailers de IA.

## Desvíos respecto del spec (por la #88 final)

- `compareCandidates` ya no corta en 6: el detalle usa los candidatos actuales (todos los de ≥ 3 días; con rango, los entrenados en él), muestra hasta 6 filas y "Ver todos (N)".
- `CompareCard` no se oculta después de cambiar el rango (aviso "todo peso corporal" con el selector). El `touched` sigue siendo interno de la tarjeta: lo prende su propio control de rango aunque el estado esté controlado por la página.
- Sin ningún ejercicio de ≥ 3 días en todo el historial (`compareCandidates(exercises)` vacío), "Por ejercicio" no se muestra (el vacío lo explica `ProgressPanel`): mostrar "Probá con un rango más largo" sin selector de rango confunde.
- El detalle ocupa la fila entera cuando `CompareCard` se oculta con CSS (`lg:[&:only-child]:col-span-2`), sin que la página tenga que saber por qué se ocultó.

## Foco de revisión

1. Cambiar de alumno en la ficha con el calendario en otro mes: no debe verse la asistencia del alumno anterior (`key` por id y `placeholderData` solo del mismo alumno).
2. Mes del alta igual al actual, o `created_at` todavía cargando / con error: flecha atrás deshabilitada, nunca se pide un mes anterior a `2020-01`.
3. Día que pasa de mes con la pantalla abierta (`useToday`): el mes mostrado no puede quedar por encima del techo.
4. Curvas con `e1rm_kg` mezcladas con otras sin él en 1RM: el detalle cae a peso máximo por ejercicio, como la comparada.
5. Métrica volumen con un ejercicio de 2 puntos de volumen y 3 de peso: se cuenta con la métrica elegida (`validCount(points, metric)`).

---

### Tarea 1: métrica elegible en `compare.js`

**Archivos:** modifica `frontend/src/utils/progress/compare.js`; test `frontend/tests/utils/progress/compare.test.js`.

**Produce:**
- `COMPARE_METRICS` = `METRICS` sin `reps`; `DEFAULT_COMPARE_METRIC = 'e1rm_kg'`.
- `compareMetric(points, wanted = 'e1rm_kg')`: con `e1rm_kg`, la regla de la #88; con otra, `wanted`.
- `tooFewPoints(points, wanted)`, `pickTop(curves, n, wanted)` cuentan puntos válidos de esa métrica.

- [ ] Test: `compareMetric(pts, 'volume_kg') === 'volume_kg'`; `pickTop` con `max_kg` y con `volume_kg` (curva con 2 puntos de volumen queda afuera); `mergeSeries(curves, () => 'volume_kg')`. Correr: falla.
- [ ] Implementar. Correr: pasa. Commit `feat(progress): métrica elegible en las utilidades de la comparada`.

### Tarea 2: `useCompareCurves` con métrica

**Archivos:** modifica `frontend/src/hooks/progress/useCompareCurves.js`; divide `tests/hooks/progress/useCompareCurves.test.jsx` (200 líneas) en `tests/hooks/progress/useCompareCurves/curves.test.jsx` y suma `useCompareCurves/metric.test.jsx`.

**Produce:** `useCompareCurves(studentId, exercises, range, metric = 'e1rm_kg')`; cada línea con `metric` = `compareMetric(points, metric)`; cambiar la métrica no borra la elección a mano.

- [ ] Test (`metric.test.jsx`): con `volume_kg` todas las líneas tienen `metric: 'volume_kg'`; elección a mano + cambio de métrica → `slots` iguales; ningún pedido nuevo al cambiar la métrica. Falla.
- [ ] Implementar, pasa. Commit `feat(progress): la comparada recibe la métrica elegida`.

### Tarea 3: `CompareControls`, nota del gráfico y `CompareCard` controlable

**Archivos:** crea `components/progress/compare/CompareControls.jsx`; modifica `CompareCard.jsx`, `CompareChart.jsx`; test `tests/components/progress/compare/CompareControls.test.jsx`.

**Produce:** `CompareControls({ range, onRange, metric, onMetric })` (selects `aria-label` "Rango de la comparación" y "Métrica de la comparación"); `CompareCard({ studentId, range?, onRange?, metric?, onMetric? })`; `CompareChart({ lines, metric })`, nota "Peso máximo · kg" / "Volumen · kg" / la de la #88 con 1RM.

- [ ] Test: los selects muestran las 3 métricas y avisan el cambio; `CompareCard` sin props: elegir Volumen cambia la nota a "Volumen · kg" sin pedir curvas nuevas; con Peso máximo, "Peso máximo · kg". Falla.
- [ ] Implementar, pasa (incluido `CompareCard.test.jsx` y `CompareChart.test.jsx` sin tocar). Commit.

### Tarea 4: `exerciseDetail.js`

**Archivos:** crea `frontend/src/utils/progress/exerciseDetail.js`; test `tests/utils/progress/exerciseDetail.test.js`.

**Produce:** `improvementPct(values) → number|null`; `formatPct(pct) → '+17 %' | '-5 %' | '0 %' | '—'`; `sparkPoints(values, w, h) → 'x,y x,y…'` (pad 2, plano al medio); `detailRows(curves, wanted) → [{ id, name, days, metric, values, current, pct }]` (peso corporal → `reps`; < 3 valores afuera; orden días y nombre).

- [ ] Tests con los valores del spec (60→70 = 17; igual = 0; primero 0 = null; 1RM sin `e1rm_kg` → `max_kg`; peso corporal → reps; orden). Falla → implementar → pasa → commit.

### Tarea 5: `useExerciseDetail` + `ExerciseDetailCard`

**Archivos:** crea `hooks/progress/useExerciseDetail.js`, `components/progress/detail/{ExerciseDetailCard,ExerciseDetailRow,Sparkline}.jsx`; test `tests/components/progress/detail/ExerciseDetailCard.test.jsx`.

**Produce:** `useExerciseDetail(studentId, exercises, range, metric) → { rows, loading, failed: [{id,name,retry}], allFailed, hidden }`; `ExerciseDetailCard({ studentId, range, metric })` (`range` = valor de `RANGES`).

- [ ] Test: fila con "Press banca: 70 kg, +17 % en el rango", extra "1RM ESTIMADO · 3 MESES", sparkline; > 6 → "Ver todos (7)"; una curva fallida → "No pudimos cargar 1 ejercicio." con Reintentar; todas fallan → ErrorState; ninguna con 3 puntos → texto de la #88; sin candidatos → no se muestra. Falla → implementar → pasa → commit.

### Tarea 6: `attendanceCalendar.js` + `useAttendanceQuery` con `keepPrevious`

**Archivos:** crea `utils/students/attendanceCalendar.js`; modifica `hooks/students/useAttendance.js`; test `tests/utils/students/attendanceCalendar.test.js`.

**Produce:** `calendarCells(month, days) → (null | { day, date, status })[]`; `shiftMonth(month, delta)`; `firstMonth(createdAt, current)` (≥ `2020-01`, ≤ current; sin alta → current); `canGoPrev(month, floor)`, `canGoNext(month, current)`; `attendanceTitle(month, current)`; `dayLabel(status)` (`entrenó`/`faltó`/`descanso`/`por venir`); `isoDay(now)`; `useAttendanceQuery(id, month, { keepPrevious })` (placeholder solo del mismo alumno).

- [ ] Tests del spec (noviembre 2026 → 6 huecos; febrero 2027 = 28; `shiftMonth('2026-01', -1)`; piso/techo; título con año). Falla → implementar → pasa → commit.

### Tarea 7: `AttendanceCard` + `AttendanceGrid`

**Archivos:** crea `components/students/attendance/{AttendanceCard,AttendanceGrid}.jsx`; test `tests/components/students/attendance/AttendanceCard.test.jsx`.

**Produce:** `AttendanceCard({ studentId })` (usa `useToday`, `useStudentQuery` para el piso, `useAttendanceQuery(..., { keepPrevious: true })`).

- [ ] Test: cada estado con su `aria-label`; "14 DE 16"; sin plan "14 SESIONES"; ‹ pide el mes anterior y › vuelve; flechas deshabilitadas en piso y techo; error con Reintentar y flechas andando. Falla → implementar → pasa → commit.

### Tarea 8: páginas

**Archivos:** modifica `pages/progress/MyProgressPage.jsx`, `pages/students/StudentProfilePage.jsx`; tests `tests/pages/progress/MyProgressPage/{attendance,detail}.test.jsx`, `compare.test.jsx`, `tests/pages/students/StudentProfilePage/activity/attendance.test.jsx`.

- [ ] Tests: Mi progreso — Volumen cambia la nota y el extra del detalle; el rango cambia los dos; el calendario va después de la fila y antes del panel. Ficha — el PT ve el calendario y navega; no hay "Por ejercicio". Falla → implementar → pasa → commit.

### Tarea 9: cierre

- [ ] Revisión del diff contra spec y CONTRIBUTING (`wc -l`, conteo de carpetas).
- [ ] `npx vitest run --maxWorkers=2`, `npx eslint .`, `npm run build`; push.
