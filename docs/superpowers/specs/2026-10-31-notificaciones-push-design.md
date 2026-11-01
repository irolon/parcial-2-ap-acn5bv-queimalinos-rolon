---
tags: [spec]
tarjeta: 17
---
# Spec: push y centro de notificaciones en mobile (alumno)

- **Tarjeta:** [tablero personal](https://trello.com/c/KeJYajXf) (17, 🟡 P1, ~14 h) · [tablero de equipo](https://trello.com/c/OX6ZXUMo).
- **Fecha:** 2026-10-31
- **Rama:** `feature/android-notificaciones`. Sale de `feature/android-graficos` (tarjeta 13, PR #44, sin mergear) por dos motivos: necesita Room v9 y la pantalla de Gráficos para abrir un récord. Cuando la #44 entre a `develop`, esta rama se rebasa y su PR apunta a `develop`. Solo mobile: el backend no se toca.
- **Reglas:**
  - `AGENTS.md`: Room es la única fuente de verdad; la UI nunca llama a Retrofit.
  - `CONTRIBUTING.md`: 200 líneas por archivo; orden capa → módulo → archivo; carpetas de más de 10 archivos se dividen.
- **Contrato:** `docs/arquitectura/contratos-api.md`, sección Notificaciones (`GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`, `POST /notifications/tokens`, `DELETE /notifications/tokens/:token`) y el párrafo "Payload del push". Backend en `develop` desde la PR #36. ADR 0006: la tabla `notifications` es la fuente de verdad y el push es best-effort.
- **Diseño:** no hay mockup oficial. Igna eligió entre los mockups del debate (31/10). Sistema de la app: tema oscuro, azul `#2952D9`, Space Grotesk / Inter / JetBrains Mono, toque mínimo de 44 px.

## 1. Objetivo

Que el alumno se entere de lo que pasa con su entrenamiento aunque tenga la app cerrada, y que tenga un lugar dentro de la app donde ver todos sus avisos, también sin conexión.

**Criterio de aceptación (ajustado en el debate del 31/10):**
- El entrenador comenta una sesión desde la web.
- Al alumno le llega un push con la app cerrada. Lo toca y se abre el detalle de esa sesión.
- La campana de Hoy muestra el número de no leídos.
- La lista de avisos se ve en modo avión.

> El criterio original hablaba del entrenador: "el PT recibe un push y al tocarlo se abre la ficha del alumno". En el celular el entrenador todavía no tiene pantallas (eso es la tarjeta 19), así que **la parte del entrenador queda para la 19**. Decisión de Igna.

## 2. Decisiones del debate (31/10)

- **Solo el alumno.** Recibe los tres tipos que el backend ya le manda con push: `comment` (comentario del entrenador en una sesión), `pr` (récord nuevo) y `achievement` (logro). Los del entrenador (`inactivity`, `routine_modified`) no se muestran en el celular por ahora.
- **Campana en Hoy** (opción A de tres): arriba a la derecha de la pantalla Hoy, con el número de no leídos. Las otras pestañas no cambian.
- **Lista de avisos:**
  - pantalla propia que abre la campana, con flecha atrás;
  - agrupada en **Hoy · Ayer · Antes**;
  - los no leídos con fondo azulado y un punto (sin borde de color al costado);
  - arriba a la derecha, **"Marcar todo leído"**;
  - cada ítem lleva ícono por tipo (💬 comentario, 🏆 récord, 🎖️ logro), título, cuerpo y tiempo relativo ("hace 2 h", "ayer", "25 oct").
- **Al tocar** un aviso (push o ítem de la lista):
  - `comment` → detalle de esa sesión en el historial (`data.session_id`);
  - `pr` → Progreso → Gráficos → Cargas con el primer ejercicio de `data.exercise_ids` elegido;
  - `achievement` → la lista de avisos, porque la pantalla de logros es la tarjeta 15;
  - tocar un aviso lo marca como leído y baja el número de la campana.
- **Permiso (Android 13+):**
  - no se pide en un momento nuevo, porque ya se pide al empezar la primera sesión (PR #38, aviso de fin de descanso) y el mismo permiso sirve para los push;
  - si el alumno lo rechazó, la app funciona igual y los avisos siguen en la campana;
  - solo dentro de la lista se muestra un cartel discreto, "Las notificaciones están apagadas", con un botón **Activar** que abre los ajustes de notificaciones de la app;
  - no se insiste en ningún otro lado.

## 3. Pantallas y estados

### 3.1 Campana en Hoy
- Ícono de campana en el encabezado de Hoy, a la derecha del saludo. Si hay no leídos, lleva un badge con el número (más de 9 → "9+").
- El número sale de Room (§4.2) y se ve también sin conexión.

### 3.2 Lista de avisos

| Situación | Qué ve |
|---|---|
| Hay avisos | La lista agrupada, los no leídos marcados |
| Sin avisos | "Todavía no tenés avisos" con una línea de qué va a llegar ahí (comentarios, récords y logros) |
| Sin red y con avisos guardados | Lo guardado + "Sin conexión · mostrando lo guardado" (el mismo aviso que el historial) |
| Sin red y nunca se bajó | "Conectate una vez para ver tus avisos" |
| Falla el refresco (5xx, timeout) | Lo guardado + "No pudimos actualizar" con Reintentar |
| Permiso de notificaciones denegado | Cartel arriba de la lista: "Las notificaciones están apagadas" + **Activar** |
| Hay más páginas | Al llegar al final se cargan más (paginación por cursor `before`) |

- Pull-to-refresh, como en el historial.
- "Marcar todo leído" se ve solo si hay no leídos.

### 3.3 Push
- Con la app cerrada o en segundo plano: el sistema muestra el push. Lo arma el mensaje FCM con `notification.title` / `body`.
- Con la app abierta: también se muestra (decisión de Claude: así el alumno se entera igual), y la lista y el número se actualizan.
- Al tocarlo se abre la app en la pantalla del tipo (§2) y el aviso se marca leído (`notification_id` del payload).
- El push resumen de varios logros no trae `notification_id`: abre la lista de avisos y no marca nada.
- **Canal** (decisión de Claude): un canal propio, "Avisos de tu entrenador", con importancia por defecto. Se declara como canal por defecto de FCM en el manifest, porque el backend no manda `channel_id`. Es aparte del canal de fin de descanso de `WorkoutNotifications`.
- **Dos caminos, un destino** (decisión de Claude):
  - con la app cerrada, el sistema abre la actividad principal con el `data` como extras;
  - con la app abierta, el `PendingIntent` lo arma `onMessageReceived` con los mismos extras;
  - la actividad lee los extras con una sola función pura (`data` → destino) y navega.
- **Tap sin sesión de alumno** (decisión de Claude): si no hay sesión iniciada o la cuenta es de entrenador, el destino se descarta y la app abre normal (login o Hoy). No se guarda para después del login. Si hay sesión de alumno, el `PATCH` de leído usa su token: un `notification_id` de otra cuenta da 404 y se descarta sin mostrar nada.
- **Destino sin datos en el celular** (decisión de Claude):
  - `comment`: si la sesión no está en el historial guardado, primero se refresca la página 1 del historial (con red). Si la sesión aparece, se abre su detalle, que baja su contenido como ya hace con las de "Ver más". Si no aparece o no hay red, se abre Progreso → Historial.
  - `pr`: si el ejercicio no está en el desplegable de Gráficos, Gráficos abre con su elección por defecto.

## 4. Datos

### 4.1 Backend (ya existe, no se toca)
- `GET /notifications?limit&before&unread_only` → `{ data: [...], meta: { unread_count, next_before } }`. Cada fila: `id, type, title, body, data, read, created_at` (más campos que no se usan).
- `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`.
- `POST /notifications/tokens` `{ token, platform: "android" }` (upsert) · `DELETE /notifications/tokens/:token`.
- Payload del push: `data` lleva lo de la fila más `type` y `notification_id`, todo como texto. `exercise_ids` llega como JSON serializado y hay que parsearlo.
- El listado devuelve también tipos que el alumno no recibe por push. **El celular muestra solo `comment`, `pr` y `achievement`** y descarta los demás. Decisión de Claude, para no mostrar algo sin pantalla a dónde ir.

### 4.2 Caché (Room, v10)
- Tabla `notifications` por dueño (`ownerId`): `id`, `type`, `title`, `body`, `data` (JSON en texto), `read`, `createdAt`, más una marca de `fetchedAt` del último refresco.
- Room **v10, `AutoMigration(9 → 10)`**. La v9 es de la tarjeta 13.
- Se borra con el resto de los datos al cerrar sesión o cambiar de cuenta, como las tablas del historial y de los gráficos.
- **Marcar leído offline-first** (decisión de Claude, siguiendo la regla de escrituras de `AGENTS.md`):
  - se marca en Room al instante y queda pendiente;
  - se sube con el `PATCH` cuando hay red, por WorkManager o en el próximo refresco;
  - "Marcar todo leído" igual.
  - Un refresco no pisa una marca pendiente.

### 4.3 Cuándo se refresca
- Al abrir la app (con red, como mucho cada 5 minutos, igual que el badge del historial).
- Al abrir la lista y con pull-to-refresh.
- Cuando llega un push con la app abierta.

La UI lee de Room con `Flow`, el repositorio refresca Room y el ViewModel no ve Retrofit.

### 4.4 Token de push
- **Al iniciar sesión como alumno**, o cuando FCM rota el token (`onNewToken`) con sesión de alumno: `POST /notifications/tokens`. Si falla, se reintenta en el próximo inicio de la app.
- **Al cerrar sesión:** `DELETE /notifications/tokens/:token` **antes** de borrar el JWT, para que otra cuenta en el mismo celular no reciba los avisos del anterior. Si falla (sin red), el logout sigue igual. Riesgo aceptado: el backend puede mandar un push viejo hasta que el token se reasigne.
- Entrenador logueado: no registra token (§2).

## 5. Firebase
- `google-services.json` del proyecto **`fittrainer-bdb46`**, paquete `com.fittrainer`. Lo pasó Pablo y está en las Descargas de Igna como `google-services (2).json`. Va en `mobile/app/`.
- ¿Se commitea? Decisión de Claude: **sí**. No es un secreto (la API key de Android está pensada para viajar en el APK), y sin él no compila. Si Igna prefiere no subirlo, va a `.gitignore` con un `google-services.example.json`, y el plan lo anota.
- Dependencias: plugin `com.google.gms.google-services` y `firebase-messaging` (BoM de Firebase).
- Para probar el envío real, el backend local necesita la **cuenta de servicio** del mismo proyecto (`FCM_SERVICE_ACCOUNT_PATH` en `backend/.env`). La tiene Pablo. Sin ella el backend guarda la notificación pero no manda el push, así que la lista y la campana se pueden probar igual.

## 6. Componentes (orientativo)
- `data/api/notifications/` (`NotificationsApi`, DTOs) registrado en `di/NetworkModule`.
- `data/db/notifications/` (entidad, DAO).
- `data/notifications/` (repositorio, mapper, registro del token).
- `push/` o `notifications/push/` (`FirebaseMessagingService`, armado del intent de destino).
- `ui/notifications/` (lista, ViewModel, textos, estados) y la campana en `ui/today/`.
- Navegación: ruta de la lista y apertura por deep link interno desde el push, reusando las rutas del detalle de sesión y de Gráficos.
- La lógica pura, testeable fuera de los composables: agrupar por Hoy · Ayer · Antes, tiempo relativo, destino por tipo, parseo del `data` del push y filtro de tipos.

## 7. Pruebas
**Unitarias:**
- agrupación y tiempo relativo (bordes de medianoche, zona Argentina);
- destino por tipo, con `data` incompleto o `exercise_ids` mal formado (va a la lista), sin sesión de alumno (se descarta) y sesión que no está en el historial (§3.3);
- filtro de tipos;
- repositorio: refresco y paginación, marcar leído pendiente que un refresco no pisa, subida de pendientes, 404 al marcar (se descarta);
- token: alta al loguear, alta en `onNewToken`, baja antes del logout y logout que sigue si falla.

**Instrumentadas:** DAO y migración 9 → 10.

**A mano (emulador, `alumna.card8`):**
1. Sin cuenta de servicio: se carga una notificación en Supabase dev y aparece en la campana y en la lista. Al tocarla se abre su destino y queda leída.
2. Modo avión: la lista guardada se ve, y "Marcar todo leído" se aplica y se sube al volver la red.
3. Con cuenta de servicio: el entrenador comenta desde la web, llega el push con la app cerrada y al tocarlo se abre el detalle de la sesión. **Decisión de Igna (31/10):** se arranca sin la cuenta de servicio y Igna se la pide a Pablo. Esta prueba no traba la tarjeta: queda como pendiente no técnico. Mientras tanto, el tap del push se prueba mandando un intent con los mismos extras por `adb`.
4. Permiso denegado: aparece el cartel con Activar.

## 8. Fuera de alcance
- Avisos del entrenador en el celular (`inactivity`, `routine_modified`): tarjeta 19.
- Pantalla de logros: tarjeta 15. Hasta entonces, el logro abre la lista.
- Turnos (`appointment`): tarjeta 16.
- Preferencias por tipo de aviso (silenciar comentarios, etc.).
- Borrar avisos.
