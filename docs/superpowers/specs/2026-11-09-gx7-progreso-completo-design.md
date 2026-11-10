# GX7 · Mi progreso completo: calendario de asistencia, detalle por ejercicio y métrica de la comparada (A3 + E3) — diseño

Ticket 7 de 9 del lote GX. Una PR. Rama sugerida: `feature/progress-attendance-detail`. **Sale después de la #88** (GW4, progresión comparada): toca sus archivos.

## Contexto

Guía Web (`src/guia-web-hifi.jsx`):

- **A3 · Mi progreso**, funcionalidad 3, "Detalle por ejercicio": "Valor actual, curva y porcentaje de mejora para cada movimiento." Referencia visual: tarjeta "Por ejercicio" de `AW_Progreso` (`src/alumno-web-2.jsx`): nombre, sparkline de 64 × 26, valor ("70 kg") y "+12%" en verde, al lado del gráfico comparado (proporción 1,6 : 1).
- **A3 / E3**, "Progresión de cargas comparada": la #88 la deja con métrica fija (1RM estimado; decisión 6 y "Fuera de alcance" de la GW4). Acá se vuelve elegible.
- **Calendario de asistencia**: no está en la Guía Web, pero sí en el celular del PT (`ent-mobile.jsx`, "Asistencia · abril" con "14 DE 16"; en código `mobile/.../ui/students/progress/AttendanceCalendar.kt` y `StudentProgressSection.kt`, con flechas de mes, piso en el mes del alta y techo en el actual). La web solo usa `GET /students/:id/attendance` para los números de los KPIs (`useCommitment`), no muestra los días.

## Decisiones

| # | Decisión |
|---|---|
| 1 | Un ticket para las tres piezas de progreso (calendario, detalle, métrica): comparten página y la #88 como base. Una PR. |
| 2 | **Calendario**: componente único `AttendanceCard` para Mi progreso (A3) y la ficha (E3). Sin backend: `GET /students/:id/attendance?month=YYYY-MM` ya da los días con `trained` / `missed` / `rest` / `upcoming` y los pisos (alta y rutina). |
| 3 | Colores como el celular: entrenado = `accent` (texto `accentInk`), planificado no entrenado (`missed`) = coral suave (`hot/15`, texto `hot`), descanso = `ink2`, por venir = `ink2` al 45 %; hoy con borde `accentText`. Semana de **lunes a domingo**. |
| 4 | Navegación de meses: flechas ‹ › ; **piso** = mes del alta del alumno (`created_at` de `GET /students/:id`, la misma caché que la ficha y Mi perfil) y nunca antes de `2020-01`; **techo** = mes actual (hora argentina, `useToday`). El mes elegido no va a la URL. |
| 5 | **Detalle por ejercicio** solo en Mi progreso (A3), como en la Guía; la ficha (E3) no lo suma. |
| 6 | Filas del detalle = los candidatos de la comparada (`compareCandidates` de la #88: entrenados en el rango con ≥ 3 días; sin rango, los 6 de más días), con sus curvas **de la misma caché** (`exerciseProgressOptions`): no hay pedidos nuevos respecto de la #88. Se muestran los que tienen ≥ 3 puntos válidos en el rango, de más a menos días; hasta 6 y "Ver todos (N)". |
| 7 | **% de mejora** = (último valor − primer valor del rango) / primer valor, redondeado a entero. Verde si > 0, coral si < 0, `ink6` y "0 %" si es igual; "—" si el primero es 0. "Valor actual" = el último punto válido del rango. |
| 8 | **Métrica de la comparada elegible**: 1RM estimado (por defecto), Peso máximo, Volumen. Sin "Repeticiones" (la comparada no dibuja peso corporal). Con 1RM, el ejercicio sin `e1rm_kg` sigue cayendo a peso máximo (regla de la #88); con las otras dos, todas las líneas usan la elegida. |
| 9 | En Mi progreso **rango y métrica se comparten** entre la comparada y el detalle (los dos viven en una fila, como el prototipo): el estado sube a `MyProgressPage` y `CompareCard` pasa a aceptarlo controlado. En la ficha `CompareCard` sigue con su estado propio (sin detalle al lado). |
| 10 | Peso corporal en el detalle: métrica repeticiones ("15 reps"), con la sparkline y el % de las reps. |

## Diseño

**Orden de Mi progreso**: KPIs → fila comparada + detalle (`lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]`, una columna en angosto) → `AttendanceCard` → `ProgressPanel` → logros. Si `CompareCard` se oculta (sin candidatos o todo peso corporal, regla de la #88), el detalle ocupa la fila entera y usa el rango por defecto.

**`AttendanceCard`** (`components/students/attendance/`): `Card` con título "Asistencia · noviembre" ("Asistencia · octubre 2025" si no es el año en curso, como `monthTitle` del celular) y a la derecha las flechas (`ChevronLeft` / `ChevronRight`, `aria-label` "Mes anterior" / "Mes siguiente", deshabilitadas en piso y techo) y "**14** DE 16" (`sessions` de `assigned_days`; sin plan: "14 SESIONES"). Adentro `AttendanceGrid`: cabecera L M X J V S D en mono y celdas cuadradas con el número del día; cada celda con `aria-label` "5, entrenó" / "faltó" / "descanso" / "por venir" (textos del celular). Debajo, leyenda de tres puntos (Entrenó · Faltó · Descanso). En `lg` la grilla tiene un máximo de 360 px y la leyenda va a la derecha. Cambiar de mes usa `placeholderData: keepPreviousData`: la grilla anterior queda atenuada mientras llega la nueva, sin salto. Cargando la primera vez: `LoadingState rows={3}` "Cargando la asistencia…". Error: `ErrorState` "No pudimos cargar la asistencia." con Reintentar; las flechas siguen andando.

**Ficha (E3)**: `AttendanceCard` en la columna derecha, debajo de `TrainerCommitmentCard` (el mes actual comparte caché con sus KPIs).

**`ExerciseDetailCard`** (`components/progress/detail/`): `Card` "Por ejercicio" con extra mono "1RM ESTIMADO · 3 MESES" (métrica y rango vigentes). Cada `ExerciseDetailRow`: nombre (`truncate`, `title` completo), `Sparkline` (SVG 64 × 26, trazo `accent`, sin ejes, `aria-hidden`), valor actual en display ("70 kg", "15 reps") y el % en mono con su color; la fila tiene `aria-label` "Press banca: 70 kg, +12 % en el rango". Separadores `ink2` entre filas. Estados: cargando, `LoadingState rows={3}` "Cargando el detalle…"; todas las curvas fallaron, `ErrorState` con Reintentar; alguna falló, se omite y se avisa al pie "No pudimos cargar N ejercicios." con Reintentar; ninguno con 3 puntos en el rango: "En este rango ningún ejercicio tiene 3 entrenamientos." (el texto de la #88).

**Métrica de la comparada**: `CompareControls` (nuevo, en `compare/`) junta el select de rango que hoy está en `CompareCard` y un select "Métrica" (`aria-label` "Métrica de la comparación") con 1RM estimado / Peso máximo / Volumen. La nota bajo el gráfico (`metricNote` de `CompareChart`) pasa a "Peso máximo · kg" o "Volumen · kg" según la elegida; con 1RM queda la de la #88 (con la excepción "(X: peso máximo)"). Cambiar la métrica **no** borra la elección a mano de las líneas (cambiar el rango sí, como en la #88); `pickTop` cuenta puntos válidos de la métrica elegida.

## Datos

- `GET /students/:id/attendance?month=YYYY-MM` → `{ month, sessions, assigned_days, prs, days: [{ date, status }] }` (trainer dueño o el propio alumno; mes futuro o anterior a `2020-01` → 400, nunca se pide por el piso y techo).
- `GET /students/:id` → `created_at` para el piso (ya cacheado en ficha y Mi perfil).
- `GET /progress/overview` y `GET /progress/exercise/:id?student_id&from&to` → `points[{ date, max_kg, volume_kg, e1rm_kg, reps }]`, los mismos pedidos que la #88.
- **Sin cambios de backend ni de contrato.**

## Archivos que toca

- Crea `frontend/src/utils/students/attendanceCalendar.js` (`calendarCells(month, days)` con huecos `null` desde el lunes, `shiftMonth(month, delta)`, `firstMonth(createdAt, current)`, `canGoPrev/canGoNext`, `attendanceTitle(month, current)`, `dayLabel(status)`).
- Crea `frontend/src/components/students/attendance/AttendanceCard.jsx` y `AttendanceGrid.jsx`.
- Modifica `frontend/src/hooks/students/useAttendance.js` (12 líneas, +2: opción `keepPrevious` que agrega `placeholderData: keepPreviousData`; `useCommitment` no la usa).
- Crea `frontend/src/utils/progress/exerciseDetail.js` (`detailRows(curves, metric)`, `improvementPct(values)`, `sparkPoints(values, w, h)`), `frontend/src/hooks/progress/useExerciseDetail.js` (`useQueries` con `exerciseProgressOptions`) y `frontend/src/components/progress/detail/ExerciseDetailCard.jsx`, `ExerciseDetailRow.jsx`, `Sparkline.jsx`.
- Crea `frontend/src/components/progress/compare/CompareControls.jsx` (los dos selects).
- Modifica, todos **de la #88**: `components/progress/compare/CompareCard.jsx` (84, saca `RangeSelect` y suma props `range`/`onRange`/`metric`/`onMetric` opcionales: ~90), `CompareChart.jsx` (86, `metricNote` con la métrica: +4), `hooks/progress/useCompareCurves.js` (75, recibe `metric`: +3), `utils/progress/compare.js` (98, `compareMetric(points, wanted)`, `validCount`/`pickTop`/`tooFewPoints` con la métrica: ~108), `pages/progress/MyProgressPage.jsx` (22, estado de rango y métrica y la fila: ~42), `pages/students/StudentProfilePage.jsx` (128, +2: import y `<AttendanceCard>`).
- Tests (crea): `frontend/tests/utils/students/attendanceCalendar.test.js`, `frontend/tests/components/students/attendance/AttendanceCard.test.jsx`, `frontend/tests/utils/progress/exerciseDetail.test.js`, `frontend/tests/components/progress/detail/ExerciseDetailCard.test.jsx`, `frontend/tests/components/progress/compare/CompareControls.test.jsx`, `frontend/tests/pages/progress/MyProgressPage/attendance.test.jsx`, `MyProgressPage/detail.test.jsx`, `frontend/tests/pages/students/StudentProfilePage/activity/attendance.test.jsx`.
- Tests (modifica, de la #88): `frontend/tests/utils/progress/compare.test.js` (136, +~25: métrica elegida) y `frontend/tests/pages/progress/MyProgressPage/compare.test.jsx` (cambio de métrica y rango compartido con el detalle). `CompareCard.test.jsx` (148) no se toca: lo nuevo va en `CompareControls.test.jsx` y en la página.

Carpetas: `components/progress/` queda con 9 archivos + `compare/` + `detail/`; `utils/progress/` con 5; `utils/students/` con 9.

**Chequeo contra PRs abiertas.**
- **#88**: todos los archivos de `compare/`, `useCompareCurves.js`, `compare.js`, `MyProgressPage.jsx` y `StudentProfilePage.jsx` son suyos. La rama sale de `develop` **con la #88 mergeada**; si se demora, no se arranca la parte (b)/(c) (el calendario solo choca en `StudentProfilePage.jsx`, dos líneas).
- **#89** (GW5): no toca nada de progreso. **#91**: no toca `useAttendance` ni `commitment`. **#84**: toca `StudentProfilePage/activity/assign-routine.test.jsx`, no el archivo nuevo de asistencia.
- `useCommitment.js` no se modifica (se respeta la clave `[...STUDENTS_KEY, id, 'attendance', month]`): el mes actual del calendario y los KPIs comparten caché.

## Pruebas

**Vitest**
- `attendanceCalendar`: noviembre 2026 empieza domingo → 6 huecos; febrero 2027 de 28 días; `shiftMonth('2026-01', -1)` = `2025-12`; piso = mes del alta (alta en el mes actual → sin flecha atrás); techo = mes actual; título con año si no es el actual.
- `AttendanceCard`: pinta cada estado con su `aria-label`; "14 DE 16"; sin plan "N SESIONES"; ‹ pide el mes anterior y › vuelve; flechas deshabilitadas en los bordes; error con Reintentar.
- `exerciseDetail`: % de 60 a 70 = +17; igual = 0; primero 0 = `null`; descarta los de menos de 3 puntos; métrica 1RM cae a peso máximo sin `e1rm_kg`; peso corporal usa reps; orden por días y nombre.
- `ExerciseDetailCard`: fila con valor, % verde/coral, sparkline; "Ver todos (N)" con más de 6; una curva fallida avisa al pie; vacío con el texto de la #88.
- `compare.js`: `pickTop` con `max_kg` y `volume_kg`; `mergeSeries` con la métrica.
- `MyProgressPage`: cambiar la métrica a Volumen cambia la nota del gráfico y el extra del detalle; cambiar el rango cambia los dos; el calendario aparece después de la fila.
- `StudentProfilePage/activity/attendance`: el PT ve el calendario del alumno y navega meses; no hay "Por ejercicio".

**Navegador:** alumno de QA con dos meses de sesiones (entrenados, faltas y descansos) y uno sin plan; PT en su ficha. Capturas en `docs/superpowers/specs/assets/gx7/` (`01-mi-progreso.jpg`, `02-calendario-mes-anterior.jpg`, `03-detalle-por-ejercicio.jpg`, `04-comparada-volumen.jpg`, `05-ficha-calendario.jpg`, `06-angosto-375.jpg`).

## Criterio de aceptación

- En Mi progreso y en la ficha se ve el calendario del mes con entrenados, faltas y descansos, y se navega de mes sin pasar del alta ni del mes actual.
- En Mi progreso, "Por ejercicio" muestra valor actual, curva y % de mejora de cada ejercicio entrenado en el rango, sin pedidos de más respecto de la comparada.
- La comparada deja elegir 1RM estimado, peso máximo o volumen, en Mi progreso y en la ficha.
- Lint y tests en verde; ningún archivo pasa de 200 líneas.

## Estimación

**13 h**: calendario (util, tarjeta, grilla, navegación, dos páginas) 3,5 h; detalle por ejercicio 3 h; métrica de la comparada 2 h; tests 3 h; navegador y capturas 1,5 h.

## Fuera de alcance

- Agregación semanal en el backend (nota técnica de A3) y un endpoint de "resumen por ejercicio".
- Elegir el ejercicio del panel (`ProgressPanel`) tocando una fila del detalle.
- Exportar (botón "Exportar" del prototipo) y el selector de rango en la cabecera de la página.
- Tocar un día del calendario para abrir su sesión.

## Tarjetas para el celular (Igna)

1. **Calendario de asistencia en el Progreso del alumno**: el celular lo tiene solo en la ficha del PT (`StudentProgressSection`). Reusar `AttendanceCalendar` y la navegación de meses en la pantalla de progreso del alumno, con `GET /students/:id/attendance?month=` (el alumno puede pedir el suyo) y el piso en su `created_at`.
2. **Detalle por ejercicio del alumno**: lista con valor actual, sparkline y % de mejora en el rango, con `GET /progress/overview` y `GET /progress/exercise/:exerciseId` (mismas reglas: ≥ 3 puntos, % primero → último, peso corporal en reps). Solo si las gráficas del celular (`ui/progress/charts`) no lo cubren ya.
3. Métrica de la comparada: **ninguna** mientras el celular no tenga la progresión comparada.
