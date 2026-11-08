# GW2 · Alumnos: adherencia por alumno (E2) — diseño

Ticket 2 de 5 de "lo que falta de la Guía Web". Una PR. Rama sugerida: `feature/students-adherence-bar`.

## Contexto

Guía Web, pantalla **E2 · Panel de alumnos** (`src/guia-web-hifi.jsx`): "cómo viene cada alumno sin abrir uno por uno". De sus cinco funcionalidades, a la web le faltan:

- **Adherencia por alumno**: "Barra de cumplimiento con código de color, para detectar el abandono antes de que sea definitivo."
- **Filtros y ordenamiento**: hay objetivo, estado y orden, pero no se puede ordenar por cumplimiento.
- **Alumnos en riesgo señalados**: ya están (borde y avatar coral con `activityStatus === 'inactive'`); este ticket solo verifica que la regla sea la del celular.

Referencia visual: `PTPanelAlumnos` en `src/alumno-web-2.jsx` (barra fina bajo los datos de cada tarjeta, con el porcentaje al lado) y la fila del celular (`mobile/.../ui/students/components/StudentRow.kt`, `AdherenceBar`).

## Decisiones

| # | Decisión |
|---|---|
| 1 | Un ticket por pantalla: 5 tickets = 5 PRs. Esta es la de E2. |
| 2 | La barra sale de `adherence_7d` de `GET /students` (ya viene en cada alumno). Sin cambios de backend. |
| 3 | Colores = umbrales del celular (`adherenceColor`): **≥ 70 % verde** (`good`), **≥ 50 % azul** (`accent`), **< 50 % coral** (`hot`). `pct null` → texto sin barra: "Sin plan" (el `NO_PLAN` del celular) si no tiene días asignados, o "Sin días todavía" si tiene rutina pero ninguno de sus días pasó todavía (`days_per_week > 0`; acordado con Igna en la #86, que lo cambia también en el celular). |
| 4 | Orden nuevo **"Adherencia"** en el select de Orden que ya existe: de menor a mayor (lo que hay que mirar primero), "Sin plan" al final, desempate por nombre. Se guarda en la URL como los demás (`?orden=adherencia`). |
| 5 | "En riesgo" = 7 días o más sin entrenar (desde la última sesión o el alta), la regla de `activity.js`, del `at_risk` del overview y del celular. Una adherencia baja **no** marca en riesgo (tampoco en el celular): solo pinta la barra de coral. |
| 6 | Sin filtro nuevo por adherencia: la Guía pide filtro por objetivo, estado y última sesión, que ya están. |

## Diseño

**Tarjeta** (`StudentCard`): debajo de "Última sesión" y de la racha, una fila con la barra (96 × 4 px, fondo `ink3`, relleno con el color del umbral y ancho = `pct` acotado a 0–100) y el texto mono "67%". Para lectores de pantalla la barra es `role="meter"` con `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100` y `aria-label="Adherencia de los últimos 7 días"`; el texto visible queda `aria-hidden`.

- `pct null`: en lugar de la barra, "Sin plan" (o "Sin días todavía" con `days_per_week > 0`) en `text-ink6`.
- `adherence_7d` ausente (un backend viejo): igual que `null`.
- Dado de baja (`estado=baja`): se muestra igual, como dato histórico.

Tooltip nativo (`title`) sobre la fila: "2 de 3 días asignados entrenados en los últimos 7 días" (`done` de `assigned`).

**Orden**: `ORDENES` suma `{ value: 'adherencia', label: 'Adherencia' }` al final. El panel, la navegación anterior/siguiente de la ficha (`StudentNavigation`, que usa `sortStudents`) y la URL respetan el orden nuevo sin más cambios.

**Estados** de la grilla: los de hoy (`StudentsGridSkeleton`, vacío, "Ningún alumno coincide"); la barra no tiene estado propio porque viene en la lista.

## Datos

- `GET /students` → `adherence_7d: { assigned, done, pct }` (contrato: días asignados de los últimos 7 días completos, hoy no cuenta; `pct null` sin días que cuenten).
- Sin cambios de backend ni de contrato.

## Archivos que toca

- Crea `frontend/src/utils/students/adherence.js`: `ADHERENCE_GOOD = 70`, `ADHERENCE_OK = 50`, `adherenceTone(pct)` → `'good' | 'accent' | 'hot'`, `adherencePct(student)` (`null` si falta) y `adherenceTitle(student)`.
- Crea `frontend/src/components/students/AdherenceBar.jsx`.
- Modifica `frontend/src/components/students/StudentCard.jsx` (38 líneas: suma `<AdherenceBar>`).
- Modifica `frontend/src/components/students/StudentFilters.jsx` (opción del select) y `frontend/src/utils/students/studentFilters.js` (`ORDENES` y el comparador `adherencia`).
- Tests (crea): `frontend/tests/utils/students/adherence.test.js`, `frontend/tests/components/students/AdherenceBar.test.jsx`, `frontend/tests/pages/students/StudentsPage/adherence.test.jsx`.
- Tests (modifica): `frontend/tests/utils/students/studentFilters.test.js` (caso del orden nuevo y del parseo de `?orden=adherencia`).

**Chequeo contra PRs abiertas.** Ninguno de estos archivos está en la lista a evitar ni en otra PR abierta: no toca `students.routes.js`, `InactivityAlerts.jsx`, `useAuthStore.js`, `ProfileActions.jsx`, `RoutineEditorPage.jsx`, `NotEnoughData.jsx`, `ProgressPanel.jsx` ni `trainer-ai`/`chat`. Los tests existentes del panel (`StudentsPage/filters.test.jsx` y `list.test.jsx`) y el helper `tests/helpers/students/students.js` están en la **#81**: **no se tocan**, por eso el test de página va en un archivo nuevo y arma sus alumnos con `student({ adherence_7d })` del fixture (`helpers/students/fixtures.js`, fuera de la #81). Riesgo: si algún test de la #81 busca "Sin plan" con `getByText`, ahora habría varias; revisado `develop`, ninguno lo hace.

## Pruebas

**Vitest**
- `adherenceTone`: 70 → `good`, 69 → `accent`, 50 → `accent`, 49 → `hot`, 0 → `hot` (los bordes del celular).
- `adherencePct`: `null` sin `adherence_7d` o con `pct null`.
- `AdherenceBar`: el ancho y la clase de color por umbral; `meter` con `aria-valuenow`; "Sin plan" y "Sin días todavía" sin barra; `pct` 120 se acota a 100.
- `sortStudents(…, 'adherencia')`: menor primero, `null` al final, empate por nombre; `parseStudentFilters` acepta `adherencia` y descarta lo inválido.
- `StudentsPage/adherence.test.jsx`: tres alumnos (85 %, 40 %, sin plan) muestran sus barras; al elegir Orden "Adherencia" quedan 40 %, 85 %, sin plan, y la URL tiene `orden=adherencia`; un inactivo sigue con borde coral aunque tenga 100 %.

**Navegador:** panel con datos de QA (alumnos con y sin plan, y uno inactivo); capturas en `docs/superpowers/specs/assets/gw2/` (`01-grilla-barras.jpg`, `02-orden-adherencia.jpg`, `03-angosto-375.jpg`). Comparar dos alumnos contra la lista del celular: mismo porcentaje y mismo color.

## Criterio de aceptación

- Cada tarjeta muestra la adherencia de 7 días con el color del celular, o "Sin plan".
- El orden "Adherencia" pone primero a los que menos cumplen y sobrevive a recargar la página.
- Los alumnos en riesgo siguen destacados con la misma regla que el celular y el dashboard.
- Lint y tests en verde; ningún archivo pasa de 200 líneas.

## Estimación

**4 h**: utils y barra 1 h, orden 0,5 h, tests 1,5 h, navegador y capturas 1 h.

## Fuera de alcance

- Precalcular la adherencia en una tabla (la nota técnica de la Guía): hoy el backend la calcula por pedido y alcanza.
- Indicador de "sesión en curso" en la tarjeta (no hay sesiones abiertas en el backend).
- Filtro por rango de adherencia.
