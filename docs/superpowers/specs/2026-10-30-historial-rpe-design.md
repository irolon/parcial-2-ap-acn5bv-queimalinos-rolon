---
tags: [spec]
tarjeta: 12
---
# Spec — Historial de sesiones y feedback post-entreno en mobile

- **Tarjeta:** [35 del tablero de equipo](https://trello.com/c/r0It9lo1) (12 del tablero personal de Igna). Requisitos AL-06 y AL-08; casos de uso CU-16 y CU-17.
- **Fecha:** 2026-10-30
- **Rama:** `feature/android-historial`, sale de `develop` (ya trae la sincronización offline, PR #32, y el historial del backend, PR #33). Solo mobile; el backend no se toca.
- **Reglas que aplican:** `AGENTS.md` (Room es la única fuente de verdad; escrituras offline-first; WorkManager para sincronizar) y `CONTRIBUTING.md` (200 líneas, capa → módulo → archivo).
- **Contrato:** `docs/arquitectura/contratos-api.md`, módulo Sesiones: `GET /students/:id/sessions`, `GET /students/:id/sessions/:sessionId` y `PATCH /sessions/:id` (`rpe` 1-10, `notes` hasta 1000).
- **Nombres:** como en las tarjetas 10 y 11, la sesión de entrenamiento se llama **workout** en el código. El historial es el mismo recurso `sessions`, así que va en subcarpetas `history/` dentro de `workout/` (excepción de nombre ya anotada en `CONTRIBUTING.md`).
- **Diseño:** sin mockup propio (solo figura en el mapa del sitio, p. 5). Se sigue el sistema de la app: tema oscuro, azul `#2952D9`, toque mínimo 44 px.

## 1. Objetivo

Cerrar el ciclo de la sesión:
- al terminar, el alumno deja cómo se sintió (RPE y nota) sin que eso lo frene;
- después puede revisar sus entrenamientos pasados, con las series y el comentario del entrenador, también sin conexión.

**Criterio de aceptación:**
- El alumno termina una sesión, califica el RPE y deja una nota, y el entrenador lo ve en la web.
- En modo avión, el alumno ve sus últimas sesiones con el detalle de las series y el comentario del PT.

## 2. Decisiones tomadas (debate del 30/10)

- **El historial vive en la pestaña Progreso**, que hoy es un placeholder. En la tarjeta 13 los gráficos se suman ahí mismo, con dos solapas: Historial y Gráficos.
- **RPE con botones del 1 al 10**, en dos filas de 5. Al tocar uno aparece su etiqueta. La tarjeta pide etiquetas porque un número suelto no le dice nada a un principiante.
- **El feedback se saltea con un toque.** Si fuera obligatorio, los alumnos dejarían de cerrar la sesión y se perdería el entrenamiento entero.
- **Offline: las últimas 20 sesiones con su detalle.** "Ver más" trae las anteriores solo con red.
- **Enfoque A:** tablas de caché propias para el historial (`history_*`), separadas de las de la sesión activa. La lista suma arriba las sesiones del celular que el servidor todavía no tiene. Se descartó guardar el historial en `workout_sessions` / `workout_sets`: les faltan campos (plan, récords, comentario) y el worker de subida podría tomarlas como pendientes.
- **El feedback viaja en la subida de la tarjeta 11.** Si la sesión no subió, va en el `POST /sessions`; si ya subió, en un `PATCH /sessions/:id`. Se descartó frenar la subida hasta que el alumno guarde o saltee: si cierra la app en la pantalla final, la sesión no subiría.
- **Fuera de alcance:** editar el RPE después desde el historial (§8).

## 3. Datos: Room v7 → v8

Migración automática v6 → v7, sin pérdida de datos. `7.json` exportado. La base termina en **v8**: la migración automática v7 → v8 solo agrega `history_comment_seen` (§9); `8.json` exportado.

**`workout_sessions` (`data/db/workout/`) suma tres columnas:**
- `rpe` (`INTEGER`, nulo): 1 a 10.
- `notes` (`TEXT`, nulo): hasta 1000 caracteres, el límite del backend.
- `feedbackState` (`TEXT NOT NULL DEFAULT 'NONE'`):
  - `NONE`: no cargó feedback o lo salteó.
  - `PENDING`: guardado en el celular, falta subirlo.
  - `SYNCED`: el servidor lo tiene.
  - `REJECTED`: el servidor lo rechazó (400 o 404); no se reintenta.

**Tablas nuevas del historial (`data/db/workout/history/`):**

- **`history_sessions`**: el resumen del servidor, una fila por sesión.
  - Campos: `id` (PK), `ownerId`, `startedAt`, `finishedAt`, `durationMin`, `routineName`, `rpe`, `notes`, `trainerComment`, `hasModifications`, `sets`, `volumeKg`, `hasPr`, `inLatest`, `detailLoaded`.
  - `inLatest`: está entre las 20 más recientes del último refresco. "Ver más" la usa para no pisar las filas del refresco (§10).
  - `detailLoaded`: sus ejercicios y series ya están guardados.
  - Índice por (`ownerId`, `startedAt`).
- **`history_exercises`**: un ejercicio por sesión.
  - Campos: `sessionId` + `position` (PK compuesta), `exerciseName`, `originalExerciseName` (nulo si no hubo reemplazo), `plannedSets`, `plannedReps`, `plannedKg` (cada uno nulo), `isPr`.
  - `position` sigue el orden del servidor (el del primer `executed_at`).
- **`history_sets`**: las series de cada ejercicio.
  - Campos: `id` (PK, el del servidor), `sessionId`, `exercisePosition`, `setNumber`, `reps` (nulo), `kg` (nulo), `executedAt`.

`history_exercises` y `history_sets` dependen de `history_sessions` con `ON DELETE CASCADE`. `UserDataCleaner.clearUserData(ownerId)` borra el historial del dueño junto con lo demás.

## 4. Componentes

**Red (`data/api/SessionApi.kt`):**
- Suma `history(studentId, page, limit)`, `historyDetail(studentId, sessionId)` y `update(tag, id, body)` (`PATCH`, con `rpe` y `notes`).
- `CreateSessionRequest` suma `rpe` y `notes`.
- DTOs del historial según el contrato, con los nulos de la §"Campos que pueden ser null".

**Historial (`data/workout/history/`):**
- `HistoryRepository`:
  - `observe(owner)`: un `Flow` con la lista para la UI.
  - `observeDetail(owner, id)`: un `Flow` con el detalle.
  - `refresh(owner)`, `loadMore(owner, page)` y `loadDetail(owner, id)`.
- Cómo arma la lista `observe`:
  1. Primero, las sesiones terminadas de `workout_sessions` cuyo `id` no está en `history_sessions`. Llevan `pendingUpload = true` si su `syncState` no es `SYNCED`, y entonces la UI muestra "Sin subir". Los totales (series, volumen, duración) se calculan con sus series locales.
  2. Después, `history_sessions` por `startedAt` descendente y `id`.
  3. Si en `workout_sessions` hay feedback `PENDING` o `SYNCED` para una sesión, ese `rpe` y esa `notes` reemplazan a los del caché: con `SYNCED` el caché puede ser de antes del `PATCH`, hasta que un refresco lo traiga.
- `refresh`:
  1. `GET page=1, limit=20`.
  2. En una transacción: upsert de los 20 con `inLatest = true`. Se borran solo las filas del dueño que no vinieron y caen dentro de esa ventana (orden `startedAt` desc, `id` desc, hasta la más vieja que vino): se borraron en el servidor. Las más viejas (las de "Ver más") quedan hasta el logout; si el servidor no tiene más que esa página, o no trajo ninguna, se borran todas las que no vinieron. Un upsert no borra el detalle ya guardado (§10, decisión A).
  3. Detalle (`GET …/:sessionId`) de cada una de las 20 que sea nueva, que tenga `detailLoaded = false` o que haya cambiado `sets`, `volumeKg`, `hasPr`, `hasModifications` o `finishedAt` respecto del caché. Se pide de a una; cada detalle se guarda en su propia transacción (borra y vuelve a insertar sus ejercicios y series y marca `detailLoaded = true`).
  4. Si un detalle falla, lo ya guardado queda y el resto se intenta en el próximo refresco.
- `loadMore(page)`: `GET page=N, limit=20`, upsert con `inLatest = false` y sin detalle. Devuelve si hay más páginas (`meta.total_pages`).
- `loadDetail(id)`: para una sesión sin detalle (las de "Ver más"), lo pide y lo guarda.
- Las sesiones locales se ven en el detalle con sus series de `workout_sets` y el plan copiado al empezar (`workout_exercises`), sin récords ni comentario, que calcula el servidor. Tampoco muestran "en lugar de…": Room guarda el id del ejercicio original, no su nombre.

**Feedback (`data/workout/`):**
- `WorkoutRepository.saveFeedback(sessionId, rpe, notes)`: escribe `rpe`, `notes` (recortada; vacía pasa a nulo) y `feedbackState = PENDING`. Si no hay ni RPE ni nota, no escribe nada. Si la sesión ya estaba `FAILED` (el servidor la rechazó), el feedback queda `REJECTED`: no hay sesión a la que mandárselo.

**Subida (`data/sync/`), ampliación de la tarjeta 11:**
- `SessionUploader`: el `POST /sessions` lleva el `rpe` y la `notes` de la entidad leída. Devuelve qué feedback mandó.
- `SyncPass`:
  - **Al subir una sesión:** si el `POST` llevó feedback, marca `SYNCED` solo si `rpe` y `notes` en Room siguen iguales a los enviados (UPDATE condicional).
  - **Después de las sesiones:** recorre las `SYNCED` con `feedbackState = PENDING` y manda `PATCH /sessions/:id` con `rpe` y `notes`. Al terminar bien, el mismo UPDATE condicional.
- `SyncTrigger`: el conteo que observa pasa a ser sesiones pendientes + feedback pendiente. Guardar el feedback encola la subida.
- **Aviso de logout de la 11** (`SignOutSyncViewModel`): cuenta el feedback pendiente como pendiente.
- **Aviso de Hoy:** "N entrenamientos sin subir" sigue contando solo sesiones.

**Pantallas (`ui/workout/` y `ui/workout/history/`):**
- `FeedbackForm`, dentro de `WorkoutSummaryView`: botones del RPE, etiqueta, nota, Guardar y Saltar. El estado lo maneja un `FeedbackViewModel`.
- `HistoryScreen` + `HistoryViewModel`: la lista, en la ruta de la pestaña Progreso.
- `HistoryDetailScreen` + `HistoryDetailViewModel`: el detalle, en una ruta nueva con el `id` de la sesión.
- `HistoryTexts`: etiquetas del RPE y formatos de fecha, duración y volumen.

## 5. Errores y reintentos

**Feedback (`PATCH` y `POST`):** los mismos criterios que la tarjeta 11.

| Caso | Qué pasa |
|---|---|
| Red, timeout, 5xx, respuesta ilegible | `RETRY`: la pasada se reintenta con backoff |
| 401 con la sesión todavía abierta | Refresh pasajero: `RETRY` |
| 401 con la sesión cerrada, 403 o cambio de cuenta | Queda `PENDING` hasta que vuelva su dueño |
| 400 o 404 en el `PATCH` | `REJECTED`: no se reintenta. No debería pasar (la sesión existe y los valores se validan en el celular) |

**Historial (pantalla):**

| Situación | Qué ve el alumno |
|---|---|
| Abre Progreso sin red | Lo guardado, más el aviso "Sin conexión · mostrando lo guardado" |
| Sin red y nunca bajó nada | "Conectate una vez para ver tu historial", más las sesiones del celular si hay |
| Falla el refresco (5xx) | Lo guardado, más "No pudimos actualizar el historial" con Reintentar |
| "Ver más" sin red | Snackbar "Necesitás conexión para ver sesiones anteriores" |
| Detalle no guardado y sin red | "El detalle de esta sesión se ve con conexión", con el resumen a la vista |
| Falla guardar el feedback en Room | Snackbar "No pudimos guardar. Probá de nuevo"; Saltar sigue andando |

## 6. Pantallas

**A. Feedback en "¡Bien ahí!" (`WorkoutSummaryView`)**
- Debajo de "Sesión terminada · N series · M min": **"¿Qué tan dura fue?"** y los botones del 1 al 10 en dos filas de 5. El elegido se resalta con el azul de marca, y abajo aparece su etiqueta.
- **Etiquetas** (escala RPE con repeticiones en reserva):

  | RPE | Etiqueta |
  |---|---|
  | 1 | Muy fácil, como entrar en calor |
  | 2 | Fácil |
  | 3 | Liviano, podías seguir un rato largo |
  | 4 | Moderado |
  | 5 | Algo exigente, te quedaban 5 o más reps |
  | 6 | Exigente, te quedaban 4 reps |
  | 7 | Difícil, te quedaban 2-3 reps |
  | 8 | Muy difícil, te quedaban 1-2 reps |
  | 9 | Casi al fallo, te quedaba 1 rep |
  | 10 | Al fallo, no salía ni una más |

- **Nota (opcional):** un campo de varias líneas, de hasta 1000 caracteres.
- **Guardar:** habilitado si eligió RPE o escribió algo. Guarda y vuelve a Hoy.
- **Saltar:** un botón de texto. Vuelve a Hoy sin guardar. El gesto de atrás hace lo mismo.
- La línea de subida de la tarjeta 11 queda igual.

**B. Progreso → historial (`HistoryScreen`)**
- **Una card por sesión:**
  - fecha ("Jue 29 oct") y rutina ("Sin rutina" si es nula);
  - "54 min · 18 series · 4.210 kg";
  - RPE si hay, 🏆 si `hasPr` y 💬 si hay comentario del PT.
  - Las del celular sin subir llevan **"Sin subir"**.
- **Deslizar hacia abajo** refresca. Al final, **"Ver más"** cuando `meta.total_pages` indica que hay más.
- **Estado vacío:** "Todavía no hay entrenamientos. Cuando termines el primero, aparece acá".

**C. Detalle (`HistoryDetailScreen`)**
- **Encabezado:** fecha, rutina, duración, volumen, el RPE con su etiqueta y la nota del alumno.
- **Comentario del entrenador:** en una card destacada con el azul de marca. Si no hay, no se muestra nada.
- **Por ejercicio:**
  - el nombre ("en lugar de X" si hubo reemplazo) y 🏆 si `isPr`;
  - "Plan: 4 × 10 · 60 kg", si hay plan;
  - las series ("S1 · 62,5 kg × 10"; sin kg: "S1 · 10 reps").

## 7. Pruebas

**Unitarias (JVM, con fakes):**
- **`HistoryRepository`:**
  - el refresco guarda 20 y borra las de "Ver más";
  - pide el detalle solo de las nuevas, cambiadas o sin detalle;
  - si falla un detalle, conserva lo ya guardado;
  - "Ver más" guarda sin detalle y dice si hay más;
  - la lista combina las sesiones locales (con y sin "Sin subir") con el caché, sin duplicar;
  - el feedback `PENDING` local le gana al caché.
- **`SessionUploader` / `SyncPass`:**
  - el `POST` lleva `rpe` y `notes`;
  - el `PATCH` sale para las ya subidas;
  - la carrera (feedback guardado durante el `POST`) termina en `PATCH`;
  - el UPDATE condicional no pisa un valor nuevo;
  - 400/404 → `REJECTED`; red → `RETRY`; cambio de cuenta → `PENDING`.
- **`SyncTrigger`:** guardar feedback encola.
- **ViewModels:**
  - feedback: Guardar habilitado, guardar, saltar, error de Room;
  - historial: sin red, sin datos, error, "Ver más";
  - detalle: con detalle, sin detalle y sin red, sesión local.
- **Textos:** las 10 etiquetas y los formatos de fecha, duración y volumen.

**Instrumentadas:**
- Migración v6 → v7 con `runMigrationsAndValidate`.
- DAO del historial sobre Room real: cascade, limpieza por `ownerId`, orden de la lista.
- Compose:
  - el RPE muestra la etiqueta al tocar;
  - Saltar vuelve sin guardar;
  - el detalle muestra el comentario del PT y "en lugar de …".

**E2E manual (criterio de aceptación, emulador + web):**
1. Terminar una sesión con RPE 7 y una nota → se ven en la web, en el detalle de la sesión.
2. Comentar esa sesión desde la web → refrescar Progreso → 💬 en la card y el comentario en el detalle.
3. Modo avión → Progreso muestra las últimas sesiones con series y comentario.
4. En modo avión, terminar otra sesión y saltear el feedback → aparece arriba con "Sin subir"; al volver la red sube y el próximo refresco la trae del servidor.

## 8. Fuera de alcance

- Editar el RPE o la nota desde el historial.
- Gráficos de progreso (tarjeta 13).
- Refresco del historial en segundo plano o por notificación cuando el entrenador comenta.
- Borrar sesiones del historial.

## 9. Agregados durante el E2E (31/10, pedidos por Igna)

- **Aviso de comentarios nuevos del entrenador.**
  - Badge rojo con el número de comentarios sin leer sobre la pestaña Progreso (corrido para no tapar la estrella) y sobre el chip "Comentados 💬".
  - La card muestra "💬 Nuevo" hasta abrir el detalle.
  - Los leídos se guardan en `history_comment_seen` (Room v8, solo agrega esa tabla); un comentario editado vuelve a contar como nuevo.
  - El historial también se refresca al abrir o volver a la app, con red y como mucho cada 5 minutos.
- **El spinner no espera los detalles.** El refresco se separa en dos fases: la lista (20 sesiones) y después los detalles en segundo plano. "Ver más" queda deshabilitado mientras bajan.
- **Título y filtros.**
  - Título "Progreso" con el resumen de la semana ("Esta semana: N entrenamientos · duración · volumen").
  - Chips **Esta semana** (por defecto; desde la PR #40, solo si hay sesiones esta semana, §10), **Todos**, **Comentados 💬** (no leídos primero), **Récords 🏆** y **Sin subir** (solo si hay).
  - Los filtros trabajan sobre lo guardado y funcionan offline; "Ver más" solo aparece con Todos.
- **Fuera de esta tarjeta:** el descanso ajustable por el alumno y registrado en el historial ([tarjeta aparte](https://trello.com/c/dwQI3sGR), depende del backend).

## 10. Decisiones de la revisión de Pablo en la PR #40 (31/10)

- **A. El refresco no borra las sesiones de "Ver más".** Solo borra las que caen dentro de la ventana de las 20 que trajo el servidor y no vinieron. Si el servidor tiene menos de una página completa, o ninguna sesión, se borran todas las que no vinieron. Las de "Ver más" quedan hasta el logout. Después de cada refresco, "Ver más" vuelve a la página 2, porque las posiciones pudieron correrse. Un toque re-pide las páginas: actualiza las que ya estaban fuera de las 20 y, si una página no suma ninguna sesión nueva, sigue con la siguiente hasta traer alguna o llegar al final. "Hay más" sale de las páginas que dice el servidor, no de lo guardado (ronda 3, hallazgos H3 y H4 de Codex). Un detalle que llega para una sesión que ya no está en el caché no se escribe. Si ninguna de las 20 que vinieron estaba guardada (entraron más de 20 nuevas), se borran todas las que no vinieron, porque podría quedar un hueco. `inLatest` marca de quién es cada fila: las de las 20 las actualiza el refresco; las demás, "Ver más", que actualiza su resumen (por ejemplo, un comentario nuevo del entrenador) y vuelve a bajar el detalle solo si el resumen cambió.
- **B. El badge refresca al abrir la app en frío.** El dueño se espera dentro del pedido, porque la sesión todavía no salió de DataStore en el primer `onAppStart`.
- **C. "No se pudo subir".** Una sesión del celular que el servidor rechazó (`FAILED`) lleva esa marca, en la tarjeta y en el detalle, con el color de error. No cuenta para el chip "Sin subir".
- **D. Filtro por defecto.** Arranca en "Esta semana" si hay sesiones esta semana y en "Todos" si no. Se decide una vez, con la primera lista no vacía; hasta entonces muestra "Todos". Si el alumno cambia el filtro a mano, se respeta.
- **Menores.**
  - Un RPE fuera de 1-10 no muestra etiqueta ni rompe la pantalla.
  - La duración de las sesiones del celular redondea como el backend.
  - El aviso de logout dice "Comentarios sin subir" o "Datos sin subir" cuando corresponde.
  - "Subir ahora" devuelve las dos señales por separado: lo que quedó pendiente y si hubo un rechazo nuevo. El logout ofrece "Reintentar" si queda algo pendiente y avisa también el rechazo. En Hoy, lo pendiente no se muestra como rechazado.
  - Accesibilidad: descripción del badge, "Ver detalle" en la tarjeta y los RPE como grupo de selección única.
  - Un pull durante la bajada de los detalles muestra el spinner y refresca una vez al terminar.

