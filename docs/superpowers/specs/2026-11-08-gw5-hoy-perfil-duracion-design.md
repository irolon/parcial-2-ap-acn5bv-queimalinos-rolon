# GW5 · Hoy y Mi perfil del alumno (A1 + A5) y duración estimada (E4) — diseño

Ticket 5 de 5 de "lo que falta de la Guía Web". Una PR. Rama sugerida: `feature/student-context-cards`.

## Contexto

Guía Web (`src/guia-web-hifi.jsx`):

- **A1 · Hoy**, funcionalidad 3, "Columna de contexto": "Semana en curso, nota del entrenador y próximo turno, visibles sin desplazar." Funcionalidad 4: "Un solo CTA primario".
- **A5 · Mi perfil**, funcionalidad 3, "Su entrenadora a la vista": "Quién lo entrena y acceso directo al mensaje, sin buscar en otra sección."
- **E4 · Crear rutina**, funcionalidad 4, "Metadatos de la rutina": "Días asignados, duración estimada y nivel".

Referencia visual: `AW_Hoy` en `src/alumno-web.jsx` (columna derecha: "Esta semana", "Nota de Laura" con avatar e iniciales, "Próximo turno" con "Jueves 24 · 09:00"), `AW_Perfil` en `src/alumno-web-2.jsx` (tarjeta "Mi entrenadora" con avatar, nombre y "Enviar mensaje") y `PTCrearRutina` en `src/pt-screens.jsx`.

Hoy la columna derecha de Hoy tiene solo "Esta semana" (`WeekSection`); Mi perfil no muestra al entrenador; el editor no estima la duración.

## Decisiones

| # | Decisión |
|---|---|
| 1 | Un ticket por pantalla (aquí A1 + A5 + el detalle de E4, todos chicos): 5 tickets = 5 PRs. |
| 2 | **Hoy**: la columna de contexto suma "Nota de tu PT" (el `trainer_comment` más reciente) y "Próximo turno" (próximos 14 días, `GET /appointments`), debajo de "Esta semana". **El CTA principal no se mueve**: la columna sigue a la derecha en `lg` y debajo de la rutina en angosto. |
| 3 | **Mi perfil**: tarjeta "Tu entrenador/a" con avatar, nombre y botón "Mensaje" que lleva a Mensajes. |
| 4 | Nombre del entrenador: `counterpart` de `GET /messages/:studentId?limit=1` (para el alumno es su PT, sin email). Es el único endpoint que hoy lo da; sin polling (`staleTime` 5 min). La misma consulta da el nombre en "Nota de Laura". |
| 5 | **Editor de rutinas**: "Duración estimada ~N min" calculada en el cliente con **series × (reps × ~3 s + descanso)**, dentro de un subcomponente del editor (`RoutineHeader`), **no en `RoutineEditorPage.jsx`**. |
| 6 | La nota sale de la primera página del historial (`useSessionsInfinite`, la caché que ya usa "Esta semana"): sin pedido nuevo. Si el último comentario es más viejo que las últimas 20 sesiones, no se muestra. |
| 7 | Próximo turno: el primero `pending` o `confirmed` con `scheduled_at` posterior a ahora, de hoy a hoy + 13. No hay pantalla de turnos del alumno en la web: la tarjeta no tiene botón. |

## Diseño

**Hoy** (`TodayContext`, reemplaza a `<WeekSection>` en `TodayPage`; adentro: `WeekSection`, `TrainerNoteCard`, `NextAppointmentCard`, en ese orden):

- `TrainerNoteCard`: `Card` "Nota de Laura" (primer nombre del `counterpart`; mientras carga o si falla, "Nota de tu entrenador/a"). Avatar con iniciales (32 px), el comentario (`line-clamp-4`, `title` con el texto entero) y abajo en mono "SOBRE TU SESIÓN DEL 05/11 · PUSH" (`formatDayMonthAR` y `routine.name`, sin la rutina si es `null`). Vacío: "Tu entrenador/a todavía no comentó tus sesiones." en `text-ink6`. Carga y error: los de "Esta semana" (comparten la consulta, así que no hay un error de más).
- `NextAppointmentCard`: `Card` "Próximo turno". Valor grande "Jueves 12/11 · 18:00" (hora argentina) y debajo el estado con el punto y el color de `components/agenda/status.js` ("Pendiente" / "Confirmado"). Vacío: "No tenés turnos en los próximos 14 días." Cargando: `LoadingState rows={1}` "Cargando tus turnos…". Error: `ErrorState` "No pudimos cargar tus turnos." con Reintentar.

**Mi perfil** (`TrainerCard`, en la columna izquierda debajo de la rutina): `Card` "Tu entrenador/a" con `Avatar` de 40 px, el nombre y un link con aspecto de botón ghost "Mensaje" (ícono `MessageSquare`) a `/alumno/mensajes` (armado con `STUDENT_NAV.base`, sin tocar `routeTable.js`). Cargando: `LoadingState rows={1}` "Cargando a tu entrenador/a…". Error: `ErrorState` "No pudimos cargar los datos de tu entrenador/a." con Reintentar; el link a Mensajes se muestra igual (no depende del nombre).

**Editor** (`EstimatedDuration`, dentro de `RoutineHeader`, debajo de `DayPicker`): texto mono "DURACIÓN ESTIMADA ~45 MIN" con `title` "Series × (repeticiones × 3 s + descanso)". Por ejercicio: `sets × (reps × 3 + rest_seconds)` segundos; un campo vacío o inválido cuenta 0. Total redondeado al minuto; entre 1 s y 59 s muestra "~1 min". Sin ejercicios: no se muestra. Se recalcula en cada cambio de la tabla (el `state` ya llega a `RoutineHeader`).

## Datos

- `GET /students/:id/sessions` (primera página) → `trainer_comment`, `started_at`, `routine.name`.
- `GET /appointments?from&to` (rol alumno: sus turnos; hasta 62 días) con `useAppointments` de `hooks/agenda/useAgenda.js`.
- `GET /messages/:studentId?limit=1` → `counterpart: { id, name, avatar_url }`. Un GET: no marca nada como leído.
- Duración: sin backend (`state.exercises` del editor).
- Sin cambios de backend ni de contrato.

## Archivos que toca

- Modifica `frontend/src/api/messages/messages.api.js` (suma `getCounterpart(studentId)`); crea `frontend/src/hooks/messages/useCounterpart.js` (key `['messages', 'counterpart', id]`).
- Crea `frontend/src/utils/sessions/trainerNote.js` (`latestTrainerNote(sessions)`), `frontend/src/utils/agenda/nextAppointment.js` (`nextAppointment(list, now)`, `nextDaysRange(now, 14)`), `frontend/src/utils/routines/duration.js` (`estimateMinutes(exercises)`, `SECONDS_PER_REP = 3`).
- Crea `frontend/src/components/student/today/TodayContext.jsx`, `TrainerNoteCard.jsx`, `NextAppointmentCard.jsx`; `frontend/src/components/student/profile/TrainerCard.jsx`; `frontend/src/components/routines/editor/EstimatedDuration.jsx`.
- Modifica `frontend/src/pages/student/TodayPage.jsx` (74 líneas, cambia un import y una línea), `frontend/src/pages/student/MyProfilePage.jsx` (51, +1) y `frontend/src/components/routines/editor/RoutineHeader.jsx` (47, +1).
- Tests (crea): `frontend/tests/utils/sessions/trainerNote.test.js`, `frontend/tests/utils/agenda/nextAppointment.test.js`, `frontend/tests/utils/routines/duration.test.js`, `frontend/tests/api/messages/counterpart.test.js`, `frontend/tests/pages/student/TodayPage/context.test.jsx`, `frontend/tests/pages/student/MyProfilePage/trainer.test.jsx`, `frontend/tests/components/routines/editor/RoutineHeader.test.jsx`.
- Tests (modifica): `frontend/tests/helpers/student/home.js` (contesta `/appointments` con `[]` y `/messages/:id` con un `counterpart` por defecto) y `frontend/tests/helpers/students/self.jsx` (el `counterpart`).

**Chequeo contra PRs abiertas.** No toca `RoutineEditorPage.jsx` (#84): la duración vive en `RoutineHeader`. Tampoco `useAuthStore.js` (solo se importa), `ProfileActions.jsx`, `routeTable.js` ni `router.jsx` (#84 y #81: el link se arma con `STUDENT_NAV.base`), `Button.jsx` (#84: se usa, no se edita), `ActiveSession.jsx`/`SessionHeader.jsx` (#85), `students.routes.js`, `InactivityAlerts.jsx`, `NotEnoughData.jsx`, `ProgressPanel.jsx` ni `trainer-ai`/`chat`. Los tests del editor (`RoutineEditorPage/*.test.jsx`) y `tests/helpers/routines/editor.js` están en la **#81** y no se tocan: el test de la duración va en `RoutineHeader.test.jsx`, nuevo. Riesgo menor: el texto nuevo aparece en esas pantallas; revisado, ningún test del editor busca `/min/`.

## Pruebas

**Vitest**
- `latestTrainerNote`: la sesión más nueva con comentario no vacío; `null` sin ninguno.
- `nextAppointment`: ignora cancelados y pasados; el más cercano; `null` sin turnos. `nextDaysRange` da hoy y hoy + 13 en fecha argentina.
- `estimateMinutes`: 4 × (10 × 3 + 90) = 480 s → 8 min; campos vacíos cuentan 0; 30 s → 1; lista vacía → 0.
- `TodayPage/context.test.jsx`: "Nota de Laura" con el comentario y la fecha; sin comentarios, el texto vacío; turno confirmado con día, hora y "Confirmado"; sin turnos, el vacío; error de turnos con Reintentar y la rutina del día sigue; el botón principal de la rutina sigue siendo el primero en el orden del documento.
- `MyProfilePage/trainer.test.jsx`: nombre y link "Mensaje" a `/alumno/mensajes`; error con Reintentar y el link presente.
- `RoutineHeader.test.jsx`: con dos ejercicios muestra "~N min"; cambia al cambiar las series; sin ejercicios no aparece.

**Navegador:** alumno de QA con una sesión comentada y un turno confirmado, y otro sin nada; PT armando una rutina. Capturas en `docs/superpowers/specs/assets/gw5/` (`01-hoy-contexto.jpg`, `02-hoy-vacio.jpg`, `03-hoy-angosto-375.jpg`, `04-mi-perfil-entrenador.jpg`, `05-editor-duracion.jpg`).

## Criterio de aceptación

- En Hoy, la columna de contexto muestra semana, nota del PT y próximo turno; en escritorio entra sin desplazar y el botón de comenzar sigue siendo el único CTA primario.
- En Mi perfil, el alumno ve a su entrenador/a y llega a Mensajes con un clic.
- El editor muestra la duración estimada y se actualiza al editar la tabla.
- Lint y tests en verde; ningún archivo pasa de 200 líneas.

## Estimación

**8 h**: utils, API y hook 1,5 h, tarjetas de Hoy 2 h, tarjeta de perfil 0,5 h, duración 1 h, tests y helpers 2 h, navegador y capturas 1 h.

## Fuera de alcance

- Pedir o ver turnos desde la web del alumno (botón "Ver agenda" del prototipo).
- Título profesional del entrenador ("LIC. EN ED. FÍSICA"): el backend no lo tiene.
- Guardar la duración estimada en la rutina o mostrarla al alumno.
- "Nivel" de la rutina en el editor.
