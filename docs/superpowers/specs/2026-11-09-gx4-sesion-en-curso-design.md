# GX4 · Sesión en curso y feedback pendiente — diseño

Ticket 4 de 9 del lote GX. Una PR (backend + web) y una tarjeta para Igna (celular). Rama sugerida: `feature/open-sessions`.

## Contexto

GW1 dejó afuera dos cosas del Dashboard del PT (`PTDashboard` en `pt-dashboard.jsx`): el **punto verde de "en curso"** ("el backend no expone sesiones abiertas") y **"Feedback pendiente"** en la web (el prototipo: "7 días, feedback pendiente").

Hoy la sesión llega al servidor recién al terminar: en la web, `uploadWorkout` (`frontend/src/utils/workout/uploadWorkout.js`) hace `POST /sessions` con `finished_at` ya puesto después de Terminar; en el celular, `SessionUploader.kt` llama a `SessionApi.create` (`@POST("sessions")`) también al final.

El backend ya acepta una sesión abierta: `validateCreateSession` deja `finished_at` opcional y `sessions.service.create` es idempotente por el `id` del cliente. Un reintento con el mismo `id` (`applyRetry`) completa `finished_at`, `rpe` y `notes` si estaban en `null`, y recién ahí corre logros y avisos. Falta exponer las abiertas, que no ensucien lo que hoy cuenta "sesiones" (el historial y la vista `student_last_session` no filtran `finished_at`) y poder borrar una abierta al descartar.

`feedback_pending` ya existe en `GET /students/overview` (`models/students/overview-lists.js`, `FEEDBACK_WINDOW_DAYS = 7`), pero la web no lo muestra.

## Decisiones

| # | Decisión |
|---|---|
| 1 | Se puede iniciar en la web y en el celular; el backend acepta los dos. Las dos apps **crean la sesión al empezar** (`POST /sessions` con `finished_at: null`). Es idempotente por el UUID del cliente y best-effort: sin red, la crea la subida final, como hoy. |
| 2 | **Sesión abierta**: `finished_at is null` y `started_at` dentro de las **últimas 4 h** (`OPEN_SESSION_MAX_HOURS`). Las más viejas se dan por abandonadas: no se muestran ni se borran. |
| 3 | El cierre no cambia: la subida final repite `POST /sessions` con el mismo `id` y `applyRetry` completa `finished_at`, RPE y notas. Logros, racha y avisos salen igual que hoy. |
| 4 | **Descartar** una sesión iniciada borra la abierta en el servidor: `DELETE /sessions/:id`, solo propia y solo con `finished_at null`. Si está terminada, es ajena o no existe → 404 `SESSION_NOT_FOUND`, sin código nuevo (no toca `errors.js`). |
| 5 | Una abierta **no es una sesión hecha**: el historial (`GET /students/:id/sessions`) y `student_last_session` filtran `finished_at is not null`. Adherencia, racha, logros, inactividad y overview ya filtraban. |
| 6 | Se exponen al PT: `GET /students/overview` suma `in_session` y cada fila de `GET /students` suma `open_session`. Los dos campos son aditivos (el celular usa `ignoreUnknownKeys`). |
| 7 | **Web del PT**: punto verde "En curso" arriba de "Actividad reciente" (Dashboard) y en la tarjeta de Alumnos. El overview se refresca cada 60 s mientras el Dashboard está abierto. Alumnos no hace polling: se refresca al volver a la pestaña (lo que TanStack ya hace por defecto). |
| 8 | **Feedback pendiente**: sesiones terminadas en los **últimos 7 días, contando hoy**, sin `trainer_comment`. Es la ventana que ya usa el celular (`FEEDBACK_WINDOW_DAYS`): no se define otra. Va en el Dashboard web, con link a la ficha. |
| 9 | Si la sesión se abre en el celular, la web del alumno no la ve ni la continúa: las series siguen viviendo en un solo dispositivo hasta subir. |

## Diseño

**Inicio en la web.** `useActiveWorkout.start(routine)`, después de `writeWorkout`, llama a `openOnServer(workout)` (`utils/workout/openSession.js`). Esa función hace `openSession(sessionBody(workout))`, que es un `POST /sessions` sin `finished_at`. Reglas:

- No guarda nada en `upload`: `sessionCreated` sigue en `false` y la subida final vuelve a mandar el POST, que el servidor toma como reintento.
- Traga cualquier error, incluido uno que no sea HTTP: sin red o con 5xx no pasa nada visible.
- Guarda la promesa en vuelo por `workout.id`, así un Descartar inmediato espera a que el POST termine antes de borrar.

**Descartar.** `useActiveWorkout.discard()` llama a `closeOnServer(id)`:

- espera la promesa de apertura si hay una;
- después hace `DELETE /sessions/:id`;
- ignora 404 y errores de red. Si no se pudo borrar, la abierta vence a las 4 h (decisión 2).

**Backend.**

- `findOpenSessions(studentIds, sinceIso)` devuelve `id, student_id, started_at, routine:routines(name)`, de la más nueva a la más vieja.
- `openSince(now)` en `session.model.js` da `now − 4 h`.
- `DELETE` borra en una sola sentencia (`.eq('id').eq('student_id').is('finished_at', null)`), así no puede pisar una subida que cerró la sesión en el medio. `session_sets` cae en cascada y `chat_messages.session_id` queda en `null`.

**Dashboard (PT).**

`RecentActivity` arranca con las filas de `in_session`:

- un punto `bg-good` con `animate-pulse` (estático con `motion-reduce`);
- nombre y rutina (o "Sin rutina");
- a la derecha "En curso · hace 12 min" (`relativeTime(started_at)`);
- link a la ficha;
- `aria-label` "Lucía Gómez, entrenando ahora".

Sin abiertas, la tarjeta queda como hoy.

`FeedbackPending` es una `Card` "Feedback pendiente" en la columna derecha, debajo de `InactivityAlerts`:

- `lists.feedback_pending`, hasta 5 filas: nombre, rutina, "RPE 8" y "hace 2 d", con link a la ficha;
- si hay más, "y N más";
- vacía: "Comentaste todas las sesiones de los últimos 7 días.";
- carga y error: los del overview (una sola consulta).

**Alumnos (PT).** Con `open_session`, `StudentCard` reemplaza "Última sesión: …" por un punto verde y "Entrenando ahora". `title` = "Empezó a las 18:05" (hora argentina).

## Datos

- **`POST /sessions`**: sin cambio de forma. Se documenta el uso "abrir al empezar" (`finished_at` ausente) y el cierre por reintento.
- **Nuevo `DELETE /sessions/:id`** (rol `student`): 204 sin body. Responde 404 `SESSION_NOT_FOUND` si es ajena, si no existe o si ya está terminada, y 400 `VALIDATION_ERROR` si el id no es UUID.
- **`GET /students`**: cada fila suma `open_session: { id, started_at } | null`.
- **`GET /students/overview`**: suma `in_session: [{ student_id, name, session_id, routine_name, started_at }]`, de la más nueva a la más vieja, una por alumno (la más nueva). `EMPTY` lleva `[]`.
- **`GET /students/:id/sessions`**: solo terminadas; `meta.total` también. El detalle `/:sessionId` no cambia.
- **Migración `backend/src/database/migrations/2026-11-09-open-sessions.sql`**:
  - `create or replace view student_last_session … where finished_at is not null`;
  - `create index if not exists idx_sessions_open on sessions (student_id, started_at desc) where finished_at is null`.

  Lo mismo va en `schema/04-progress.sql`, que pasa de 195 a 197 líneas.
- Docs: `contratos-api.md` (§POST /sessions, el DELETE nuevo, §GET /students, §GET /students/overview y §GET /students/:id/sessions) y `modelo-de-datos.md` (la vista y el índice).

## Archivos que toca

**Backend**

- Crea:
  - `repositories/sessions/open-sessions.repository.js` (`findOpenSessions`);
  - en `tests/unit/`: `repositories/sessions/open-sessions.repository.test.js` y `services/sessions/sessions.service/discard.test.js`.
- Modifica:
  - `models/sessions/session.model.js` (16 líneas: `OPEN_SESSION_MAX_HOURS`, `openSince`);
  - `repositories/sessions/sessions.repository.js` (54: `deleteOpenSession`);
  - `services/sessions/sessions.service.js` (88: `discard`);
  - `controllers/sessions/sessions.controller.js` (21);
  - `routes/sessions/sessions.routes.js` (49: `router.delete('/:id', requireRole('student'), …)`);
  - `repositories/sessions/session-history.repository.js` (107: el filtro en `findSessionsPage`);
  - `services/students/students.service.js` (151: `open_session` en `list`);
  - `models/students/overview-lists.js` (82: `inSessionList`);
  - `models/students/overview.js` (94 con la #91: +1);
  - `services/students/overview.service.js` (50 con la #91: suma la consulta y `EMPTY`);
  - `database/schema/04-progress.sql` (195 → 197).
- Tests (modifica): `routes/sessions/sessions.routes.test.js`, `services/students/students.service/list.test.js`, `models/students/overview-lists.test.js` (101), `models/students/overview.test.js`, `services/students/overview.service.test.js` y `repositories/sessions/session-history.repository.test.js`.

**Web**

- Crea:
  - `frontend/src/utils/workout/openSession.js` (`openOnServer`, `closeOnServer`);
  - `frontend/src/components/students/overview/FeedbackPending.jsx`.
- Modifica:
  - `frontend/src/api/sessions/sessions.api.js` (41: `openSession`, `deleteSession`);
  - `frontend/src/hooks/workout/useActiveWorkout.js` (116, unas 6 líneas);
  - `frontend/src/components/students/overview/RecentActivity.jsx` (45 con la #91);
  - `frontend/src/pages/dashboard/DashboardPage.jsx` (53 con la #91: +3);
  - `frontend/src/hooks/students/useStudentsOverview.js` (11 con la #91: `refetchInterval`);
  - `frontend/src/components/students/StudentCard.jsx` (40).
- Tests (crea): `frontend/tests/utils/workout/openSession.test.js`, `frontend/tests/hooks/workout/useActiveWorkout/open.test.jsx` y `frontend/tests/components/students/overview/FeedbackPending.test.jsx`.
- Tests (modifica):
  - `frontend/tests/components/students/overview/RecentActivity.test.jsx`;
  - `frontend/tests/pages/dashboard/DashboardPage.test.jsx`;
  - `frontend/tests/helpers/students/overview.js` (`in_session` y `feedback_pending` por defecto);
  - `frontend/tests/helpers/students/students.js` (`open_session: null`);
  - `frontend/tests/helpers/workout/workout.js` (81: el POST de apertura, para que los tests que cuentan pedidos `POST /sessions` miren solo el que trae `finished_at`).

**Chequeo contra PRs abiertas.**

- **#91** crea o modifica `overview.js`, `overview.service.js`, `RecentActivity.jsx`, `DashboardPage.jsx`, `useStudentsOverview.js`, los helpers y tests de `students/overview` y `DashboardPage.test.jsx`, además de la sección del overview en `contratos-api.md`. **La rama sale de `develop` después del merge de la #91.**
- **#85 y #90**: no se toca `ActiveSession.jsx`, `SessionHeader.jsx`, `useAuthStore.js` ni nada de `chat`. La lógica nueva vive en `useActiveWorkout.js`, que no está en ninguna PR. Las dos editan otras secciones de `contratos-api.md` (Chat): se espera un merge automático. El chat de la #85 se beneficia: con la sesión creada al empezar, `resolveSessionId` la encuentra y guarda `session_id` en los mensajes.
- **#76 y #92**: el barrido de rutas de la #92 exige que cada ruta figure en la tabla de `docs/proceso/auditoria-seguridad.md`. Si entra antes, esta PR suma la fila de `DELETE /sessions/:id` (propiedad validada en la sentencia). Si entra después, la fila la suma quien mergee último.
- **#93** (`StudentsPage.jsx`) y **#89**: no se tocan.

## Pruebas

**Jest (backend)**

- `openSince`: 4 h antes de `now`.
- `findOpenSessions` filtra por `finished_at null`, `started_at >= since` y los ids pedidos; `[]` con la lista vacía (sin consulta).
- `discard` en `DELETE /sessions/:id`:
  - abierta y propia → 204;
  - terminada, ajena o inexistente → 404;
  - id inválido → 400;
  - un alumno no puede borrar la de otro;
  - con rol PT → 403.
- `create` con `finished_at null` no evalúa logros ni avisa. El reintento con `finished_at` cierra y evalúa: un caso nuevo en `create.test.js` junto a los existentes.
- `list` suma `open_session` y `null` sin abierta.
- `inSessionList`: una por alumno (la más nueva), con nombre y rutina.
- `overview()` sin alumnos: `in_session: []`.
- El historial no lista abiertas.

**Vitest (web)**

- `openOnServer`:
  - manda el body sin `finished_at`;
  - un error no se propaga;
  - no cambia `upload`.
- `closeOnServer`:
  - espera la apertura en vuelo;
  - 404 y error de red no se propagan.
- `useActiveWorkout`:
  - `start` abre una sola vez (una sesión abierta existente no vuelve a abrir);
  - `discard` borra;
  - la subida final sigue mandando `POST /sessions` con `finished_at` y las series.
- `RecentActivity`: con `in_session`, la fila "En curso" primero, con su `aria-label`.
- `FeedbackPending`: hasta 5 filas y "y N más", vacío y links a la ficha.
- `StudentCard`: con `open_session`, "Entrenando ahora" en vez de la última sesión.

**Navegador.** Alumno de QA en una pestaña y PT en otra:

el alumno empieza en la web y, en 60 s, el Dashboard muestra "En curso" (Alumnos, al volver a la pestaña); al terminar sale de "En curso" y entra en "Actividad reciente" y "Feedback pendiente"; empezar y descartar la hace desaparecer; empezar sin red (DevTools offline) no muestra nada y al terminar online sube como hoy.

Capturas en `docs/superpowers/specs/assets/gx4/`: `01-dashboard-en-curso.jpg`, `02-alumnos-entrenando.jpg`, `03-feedback-pendiente.jpg`, `04-feedback-vacio.jpg`, `05-angosto-375.jpg`.

## Criterio de aceptación

- Una sesión iniciada en la web aparece "En curso" para el PT (Dashboard y Alumnos) y deja de aparecer al terminarla, al descartarla o a las 4 h.
- Terminar una sesión da los mismos logros, racha, historial y avisos que hoy, con red o sin red al empezar.
- Ninguna abierta aparece en el historial ni cambia "Última sesión" o "días sin entrenar".
- El Dashboard muestra el feedback pendiente de los últimos 7 días.
- Contrato y modelo de datos actualizados. Lint y tests en verde en `backend/` y `frontend/`, y ningún archivo pasa de 200 líneas.

## Estimación

**12 h**: backend (repo, DELETE, filtros, listas, migración) 3,5 h, tests de backend 1,5 h, docs 0,5 h, apertura y descarte en la web 1,5 h, Dashboard y Alumnos 2 h, tests y helpers de la web 2 h, navegador y capturas 1 h.

## Fuera de alcance

- Continuar en la web una sesión abierta en el celular (o al revés).
- Mostrar al PT la serie o el ejercicio en curso: las series se suben al final.
- Limpiar en la base las abiertas abandonadas (un job). Hoy solo se ocultan.
- "Feedback pendiente" como filtro de la lista de Alumnos.

## Tarjetas para el celular (Igna)

1. **Abrir la sesión al empezar.** Al iniciar el entrenamiento, `SessionApi.create` con `finishedAt = null`, best-effort y sin encolar: si falla, `SessionUploader` la crea al final como hoy. Al descartarla (o al terminar sin series, cuando hoy se hace `dao.deleteSession`), `DELETE /sessions/:id` best-effort, tratando el 404 como éxito. Se agrega `@DELETE("sessions/{id}")` a `SessionApi.kt`.
2. **"En curso" en el Inicio y en Alumnos del PT.** Leer `in_session` de `GET /students/overview` y `open_session` de `GET /students` (DTO `OverviewDtos.kt` y el de la lista) y mostrar el punto verde. "Feedback pendiente" ya lo tiene: `lists.feedback_pending`.
