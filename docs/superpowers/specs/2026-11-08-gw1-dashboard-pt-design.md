# GW1 · Dashboard del PT (E1) — diseño

Ticket 1 de 5 de "lo que falta de la Guía Web". Una PR. Rama sugerida: `feature/trainer-dashboard-overview`.

## Contexto

Guía Web, pantalla **E1 · Dashboard** (`Seminario/Entrega_Seminario_Queimaliños_Rolon/src/guia-web-hifi.jsx`): "Responde qué necesita atención hoy". Pide:

1. **Indicadores de cartera**: alumnos activos, sesiones, adherencia general e inactivos, cada uno con su variación.
2. **Gráfico de actividad**: sesiones completadas por día, con selección de período.
3. **Alertas de inactividad** (ya está: `InactivityAlerts`).
4. **Actividad reciente**: quién entrenó, con qué rutina y con qué RPE.

Referencia visual: `PTDashboard` en `src/pt-dashboard.jsx` (KPIs en la fila de arriba, "Actividad · 14 días" en barras con `7D/14D/30D`, tabla "Actividad reciente" al pie), maqueta 1200 × 930 del prototipo navegable (`FitTrainer Prototipo Web (navegable).html`).

Hoy la web muestra solo 3 números calculados en el cliente desde `GET /students` (activos, inactivos, nunca entrenaron) y las alertas. El celular (Igna) ya consume `GET /students/overview` (`ui/students/overview/HomeTexts.kt`).

## Decisiones

| # | Decisión |
|---|---|
| 1 | Un ticket por pantalla: 5 tickets = 5 PRs. Esta es la de E1. |
| 2 | Los KPIs salen de `GET /students/overview`, con la semántica del celular: **sesiones de HOY** (`sessions_today.done / expected`), no "de la semana". |
| 3 | KPIs: alumnos activos (con `new_7d`), sesiones hoy, adherencia 7 días (con `delta`), en riesgo (`at_risk`). |
| 4 | "Actividad reciente" sale de `overview.recent` (quién, rutina, RPE, cuándo). **Sin punto verde de "en curso"**: el backend no expone sesiones abiertas. |
| 5 | Gráfico: sesiones terminadas por día con selector **7 / 14 días**. Backend: campo **aditivo** `daily: [{ date, count }]` en el overview (días argentinos; el service ya carga 14 días). El celular lo ignora. Se actualiza el contrato. Sin 30 días: haría falta ampliar la consulta. |
| 6 | `InactivityAlerts` queda como está (no se edita el archivo). Sigue leyendo `GET /students`. |
| 7 | Variación: mismo texto que el celular (`deltaLabel`: "+4%", "−3%", "0%") y "vs. semana anterior". |
| 8 | Tiempo relativo como `relativeTime` del celular: "hace un momento", "hace 12 min", "hace 3 h", "ayer", "05/11". |

## Diseño

Orden de arriba hacia abajo: fila de 4 KPIs, después dos columnas en `lg` (gráfico a la izquierda, `InactivityAlerts` a la derecha), y al pie "Actividad reciente" a todo el ancho. Sin alumnos (ni activos ni de baja): `FirstInvitationCta`, como hoy.

**KPIs** (`OverviewKpis`, 4 `Card` con `Stat`):

| Label | Valor | Línea de contexto |
|---|---|---|
| ALUMNOS ACTIVOS | `count` | "+2 en los últimos 7 días" (verde) si `new_7d > 0`; si no, nada |
| SESIONES HOY | `done` con unidad `/expected` | "Hoy nadie tiene entrenamiento asignado" si `expected = 0` |
| ADHERENCIA 7 DÍAS | `pct` + `%` | "+4% vs. semana anterior" (verde si sube, coral si baja, gris si es 0); `pct null` → valor "—" y "Ningún alumno tiene plan asignado" |
| EN RIESGO | `at_risk` | "7 días o más sin entrenar"; el número va en coral si es > 0 |

**Actividad** (`ActivityChart`): `Card` con título "Actividad · 7 días" o "Actividad · 14 días" y un grupo de dos botones `7D` / `14D` (`aria-pressed`, 7 por defecto). Barras de recharts (`BarChart`) con `AXIS` y `GRID` de `chartStyle.jsx`; eje X con la inicial del día (L, M, X…), barra de hoy en `--color-accent`, resto en `--color-ink4`. Tooltip `TooltipBox`: "Jue 06/11" y "3 sesiones" / "1 sesión". Todo en 0: en lugar del gráfico, "Ninguna sesión terminada en los últimos 7 días" (o 14). `role="img"` con `aria-label="Sesiones terminadas por día, últimos 7 días"`.

**Actividad reciente** (`RecentActivity`): `Card` "Actividad reciente". Cada fila es un link a la ficha (`profileHref`) con `Avatar`, nombre, `routine_name ?? "Sin rutina"`, "RPE 8" (o "RPE —") y el tiempo relativo. Vacío: "Todavía nadie terminó una sesión".

**Estados** (el overview carga una vez para KPIs, gráfico y recientes):
- Cargando: `LoadingState` dentro de cada `Card`, con label "Cargando el resumen…".
- Error: un solo `ErrorState` arriba con "No pudimos cargar el resumen." y Reintentar (`refetch`). `InactivityAlerts` sigue con su propia consulta y no se tapa.

## Datos

- `GET /students/overview` (`docs/arquitectura/contratos-api.md`): `active_students`, `sessions_today`, `adherence_7d`, `at_risk`, `recent` y el nuevo `daily`.
- **Cambio de backend (aditivo):** `daily` = 14 filas `{ date: "YYYY-MM-DD", count }`, de hoy − 13 a hoy, ascendente. `count` = sesiones terminadas ese día por **día argentino de `finished_at`** (el mismo criterio que `sessions_today.done`), de todos los alumnos activos, planificadas o no. Días sin sesiones en 0. Sin alumnos activos: igual 14 filas en 0.
- La web toma las últimas 7 o las 14 filas. Query key `['students', 'overview']` (bajo `STUDENTS_KEY`, así la invalida cualquier cambio de alumnos).

## Archivos que toca

**Backend**
- Crea `backend/src/models/students/overview-daily.js` (`dailySessions(sessions, today, days = 14)`).
- Modifica `backend/src/models/students/overview.js` (92 líneas: suma `daily`) y `backend/src/services/students/overview.service.js` (el `EMPTY` lleva `daily` en 0; pasa a calcular `today` antes del corte).
- Crea `backend/tests/unit/models/students/overview-daily.test.js`; modifica `backend/tests/unit/models/students/overview.test.js` (129 líneas, +1 caso) y `backend/tests/unit/services/students/overview.service.test.js`.
- Modifica `docs/arquitectura/contratos-api.md`, sección `GET /students/overview` (JSON de ejemplo y una viñeta de `daily`).

**Web**
- Crea `frontend/src/api/students/overview.api.js`, `frontend/src/hooks/students/useStudentsOverview.js`, `frontend/src/utils/students/overviewFormat.js` (`deltaLabel`, `relativeTime`, `lastDays(daily, n)`).
- Crea `frontend/src/components/students/overview/OverviewKpis.jsx`, `ActivityChart.jsx`, `RecentActivity.jsx`.
- Modifica `frontend/src/pages/dashboard/DashboardPage.jsx` (39 líneas: saca `Indicators`, arma el layout).
- Tests (crea): `frontend/tests/api/students/overview.api.test.js`, `frontend/tests/utils/students/overviewFormat.test.js`, `frontend/tests/components/students/overview/{OverviewKpis,ActivityChart,RecentActivity}.test.jsx`, `frontend/tests/helpers/students/overview.js` (fixture y ruta del overview).
- Tests (modifica): `frontend/tests/pages/dashboard/DashboardPage.test.jsx`.

**Chequeo contra PRs abiertas.** No toca ninguno de la lista a evitar: `InactivityAlerts.jsx`, `students.routes.js` (el endpoint no cambia de ruta), `useAuthStore.js`, `ProfileActions.jsx`, `RoutineEditorPage.jsx`, `NotEnoughData.jsx`, `ProgressPanel.jsx`, ni nada de `trainer-ai`/`chat`. **Dos riesgos:**
- `frontend/tests/pages/dashboard/DashboardPage.test.jsx` lo modifica la **#81**, y este ticket lo tiene que cambiar (sus aserciones sobre "Nunca entrenaron" dejan de valer). **Se abre la PR después del merge de la #81** (o se mergea `develop` antes de tocar ese test).
- `contratos-api.md` lo tocan la #78, #80, #83 y #85 en otras secciones (líneas 43–200, 555–660, 1185, 1359, 1587). La sección del overview (≈209–251) no se pisa: merge automático esperado.

## Pruebas

**Backend (Jest)**
- `dailySessions`: 14 filas de hoy − 13 a hoy, ascendentes; cuenta por día argentino de `finished_at` (una sesión que empezó ayer 23:30 y terminó hoy 00:20 cuenta hoy); dos sesiones del mismo alumno el mismo día suman 2; las de antes de la ventana no entran; sin sesiones, todo 0.
- `buildOverview` devuelve `daily` con la forma del contrato.
- `overview()` sin alumnos activos devuelve `daily` con 14 ceros (y el resto de `EMPTY` igual).

**Web (Vitest)**
- `overviewFormat`: `deltaLabel(4) = "+4%"`, `(-3) = "−3%"`, `(0) = "0%"`, `(null) = ""`; `relativeTime` en sus 5 tramos; `lastDays` corta 7 o 14.
- `OverviewKpis`: los 4 valores, `new_7d = 0` sin línea, `expected = 0` con su texto, adherencia `null` con "—".
- `ActivityChart`: arranca en 7 días; `14D` cambia título y cantidad de barras; todo en 0 muestra el texto vacío.
- `RecentActivity`: fila con link a la ficha, "Sin rutina" y "RPE —" con nulos, vacío.
- `DashboardPage`: con el overview y la lista; error del overview con Reintentar sin tapar las alertas; sin alumnos invita.

**Navegador:** `npm run dev` contra el backend local con datos de QA; capturas en `docs/superpowers/specs/assets/gw1/` (`01-dashboard.jpg`, `02-actividad-14d.jpg`, `03-sin-sesiones.jpg`, `04-error.jpg`, `05-angosto-375.jpg`).

## Criterio de aceptación

- El PT ve, sin hacer nada, los 4 KPIs con los mismos números que el Inicio del celular para la misma cuenta y el mismo momento.
- El gráfico muestra sesiones por día y cambia entre 7 y 14 días.
- "Actividad reciente" lista las últimas 10 sesiones terminadas, con link a cada alumno.
- Las alertas de inactividad siguen iguales.
- `npm run lint` y tests en verde en `backend/` y `frontend/`; ningún archivo pasa de 200 líneas.

## Estimación

**9 h**: backend y contrato 2 h, API, hook y utils 1,5 h, componentes 3 h, tests 1,5 h, prueba en navegador y capturas 1 h.

## Fuera de alcance

- Período de 30 días (requiere ampliar la consulta de sesiones del overview).
- Punto verde de "sesión en curso" (no hay sesiones abiertas en el backend).
- Cambiar `InactivityAlerts` para que lea del overview (`attention`).
- "Feedback pendiente" en la web.
