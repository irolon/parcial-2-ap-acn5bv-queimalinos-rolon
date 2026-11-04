---
tags: [spec]
tarjeta: E12
---
# Spec — E12 · Notificaciones del entrenador

- **Tarjeta:** [E12 del tablero del entrenador](https://trello.com/c/SjvSlvHD).
- **Fecha:** 2026-11-01.
- **Rama:** `feature/android-entrenador-notificaciones`, apilada sobre `feature/android-entrenador-desafios` (E14, PR #66). El 02/11 se rearmó sobre la #66 de después de la cascada de Room, que ya trae la #44 (progreso) y la #48 (push y centro del alumno).
- **Base:** reusa todo lo de la tarjeta 17 (FCM, `NotificationsRepository`, `NotificationsScreen`, resolución del tap). Esta tarjeta lo abre al rol entrenador.

> **Cómo quedó (01/11):**
> - **E2E en el emulador** con el backend local: al entrar como `profe.card8`, `push_tokens` quedó con `user_role = trainer`. La alumna sustituyó un ejercicio por API, y el aviso "Alumna Card 8 modificó su rutina" apareció en la campana del Inicio. Tocarlo marcó leído y abrió la sesión con "Aperturas en polea en lugar de Bicicleta abdominal".
> - **Push real:** el backend local no tiene cuenta de servicio de FCM (`FCM deshabilitado: sin credenciales configuradas`), igual que en la tarjeta 17. El tap se probó lanzando la app con los mismos extras que trae el push (`type`, `student_id`, `session_id`, `notification_id`): abrió la sesión, y Atrás llevó a la ficha y de ahí a Alumnos. `inactivity` abrió la ficha. **Queda pendiente el push real**, con la cuenta de servicio o en un celular contra el VPS.
> - **Migraciones:** el merge de develop renumeró la base local (9→10→11→12…20). Las migraciones instrumentadas 9-20 pasaron en el emulador.
> - **Room sigue en v20 (02/11).** En la ronda 1 de Codex esta rama subía a v21 con `MIGRATION_20_21`, que creaba si faltaban las nueve tablas de develop (progreso y avisos), porque la v20 de E14 de entonces (`309bbed`) no las tenía. Después de la cascada de Room, la v20 de la #66 ya las trae (vienen de la v10 y la v11 de develop) y su esquema es idéntico al de la v21 que generaba esta rama. Así que la v21, su migración manual y `MigrationV21Test` se sacaron: E12 no cambia el esquema. La v20 vieja de `309bbed` solo existió en el emulador de desarrollo y nunca llegó a develop.
> - **Ronda 1 de Codex: pendientes de hoy.** La spec de E7 dejaba para E12 un push a la mañana con los alumnos del día y esa misma lista en el centro de avisos. La lista va arriba del centro del entrenador: `ui/students/overview/pending/`, con `PendingTodayViewModel` y `pendingTodayItems`, y `navigation/trainer/TrainerNotificationRoutes`. Lee el resumen del Inicio de Room y lo refresca al abrirse; tocar un alumno abre su ficha. El push necesita un tipo y un job en el backend, y quedó como aviso a Pablo en el README.
> - **Se borró** `PendingTodaySheet` y su test instrumentado; lo reemplaza `PendingTodayItemsTest`.
> - **Aviso a Pablo** en `backend/README.md`: el feedback/RPE no genera una notificación para el PT.

## 1. Objetivo

El entrenador recibe push cuando un alumno sustituye un ejercicio o lleva días sin entrenar, y tiene su centro de notificaciones. Tocar un aviso abre la sesión o la ficha del alumno.

**Criterio de aceptación:** un alumno sustituye un ejercicio y al entrenador le llega la notificación al celular; al tocarla, se abre esa sesión.

## 2. Decisiones (debate del 01/11 y lectura del backend)

1. **Tipos** (el backend ya los genera para el entrenador):

   | Tipo | Push | Tocar abre |
   |---|---|---|
   | `routine_modified` (sustituyó un ejercicio) | sí | la sesión del alumno (E4) |
   | `inactivity` (3 días asignados sin entrenar) | sí | la ficha del alumno |
   | `pr` (récord del alumno) | no, solo en la lista | la sesión |
   | `achievement` (logro del alumno) | no, solo en la lista | la ficha |

   `pr` y `achievement` no estaban en el debate, pero el backend ya le guarda al entrenador esas filas. Esconderlas costaría código y dejaría avisos que existen pero no se ven, así que se muestran. **Feedback/RPE no tiene tipo en el backend:** queda pendiente y se le avisa a Pablo en `backend/README.md`.
2. **Dónde vive:** la campana del Inicio (E7), que hasta ahora abría "pendientes de hoy", pasa a abrir el centro de notificaciones (`trainer/notifications`, pestaña Inicio), con el contador de no leídas, como la campana de Hoy del alumno.
   - La hoja de pendientes se va: la tarjeta del día ya filtra a los que faltan hoy.
3. **Push:** el token se registra también para el entrenador. El backend acepta los dos roles y toma el rol del JWT. Al recibir un push se refresca la lista del usuario logueado, sea del rol que sea.
4. **Un solo mapa de destino por tipo**, con el rol para los tipos que comparten nombre:
   - `pr` del alumno → su gráfico; `pr` del entrenador → la sesión;
   - `achievement` del alumno → la lista; del entrenador → la ficha.
   - Los push del entrenador (`inactivity`, `routine_modified`) son tipos que el alumno nunca recibe, así que el intent del push se resuelve sin saber el rol.
5. **Navegación desde un push:**
   - sesión: pestaña Alumnos → ficha → sesión, así atrás vuelve a la ficha;
   - ficha: pestaña Alumnos → ficha;
   - desde la lista, se apila sobre la lista.
   - Un destino que no corresponde al rol logueado (push viejo de otra cuenta) se descarta.
6. **Offline-first, sin cambios:** la lista sale de Room (tabla `notifications`, por dueño), las lecturas suben cuando hay red y el cierre de sesión limpia todo, como en la tarjeta 17. Room no cambia (sigue en v20).

## 3. Backend

No cambia el código. Usa `GET /notifications`, `PATCH /notifications/:id/read` y `POST/DELETE /notifications/tokens`, con `requireRole('trainer', 'student')`.

En `backend/README.md` se suma un aviso para Pablo: falta un tipo de notificación para el feedback/RPE nuevo del alumno.

## 4. Mobile

- **`data/notifications/`:**
  - `NotificationType` suma `INACTIVITY` y `ROUTINE_MODIFIED`;
  - `destinationOf(type, data, role)` suma `StudentSession(studentId, sessionId)` y `StudentProfile(studentId)`;
  - el dueño de la sesión es cualquier usuario logueado (`Session.userId`), en el repositorio y en el servicio de push;
  - `PushTokenRegistry` registra a cualquier usuario logueado.
- **`ui/notifications/`:**
  - el ViewModel de la lista y el de la campana usan `Session.userId`;
  - la lista resuelve el destino con el rol;
  - `LaunchResolver` suma `NavTarget.TrainerSession`, `TrainerStudent` y `TrainerNotifications`;
  - textos e íconos para los tipos nuevos.
- **`navigation/`:**
  - `NotificationNavigation.navSteps` suma los destinos del entrenador;
  - `NotificationLaunchEffect` corre en los dos shells;
  - `notificationsUnread` corre para los dos roles;
  - ruta `trainer/notifications` en `RoleTabs` (pestaña Inicio).
- **Inicio (E7):** `HomeHeader` muestra la campana con no leídas y abre el centro. Se borra `PendingTodaySheet`.

## 5. Pruebas

- **Unitarias:**
  - destino por tipo y rol;
  - mapper con los tipos nuevos;
  - resolver y `navSteps` para el entrenador;
  - registro del token para el entrenador;
  - ViewModels de lista y campana con sesión de entrenador;
  - los tests existentes del alumno siguen en verde.
- **E2E en el emulador con el backend local:**
  1. Entrar como entrenador: queda registrado el token (`push_tokens` con `user_role = trainer`).
  2. Como alumno, sustituir un ejercicio en una sesión por API (`POST /sessions` con `substitutions`).
  3. Al entrenador le llega el push; tocarlo abre esa sesión (criterio de aceptación).
  4. La campana del Inicio muestra el contador; la lista abre la ficha o la sesión según el tipo.
