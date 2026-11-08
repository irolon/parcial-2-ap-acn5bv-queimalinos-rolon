# GW3 · Indicadores del alumno y de compromiso (A3 + E3) — diseño

Ticket 3 de 5 de "lo que falta de la Guía Web". Una PR. Rama sugerida: `feature/student-indicators`.

## Contexto

Guía Web (`src/guia-web-hifi.jsx`):

- **A3 · Mi progreso**, funcionalidad 1, "Cuatro indicadores de cabecera": "Sesiones del mes, racha, récords y volumen total, cada uno con su contexto."
- **E3 · Perfil del alumno**, funcionalidad 3, "Indicadores de compromiso": "Sesiones del mes sobre planificadas, racha, esfuerzo promedio y récords."

Referencia visual: `AW_Progreso` en `src/alumno-web-2.jsx` (4 tarjetas: SESIONES DEL MES `14 /16`, RACHA ACTUAL `12 días`, RÉCORDS DEL MES `3 nuevos`, VOLUMEN TOTAL `48 t` con "+9% vs mes anterior") y `PTPerfil` en `src/pt-screens.jsx`. El celular ya muestra SESIONES `6/9`, RACHA y PRS del mes desde `GET /students/:id/attendance` (`ui/students/progress/StudentProgressSection.kt`).

Hoy la web no consume `attendance`. `ProgressKpis` (dentro de `ProgressPanel`) muestra sesiones, volumen y récord **del rango y del ejercicio elegido**: es otra cosa y queda.

## Decisiones

| # | Decisión |
|---|---|
| 1 | Un ticket por pantalla (aquí A3 + E3, que comparten datos): 5 tickets = 5 PRs. |
| 2 | **Alumno, "Mi progreso"**: 4 KPIs (sesiones del mes, racha, récords del mes, volumen) desde `attendance`, `streak` y `progress/overview`. Se dibujan **fuera de `ProgressPanel`**, a nivel página, arriba del panel. |
| 3 | **PT, ficha del alumno**: indicadores de compromiso (sesiones del mes sobre planificadas, racha, RPE promedio, récords) con **el mismo hook**. |
| 4 | **Una sola API y un solo hook de asistencia** (`getAttendance` / `useAttendanceQuery`), compartidos por las dos pantallas. |
| 5 | "Sesiones del mes" = `sessions / assigned_days`, el `sessionsLabel` del celular ("6/9"). `assigned_days` cuenta hasta hoy inclusive. |
| 6 | "Récords" = `attendance.prs` (sesiones del mes con al menos un récord), como PRS del celular. |
| 7 | **Volumen** (alumno): suma de las últimas 4 semanas completas o en curso de `weekly_volume`, con la variación contra las 4 anteriores ("+9% vs. las 4 semanas anteriores"). No "del mes": el overview agrupa por semana y un mes no cae en semanas enteras. |
| 8 | **RPE promedio** (PT): promedio de `rpe` no nulo de las sesiones terminadas del mes en curso, de la primera página del historial (`useSessionsInfinite`, la misma caché que `SessionsHistory`), a 1 decimal. Con más de 20 sesiones en el mes, el promedio es de las últimas 20 (se aclara en el `title`). |
| 9 | Mes = mes actual en hora argentina; sin navegación de meses (el calendario de asistencia queda fuera). |

## Diseño

Componente común `CommitmentKpis` (grilla `grid-cols-2 lg:grid-cols-4`, cada ítem un `Card padding={16}` con `Stat`) que recibe los 4 ítems ya armados.

**Alumno** (`StudentProgressKpis`, en `MyProgressPage` arriba de `ProgressPanel`):

| Label | Valor | Contexto |
|---|---|---|
| SESIONES DEL MES | `6`, unidad `/9` (accent) | "de 9 días planificados"; sin días asignados: unidad vacía y "Sin plan este mes" |
| RACHA | `12`, unidad `días` | "Tu mejor racha: 21 días"; en 0: "Arrancá hoy" |
| RÉCORDS DEL MES | `2` | "sesiones con récord"; en 0: "Todavía ninguno este mes" |
| VOLUMEN · 4 SEMANAS | `48,2 t` o `5.230 kg` (`formatVolume`) | "+9% vs. las 4 semanas anteriores" (verde/coral; sin semanas previas con volumen, nada) |

**PT** (`TrainerCommitmentCard`, `Card` "Compromiso · noviembre" en la ficha, columna derecha, arriba de `WeightChart`):

| Label | Valor | Contexto |
|---|---|---|
| SESIONES DEL MES | `6/9` | "sobre planificadas" |
| RACHA | `12` días | "Mejor: 21" |
| RPE PROMEDIO | `7,4` | "de 5 sesiones"; sin RPE: "—" y "Sin RPE cargado" |
| RÉCORDS | `2` | "este mes" |

**Estados** (por bloque, no por tarjeta):
- Cargando: `LoadingState rows={1}` con "Cargando tus indicadores…" (alumno) o "Cargando indicadores…" (PT).
- Error de `attendance` o `streak`: `ErrorState` "No pudimos cargar los indicadores." con Reintentar, que vuelve a pedir solo lo que falló. Si falla solo el overview (volumen) o el historial (RPE), ese ítem muestra "—" y el resto se ve.
- Alumno sin ninguna sesión: los KPIs se ven igual (en 0), el estado vacío sigue siendo el de `ProgressPanel`.

## Datos

- `GET /students/:id/attendance?month=YYYY-MM` → `{ month, sessions, assigned_days, prs, days }` (se ignora `days`).
- `GET /students/:id/streak` → `current_streak_days`, `longest_streak_days` (`useStudentStreakQuery`, ya existe).
- `GET /progress/overview?student_id&from&to` con `from` = lunes de hace 7 semanas, `to` = hoy (8 filas de `weekly_volume`).
- `GET /students/:id/sessions` (primera página, ya cacheada por la ficha) → `rpe`, `finished_at`.
- Query key de asistencia: `['students', id, 'attendance', month]`. Sin cambios de backend ni de contrato.

## Archivos que toca

- Crea `frontend/src/api/students/attendance.api.js` (`getAttendance(id, month)`) y `frontend/src/hooks/students/useAttendance.js` (`useAttendanceQuery`).
- Crea `frontend/src/hooks/students/useCommitment.js`: junta asistencia del mes y racha (comunes); `rpe` y `volume` opcionales por parámetro (`{ withRpe, withVolume }`).
- Crea `frontend/src/utils/students/commitment.js`: `currentMonth(now)`, `rpeAverage(sessions, month)`, `volumeWindow(weeks)` → `{ total, deltaPct }`, `eightWeeksRange(now)`.
- Crea `frontend/src/components/students/commitment/CommitmentKpis.jsx`, `StudentProgressKpis.jsx`, `TrainerCommitmentCard.jsx`.
- Modifica `frontend/src/pages/progress/MyProgressPage.jsx` (17 líneas) y `frontend/src/pages/students/StudentProfilePage.jsx` (124 líneas, +2).
- Tests (crea): `frontend/tests/api/students/attendance.api.test.js`, `frontend/tests/utils/students/commitment.test.js`, `frontend/tests/hooks/students/useCommitment.test.jsx`, `frontend/tests/components/students/commitment/{StudentProgressKpis,TrainerCommitmentCard}.test.jsx`, `frontend/tests/helpers/students/attendance.js` (fixture `ATTENDANCE` y su ruta), `frontend/tests/pages/progress/MyProgressPage/kpis.test.jsx` (y se mueve el `MyProgressPage.test.jsx` actual a `MyProgressPage/panel.test.jsx`), `frontend/tests/pages/students/StudentProfilePage/activity/commitment.test.jsx`.
- Tests (modifica): `frontend/tests/helpers/progress/progress.jsx` (`stubProgress` contesta `attendance` por defecto) y `frontend/tests/helpers/students/profile.js` (`loadProfile` envuelve el `fetch` para contestar `attendance`; así los tests de la ficha no ven un 500 de más).

**Chequeo contra PRs abiertas.** No toca `ProgressPanel.jsx` ni `NotEnoughData.jsx` (#81) ni `ProfileActions.jsx` (#84): los KPIs van a nivel página. Tampoco `useAuthStore.js` (solo se importa, como hoy), `students.routes.js` (el endpoint ya existe), `InactivityAlerts.jsx`, `RoutineEditorPage.jsx` ni `trainer-ai`/`chat`. El helper `tests/helpers/students/students.js` está en la **#81**: por eso la ruta de `attendance` va en `profile.js` y no ahí. Riesgo menor: algún test de otra pantalla que navegue a la ficha sin `loadProfile` (por ejemplo `StudentsPage/list.test.jsx`, #81) verá un `ErrorState` más; revisado, ninguno busca `role="alert"` después de navegar. **Choque con GW4**: las dos tocan `MyProgressPage.jsx` y `StudentProfilePage.jsx` en líneas vecinas: mergear GW3 primero.

## Pruebas

**Vitest**
- `currentMonth` en hora argentina (el 1/12 a las 01:00 UTC todavía es noviembre).
- `rpeAverage`: solo sesiones del mes con `rpe` y `finished_at`; redondeo a 1 decimal; `null` sin datos.
- `volumeWindow`: 8 semanas → total de las 4 últimas y variación; sin las 4 previas, `deltaPct null`.
- `StudentProgressKpis`: los 4 valores y contextos; sin plan; racha 0; error de asistencia con Reintentar; error solo del overview deja "—" en volumen.
- `TrainerCommitmentCard`: "6/9", RPE "7,4" con "de 5 sesiones", sin RPE.
- Páginas: `MyProgressPage` pide `attendance` del propio alumno con `month`; la ficha pide la del alumno de la URL y comparte la caché del historial (un solo GET a `/sessions`).

**Navegador:** alumno de QA con sesiones y récords en el mes, y otro sin plan; capturas en `docs/superpowers/specs/assets/gw3/` (`01-mi-progreso-kpis.jpg`, `02-ficha-compromiso.jpg`, `03-sin-plan.jpg`, `04-error.jpg`, `05-angosto-375.jpg`). Comparar "6/9", racha y PRS contra la ficha del celular del mismo alumno.

## Criterio de aceptación

- "Mi progreso" muestra los 4 indicadores arriba del panel, con su contexto.
- La ficha del PT muestra sesiones sobre planificadas, racha, RPE promedio y récords, con los mismos números que el celular.
- Las dos pantallas usan el mismo `useAttendanceQuery`.
- Lint y tests en verde; ningún archivo pasa de 200 líneas.

## Estimación

**8 h**: API, hook y utils 2 h, componentes 2 h, tests y helpers 2,5 h, navegador y capturas 1,5 h.

## Fuera de alcance

- Calendario de asistencia y navegación de meses (los tiene el celular).
- Volumen de un mes calendario exacto (pediría un `from`/`to` diario en el backend).
- Logros en la cabecera (ya están en "Racha y logros").
