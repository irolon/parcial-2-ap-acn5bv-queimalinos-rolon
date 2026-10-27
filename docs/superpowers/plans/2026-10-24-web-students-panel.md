# Panel y ficha del alumno en la web — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dashboard, panel de alumnos y ficha del alumno del entrenador en la web (último entrenamiento, badge de inactivo, navegación entre alumnos, medidas con gráfico de peso, contexto IA, edición y baja), más `last_session_at` en la ficha del backend.

**Architecture:** React Query sobre `GET /students` y `/students/:id/metrics`; la lógica (estado de actividad, filtros/orden, anterior/siguiente, diferencias de medidas) son funciones puras en `utils/students/` y `utils/body-metrics/`; los filtros del panel viven en la URL; la topbar acepta un título fijado por la página.

**Tech Stack:** React 19, React Router 7, TanStack Query 5, Tailwind 4, Radix Dialog, `recharts@3.10.1` (nuevo), Vitest + Testing Library; backend Express + Jest.

**Spec:** `docs/superpowers/specs/2026-10-24-web-students-panel-design.md`

## Global Constraints

- `CONTRIBUTING.md`: ningún archivo > 200 líneas (tests incluidos); capa → módulo (`students`, `body-metrics`) → archivo; tests espejan `src`; test dividido → carpeta con el nombre de la unidad; helpers en `tests/helpers/<módulo>/`; **≤ 10 archivos por carpeta** (`components/shared/ui` ya tiene 10: no sumar ahí sin subdividir).
- Commits Conventional Commits en español, **sin atribución de IA ni Co-Authored-By**.
- Dependencias con versión exacta: `recharts` = `3.10.1`.
- Textos en español rioplatense. Valores del backend en inglés (goals `tonify|weight_loss|hypertrophy|strength`, levels `beginner|intermediate|advanced`); etiquetas reutilizadas de `components/invitations/studentFormOptions.js` (`GOAL_OPTIONS`, `LEVEL_OPTIONS`) y de `utils/exercises/exerciseOptions.js` (`EQUIPMENT`, `EQUIPMENT_LABELS`).
- `INACTIVITY_DAYS = 7`.
- El IMC no se calcula en la web: se usa `bmi` de la respuesta.
- Verificación por tarea: `npm run lint && npm test` en el paquete tocado.

## Review Focus

1. **Bordes de fecha**: `last_session_at` exactamente hace 7 días (inactivo), hace 6 días y 23 h (al día), fechas en otra zona horaria, y alumno creado hace 7 días sin sesiones → test en Task 2.
2. **Doble envío de "Cargar medida"**: el `id` UUID se genera una vez por apertura del modal, así un reintento no duplica → test en Task 6.
3. **Flechas ← → con el foco en un input o textarea** (p. ej. dentro de un modal): no navegan → test en Task 5.
4. **Anterior/siguiente en los bordes** (primer y último alumno, lista de 1, alumno que no está en la lista filtrada porque se entró por URL): botones deshabilitados y sin crash → tests en Tasks 2 y 5.
5. **Filtros en la URL con valores inválidos** (`?estado=xxx&orden=yyy`): se usan los defaults, sin crash → test en Task 2.

---

### Task 1: Backend — `last_session_at` en la ficha

**Files:**
- Modify: `backend/src/services/students/students.service.js` (`buildDetail`: sumar `last_session_at` con `findLastSessionDates([id])`, `null` si no hay)
- Test: `backend/tests/unit/services/students/students.service/get-by-id.test.js` (y `update.test.js` si el PATCH devuelve el detalle)
- Modify: `docs/arquitectura/contratos-api.md` (ejemplo y nota de `GET /students/:id`), `backend/README.md` (sección Alumnos)

**Interfaces:**
- Produces: `GET /students/:id` y `PATCH /students/:id` devuelven `last_session_at: string|null` en `data`.

- [ ] **Step 1:** tests que fallan: con una fila en la vista → `last_session_at` igual a su valor; sin filas → `null`; el PATCH también lo trae.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `cd backend && npm run lint && npm test` verde.
- [ ] **Step 5: Commit** `feat(students): la ficha trae la fecha de la última sesión`.

---

### Task 2: Web — API, hooks y lógica pura de alumnos y medidas

**Files:**
- Modify: `frontend/src/api/students/students.api.js` (`listStudents({ active, limit })`, `getStudent(id)`, `updateStudent(id, body)`)
- Create: `frontend/src/api/body-metrics/body-metrics.api.js` (`listMetrics(studentId)`, `createMetric(studentId, body)`, `deleteMetric(studentId, metricId)`)
- Create: `frontend/src/hooks/students/useStudents.js` (`STUDENTS_KEY = ['students']`; `useStudentsQuery({ active })` → `['students', { active }]`; `useStudentQuery(id)` → `['students', id]`; `useUpdateStudent(id)` invalida `['students']`)
- Create: `frontend/src/hooks/body-metrics/useBodyMetrics.js` (`useMetricsQuery(studentId)` → `['body-metrics', studentId]`; `useCreateMetric(studentId)`, `useDeleteMetric(studentId)` invalidan `['body-metrics', studentId]` y `['students', studentId]`)
- Create: `frontend/src/utils/students/activity.js`, `frontend/src/utils/students/studentFilters.js`, `frontend/src/utils/students/age.js`, `frontend/src/utils/body-metrics/metrics.js`
- Tests: `frontend/tests/api/students/…`, `frontend/tests/api/body-metrics/…`, `frontend/tests/utils/students/…`, `frontend/tests/utils/body-metrics/…`; helper `frontend/tests/helpers/students/fixtures.js`

**Interfaces:**
- `activity.js`:
  - `INACTIVITY_DAYS = 7`
  - `daysSince(iso, now): number` (días enteros transcurridos, `Math.floor`)
  - `activityStatus(student, now): 'active' | 'inactive' | 'new' | 'disabled'` — `disabled` si `active === false`; con `last_session_at`: `inactive` si `daysSince ≥ 7`, si no `active`; sin sesión: `inactive` si `daysSince(created_at) ≥ 7`, si no `new`.
  - `lastSessionLabel(student, now): string` — `'Hoy'`, `'Ayer'`, `'Hace N días'`, `'Nunca entrenó'`.
  - `STATUS_LABELS = { active: 'Al día', inactive: 'Inactivo', new: 'Nuevo', disabled: 'Dado de baja' }`.
- `studentFilters.js`:
  - `DEFAULT_FILTERS = { estado: 'todos', objetivo: '', orden: 'ultima-sesion', q: '' }`; `ESTADOS = ['todos','inactivos','al-dia','nuevos','baja']`; `ORDENES = ['ultima-sesion','nombre','alta']`.
  - `parseStudentFilters(searchParams: URLSearchParams): Filters` (valores inválidos → default).
  - `filtersToSearch(filters): string` (omite los defaults; `''` si todo es default).
  - `filterStudents(students, filters, now)` (estado vía `activityStatus`; `baja` → solo `disabled`; `q` sin mayúsculas ni tildes; `objetivo` exacto).
  - `sortStudents(students, orden)`: `ultima-sesion` → los que nunca entrenaron primero (por `created_at` ascendente), después por `last_session_at` ascendente; `nombre` → `localeCompare('es')`; `alta` → `created_at` descendente.
  - `neighbors(students, id): { prev, next, index, total }` (`prev`/`next` = alumno o `null`; `index` = -1 si no está).
- `age.js`: `ageFrom(birthDate: 'YYYY-MM-DD' | null, now): number | null`.
- `metrics.js`:
  - `METRIC_FIELDS = ['weight_kg','height_cm','body_fat_pct','waist_cm','hip_cm','chest_cm']` con unidades `{ weight_kg: 'kg', height_cm: 'cm', body_fat_pct: '%', … }`.
  - `latestTwo(metrics)` → `{ latest, previous }` (el historial llega ascendente).
  - `metricDelta(latest, previous, field): number | null`; `formatDelta(n, unit): string` (`'+0,8 kg'`, `'−1,2 cm'`, coma decimal, `'='` si 0).
  - `buildMetricBody(values, { id, recordedAt }) → body` (números; vacíos fuera; `recorded_at` = `new Date(recordedAt).toISOString()`); `validateMetricBody(body) → { campo: mensaje }` (≥ 0, `body_fat_pct` ≤ 100, al menos una medida: `form` "Cargá al menos una medida").
  - `weightSeries(metrics) → [{ date, weight }]` (solo las que tienen peso).

- [ ] **Step 1: Tests que fallan** — los 5 puntos de Review Focus que tocan esta tarea (bordes de 7 días, otra zona, nunca entrenó viejo/nuevo; `neighbors` en bordes, lista de 1 y ausente; `parseStudentFilters` con valores inválidos) + `sortStudents` (nunca entrenó primero), `filterStudents` (`'jose'` encuentra "José"), `formatDelta(0.8,'kg') === '+0,8 kg'`, `buildMetricBody` (string `'74,5'`? no: los inputs son `type=number` → `'74.5'` → `74.5`), API (paths, métodos, `res.data`; `listStudents({active:false})` → `?active=false&limit=100`).
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `cd frontend && npm run lint && npm test` verde.
- [ ] **Step 5: Commit** `feat(web): API y lógica de alumnos y medidas`.

---

### Task 3: Web — topbar dinámica, rutas y dashboard

**Files:**
- Create: `frontend/src/hooks/shared/usePageHeader.js`
- Modify: `frontend/src/components/shared/layout/AppShell.jsx` (usa el header fijado por la página si existe; si no, el `handle`)
- Modify: `frontend/src/routes/routeTable.js` (`STUDENT_PROFILE = { path: '/pt/alumnos/:id' }`), `frontend/src/routes/router.jsx` (`elements: { dashboard: <DashboardPage/>, alumnos: <StudentsPage/>, biblioteca: … }` y la ruta de la ficha en `pages`, **antes** no hace falta orden: `/pt/alumnos/nuevo` es más específica)
- Create: `frontend/src/pages/dashboard/DashboardPage.jsx`, `frontend/src/components/students/InactivityAlerts.jsx`
- Create (placeholder hasta Task 4/5): `frontend/src/pages/students/StudentsPage.jsx` y `StudentProfilePage.jsx` mínimos que rendericen su título (los completan las tareas siguientes)
- Tests: `frontend/tests/hooks/shared/usePageHeader.test.jsx`, `frontend/tests/pages/dashboard/DashboardPage.test.jsx`; helper `frontend/tests/helpers/students/students.js` (`stubStudents({ list, disabled, detail, metrics, handlers })` sobre `stubFetch`)

**Interfaces:**
- `usePageHeader({ title, subtitle } | null)`: la página lo llama; mientras está montada, la topbar muestra ese título/subtítulo; al desmontarse vuelve al `handle`. Implementación con un store chico (zustand) o contexto en `hooks/shared/`; `AppShell` lee `header ?? handle`.
- Dashboard: `Stat`s **Alumnos activos** (activos no dados de baja), **Inactivos > 7 días**, **Nunca entrenaron**; `InactivityAlerts` con hasta 5 inactivos (más días primero; los que nunca entrenaron después, por alta más vieja), link de cada uno a `/pt/alumnos/:id` y "Ver todos" → `/pt/alumnos?estado=inactivos`; sin inactivos: "Todos tus alumnos entrenaron en la última semana"; sin alumnos: `EmptyState` con "Generá tu primera invitación" → `/pt/alumnos/nuevo`.

- [ ] **Step 1: Tests que fallan:** la topbar muestra el título fijado por una página de prueba y vuelve al del `handle` al desmontarla; dashboard con 3 alumnos (al día, inactivo de 10 días, nuevo) → indicadores 3 / 1 / 1, alerta con el inactivo y "Hace 10 días", "Ver todos" con `?estado=inactivos`; sin alumnos → llamado a invitar; error → reintento. Los tests existentes de rutas, sidebar y biblioteca siguen pasando.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** verde.
- [ ] **Step 5: Commit** `feat(web): dashboard del entrenador y título dinámico de la topbar`.

---

### Task 4: Web — panel de alumnos

**Files:**
- Modify: `frontend/src/pages/students/StudentsPage.jsx`
- Create: `frontend/src/components/students/StudentCard.jsx`, `StudentFilters.jsx`, `StudentStatusPill.jsx`, `StudentsGridSkeleton.jsx`
- Tests: `frontend/tests/pages/students/StudentsPage/{list,filters}.test.jsx`

**Interfaces:**
- Consumes: Task 2 (`useStudentsQuery`, `activityStatus`, `lastSessionLabel`, `STATUS_LABELS`, `parseStudentFilters`, `filtersToSearch`, `filterStudents`, `sortStudents`), Task 3 (`usePageHeader`).
- Filtros leídos y escritos con `useSearchParams` (`replace: true`); `estado=baja` usa `useStudentsQuery({ active: false })`.
- `usePageHeader({ title: 'Alumnos', subtitle: '<N> ACTIVOS · <M> INACTIVOS' })`.
- `StudentCard`: link a `/pt/alumnos/:id` **conservando la búsqueda actual** (`?estado=…`), con avatar (tono `hot` si inactivo), nombre, etiqueta del objetivo (o "Sin objetivo"), "Última sesión: …", `StudentStatusPill` (INACTIVO `hot`, NUEVO `cool`, DADO DE BAJA `ghost`; nada si al día) y borde `border-hot/40` si inactivo.
- `StudentFilters`: buscador (`aria-label="Buscar alumno"`), select "Objetivo" (Todos + 4), select "Estado", select "Orden".

- [ ] **Step 1: Tests que fallan:** lista con última sesión e INACTIVO; filtro "Inactivos" desde la URL (`/pt/alumnos?estado=inactivos`); cambiar el estado escribe la URL; "Dados de baja" pide `?active=false&limit=100`; búsqueda sin tildes; sin alumnos → llamado a invitar; sin resultados → limpiar filtros; el link de la tarjeta conserva `?estado=inactivos`; subtítulo con contadores.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** verde.
- [ ] **Step 5: Commit** `feat(web): panel de alumnos con estado de actividad y filtros`.

---

### Task 5: Web — ficha del alumno (lectura y navegación)

**Files:**
- Modify: `frontend/package.json` (+ `"recharts": "3.10.1"`), `package-lock.json`
- Modify: `frontend/src/pages/students/StudentProfilePage.jsx`
- Create: `frontend/src/components/students/profile/` (`ProfileHeader.jsx`, `StudentNavigation.jsx`, `AiContextCard.jsx`, `ActiveRoutineCard.jsx`)
- Create: `frontend/src/components/body-metrics/` (`AnthropometryCard.jsx`, `WeightChart.jsx`, `MetricsHistory.jsx`)
- Tests: `frontend/tests/pages/students/StudentProfilePage/{profile,navigation,metrics}.test.jsx`

**Interfaces:**
- Consumes: Task 2 (`useStudentQuery`, `useStudentsQuery`, `useMetricsQuery`, `neighbors`, `parseStudentFilters`, `filterStudents`, `sortStudents`, `activityStatus`, `lastSessionLabel`, `ageFrom`, `latestTwo`, `metricDelta`, `formatDelta`, `weightSeries`), Task 3 (`usePageHeader`).
- Topbar: título = nombre; subtítulo `ALUMNOS › PERFIL · ÚLTIMA SESIÓN <LABEL EN MAYÚSCULAS>` (o `· NUNCA ENTRENÓ`).
- `StudentNavigation`: "‹ Anterior" / "Siguiente ›" (links con la misma búsqueda) y "3 de 12"; deshabilitados en los bordes o si el alumno no está en la lista; atajos `ArrowLeft`/`ArrowRight` en `window` ignorados si `event.target` es `input`, `textarea`, `select` o `contenteditable`, o si hay un `[role=dialog]` abierto.
- `AnthropometryCard`: 7 valores (peso, talla, % grasa, IMC, cintura, cadera, pecho) con `formatDelta` contra la anterior; sin medidas: "Todavía no hay medidas".
- `WeightChart`: `LineChart` de Recharts con `weightSeries`; < 2 puntos: "Cargá al menos dos pesos para ver la evolución". En tests, jsdom no mide: mockear `ResponsiveContainer` o fijar tamaño (ver cómo lo resuelve el test; reportarlo).
- `MetricsHistory`: tabla de la más nueva a la más vieja (fecha `dd/mm/aaaa`, peso, IMC, % grasa, cintura) con botón `aria-label="Borrar medida del <fecha>"` (la acción llega en Task 6: por ahora callback).
- `AiContextCard`: chips de equipamiento (códigos → `EQUIPMENT_LABELS`, otros tal cual) y lesiones; vacíos → aviso "Sin completar: la IA no va a poder personalizar".
- `ActiveRoutineCard`: nombre y días en español, o "Sin rutina asignada".
- 403 del backend → `EmptyState` "No encontramos a este alumno" + link "Volver a alumnos".
- Layout: dos columnas en `lg` (izquierda 300 px), una en mobile.

- [ ] **Step 1: Tests que fallan:** topbar con nombre y última sesión; edad y nivel; antropometría con `+0,8 kg`; gráfico con 2+ pesos vs. texto con 1; historial ordenado; contexto IA con "Barra" y "Banco plano" y el aviso cuando falta; rutina activa / sin rutina; 403 → no encontrado; navegación (Review Focus 3 y 4): siguiente/anterior respetando `?estado=`, "2 de 3", bordes deshabilitados, `ArrowRight` navega y no lo hace con el foco en un input.
- [ ] **Step 2:** FAIL → **Step 3:** `npm install --save-exact recharts@3.10.1` e implementar → **Step 4:** verde.
- [ ] **Step 5: Commit** `feat(web): ficha del alumno con medidas, gráfico de peso y navegación`.

---

### Task 6: Web — acciones de la ficha (modales)

**Files:**
- Create: `frontend/src/components/students/dialogs/` (`EditStudentDialog.jsx`, `AiContextDialog.jsx`, `DeactivateStudentDialog.jsx`) y `frontend/src/components/body-metrics/dialogs/` (`MetricFormDialog.jsx`, `DeleteMetricDialog.jsx`)
- Create: `frontend/src/utils/students/studentForm.js` (body del PATCH con solo lo cambiado, validación, errores por campo)
- Modify: `frontend/src/pages/students/StudentProfilePage.jsx` (botones "Editar alumno", "Cargar medida", "Dar de baja"/"Reactivar", "Editar" del contexto IA; un solo estado `dialog`)
- Tests: `frontend/tests/pages/students/StudentProfilePage/{edit,context,metric-form,deactivate}.test.jsx`, `frontend/tests/utils/students/studentForm.test.js`

**Interfaces:**
- Consumes: `useUpdateStudent`, `useCreateMetric`, `useDeleteMetric`, `buildMetricBody`, `validateMetricBody`, `fieldErrorsFrom`, `Dialog` (con `dismissible={!pending}`), `Input`, `Select`, `Textarea`, `Button`.
- `EditStudentDialog`: nombre (2–100), objetivo, nivel (opcional), fecha de nacimiento (`type=date`, no futura). PATCH con solo lo cambiado; sin cambios → cierra sin request. 400 → errores en su campo.
- `AiContextDialog`: 7 chips (`role="checkbox"` + `aria-checked`, etiquetas de `EQUIPMENT_LABELS`) + "Agregar otro" (input ≤ 50 + botón; no duplica; tope 30) + chips de los otros con "Quitar"; textarea "Lesiones" ≤ 1000 con placeholder "Ej.: lumbalgia, evitar peso muerto pesado". PATCH `{ gym_equipment, injuries }` (lista vacía → `null`, texto vacío → `null`).
- `MetricFormDialog`: 6 inputs `type=number` (talla precargada con la última), "Fecha y hora" (`datetime-local`, por defecto ahora, sin futuro); `id = crypto.randomUUID()` generado **una vez por apertura**; POST; 400 → campo; éxito → cierra.
- `DeleteMetricDialog`: "¿Borrar la medida del <fecha>?" → DELETE → cierra.
- `DeactivateStudentDialog`: texto de la spec (baja no inmediata, hasta 1 hora) → PATCH `{ active: false }`. "Reactivar" hace PATCH `{ active: true }` directo.

- [ ] **Step 1: Tests que fallan:** editar solo el nombre → PATCH `{ name }`; sin cambios → sin request; contexto: marcar "Mancuernas" + "Agregar otro: Banco plano" → PATCH `{ gym_equipment: ['dumbbell', 'Banco plano'], injuries }`; vaciar todo → `null`s; cargar medida → POST con números, `recorded_at` terminado en `Z` y un `id` UUID; doble click en Guardar → un solo POST y reintento tras error de red con el **mismo** `id` (Review Focus 2); validación (al menos una medida, `body_fat_pct` 101); borrar medida → DELETE y recarga; dar de baja con confirmación → PATCH `{ active: false }` y la pill "Dado de baja"; reactivar → PATCH `{ active: true }`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npm run lint && npm test` verde.
- [ ] **Step 5: Commit** `feat(web): editar alumno, contexto IA, medidas y baja desde la ficha`.
