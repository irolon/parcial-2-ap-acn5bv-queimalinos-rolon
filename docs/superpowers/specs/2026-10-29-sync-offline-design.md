---
tags: [spec]
tarjeta: 11
---
# Spec — Sincronización offline de sesiones en mobile

- **Tarjeta:** 11 del tablero personal de Igna (sincronización offline de sesiones). El texto de la tarjeta no se pudo leer al escribir este spec (conector de Trello caído); el alcance sale de `docs/proceso/plan-de-desarrollo.md` (fila "Modo offline (mobile)"), RNF-03 y el spec de la tarjeta 10 (§8, §9).
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

- **Se sube solo la sesión terminada.** Nada se sube mientras se entrena. Así "Descartar" sigue funcionando sin un endpoint de borrado.
- **Las series que vuelven en `failed` se marcan en el celular y no se reintentan.** Quedan en Room con su código de error. La sesión cuenta como subida cuando todas sus series están guardadas en el servidor o marcadas como fallidas.
- **Logout con entrenamientos sin subir:** un aviso con **Subir ahora**, **Cerrar igual** y **Cancelar**. Cada sesión espera a que vuelva a entrar su dueño; nunca se sube con la cuenta de otro.
- **Lo que ve el alumno:**
  - una línea de estado en el resumen al terminar;
  - un aviso en Hoy, solo si hay algo pendiente o fallido.
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

**Reglas:**
- Solo se suben sesiones `FINISHED` + `PENDING` del alumno con sesión iniciada. Una sesión `ACTIVE` nunca se toca.
- Las sesiones terminadas antes de esta tarjeta se suben solas la primera vez.
- Una sesión `SYNCED` o `FAILED` no se vuelve a subir.
- Hoy no se puede corregir una serie de una sesión terminada, así que ese caso no se cubre. Si la tarjeta 12 lo agrega, alcanza con volver la serie y la sesión a `PENDING`: el contrato admite reenviar una serie con datos nuevos.

**Consultas nuevas en `WorkoutDao`:**
- sesiones pendientes de un dueño, con sus series `PENDING`;
- marcar series (`SYNCED` / `FAILED` + código) y sesiones (`SYNCED` / `FAILED`) en una transacción;
- observar cuántas sesiones `PENDING` y `FAILED` tiene un dueño;
- observar el `syncState` de una sesión y la cantidad de series `FAILED` (para el resumen).

## 4. Componentes

| Pieza | Qué hace |
|---|---|
| `data/api/SessionApi.kt` | Retrofit: `POST sessions`, `POST sessions/{id}/sets` y sus DTO. Usa el cliente principal (Bearer + `TokenAuthenticator`), así el token vencido se renueva solo. |
| `data/sync/SessionUploader` | Sube **una** sesión: `POST /sessions` con `finished_at`, y después sus series `PENDING` en lotes de hasta 100. Devuelve un resultado: qué series quedaron guardadas, cuáles fallaron y con qué código, o qué tipo de error cortó la subida. No toca Room. |
| `data/sync/SyncSessionsWorker` | `CoroutineWorker` con `@HiltWorker`. Lee quién tiene la sesión iniciada, recorre sus sesiones pendientes de a una, usa `SessionUploader` y guarda cada resultado en Room. |
| `data/sync/SessionSync` | La cara hacia la app: `enqueue()`, `syncNow()` (encola y espera el final, con tope) y `observePending(ownerId)`. |
| `FitTrainerApp` + `AndroidManifest.xml` | `Configuration.Provider` con `HiltWorkerFactory`; se saca el inicializador por defecto de WorkManager. |
| Dependencias | `androidx.work:work-runtime-ktx`, `androidx.hilt:hilt-work` (+ su compilador por KSP); `androidx.work:work-testing` en los tests. |

**Cuándo se encola** (trabajo único `sync-sessions`, condición de red `CONNECTED`, `ExistingWorkPolicy.APPEND_OR_REPLACE`: si ya está corriendo, la pasada sigue y se agenda otra al terminar):
1. al terminar una sesión (`WorkoutRepository.finish()`);
2. al iniciar sesión;
3. al abrir la app con alguien logueado.

**Flujo de una pasada:**
1. Sin nadie logueado: termina con éxito sin hacer nada.
2. Por cada sesión `FINISHED` + `PENDING` del dueño, en orden de `startedAt`:
   1. `POST /sessions`;
   2. lotes de series;
   3. guardar el resultado en Room en una transacción.
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
| 401 (falló también el refresh) o 403 | Corta sin reintentar (`Result.success()`). Todo queda `PENDING` hasta el próximo login, que vuelve a encolar. |

- Se avanza sesión por sesión. Lo ya marcado queda marcado si la pasada se corta.
- Si el alumno hace logout durante una pasada, el próximo request da 401 y la pasada corta. Las sesiones siguen siendo de su dueño.

## 6. Pantallas

- **Resumen al terminar** (`ui/workout/components/WorkoutSummaryView.kt`): una línea de estado que observa Room:
  - "Guardado en el celular · se sube cuando haya conexión" (`PENDING`);
  - "Subido ✓" (`SYNCED`, sin series fallidas);
  - "Subido · N series no se pudieron subir" (`SYNCED` con series `FAILED`);
  - "No se pudo subir este entrenamiento" (`FAILED`).
- **Hoy** (`ui/today/`): un aviso chico arriba, solo si hace falta: "N entrenamientos sin subir" y/o "N entrenamientos no se pudieron subir". `TodayViewModel` lo toma de `SessionSync.observePending()`.
- **Logout:**
  - Si hay una sesión abierta, sale primero el aviso actual (`ActiveWorkoutSignOutDialog`).
  - Después, si hay sesiones `PENDING`, un aviso nuevo: "Tenés N entrenamientos sin subir. Se van a subir cuando vuelvas a entrar."
    - **Subir ahora:** llama a `syncNow()` con tope de 15 s y muestra una ruedita. Si quedó todo subido, cierra sesión. Si no, muestra "No se pudo subir. ¿Cerrar sesión igual?" con **Reintentar**, **Cerrar igual** y **Cancelar**.
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
- `SyncSessionsWorker` con fakes (`TestListenableWorkerBuilder`): la traducción de cada resultado a `success` / `retry`, que solo suba lo del dueño logueado, que se corte sin nadie logueado y que no toque sesiones `ACTIVE`.
- `TodayViewModel` (aviso) y el ViewModel del logout: los tres botones, el tope de 15 s y el error.

**Instrumentadas (`connectedDebugAndroidTest`):**
- Migración v4 → v5 con `MigrationTestHelper`: los datos se conservan y las series quedan `PENDING`.
- Consultas nuevas del DAO.
- El trabajo con `WorkManagerTestInitHelper` (encolado único y condición de red).

**De punta a punta** (backend real + Supabase dev, alumna de prueba, emulador):
- entrenar en modo avión → terminar → sacar el modo avión → sesión y series en la base en < 5 s;
- forzar un reenvío → sin duplicados;
- logout con pendientes: "Subir ahora" con red y sin red, "Cerrar igual", y volver a entrar (se sube sola);
- la web de Pablo deja de mostrar "Nunca entrenó" para esa alumna.

## 8. Fuera de alcance

- RPE y notas al terminar la sesión, historial de sesiones y corrección de series ya subidas (tarjeta 12).
- `last_session_kg` desde el backend en `/routines/today`: la precarga sigue usando lo guardado en el celular.
- Ver la sesión en vivo desde la web mientras el alumno entrena.
- Borrar en el servidor una sesión descartada (no existe el endpoint, y con "subir al terminar" no hace falta).
