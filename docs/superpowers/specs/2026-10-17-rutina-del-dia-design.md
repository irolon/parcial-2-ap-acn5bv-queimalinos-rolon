---
tags: [spec]
tarjeta: 8
---
# Spec — Pantalla "Rutina del día" en mobile con caché offline

- **Tarjeta:** "8 · Pantalla "Rutina del día" en mobile con caché offline" (tablero personal de Igna) → tarjeta de equipo https://trello.com/c/IPotDBpI
- **Fecha:** 2026-10-17
- **Ramas:**
  - backend: `feature/routines-mine`, sale de `feature/students-body-metrics` (tiene el `backend/README.md` nuevo); PR chico y separado;
  - mobile: `feature/android-rutina-del-dia`, sale de `feature/android-onboarding-qr`.
- **Reglas que aplican:** `AGENTS.md` (Mobile: Room es la única fuente de verdad) y `CONTRIBUTING.md` (200 líneas, capa → módulo → archivo).
- **Diseño:** Guía Mobile p.12, "02 Rutina del día".

**Pendiente:** el checklist "Puntos a desarrollar" de la tarjeta de equipo no se pudo leer desde los MCP de Trello. Este spec sale de la descripción de la tarjeta y de la p.12.

## 1. Objetivo

La pantalla principal del alumno: abre la app en el gimnasio y ve qué le toca hoy, con o sin internet. Es la primera pantalla offline-first de la app y deja armado el patrón (Room → UI, refresh en segundo plano) que después usa el S3.

**Criterio de aceptación (de la tarjeta):** el alumno abre la app en modo avión y ve la rutina de hoy con sus ejercicios completos. El entrenador cambia la rutina, el alumno reconecta y la ve actualizada sin reinstalar nada.

## 2. Decisiones tomadas

- **Endpoint nuevo `GET /routines/mine` en vez de usar `/routines/today`.** `/today` devuelve `null` tanto en día de descanso como sin rutina asignada, y cachear solo "la de hoy" falla offline cuando cambia el día (se abrió el lunes, se usa el martes sin señal). Mobile guarda todas las rutinas activas con sus `days` y resuelve el día en el teléfono. `/today` queda como está para la web.
- **El día se resuelve con la zona horaria del teléfono.** El bug de zona horaria de `dayName` del backend (PR #2) no afecta a mobile.
- **Alcance del mockup (p.12):**
  - entra: encabezado con fecha y saludo, tira semanal con los días de entrenamiento y hoy resaltado, tarjeta de la rutina con ejercicios / series / minutos estimados, lista de ejercicios, hoja de detalle por ejercicio, indicador de conexión;
  - "Empezar" se ve pero está **deshabilitado**, con el texto "Disponible con el registro de sesiones" (la sesión activa es del S3);
  - queda afuera: racha y marcas de días hechos (dependen de `sessions`, sin endpoints todavía), nota general del PT (no hay columna; sí se muestran las `notes` de cada ejercicio).
- **Videos:** solo se guarda `video_url`. Con red, el botón de video abre el link; sin red, no aparece. Videos offline quedan fuera (tarjeta 9 o corte).
- **Refresh sin WorkManager:** al entrar a la pantalla y al volver la app al frente, al recuperar la red con la app abierta y con pull-to-refresh. WorkManager queda para las subidas del S3.
- **Room versión 2 con migración destructiva.** Es solo caché y todavía no hay usuarios reales.
- **Al cerrar sesión se borra la caché de rutinas,** para que otro alumno en el mismo teléfono no vea la anterior.
- **Prueba sin la web:** la web de rutinas es de Pablo y no existe todavía. El cambio de rutina se simula con `PATCH /api/routines/:id` o `POST /api/routines/:id/exercises` con el token del entrenador de prueba.

## 3. Backend: `GET /api/routines/mine`

| | |
|---|---|
|Rol|`student` (con `requireRole('student')`; va antes de `/:id` en el router)|
|Query / body|ninguno|
|Respuesta 200|`{ data: [ { routine_id, name, goal, days, created_at, exercises: [...] } ] }`, ordenado por `created_at` descendente; `[]` si no tiene rutinas activas|
|Ejercicio|la misma forma que en `/today`: `{ routine_exercise_id, exercise: { id, name, muscle_group, equipment, video_url }, sets, reps, rest_seconds, suggested_kg, tempo, notes, order_index }`, ordenados por `order_index`|
|Errores|401 sin token; 403 si no es alumno|

- **Capas:** ruta → `routinesController.mine` → `routinesService.mine(studentId)` → `repository.findActiveRoutinesForStudent(studentId)` → modelo `toStudentRoutines(rows)` (reusa `mapRoutineExercises`).
- **Ownership:** el filtro es `student_id = req.user.id` y `active = true`. El alumno no puede pedir rutinas de otro: no hay parámetro.
- **Envoltura de la respuesta:** `{ data }`, igual que `/today` y el resto del módulo.
- **README:** se agrega a la tabla de Endpoints de `backend/README.md` y a "Desvíos respecto del contrato de API (Notion v1.1)". Para la web: nada que hacer, es solo de mobile.

## 4. Mobile: datos

### 4.1 Room (versión 2)

- `RoutineEntity`: `id` (PK), `name`, `goal`, `days` (lista guardada como texto con un `TypeConverter`), `createdAt`.
- `RoutineExerciseEntity`: `id` (PK, `routine_exercise_id`), `routineId` (FK → `RoutineEntity`, `onDelete = CASCADE`, con índice), `exerciseId`, `name`, `muscleGroup`, `equipment`, `videoUrl`, `sets`, `reps`, `restSeconds`, `suggestedKg`, `tempo`, `notes`, `orderIndex`. Los datos del ejercicio van desnormalizados en la fila; una tabla de ejercicios aparte se decide en la tarjeta 9.
- `RoutineSyncEntity`: una sola fila con `lastSyncedAt`. Su ausencia significa "nunca sincronizó".
- `RoutineDao`:
  - `observeRoutines(): Flow<List<RoutineWithExercises>>` (`@Relation`);
  - `observeLastSync(): Flow<Long?>`;
  - `replaceAll(routines, exercises, syncedAt)` en una `@Transaction`: borra todo, inserta y guarda la hora;
  - `clear()` para el logout.
- `fallbackToDestructiveMigration` de 1 → 2. Se exporta el schema v2.

### 4.2 Red

- `RoutineApi` (Retrofit): `GET routines/mine` → DTOs `StudentRoutineDto` / `RoutineExerciseDto` / `ExerciseDto`.
- `ConnectivityObserver` (`data/network/`): `Flow<Boolean>` con `ConnectivityManager.registerDefaultNetworkCallback`, valor inicial leído al suscribirse y `distinctUntilChanged`. Se provee por Hilt.

### 4.3 `RoutineRepository` (`data/routine/`)

- `observeToday(): Flow<TodayContent>` combina las rutinas de Room, `lastSyncedAt` y un flujo con la fecha de hoy. Nunca llama a la red.
- `refresh(): RefreshResult` (`Ok` / `Failed(DataError)`) llama a `/routines/mine`, mapea y hace `replaceAll`. Si falla, Room queda como estaba.
- `clear()`: lo llama el flujo de logout existente.
- **Resolución del día:** función pura `resolveToday(routines, date, everSynced): TodayContent`.
  - `Training(routine, exercises)`: entre las rutinas activas cuyo `days` incluye el día de `date`, la de `createdAt` más reciente (la misma regla que el backend).
  - `Rest(routine, nextDay)`: hay rutinas pero ninguna incluye hoy; `nextDay` es el próximo día de la semana con entrenamiento.
  - `NoRoutine`: sincronizó al menos una vez y no hay rutinas activas.
  - `NeverSynced`: nunca sincronizó (y por lo tanto no hay datos).
- **Días:** el backend usa los nombres en inglés en minúscula (`monday` … `sunday`). Se mapean a `java.time.DayOfWeek`; un valor desconocido se ignora.

## 5. Mobile: pantalla

### 5.1 `TodayViewModel`

- `UiState`: `content: TodayContent`, `isOffline: Boolean`, `lastSyncedAt: Instant?`, `isRefreshing: Boolean`, `studentName: String` (de la sesión), `today: LocalDate`.
- **Disparadores del refresh:**
  - al crearse y cada vez que la app vuelve al frente (`Lifecycle.Event.ON_START`, que además recalcula la fecha si pasó la medianoche);
  - cuando `ConnectivityObserver` pasa de `false` a `true`;
  - pull-to-refresh.
- **Deduplicación:** si hay un refresh en curso, los disparadores nuevos se ignoran (un `Job` activo o un `Mutex.tryLock`).
- **Errores:**
  - un error de red o un 5xx en un refresh automático no se muestra: se ven los datos de Room y, si no hay red, el indicador;
  - un 401 lo maneja el `Authenticator` existente; si la renovación falla, la sesión se cierra como ya pasa hoy;
  - solo el pull-to-refresh manual muestra un aviso suave ("No pudimos actualizar. Mostrando tu última rutina") si falla.

### 5.2 Composición (`ui/today/`, componentes en `ui/today/components/`)

- `TodayScreen`: encabezado (fecha en mayúsculas tipo "MARTES · 22 OCT", "Hola, {nombre}"), indicador de conexión ("Sin conexión — mostrando tu última rutina", discreto, sin rojo), pull-to-refresh y el contenido según el estado.
- `WeekStrip`: L M X J V S D, con los días de entrenamiento de la rutina mostrada marcados y hoy resaltado. No marca días hechos.
- `RoutineHeroCard`: nombre de la rutina, "N EJERCICIOS · ~M MIN · S SERIES", CTA "Empezar" deshabilitado con su texto.
- `ExerciseRow`: nombre, "series×reps · músculo", toque de 44 dp o más; abre el detalle.
- `ExerciseDetailSheet` (`ModalBottomSheet`): series, reps, kg sugeridos, tempo, descanso, notas del PT y botón "Ver video" (solo con `videoUrl` y con red; abre un `Intent.ACTION_VIEW`).
- `RestState` ("Hoy descansás. Tu próximo entreno es el {día}"), `NoRoutineState` ("Tu entrenador todavía no te asignó una rutina. Escribile para arrancar"), `NeverSyncedState` ("Conectate una vez para descargar tu rutina").
- La pestaña `student/today` de `RoleTabs.kt` deja de ser placeholder y apunta a `TodayScreen`.
- **Estilo:** tema oscuro, azul `#2952D9`, tipografías del tema (Space Grotesk / Inter / JetBrains Mono para los metadatos), áreas de toque de 44 dp o más.

### 5.3 Textos derivados

- **Minutos estimados:** suma por ejercicio de `sets × (45 s + rest_seconds)`; si falta `rest_seconds` se usan 60 s y si falta `sets`, 1. El total se redondea al múltiplo de 5 más cercano.
- **Series totales:** suma de `sets` (los nulos cuentan 0).
- **Músculo:** `muscle_group` traducido (chest → Pecho, back → Espalda, shoulders → Hombros, legs → Piernas, glutes → Glúteos, biceps → Bíceps, triceps → Tríceps, core → Core, calves → Gemelos, full_body → Cuerpo completo, cardio → Cardio). Un valor desconocido se muestra tal cual.
- **Reps nulas:** se muestra solo "N series".

## 6. Tests

- **Backend** (`npm run lint` y `npm test`):
  - service `mine`: alumno con 0, 1 y 2 rutinas activas; ejercicios ordenados por `order_index`;
  - el repository filtra por `student_id` y `active`.
- **Mobile** (`gradlew checkFileLength assembleDebug testDebugUnitTest`):
  - `resolveToday`: los cuatro estados, empate de días entre dos rutinas (gana la más reciente), próximo día de entrenamiento cruzando el domingo, día desconocido ignorado;
  - textos derivados: minutos con y sin descanso, series, traducción de músculos;
  - repositorio con API falsa y Room en memoria: el refresh reemplaza todo (una rutina desactivada desaparece), un error no borra la caché, `clear()` deja `NeverSynced`;
  - ViewModel: refresh al iniciar, al reconectar y manual; deduplicación; `isOffline`; aviso solo en el refresh manual fallido.

## 7. Prueba del criterio de aceptación

En el emulador (no hace falta cámara), con el backend de `feature/routines-mine` corriendo y la alumna y el entrenador de prueba:

1. Login como alumna con red: se ve la rutina de hoy.
2. Modo avión y reabrir la app: se ve igual, con el indicador de sin conexión.
3. Con el token del entrenador, `PATCH /api/routines/:id` (cambiar el nombre) o `POST /api/routines/:id/exercises`.
4. Quitar el modo avión con la app abierta: la pantalla se actualiza sola.
5. Cambiar los `days` para que hoy no toque: se ve el estado de descanso con el próximo día.
6. Desactivar la rutina (`active: false`): se ve "todavía no te asignó una rutina".
7. Cerrar sesión y entrar con otro usuario: no aparece la rutina anterior.

## 8. Fuera de alcance

- Racha y marcas de días hechos.
- Nota general del PT.
- Iniciar la sesión de entrenamiento (S3).
- Videos offline.
- Refresh periódico con WorkManager.
- Mensaje mobile para `ACCOUNT_DISABLED` (queda para la próxima tarjeta que toque el login).

**Estimación:** 13–15 h (backend 1–2 h, datos y sync 5 h, UI 5 h, tests y prueba 2–3 h).

---

## Relacionado

- [[tarjetas|Índice de tarjetas]]
- [[superpowers/plans/2026-10-17-rutina-del-dia|Plan]]
- [[superpowers/specs/2026-10-15-onboarding-qr-design|Sale de: onboarding QR]]
- [[producto/casos-de-uso|Casos de uso (CU-04, CU-05)]]
- [[arquitectura/contratos-api|Contratos de API]]
- [[arquitectura/modelo-de-datos|Modelo de datos]]
