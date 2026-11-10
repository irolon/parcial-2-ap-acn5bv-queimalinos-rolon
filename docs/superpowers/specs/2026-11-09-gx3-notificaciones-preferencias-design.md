# GX3 · Preferencias de notificación del alumno — diseño

Ticket 3 de 9 del lote GX ("lo que quedó afuera de la Guía Web"). Una PR. Rama sugerida: `feature/notification-preferences`.

## Contexto

Guía Web (`src/guia-web-hifi.jsx`), **A5 · Mi perfil**, funcionalidad 4, "Configuración de la cuenta": "Contraseña, notificaciones, modo sin conexión y exportación de datos". Referencia visual: fila "Notificaciones · Recordatorio de entreno y mensajes · Editar" de la tarjeta "Cuenta" en `AW_Perfil` (`src/alumno-web-2.jsx`).

Hoy (`backend/src/models/notifications/push-policy.js`) el alumno recibe push de cinco tipos, sin forma de apagarlos:

| Tipo | Origen | Fila en `notifications` |
|---|---|---|
| `message` | `message-triggers.service.js` (`onMessageSent`, `onBroadcastSent`) vía `pushOnly` | no |
| `comment` | `triggers.service.onSessionCommented` vía `notify` | sí |
| `appointment` | `triggers.service.onAppointmentChanged` (confirmado, cancelado o creado por el PT) | sí |
| `pr` | `triggers.service` al cerrar sesión | sí |
| `achievement` | `triggers.service` (uno con `notify`; varios, resumen con `pushOnly`; los del job nocturno sin push) | sí |

Todo push sale por `services/notifications/notify.service.js` (67 líneas): `notify()` guarda la fila y después llama a `pushToUser`; `pushOnly()` llama a `pushToUser` sin fila. En ambos, `data.type` trae el tipo. No hay desafíos ni recordatorios de entreno con push. La web no recibe push ni muestra la bandeja: la bandeja (`GET /notifications`) es del celular.

## Decisiones

| # | Decisión |
|---|---|
| 1 | Preferencias **del alumno**, por tipo: `message`, `comment`, `appointment`, `pr`, `achievement`. Las del PT (`inactivity`, `routine_modified`, `message`) quedan para otro ticket. |
| 2 | Tabla nueva `notification_preferences`, **una fila por alumno con una columna booleana por tipo** (default `true`). Sin fila = todo prendido: nadie tiene que migrar datos y el que nunca entró a la pantalla sigue como hoy. Un tipo nuevo es una columna nueva (los tipos cambian poco y así el `PUT` es atómico y validable). |
| 3 | El backend **no manda el push** de un tipo apagado. **La fila de `notifications` se guarda igual**: apagar un tipo es "no me interrumpas", no "no me lo muestres". La bandeja del celular es el historial (un turno confirmado o un comentario del PT tienen que poder verse después) y el índice único `uq_notifications_session` deduplica `pr` por sesión con esa fila. `message` no tiene fila: apagado, el mensaje igual está en Mensajes. |
| 4 | El chequeo vive en **un solo lugar**: `pushToUser` de `notify.service.js`, con el tipo de `payload.data.type` (lo traen `notify` y `pushOnly`). No se toca `triggers.service.js` (#76) ni `push-policy.js`: la política dice quién *puede* recibir; la preferencia, quién *quiere*. |
| 5 | Si leer las preferencias falla, **no se manda** el push (se loguea): el push ya es best-effort y respetar un "apagado" pesa más que un aviso perdido. La fila se guarda igual. |
| 6 | Un push apagado deja `push_sent_at` en `null`, como un push que no salió. |
| 7 | Se editan desde la web, en la fila "Notificaciones" de la tarjeta "Cuenta" de Mi perfil (de GX1), con un diálogo. `PUT` reemplaza las cinco (body completo, sin parches parciales). |
| 8 | Envío masivo (hasta 200 alumnos): una lectura por alumno dentro del `forEachLimit` existente (10 en paralelo). Sin caché. |

## Diseño

**Backend.**
- `models/notifications/preferences.js`: `PREFERENCE_TYPES` (los cinco, en el orden de la pantalla), `PREFERENCES_TABLE`, `DEFAULT_PREFERENCES` y `toPreferences(row)` (sin fila → defaults con `updated_at: null`), `allowsPush(prefs, type)` (un tipo que no está en la lista → `true`).
- `repositories/notifications/preferences.repository.js`: `findByStudent(id)` (`maybeSingle`) y `upsert(id, prefs, now)` (`onConflict: 'student_id'`).
- `services/notifications/preferences.service.js`: `get(user)` y `replace(user, body)` (solo alumno; el `user.id` es el dueño, no hay `:id`); `isPushAllowed(userId, userRole, type)` (trainer → `true`; alumno → lee y aplica `allowsPush`).
- `notify.service.pushToUser(userId, userRole, payload)`: primera línea `if (!(await isPushAllowed(userId, userRole, payload.data?.type))) return { sent: false, dead: [] };` dentro del `try` que ya tienen `notify` y `pushOnly`, así un error de la lectura cae en su `catch` y no manda (decisión 5).
- `validations/notifications/notifications.validation.js` (55): `validatePreferences(body)`: los cinco presentes y booleanos; campos de más se ignoran.
- Rutas en `notifications.routes.js` (24): `GET /preferences` y `PUT /preferences` con `requireRole('student')`, **antes** de `/:id/read`.

**Web** (Mi perfil, tarjeta "Cuenta" de GX1):
- Fila "Notificaciones" entre "Contraseña" y "Exportar": subtítulo "Todas activadas" / "N de 5 activadas" / "Todas apagadas"; botón "Editar". Cargando: "Cargando…"; error: "No pudimos cargar tus preferencias" con Reintentar en la fila.
- `NotificationPrefsDialog`: "Avisos en tu celular" y la aclaración "Elegí qué te avisamos con una notificación. Lo apagado igual queda en la app." Cinco interruptores (`role="switch"`, `aria-checked`) con título y detalle:
  - Mensajes — "Cuando tu entrenador/a te escribe"
  - Comentarios — "Cuando comenta una de tus sesiones"
  - Turnos — "Cuando confirma, cancela o te agenda un turno"
  - Récords — "Cuando superás una marca personal"
  - Logros — "Cuando desbloqueás un logro"
- "Guardar" (deshabilitado sin cambios, `loading` mientras guarda) y "Cancelar". Error al guardar: `role="alert"` dentro del diálogo, sin cerrarlo. Éxito: cierra y actualiza la caché (`['notifications', 'preferences']`).

## Datos

- `GET /notifications/preferences` (alumno) → `200 { data: { message, comment, appointment, pr, achievement, updated_at } }`; sin fila, todo `true` y `updated_at: null`. Trainer → 403.
- `PUT /notifications/preferences` (alumno), body `{ message, comment, appointment, pr, achievement }` (booleanos, los cinco) → `200 { data: … }` igual que el GET. 400 si falta alguno o no es booleano.
- Efecto en los push existentes: ninguno cambia de forma; los apagados no salen.
- Migración `backend/src/database/migrations/2026-11/2026-11-09-notification-preferences.sql`:
  ```sql
  create table if not exists notification_preferences (
    student_id  uuid primary key references students (id) on delete cascade,
    message     boolean not null default true,
    comment     boolean not null default true,
    appointment boolean not null default true,
    pr          boolean not null default true,
    achievement boolean not null default true,
    updated_at  timestamptz not null default now()
  );
  alter table notification_preferences enable row level security;
  ```
  En el schema: archivo nuevo `schema/06c-notification-preferences.sql` (corre después de `06b`) y la línea en `07-rls.sql`; fila nueva en `schema/README.md`. Sin índice extra (la PK es el único acceso).
- Contrato: sección "Notificaciones" de `contratos-api.md`; tabla en `modelo-de-datos.md`; `auditoria-seguridad.md` pasa de 23 a 24 tablas con RLS.

## Archivos que toca

- Backend, crea: `models/notifications/preferences.js`, `repositories/notifications/preferences.repository.js`, `services/notifications/preferences.service.js`, `controllers/notifications/preferences.controller.js`, `database/schema/06c-notification-preferences.sql`, la migración.
- Backend, modifica: `services/notifications/notify.service.js` (67, +3), `routes/notifications/notifications.routes.js` (24, +4), `validations/notifications/notifications.validation.js` (55, +16), `database/schema/07-rls.sql` (33, +1), `database/schema/README.md`, `database/checks/schema-checks.sql` (suma `notification_preferences` a la lista de tablas con RLS).
- Web, crea: `api/notifications/preferences.api.js`, `hooks/notifications/useNotificationPrefs.js` (query + mutación), `utils/notifications/preferences.js` (`PREFERENCE_ITEMS` con textos, `summary(prefs)`), `components/account/NotificationPrefsDialog.jsx`, `components/account/NotificationsRow.jsx`, `components/shared/ui/Switch.jsx`.
- Web, modifica: `components/account/AccountCard.jsx` (GX1, +2).
- Tests: ver Pruebas. Docs: contrato, modelo, auditoría.

**Chequeo contra PRs abiertas.** No toca `triggers.service.js` (**#76**) ni `message-triggers.service.js`: el filtro está en `notify.service.js`, que ninguna PR abierta modifica. `schema/README.md` y `schema-checks.sql` están en la **#83** (agregar las líneas al final; conflicto de una línea si se cruzan). `contratos-api.md` en #83, #85, #90 y #91 (otras secciones). `auditoria-seguridad.md` en la **#92**: si entra antes, sumar además las 2 rutas a su tabla de aislamiento. Depende de **GX1** (`AccountCard`); no toca `MyProfilePage.jsx` (la fila entra por `AccountCard`).

## Pruebas

**Jest (backend)**
- `tests/unit/models/notifications/preferences.test.js`: `toPreferences(null)` da defaults; `allowsPush` con tipo apagado, prendido y desconocido.
- `tests/unit/services/notifications/preferences.service.test.js`: `get` sin fila; `replace` hace upsert; trainer → 403; `isPushAllowed` para trainer sin leer la base.
- `tests/unit/services/notifications/notify.service/preferences.test.js` (el actual tiene 118 líneas: los casos nuevos van en la carpeta y el existente pasa a `notify.service/notify.test.js`): con `comment` apagado `notify` guarda la fila y no llama a `sendToToken`, `push_sent_at` queda `null`; `pushOnly` de `message` apagado no envía; lectura que falla → no envía y no lanza; con todo prendido, igual que hoy.
- `tests/unit/services/notifications/message-triggers.service.test.js`: masivo con un alumno que apagó `message` (el resto recibe).
- `tests/unit/validations/notifications/notifications.validation.test.js` (falta uno, no booleano) y `routes/notifications/notifications.routes.test.js` (rol, orden de rutas).

**Vitest (web)**
- `utils/notifications/preferences.test.js` (`summary`).
- `components/account/NotificationPrefsDialog.test.jsx`: muestra el estado del GET, cambia un interruptor, "Guardar" manda los cinco, error dentro del diálogo, "Guardar" deshabilitado sin cambios.
- `pages/student/MyProfilePage/notifications.test.jsx`: la fila con su resumen, carga y error con Reintentar.
- `components/shared/ui/Switch.test.jsx` (teclado: espacio cambia el estado).

**Navegador:** alumno de QA apaga "Comentarios"; el PT comenta una sesión: no llega push al celular de prueba pero la notificación aparece en la bandeja; vuelve a prenderla y llega. Capturas en `docs/superpowers/specs/assets/gx3/` (`01-fila-notificaciones.jpg`, `02-dialogo.jpg`, `03-guardado.jpg`, `04-angosto-375.jpg`, `05-bandeja-celular-sin-push.jpg`).

## Criterio de aceptación

- El alumno ve y cambia en Mi perfil qué tipos le avisan al celular; lo guardado persiste al recargar.
- Con un tipo apagado no sale ningún push de ese tipo (incluidos el resumen de logros y el envío masivo), y la notificación igual se guarda.
- Un alumno que nunca tocó la pantalla recibe todo como hoy.
- Lint y tests en verde; ningún archivo pasa de 200 líneas; contrato, modelo y auditoría actualizados.

## Estimación

**12 h**: migración y schema 0,5 h; modelo, repo, service, validación y rutas 2 h; filtro en `notify` 1 h; tests backend 2,5 h; API, hook y utils web 1 h; `Switch`, diálogo y fila 2 h; tests web 1,5 h; docs 0,5 h; navegador y capturas (con el celular) 1 h.

## Fuera de alcance

- Preferencias del PT.
- Recordatorio de entreno (la fila del prototipo lo menciona; hoy no existe ese push).
- Horario de silencio, preferencias por canal (mail) y notificaciones push en la web.
- Ocultar de la bandeja los tipos apagados.

## Tarjetas para el celular (Igna)

1. **Pantalla "Notificaciones" en ajustes del alumno:** `GET /notifications/preferences` al entrar (sin fila vienen todos en `true`), cinco interruptores con los mismos textos que la web, `PUT /notifications/preferences` con los cinco booleanos al guardar (o al tocar cada uno, mandando siempre los cinco). 403 si lo pide un PT.
2. **Sin cambios en la recepción:** el filtro es del backend; el celular no tiene que descartar nada. Los tipos apagados igual aparecen en `GET /notifications` (la bandeja).
3. (Opcional) Si el sistema tiene las notificaciones de la app bloqueadas, avisarlo arriba de la pantalla con un atajo a los ajustes de Android.
