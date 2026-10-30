---
tags: [spec]
tarjeta: 11
---
# Spec — Sincronización offline de sesiones en mobile

- **Tarjeta:** [31 del tablero de equipo](https://trello.com/c/pDWNaDQq) (11 del tablero personal de Igna): sincronización offline de sesiones. Pide además un indicador discreto de lo que falta subir y **poder forzar la subida a mano**.
- **Fecha:** 2026-10-29
- **Rama:** `feature/android-sync-offline`, sale de `develop` (ya trae el módulo Sessions de Pablo, PR #30). Solo mobile; el backend no se toca.
- **Reglas que aplican:** `AGENTS.md` (Room es la única fuente de verdad; escrituras offline-first con UUID del cliente y `executed_at` real; WorkManager para sincronizar) y `CONTRIBUTING.md` (200 líneas, capa → módulo → archivo).
- **Contrato:** `docs/arquitectura/contratos-api.md`, módulo Sesiones (`POST /sessions`, `POST /sessions/:id/sets`). Reemplaza al contrato propuesto en el §8 del spec de la tarjeta 10.
- **Nombres:** como en la tarjeta 10, la sesión de entrenamiento se llama **workout** en el código; `data/session/` es la sesión de login.

## 1. Objetivo

Las sesiones que el alumno termina en el celular (hoy quedan en Room como `PENDING` y no salen de ahí) se suben solas al backend cuando hay red, sin perder ni duplicar nada. Así el entrenador las ve y su panel deja de decir "Nunca entrenó".

**Criterio de aceptación:**
- El alumno entrena y termina una sesión en modo avión. Al volver la red, la sesión y todas sus series aparecen en la base en menos de 5 segundos (RNF-03).
- Reenviar no duplica nada.
- No se pierde ningún dato: lo que el servidor rechaza queda en el celular, marcado.
- El alumno ve si tiene entrenamientos sin subir.

## 2. Decisiones tomadas (debate del 29/10)

- **Se sube solo la sesión terminada.** Nada se sube mientras se entrena. Así "Descartar" sigue funcionando sin un endpoint de borrado. Una sesión `ACTIVE` que el alumno abandona sin terminar no se sube nunca.
- **Las series que vuelven en `failed` se marcan en el celular y no se reintentan.** Quedan en Room con su código de error. La sesión cuenta como subida cuando todas sus series están guardadas en el servidor o marcadas como fallidas.
- **Logout con entrenamientos sin subir:** un aviso con **Subir ahora**, **Cerrar igual** y **Cancelar**. Cada sesión espera a que vuelva a entrar su dueño; nunca se sube con la cuenta de otro.
- **Lo que ve el alumno:**
  - una línea de estado en el resumen al terminar;
  - un aviso en Hoy, solo si hay algo pendiente o fallido, con **Subir ahora** cuando hay pendientes y una **X** para descartar los rechazos ya vistos.
- **Enfoque:** un único trabajo de WorkManager (`sync-sessions`) que vacía la cola del alumno con sesión iniciada. Se descartaron un trabajo por sesión (coordinar N trabajos en el logout) y un trabajo periódico (mínimo 15 min, no ayuda a los 5 s).

## 3. Datos: Room v5 (`data/db/workout/`)

Migración v4 → v5, sin pérdida de datos.

**`workout_sessions.syncState`** (ya existe, hoy siempre `PENDING`):
- `PENDING`: falta subirla.
- `SYNCED`: subida; todas sus series están `SYNCED` o `FAILED`.
- `FAILED`: el servidor rechazó la sesión entera de forma permanente (409 `SESSION_ID_CONFLICT` o 400). No se reintenta.

**`workout_sets`**, dos columnas nuevas:
- `syncState` (`PENDING` | `SYNCED` | `FAILED`, no nulo). La migración pone `PENDING` en las filas existentes.
- `syncError` (texto, nulo): el `code` del servidor si falló (`VALIDATION_ERROR`, `EXERCISE_NOT_FOUND`, `SET_ID_CONFLICT`).

**Room v6** (migración automática 5 → 6, revisión de Pablo en la PR #32): `failureSeen` (booleano, por defecto `false`) en `workout_sessions` y `workout_sets`. El alumno descartó en Hoy ese rechazo: deja de contarse en el aviso, pero no se borra nada y la línea del resumen lo sigue mostrando. Un rechazo nuevo vuelve a aparecer.

**Reglas:**
- Solo se suben sesiones `FINISHED` + `PENDING` del alumno con sesión iniciada. Una sesión `ACTIVE` nunca se toca.
- Las sesiones terminadas antes de esta tarjeta se suben solas la primera vez.
- Una sesión `SYNCED` o `FAILED` no se vuelve a subir.
- Hoy no se puede corregir una serie de una sesión terminada, así que ese caso no se cubre. Si la tarjeta 12 lo agrega, alcanza con volver la serie y la sesión a `PENDING`: el contrato admite reenviar una serie con datos nuevos.

**Consultas nuevas en `WorkoutDao`:**
- sesiones pendientes de un dueño, con sus series `PENDING`;
- marcar series (`SYNCED` / `FAILED` + código) y sesiones (`SYNCED` / `FAILED`) en una transacción;
- observar cuántas sesiones `PENDING` y `FAILED` y cuántas series `FAILED` tiene un dueño (los rechazos con `failureSeen` no cuentan);
- descartar los rechazos de un dueño (`dismissFailures`, en una transacción);
- observar el `syncState` de una sesión y la cantidad de series `FAILED` (para el resumen).

## 4. Componentes

| Pieza | Qué hace |
|---|---|
| `data/api/SessionApi.kt` | Retrofit: `POST sessions`, `POST sessions/{id}/sets` y sus DTO. Usa el cliente principal (Bearer + `TokenAuthenticator`), así el token vencido se renueva solo. Cada request lleva el dueño de la sesión como tag (`RequiredUser`). |
| `data/auth/AuthInterceptor` + `RequiredUser` | Si la request trae `RequiredUser` y la cuenta guardada es otra (o no hay), no sale: tira `AccountChangedException`. |
| `data/sync/SessionUploader` | Sube **una** sesión: `POST /sessions` con `finished_at`, y después sus series `PENDING` en lotes de hasta 100. Devuelve qué series quedaron guardadas, cuáles fallaron y con qué código, si la sesión se llegó a crear y qué cortó la subida. No toca Room. |
| `data/sync/SyncPass` | Una pasada: lee quién tiene la sesión iniciada, recorre sus sesiones pendientes de a una, re-chequea el dueño antes de cada una, usa `SessionUploader` y guarda cada resultado en Room (`applyUpload`, en una transacción). |
| `data/sync/SyncSessionsWorker` | `CoroutineWorker` con `@HiltWorker`: corre una `SyncPass` y traduce su resultado a `success` / `retry`. |
| `data/sync/SessionSync` | La cara hacia la app: `enqueue(newWork)` y `syncNow()` (reemplaza la cola y espera el final, con tope). |
| `data/sync/SyncTrigger` | Arranca en `FitTrainerApp`: observa en Room las pendientes del alumno logueado y encola. |
| `data/sync/CancelSyncOnSignOut` | Al cerrar sesión cancela la pasada en curso o en espera, antes de que se borre el token. |
| `data/sync/UploadStatusRepository` | Lo que lee la UI, siempre de Room: los conteos del alumno y el estado de una sesión. |
| `ui/sync/` | `UploadStatusViewModel` (aviso de Hoy, "Subir ahora", línea del resumen), `SignOutSyncViewModel` (aviso del logout) y `SyncTexts`. |
| `FitTrainerApp` + `AndroidManifest.xml` | `Configuration.Provider` con `HiltWorkerFactory`; se saca el inicializador por defecto de WorkManager. |
| Dependencias | `androidx.work:work-runtime-ktx`, `androidx.hilt:hilt-work` (+ su compilador por KSP); `androidx.work:work-testing` en los tests. |

**Cuándo se encola** (trabajo único `sync-sessions`, condición de red `CONNECTED`, backoff exponencial desde 10 s). `SyncTrigger` observa en Room cuántas sesiones `PENDING` tiene el alumno logueado:
1. **Crecen** (terminó una sesión): `enqueue(newWork = true)`. Si hay una pasada corriendo, `APPEND_OR_REPLACE` (esa sigue y se agenda otra detrás); si no, `REPLACE` (la que esperaba backoff o red se reemplaza: lo recién terminado no espera, RNF-03).
2. **Primera lectura** (abrir la app, login) **o bajan** (la pasada va subiendo): `enqueue(newWork = false)` = `KEEP`. No se reinicia el backoff de la que espera; si la anterior ya terminó, se encola una nueva.
3. **"Subir ahora"** (Hoy y logout): `syncNow()` con `REPLACE` y espera el final.

Un error al encolar se loguea y el disparador sigue vivo.

**Flujo de una pasada:**
1. Sin nadie logueado: termina con éxito sin hacer nada.
2. Por cada sesión `FINISHED` + `PENDING` del dueño, en orden de `startedAt`:
   1. si el alumno logueado ya no es el dueño, corta;
   2. `POST /sessions`;
   3. lotes de series;
   4. guardar el resultado en Room en una transacción. Si `POST /sessions` no llegó a responder bien, no se marca nada: la sesión no existe en el servidor.
3. La UI lee el estado de Room, nunca de WorkManager.

Los `id` vuelven en minúscula; los del celular ya lo son (`UUID.toString()`), pero se comparan sin distinguir mayúsculas.

## 5. Errores y reintentos

| Situación | Reacción |
|---|---|
| Sin red, timeout o 5xx | Corta la pasada y devuelve `Result.retry()`. WorkManager reintenta con backoff exponencial desde 10 s. Reenviar es seguro (todo es idempotente). |
| Series: 200 con `failed` | Las de `failed` quedan `FAILED` con su código; las de `saved`, `SYNCED`. Sin series `PENDING`, la sesión pasa a `SYNCED`. |
| `POST /sessions`: 409 `SESSION_ID_CONFLICT` o 400 | La sesión queda `FAILED`; se sigue con la siguiente. |
| Series: 404 `SESSION_NOT_FOUND` | Reintentable (la próxima pasada vuelve a crear la sesión). |
| Series: 400 del request entero | La sesión queda `FAILED`, con sus series `PENDING` sin tocar. Es un bug nuestro y no se arregla reintentando. |
| 401 con la sesión cerrada (`TokenAuthenticator` rechazó el refresh y la borró) | Corta sin reintentar (`Result.success()`). Todo queda `PENDING` hasta el próximo login, que vuelve a encolar. |
| 401 con la sesión todavía abierta (el refresh falló por red o 5xx) | Pasajero: `Result.retry()`. |
| 403 | Rol equivocado, no depende del token: corta sin reintentar. Todo queda `PENDING`. |
| Entró otra cuenta (`AccountChangedException`) | La request no salió. Corta sin reintentar; lo pendiente espera a su dueño. |
| Error inesperado (Room, un bug) | `Result.retry()` siempre, con el backoff (WorkManager lo topea en 5 h). Con `failure()` nada volvería a encolar mientras viva el proceso. |

- Se avanza sesión por sesión. Lo ya marcado queda marcado si la pasada se corta.
- **Nunca se sube con la cuenta de otro alumno**, por tres capas:
  1. al cerrar sesión, `CancelSyncOnSignOut` cancela la pasada antes de borrar el token;
  2. `SyncPass` re-chequea el dueño antes de cada sesión;
  3. `AuthInterceptor` lee el token en cada request y frena la que trae el `RequiredUser` de otra cuenta. Esa es la que cierra la ventana entre el chequeo y el request.

## 6. Pantallas

- **Resumen al terminar** (`ui/workout/components/WorkoutSummaryView.kt`): una línea de estado que observa Room:
  - "Guardado en el celular · se sube cuando haya conexión" (`PENDING`);
  - "Subido ✓" (`SYNCED`, sin series fallidas);
  - "Subido · N series no se pudieron subir" (`SYNCED` con series `FAILED`);
  - "No se pudo subir este entrenamiento" (`FAILED`).
- **Hoy** (`ui/today/` + `ui/sync/components/UploadsNotice.kt`): un aviso chico arriba, solo si hace falta: "N entrenamientos sin subir", "N entrenamientos no se pudieron subir" y/o "N series no se pudieron subir". Lo arma `UploadStatusViewModel` desde Room.
  - Con rechazos lleva una **X**: los marca como vistos y el aviso deja de contarlos.
  - Con pendientes lleva **Subir ahora**: llama a `syncNow()` (tope de 15 s) con una ruedita. Si queda todo subido, muestra "Subido ✓" unos segundos. Si no, o si no hay red, "No se pudo subir, se reintenta solo cuando haya conexión". Si el servidor rechazó algo en esa pasada (una sesión `FAILED` deja de estar pendiente, así que no alcanza con "sin pendientes"), no hay "Subido ✓": queda el aviso del rechazo.
- **Carga de una serie:** el peso y las repeticiones quedan entre 0 y 1000, y una rutina con más de 100 series se corta en 100. Son los topes del backend: fuera de ellos la serie se rechazaría para siempre.
- **Logout:**
  - Si hay una sesión abierta, sale primero el aviso actual (`ActiveWorkoutSignOutDialog`).
  - Después, si hay sesiones `PENDING`, un aviso nuevo: "Tenés N entrenamientos sin subir. Se van a subir cuando vuelvas a entrar."
    - **Subir ahora:** llama a `syncNow()` con tope de 15 s y muestra una ruedita. Si quedó todo subido, cierra sesión. Si no, muestra "No se pudo subir. ¿Cerrar sesión igual?" con **Reintentar**, **Cerrar igual** y **Cancelar**. Si subió pero el servidor rechazó algo, no cierra solo: avisa que quedó guardado en el celular, con **Cerrar igual** y **Cancelar** (reintentar no cambia un rechazo).
    - **Cerrar igual:** cierra sesión; lo pendiente queda para el próximo login.
    - **Cancelar:** no hace nada.
- Textos y estilo con el tema actual: tema oscuro, `FtColors`, toque mínimo de 44 px.

## 7. Pruebas

**Unitarias (`testDebugUnitTest`):**
- `SessionUploader` contra MockWebServer, por la cadena real de Retrofit:
  - sesión con 0, 1 y 101+ series (dos lotes);
  - `failed` mezclado con `saved`;
  - 409 y 400 en `POST /sessions`;
  - 404 y 5xx en series;
  - sin red;
  - ids en mayúscula en la respuesta.
  - con el `AuthInterceptor` real: otra cuenta logueada → no sale ningún request.
- `SyncPass` con fakes (`data/sync/syncpass/`): que solo suba lo del dueño logueado, que no toque sesiones `ACTIVE`, cada error de §5, que un cambio de cuenta a mitad de la pasada o justo antes de un request no suba nada, y que una sesión sin crear no quede `SYNCED`.
- `SyncTrigger`: cuándo encola y con qué `newWork`, y que un error al encolar no lo mate.
- `UploadStatusViewModel` ("Subir ahora": con red, sin red, queda pendiente, doble toque) y `SignOutSyncViewModel` (los tres botones, el tope de 15 s y el error). Textos en `SyncTextsTest`.
- Topes de la carga (`WorkoutViewModelTest`, `WorkoutRulesTest`).

**Instrumentadas (`connectedDebugAndroidTest`):**
- Migración v4 → v5 con `MigrationTestHelper`: los datos se conservan y las series quedan `PENDING`. Migración v5 → v6: los rechazos se conservan sin marcarse como vistos.
- Consultas nuevas del DAO.
- `SyncSessionsWorker` (`TestListenableWorkerBuilder`): la traducción a `success` / `retry`.
- `SessionSync` con `WorkManagerTestInitHelper`: encolado único, condición de red, backoff, `REPLACE` / `APPEND_OR_REPLACE` / `KEEP` y `syncNow()`.
- `CancelSyncOnSignOut`: la pasada en espera queda `CANCELLED`.

**De punta a punta** (backend real + Supabase dev, alumna de prueba, emulador):
- entrenar en modo avión → terminar → sacar el modo avión → sesión y series en la base en < 5 s;
- corte a mitad de la subida: una sesión con muchas series, modo avión (o matar el proceso) mientras sube, volver la red → en la base están todas y sin duplicados;
- forzar un reenvío → sin duplicados;
- "Subir ahora" en Hoy, con red y sin red;
- logout con pendientes: "Subir ahora" con red y sin red, "Cerrar igual", y volver a entrar (se sube sola);
- la web de Pablo deja de mostrar "Nunca entrenó" para esa alumna.

## 8. Fuera de alcance

- RPE y notas al terminar la sesión, historial de sesiones y corrección de series ya subidas (tarjeta 12). Ojo para esa tarjeta: un reintento de `POST /sessions` solo completa los campos que en la base están en `null`, así que el RPE y las notas cargados después de subir la sesión van por `PATCH /sessions/:id`.
- `last_session_kg` desde el backend en `/routines/today`: la precarga sigue usando lo guardado en el celular.
- Ver la sesión en vivo desde la web mientras el alumno entrena.
- Borrar en el servidor una sesión descartada (no existe el endpoint, y con "subir al terminar" no hace falta).
