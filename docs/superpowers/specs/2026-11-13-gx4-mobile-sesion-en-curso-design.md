# GX4 en el celular · Abrir la sesión al empezar y "En curso" para el PT (GX4-M1 y GX4-M2) · diseño

Tarjetas del tablero del equipo:
- [GX4-M1] Abrir la sesión al empezar y borrarla al descartar: https://trello.com/c/q7T5l5GO
- [GX4-M2] "En curso" en el Inicio y en Alumnos del PT: https://trello.com/c/qTbuoP0h

Las pide Pablo (09/11) para que la GX4 quede completa en los dos clientes. Spec del backend y la web: `2026-11-09-gx4-sesion-en-curso-design.md`, la #110, ya mergeada en develop (`1dd14d53`). El contrato está en `contratos-api.md`: `POST /sessions` sin `finished_at`, `DELETE /sessions/:id`, `in_session` del overview y `open_session` de `GET /students`.

## Intención

- **Para qué.** Que el PT vea en el celular quién está entrenando ahora, igual que en la web, y que las sesiones que el alumno empieza en el celular también aparezcan "En curso", en la web y en el celular del PT.
- **Una sola rama y una sola PR**, `feature/android-gx4-sesion-en-curso`, con base `develop`. Igual que la GX8. **Decisión de Claude**, Igna no la objetó.

## Objetivos

### M1 · Del lado del alumno: abrir al empezar y borrar al descartar

- **Al empezar una sesión nueva** (`WorkoutRepository.start`, cuando no hay una activa y se crea el `Workout` con su UUID): un `POST /sessions` con `id`, `routine_id` y `started_at`, y `finished_at` en null (sin `rpe` ni `notes`).
  - Es **"si se puede"**: sin red, con error o sin sesión del usuario no pasa nada, no se reintenta ni se encola. La subida final (`SessionUploader`) la crea como hoy.
  - Va en segundo plano con el alcance de la app (`@ApplicationScope`), así que no frena el arranque ni depende de la pantalla.
  - **No se manda al retomar** una sesión que ya estaba activa: solo cuando `start` crea una nueva.
- **Al descartar** (`WorkoutRepository.discard`) **o al terminar sin series** (`finish` con `sets` vacío, que hoy hace `dao.deleteSession`): un `DELETE /sessions/{id}`, también "si se puede".
  - Un 404 cuenta como que salió bien: nunca se abrió en el servidor, o ya no está.
  - **Si la apertura de esa misma sesión sigue en vuelo, el borrado espera a que termine**, igual que la web. Si no, el DELETE podría llegar antes que el POST y la sesión quedaría huérfana "En curso" hasta 4 h.
- **El cierre no cambia.** La subida final repite el `POST /sessions` con el mismo id y el backend completa `finished_at`, `rpe` y `notes` (reintento idempotente). `SessionUploader`, `SyncPass` y el worker quedan como están.
- Se agrega `@DELETE("sessions/{id}")` a `SessionApi.kt`, con el mismo `@Tag RequiredUser` que el POST.
- **Una apertura que llega tarde no reabre la sesión.** Si el alumno termina con series mientras la apertura sigue en vuelo, la subida final puede llegar primero. La apertura que llega después encuentra la sesión ya cerrada: `applyRetry` del backend solo completa campos en null y nunca pisa `finished_at`, así que responde 200 sin cambios. Si las dos llegan a la vez, el 23505 vuelve a pasar por el mismo camino. Por eso `SessionUploader` no tiene que esperar la apertura. Lo verificó Claude en `sessions.service.js`.
- **Límite conocido (aceptado):** si el borrado no sale (sin red o con la app cerrada justo después de descartar), la sesión queda "En curso" para el PT hasta 4 h y después vence sola, igual que en la web. No se encola ni se reintenta. **Decisión de Claude**, coherente con el "si se puede" de la tarjeta.
  - En el celular "En curso" y "Entrenando ahora" salen de Room, así que **el celular también las vence a las 4 h** (`OpenSessionWindow.kt`, igual que `OPEN_SESSION_MAX_HOURS` del backend): sin red no se ve a nadie "entrenando" desde ayer. Lo marcó la revisión final.
  - Caso conocido: si el POST de apertura se corta por timeout pero el servidor lo procesa tarde, el DELETE puede llegar antes y la sesión queda huérfana; vence igual a las 4 h.

### M2 · Del lado del PT: "En curso"

- **Inicio** (`TrainerHomeScreen`):
  - Arriba de todo, antes de la tarjeta del día, una sección **"En curso"**. Lo pidió Igna, como en la web.
  - Un renglón por alumno de `in_session` (el backend ya da uno por alumno, del más nuevo al más viejo): **punto verde**, nombre, rutina (si hay) y "hace 12 min" con el `relativeTime` que ya existe.
  - Tocarlo abre la ficha del alumno.
  - **Sin nadie entrenando, la sección no aparece.**
- **El Inicio se refresca cada 60 s mientras está abierto**, como el Dashboard de la web (lo pidió Igna):
  - corta al salir de la pantalla y arranca de nuevo al volver;
  - sin red no pide, y no muestra errores por los refrescos automáticos;
  - el refresco al abrir y al tirar para abajo sigue igual.
- **Alumnos** (`StudentRow`):
  - con `open_session` no nulo, en lugar de la última sesión ("Hoy", "Hace N días"…) va un punto verde con **"Entrenando ahora"**;
  - **sin polling**: se refresca al volver a la pantalla, como hoy (`LifecycleStartEffect`) y como la web al volver a la pestaña.
- **Datos:**
  - **Overview:** `in_session` entra al DTO (`OverviewDto`) y al dominio (`TrainerOverview`). El overview se guarda en Room como JSON (`trainer_overview.dataJson`), así que **no hace falta migrar**.
  - **Lista de alumnos:** `open_session` entra al DTO (`StudentListItemDto`) y a Room. `TrainerStudentEntity` suma `openSessionStartedAt: Long?` (null si no tiene). El id de la sesión no se usa en el celular.
- **Room pasa de la v26 a la v27** con una `AutoMigration(26, 27)` (una columna que acepta null), el `27.json` y un test de migración.

## Lo que no se hace

- **"Actividad reciente"** (las sesiones terminadas recientes) en el Inicio del celular: la web la tiene, pero el celular nunca la mostró. Solo se agrega "En curso".
- **"Feedback pendiente":** el celular ya lo tiene en el filtro FEEDBACK (`lists.feedback_pending`).
- **Reintentar la apertura** si falló. Es "si se puede" por diseño.
- **Polling en Alumnos o en la ficha del alumno.**
- **"En curso" en la ficha del alumno.** No lo pide la tarjeta ni lo tiene la web.

## Lo que haría que salga mal aunque funcione

- **Que la apertura frene o rompa el arranque de la sesión.** Por ejemplo, un error visible al empezar sin red, o tener que esperar la red para entrenar.
- **Que una sesión del celular quede "En curso" para el PT después de descartarla,** o que se borre en el servidor una sesión que ya se subió terminada. El backend solo borra abiertas, pero el celular no tiene que mandar el DELETE de una que se terminó con series.
- **Duplicar la sesión, perder series o perder logros** al cerrar una que se abrió en el servidor.
- **Perder datos de Room al migrar.**
- **Que el refresco cada 60 s siga corriendo con la pantalla cerrada** o gaste batería en segundo plano.

## Restricciones

- **Reglas de AGENTS.md:**
  - Room es la única fuente de verdad;
  - ningún archivo pasa de 200 líneas (`FitTrainerDatabase.kt` tiene 196, `WorkoutViewModel.kt` 199 y `WorkoutScreen.kt` 193);
  - orden capa → módulo → archivo, con los tests copiando el árbol;
  - `gradlew checkFileLength assembleDebug testDebugUnitTest`, más `connectedDebugAndroidTest` para la migración, si hay emulador.
- **Las escrituras del alumno siguen siendo offline-first.** La apertura y el borrado son avisos al servidor "si se puede", no escrituras de datos del alumno: la sesión y sus series viven en Room y se suben con WorkManager como hoy.
- **El contrato es el de la #110.** El celular no lo cambia.

## Decisiones de Claude (para que Igna las revise)

1. **Dónde vive la apertura y el borrado:** un componente nuevo en `data/workout/` (por ejemplo, `OpenSessionNotifier`) con `open(workout)` y `close(id)`. Lo usa `WorkoutRepository`, guarda los trabajos en vuelo por id para que el borrado espere a la apertura, y corre en `@ApplicationScope`. `WorkoutViewModel` (199 líneas) no se toca.
2. **Sin sesión del usuario** (la apertura sin token daría 401 y dispararía la renovación): solo se manda si hay un alumno logueado. Es el equivalente del `shouldSend` de la web.
3. **El punto verde** es un composable chico y reutilizable (`LiveDot`), con el `FtColors.Green` que ya usan "hecho" y "confirmado". Sin animación.
4. **La sección "En curso"** usa el mismo estilo de renglón que las listas del Inicio (`HomeRow`).
5. **El refresco de 60 s** se hace en el ViewModel del Inicio con un bucle que vive mientras la pantalla está empezada (`onStart` / `onStop`). Si el ViewModel pasa de 200 líneas, el bucle va a un archivo propio.

## Lo que queda a criterio del que construye

- Nombres internos y cómo partir archivos, bajo la regla de las 200 líneas.
- El orden exacto entre la sección "En curso" y el encabezado del Inicio, siempre que "En curso" quede arriba de la tarjeta del día.

## Pruebas

- **Unitarias:**
  - El componente de apertura:
    - abre con `finished_at` null;
    - si falla, no lanza;
    - sin usuario, no pide;
    - el borrado espera la apertura en vuelo;
    - el 404 del borrado cuenta como éxito.
  - `WorkoutRepository`:
    - `start` de una nueva abre;
    - `start` con una activa no abre;
    - `discard` borra;
    - `finish` sin series borra;
    - `finish` con series no borra.
  - El mapper del overview con y sin `in_session`, y el del alumno con y sin `open_session`.
  - Los textos: "Entrenando ahora" y el renglón de "En curso".
  - `TrainerHomeViewModel`:
    - refresca cada 60 s con la pantalla empezada;
    - deja de hacerlo al pararla;
    - no muestra errores por los refrescos automáticos.
- **Instrumentada:** el test de migración de v26 a v27, si hay emulador.
- **En el celular:**
  - el alumno empieza en el celular y el PT lo ve "En curso" en la web y en el celular en menos de 60 s;
  - al descartar desaparece;
  - al terminar pasa a la actividad normal;
  - sin red, al empezar no se ve nada y la subida final funciona como hoy.
