# Notificaciones — módulo Notifications, push con FCM y alerta de inactividad

- **Tarjeta de equipo:** [S6] Firebase + FCM + módulo Notifications + cron de inactividad (https://trello.com/c/rHdVyMV6), fuente de verdad del alcance y del criterio de aceptación.
- **Tablero personal:** "20 · Firebase + FCM + Notifications + cron de inactividad".
- **Fecha:** 2026-10-30 · **Rama:** `feature/notifications`, apilada sobre `feature/gamification` (PR #35): reusa la racha, el evaluador de logros y el scheduler.

## 1. Objetivo y criterio de aceptación

Infraestructura de notificaciones (tabla como fuente de verdad, push como aviso) y el job que detecta alumnos que dejaron de entrenar.

**Criterio de aceptación (tarjeta de equipo):** un alumno con rutina de 3 días por semana que lleva 10 días sin entrenar genera una notificación al PT, que le llega como push al celular y aparece en la base. Con el token de FCM inválido, la notificación igual queda registrada.

**Checklist:** proyecto Firebase + credenciales · tabla + listado + marcar leída · servicio de envío a FCM + registro del token · guardar siempre aunque el push falle · cron de inactividad contra los días asignados · máximo un aviso por alumno por semana · disparadores: rutina modificada, récord, logro.

## 2. Decisiones (grilling del 2026-10-30)

| # | Tema | Decisión |
|---|---|---|
| Q1 | Rama | Apilada sobre la #35 (`feature/gamification`) |
| Q2 | Proyecto Firebase | Lo crea Pablo en la consola; cuenta de servicio (JSON, fuera del repo) para el backend y `google-services.json` para Igna. Sin credenciales el push queda apagado y la notificación se guarda igual |
| Q3 | Envío | FCM HTTP v1 sin dependencias nuevas: JWT RS256 firmado con `jsonwebtoken` → access token OAuth (cacheado hasta que vence) → `fetch` a `messages:send`. Credencial en `FCM_SERVICE_ACCOUNT_PATH` o `FCM_SERVICE_ACCOUNT_JSON` (base64). `UNREGISTERED`/404 → se borra el token. La `FCM_SERVER_KEY` legacy de la tarjeta ya no existe (Google la apagó en 2024) |
| Q4 | Tokens | Tabla `push_tokens` (`user_id`, `user_role`, `token` único, `platform` android\|web, `created_at`, `last_seen_at`). `POST /notifications/tokens` (upsert; si el token era de otro usuario, se reasigna) y `DELETE /notifications/tokens/:token`. Push a todos los tokens del usuario |
| Q5 | Columnas nuevas | `notifications.data jsonb` (contexto: `student_id`, `session_id`, `achievement_code`…) y `push_sent_at timestamptz`. Sin reintentos: la tabla es la fuente de verdad (se actualiza el CU-10 E1) |
| Q6 | Inactividad | Inactivo = **≥ 3 días asignados sin entrenar** desde la última sesión cerrada (hoy no cuenta; un alumno sin rutina activa se saltea (no hay días que perder); sin sesiones, desde `students.created_at`). Constante `INACTIVITY_MISSED_DAYS = 3` |
| Q7 | Una por semana | No se crea si ya hay una `inactivity` con el mismo `data.student_id` en los últimos 7 días |
| Q8 | Disparadores | Ver tabla §3.2 |
| Q9 | Endpoints | `GET /notifications?unread_only=&limit=&before=` → `{ data, meta:{ unread_count, next_before } }` (20, máx 100), `PATCH /notifications/:id/read` (204; ajena → 404), `PATCH /notifications/read-all` (204) |
| Q10 | Job | En la corrida de las 03:00 junto con la gamificación (scheduler generalizado a una lista de jobs; si uno falla, corre el otro). `npm run notifications:inactivity` |
| Q11 | Verificación | Regla y job contra Supabase dev; notificación guardada con token inválido; con el proyecto creado, `validate_only` y token inválido (`UNREGISTERED` → token borrado). El push al celular se cierra cuando Igna integre FCM en la app |
| Q12 | Logros del job | Push solo de los logros desbloqueados al cerrar una sesión; los del job quedan solo en la base. Varios en una sesión → una notificación por logro en la base y **un** push resumen |
| Q13 | Textos | §3.3 |

## 3. Reglas en detalle

### 3.1 Inactividad (`missedAssignedDays({ lastDate, assignedDays, today })`)

- `lastDate`: fecha AR de la última sesión cerrada, o de `created_at` del alumno si no tiene.
- Cuenta los días desde el día siguiente a `lastDate` hasta ayer cuyo día de la semana está en `assignedDays`. El job saltea a los alumnos sin rutina activa (`assignedDays` vacío): no se les avisa.
- El job (`runInactivityAlerts({ now })`) recorre los alumnos activos, calcula los días perdidos y, si son ≥ 3 y no hubo otra `inactivity` de ese alumno en 7 días, notifica al PT del alumno. `data: { student_id, missed_days, days_since }`.

### 3.2 Disparadores

| Tipo | Cuándo | Destinatario (push) | Destinatario (solo base) | `data` |
|---|---|---|---|---|
| `inactivity` | job nocturno | PT | — | `student_id, missed_days, days_since` |
| `routine_modified` | una sesión pasa a `has_modifications` (una vez por sesión: no se repite si ya hay una con ese `session_id`) | PT | — | `student_id, session_id` |
| `pr` | al cerrar una sesión con récords (`session_records` de esa sesión), una por sesión | alumno | PT | `student_id, session_id, exercise_ids` |
| `achievement` | logro desbloqueado al cerrar sesión (los del job: solo base para los dos) | alumno (un push resumen) | PT | `student_id, achievement_code` |
| `comment` | el PT guarda un comentario no vacío en una sesión | alumno | — | `session_id` |

Los disparadores nunca rompen la operación que los origina (try/catch + log).

### 3.3 Textos

- `inactivity` (PT): "{alumno} no entrena hace {días_desde} días" / "Se salteó {perdidos} días de su rutina. Escribile para retomar."
- `routine_modified` (PT): "{alumno} modificó su rutina" / "En la sesión del {dd/mm} sustituyó {original} por {nuevo}" (varias: "…sustituyó {n} ejercicios").
- `pr` alumno: "¡Nuevo récord en {ejercicio}!" (varios: "¡{n} récords nuevos!") / "Sesión del {dd/mm}". PT: "{alumno} hizo un récord en {ejercicio}" (varios: "{alumno} hizo {n} récords").
- `achievement` alumno: "¡Logro desbloqueado: {nombre}!" / descripción. Push resumen con varios: "Desbloqueaste {n} logros" / nombres separados por coma. PT: "{alumno} desbloqueó {nombre}".
- `comment` (alumno): "Tu entrenador comentó tu sesión del {dd/mm}" / primeros 120 caracteres del comentario.
- Título ≤ 150 caracteres (se recorta).

## 4. Endpoints

| Método y ruta | Roles | Notas |
|---|---|---|
| `GET /notifications` | trainer, student | propias, desc por `created_at`; `unread_only` (bool), `limit` 1–100 (20), `before` (ISO) → `{ data:[{ id, type, title, body, data, read, created_at }], meta:{ unread_count, next_before } }` |
| `PATCH /notifications/:id/read` | trainer, student | 204; inexistente o ajena → 404 `NOTIFICATION_NOT_FOUND` |
| `PATCH /notifications/read-all` | trainer, student | 204 |
| `POST /notifications/tokens` | trainer, student | `{ token (1–4096), platform: android\|web }` → 201 (nuevo) / 200 (existente, actualiza `last_seen_at` y dueño) |
| `DELETE /notifications/tokens/:token` | trainer, student | 204 (solo borra si es del usuario; si no existe, 204 igual) |

## 5. Base de datos

Migración `backend/src/database/migrations/2026-10-30-notifications.sql` (y en `schema/06-ai-and-agenda.sql`):

- `alter table notifications add column if not exists data jsonb not null default '{}'`, `add column if not exists push_sent_at timestamptz`.
- índice para el límite semanal: `create index if not exists idx_notifications_inactivity on notifications (created_at desc) where type = 'inactivity'` (precedido de `drop index if exists` para reemplazar el índice anterior al reaplicar).
- `create table if not exists push_tokens (id uuid pk default gen_random_uuid(), user_id uuid not null, user_role varchar(20) not null check (user_role in ('trainer','student')), token text not null unique, platform varchar(10) not null check (platform in ('android','web')), created_at timestamptz not null default now(), last_seen_at timestamptz not null default now())` + índice `(user_id)`.
- RLS activado sin políticas en `push_tokens`; `schema-checks.sql` y `check-anon-access.js`.

## 6. Diseño interno

- Módulo `notifications` (routes → controllers → services → repositories → validations → models).
- `models/notifications/`: textos (funciones puras), política de push por tipo/rol, constantes.
- `missedAssignedDays` en `models/gamification/streak.js` (misma regla de días asignados que la racha, ADR 0005).
- `services/notifications/fcm.client.js`: token OAuth + envío + clasificación de errores (`unregistered`, `other`); no-op si no hay credenciales (`FCM_ENABLED` derivado).
- `services/notifications/notify.service.js`: `notify({ userId, userRole, type, title, body, data, push })` → inserta, envía a los tokens si `push`, setea `push_sent_at` si alguno salió, borra los tokens `unregistered`; nunca tira.
- `services/notifications/triggers.service.js`: `onSessionModified`, `onSessionClosed({ studentId, session, unlocked })` (récords + logros), `onSessionCommented`, cada uno envuelto en try/catch.
- Job `runInactivityAlerts` + scheduler con lista de jobs; script `backend/scripts/notifications-inactivity.js`.

## 7. Fuera de alcance

- Integración de FCM en la app Android (Igna) y Web Push / campanita en la web (tarjeta de la web que corresponda).
- Umbral de inactividad configurable por PT (no hay dónde guardarlo).
- Notificaciones de desafíos (el `check` de `type` no las tiene) y de turnos (`appointment`, tarjeta 21).

## 8. Documentación

- ADR `docs/adr/0006-notificaciones-tabla-fuente-de-verdad-fcm-v1.md` (tabla como fuente de verdad, push best-effort sin reintentos, FCM HTTP v1 con cuenta de servicio en lugar de la server key legacy).
- `contratos-api.md` (módulo Notifications), `modelo-de-datos.md`, CU-10 (regla y E1), `backend/README.md`, `setup-tecnico.md` (cómo crear el proyecto Firebase y las variables), `.env.example`, `docs/tarjetas.md`.

## 9. Verificación

- `npm run lint` y `npm test`. Tests de `missedAssignedDays`, textos, política, `fcm.client` (token cacheado, `UNREGISTERED`, sin credenciales), `notify` (guarda aunque falle el push, borra tokens inválidos), disparadores (una por sesión, sin romper la operación), job (límite semanal, alumno sin rutina, sin sesiones), endpoints y permisos.
- Supabase dev: alumno QA con rutina de 3 días y 10 días sin entrenar → 1 notificación al PT; segunda corrida → ninguna; con un token inválido registrado, la notificación queda guardada. Con el proyecto Firebase creado: `validate_only` OK y token inválido → `UNREGISTERED` y token borrado.

## 10. Cambios durante la implementación

- **Borrado de tokens más estricto (Q3):** el spec decía "`UNREGISTERED`/404 → se borra el token". Un 404 también lo devuelve FCM por un proyecto equivocado o la API sin habilitar, y borraría todos los tokens. Se borra solo con `UNREGISTERED` o con un 400 que señala `message.token` (token inválido); un 404/400 genérico, un 401, un timeout o un error de red cuentan como error `other` y no borran nada. Un 401 además descarta el access token cacheado.
- **`FCM_ENABLED` derivado:** quedó como función `isFcmEnabled()` en `fcm.client.js` (memoiza la carga de la credencial; la ruta gana sobre el base64). Las llamadas llevan un timeout de 10 s.
- **`pushOnly` en `notify.service.js`:** para el push resumen de varios logros (Q12), que no tiene fila propia. Con un solo logro se usa `notify` con `push: true`.
- **Comentario (`comment`):** además de no vacío, solo notifica si el texto cambió respecto del anterior (`previousComment`), para que reguardar el mismo comentario no repita el aviso.
- **Scheduler:** vive en `backend/src/shared/utils/scheduler.js` (`startScheduler({ jobs, hour })`); `server.js` le pasa la lista `gamification` → `inactividad`, que corren en secuencia, cada una con su `try/catch`.
- **Listado:** el orden es `created_at` desc con `id` desc como desempate, y `next_before` es el `created_at` de la última fila solo cuando la página vino llena. Como termina en `+00:00`, el cliente debe codificarlo en la URL (`%2B`) al reenviarlo en `before`.
- **Migración y schema:** el índice de inactividad y las columnas están además en `schema/06-ai-and-agenda.sql`; `push_tokens` en `07-rls.sql`, `schema-checks.sql` y `check-anon-access.js`, como se planeó.
- **Series tardías sobre una sesión cerrada:** subir series a una sesión ya cerrada reevalúa logros y también dispara `onSessionClosed`, así que notifica récords (dedup: una sola `pr` por sesión) y los logros recién desbloqueados, igual que el cierre.
- **Cooldown de inactividad por fecha argentina:** el aviso previo bloquea solo si `localDate(created_at) > hoy - 7 días` (fechas de Buenos Aires). Al día 7 exacto se permite de nuevo aunque el anterior se haya creado segundos después de las 03:00. El repo trae los avisos de los últimos 8 días (`findLastInactivityNotifications`: alumno → último `created_at`) y el filtro fino se hace en JS.
- **Logros del job nocturno solo en la base:** `runDailyGamification` crea, por cada logro que desbloquea `evaluateStudent`, una fila para el alumno y otra para el PT con `push: false` (`onAchievementsFromJob`, que usa `shouldPush('achievement', role, { fromJob: true })` y nunca lanza). Un logro que falla no corta a los demás.
- **Tokens por usuario y rol:** `push_tokens` se consulta y se borra por `user_id` **y** `user_role`, porque un id de alumno y uno de entrenador viven en tablas distintas; `notify`/`pushOnly` pasan `userRole`.
- **Alumno sin rutina activa (ruling de la revisión de #36):** el job no avisa de los alumnos sin rutina activa (invitado sin rutina todavía, o rutinas pausadas): no hay días asignados que saltearse. Reemplaza la regla "sin rutina, todos los días son asignados" para la inactividad; la racha de gamificación mantiene la suya (ADR 0005).
- **Disparadores sin `await`:** sessions, session-sets y session-history lanzan los disparadores con `void` para no alargar el request (cada `notify` hace varias consultas más el envío a FCM). Son seguros porque `safely` nunca deja escapar un error.
- **Payload del push:** `notify` envía `{ ...data, type, notification_id }` (la fila no cambia) y el push resumen de logros lleva `type: 'achievement'` y `student_id`, para que la app navegue y marque la notificación como leída.
- **Índice de inactividad:** `(created_at desc) where type = 'inactivity'`, porque `findLastInactivityNotifications` filtra solo por tipo y fecha.
- **Deuda:** `findLastClosedSessionStarts` trae las sesiones cerradas de todos los alumnos cada noche para quedarse con la última, y `findAssignedDays` se consulta alumno por alumno. Crecen con el historial y la cantidad de alumnos; conviene agregar en la base (última sesión por alumno, días asignados en lote) cuando haga falta.
