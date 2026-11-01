---
tags: [spec]
tarjeta: 10
---
# Spec — Sesión activa + timer de descanso en mobile

- **Tarjeta:** "10 · Pantalla de sesión activa + timer de descanso en mobile" (tablero personal de Igna) → tarjeta de equipo https://trello.com/c/WgQacbkv
- **Fecha:** 2026-10-17
- **Rama:** `feature/android-sesion-activa`, sale de `feature/android-biblioteca` (usa la biblioteca en Room de la tarjeta 9 para "Reemplazar"). Solo mobile; el backend no se toca.
- **Reglas que aplican:** `AGENTS.md` (Room es la única fuente de verdad; escrituras offline-first con UUID del cliente y `executed_at` real) y `CONTRIBUTING.md` (200 líneas, capa → módulo → archivo).
- **Diseño:** Guía Mobile p.13 (03 Sesión activa) y p.14 (04 Timer de descanso).
- **Nombres:** en el código la sesión de entrenamiento se llama **workout** (`data/workout/`, `ui/workout/`, `WorkoutRepository`, `WorkoutService`), porque `data/session/` ya es la sesión de login. En la UI dice "sesión".

## 1. Objetivo

La pantalla donde el alumno entrena: recorre los ejercicios de la rutina del día, registra peso y reps de cada serie con uno o dos toques y descansa con un timer que suena aunque el celular esté bloqueado. Se usa con una mano, de pie, entre series: botones grandes, cifras de 72 px y nada de scroll para completar una serie.

**Criterio de aceptación (de la tarjeta):** el alumno completa una rutina de 5 ejercicios × 4 series sin salir de la pantalla. El timer suena con el celular bloqueado. Cierra la app a mitad de sesión, la reabre y retoma donde estaba.

## 2. Decisiones tomadas (debate del 17/10)

- **Reemplazar ejercicio entra** en esta tarjeta. Se elige de la biblioteca en Room (tarjeta 9), así que anda offline.
- **Timer con foreground service** y notificación fija mientras dura la sesión. Se descartó `AlarmManager` porque en Android 14 el permiso de alarmas exactas viene apagado.
- **La ✕ abre un menú** con tres opciones: Terminar sesión, Descartar sesión y Seguir entrenando. Desde el 31/10 es una hoja inferior en vez de un diálogo (ver "Menú de la ✕").
- **Precarga:**
  - la S1 arranca con lo que hizo la última vez en ese ejercicio (en este celular);
  - si nunca lo hizo, con el plan del PT;
  - las S2 en adelante arrancan con lo que confirmó en la serie anterior de hoy;
  - el plan del PT queda siempre en el chip "SUGERIDO".
- **Las sesiones no se suben en esta tarjeta.** Quedan en Room como `PENDING`; subirlas es la tarjeta 11, que necesita el endpoint de Pablo (§8).

## 3. Flujo y pantallas (`ui/workout/`)

**Entrada desde Hoy.**
- El CTA de `RoutineHeroCard` se habilita si la rutina del día tiene ejercicios: "Empezar".
- Si hay una sesión `ACTIVE` del alumno, dice "Continuar sesión". Esto aplica aunque la sesión sea de otra rutina o de otro día.
- Hay una sola sesión abierta a la vez.

**Sesión activa (p.13).**
- **Arriba:**
  - la ✕;
  - "EJERCICIO 3 / 6". Tocarlo abre la lista de ejercicios de la sesión para saltar a cualquiera. TalkBack lo anuncia como botón "Ver ejercicios";
  - el cronómetro de la sesión, que cuenta desde `startedAt`;
  - la barra de progreso con un segmento por ejercicio. Un segmento se llena cuando su ejercicio tiene todas las series hechas.
- **Tabs S1…Sn:**
  - las hechas muestran "kg·reps" y tocarlas permite corregirlas;
  - la actual se ve resaltada;
  - las que faltan se ven apagadas;
  - hasta 5 pestañas van repartidas en el ancho. Con más, la fila se desliza y sigue a la serie en pantalla, también al cambiar de ejercicio (aunque el número de serie sea el mismo).
- **Nombre del ejercicio** (`ExerciseHeading`): va debajo de S1…Sn, más grande que el resto. Igual que el contador, es tocable y abre la lista de ejercicios.
- **Chip:** "SUGERIDO · 70KG × 8" con el plan del PT. No se muestra si no hay `suggestedKg` ni `reps`.
- **Peso y reps:** en 72 px, precargados según §2.
  - Botones −2.5 / −1 / +1 / +2.5 / +5. Ajustan el peso, que nunca baja de 0.
  - El lápiz abre un diálogo con teclado numérico para escribir peso (decimal) y reps (entero).
- **CTA:** "Serie completa → descanso".
  - Guarda la serie y arranca el timer.
  - En la última serie de la rutina dice "Serie completa → terminar" y va al cierre.
  - Si se está corrigiendo una serie ya hecha, dice "Guardar corrección", no arranca el timer y vuelve a la serie en curso.
- **Abajo:**
  - "Técnica" abre `ExerciseDetailSheet` (tarjeta 9);
  - "Reemplazar" abre el selector;
  - "IA" se ve deshabilitado.

**Avance:**
- Después de la última serie de un ejercicio, el siguiente es el primer ejercicio, en orden, que tenga series sin hacer.
- Si no queda ninguno, va al cierre.

**Timer de descanso (p.14), a pantalla completa.**
- Arriba: "SERIE 3 · 70KG × 8 ✓".
- Al centro, un anillo de progreso con la cuenta en mm:ss y "DE 1:30".
- Botones:
  - "+15″" y "−15″": el descanso nunca baja de 0 y llegar a 0 lo termina;
  - "Pausar"/"Seguir";
  - "Saltar".
- Abajo, "PRÓXIMA SERIE · 4/4 · 70kg × 8 reps", o el primer set del ejercicio siguiente.
- Al llegar a 0 vuelve sola a la pantalla de la serie.
- Mientras dura el descanso, la pantalla no se apaga (`keepScreenOn`).

**Avisos en un snackbar** (sobre Técnica / Reemplazar; el último reemplaza al que esté a la vista):
- **Serie guardada:** al guardar una serie que no arranca un descanso, "Serie N guardada · kg × reps". Si arranca descanso no sale (el timer ya la muestra con ✓). Corregir una serie ya hecha tampoco lo dispara.
- **Fin del descanso:** ver §5.

**Reemplazar.**
- Abre una hoja con la biblioteca de Room filtrada por el grupo muscular del ejercicio. Los chips (`MuscleChips`) permiten cambiar de grupo.
- Se puede reemplazar **solo si el ejercicio no tiene series hechas en esta sesión**. Si ya tiene, el botón se ve apagado pero se puede tocar: un snackbar explica "No se puede reemplazar: ya registraste series de este ejercicio" (`REPLACE_LOCKED`). TalkBack lo anuncia como "No disponible".
- El reemplazo cambia la copia del plan de la sesión, nunca la rutina:
  - `exerciseId`, el nombre, el grupo muscular y el video pasan a ser los del nuevo ejercicio;
  - en `originalExerciseId` queda el ejercicio planificado;
  - las series, las reps, el descanso y el peso sugerido siguen siendo los del plan.
- Si la biblioteca nunca se sincronizó, la hoja muestra "Conectate una vez para bajar la biblioteca".

**Menú de la ✕.** Es una hoja inferior (decisión de Igna del 31/10, entre tres mockups; antes era un diálogo):
- Arriba, el título "¿Qué hacemos con la sesión?" y el progreso "Llevás X de Y series" (singular "serie" si el total es 1). Y es la suma de las series del plan y X las ya hechas.
- Las acciones, en este orden:
  1. **Terminar sesión**, en azul de marca;
  2. **Seguir entrenando**, en gris. Las dos tienen el mismo ancho, ícono y 44 dp de alto mínimo;
  3. **Descartar sesión**, como texto coral centrado abajo, lejos del pulgar.
- Cerrar la hoja (deslizarla o tocar afuera) equivale a Seguir entrenando. Las tres acciones primero cierran la hoja con su animación.
- **Terminar sesión:** si faltan series, primero confirma con "Te faltan N series, ¿terminar igual?". Después marca `finishedAt` y `status = FINISHED`.
- **Descartar sesión:** confirma con "Se borra todo lo de esta sesión" y después borra la sesión con su copia del plan y sus series.
- **Seguir entrenando:** cierra la hoja.
- Con el botón atrás o cambiando de app, la sesión sigue `ACTIVE`.

**Cierre.**
- Muestra "Sesión terminada · N series · M min" y el botón "Volver a Hoy".
- Si se termina sin ninguna serie, la sesión se descarta: no se guardan sesiones vacías.
- De vuelta en Hoy, el aviso "N entrenamientos sin subir" de la tarjeta 11 va debajo de la card de Semana (si no hay semana, arriba de todo). El detalle está en `2026-10-29-sync-offline-design.md`.

**Datos faltantes en la rutina:**
- `sets` null → 3;
- `reps` null → 10;
- `restSeconds` null → 90 s;
- `suggestedKg` null y sin historial → 0 kg.

## 4. Datos (`data/workout/`, `data/db/workout/`)

Room pasa a la **v4**, con `AutoMigration(3→4)`, su `4.json` y un caso nuevo en `FitTrainerDatabaseMigrationTest`. Los ids son UUID generados en el celular.

- **`WorkoutSessionEntity`** (tabla `workout_sessions`):
  - datos de la sesión: `id`, `ownerId`, `routineId`, `routineName`, `startedAt`, `finishedAt?`, `status` (`ACTIVE`/`FINISHED`), `syncState` (`PENDING`);
  - cursor: `currentPosition`, `currentSet`, `restEndsAt?`, `restTotalSeconds?`, `restPausedRemainingMs?`.
- **`WorkoutExerciseEntity`** (tabla `workout_exercises`), la copia del plan al empezar:
  - `sessionId`, `position`, `routineExerciseId`, `exerciseId`, `originalExerciseId?`;
  - `name`, `muscleGroup`, `equipment`, `description`, `videoUrl`;
  - `sets`, `reps`, `restSeconds`, `suggestedKg`.
  - La clave es (`sessionId`, `position`). Que Hoy refresque la rutina no la cambia.
- **`WorkoutSetEntity`** (tabla `workout_sets`):
  - `id`, `sessionId`, `position`, `exerciseId`, `originalExerciseId?`, `routineExerciseId?`;
  - `setNumber`, `actualKg`, `actualReps`, `executedAt`.
  - La clave única es (`sessionId`, `position`, `setNumber`). Corregir una serie actualiza `actualKg`/`actualReps` y conserva `id` y `executedAt`.

Los campos coinciden con `sessions` y `session_sets` del backend, así que la tarjeta 11 los sube sin transformar.

**`WorkoutDao`**, cada escritura en una transacción:
- **`start`:** crea la sesión y la copia del plan, y falla si ya hay una `ACTIVE` del mismo dueño;
- **`confirmSet`:** guarda la serie y mueve el cursor y el descanso, todo junto;
- **`updateCursor`**, **`updateRest`**, **`replaceExercise`**, **`finish`** y **`discard`**;
- **`observeActive(ownerId)`:** un `Flow` de la sesión con su plan y sus series;
- **`lastSetFor(ownerId, exerciseId)`:** la última serie de ese ejercicio en sesiones `FINISHED`, ordenada por `executedAt`.

**`WorkoutRepository`:**
- es la única entrada desde la UI;
- recibe un `Clock` inyectable para los tests;
- arma el plan desde `RoutineRepository` y los ejercicios de reemplazo desde `LibraryRepository`.

**Logout.**
- Estas tablas **no** se registran como `UserDataCleaner`: son entrenamientos del alumno sin subir, no un caché.
- Todo se filtra por `ownerId`, así que otro alumno en el mismo celular no ve nada ajeno.
- Si hay una sesión `ACTIVE` al tocar "Cerrar sesión", `AccountMenuScreen` pregunta "Tenés una sesión en curso" y da dos opciones: "Terminarla y salir" o "Cancelar".

**Lógica pura (`ui/workout/` o `data/workout/`, sin Android).** Son funciones testeables sin Room ni Compose:
- la precarga de peso y reps;
- la próxima serie y el próximo ejercicio;
- lo que falta del descanso (`restEndsAt − now`, con pausa y ±15);
- si un ejercicio se puede reemplazar;
- el resumen del cierre.

## 5. Timer en segundo plano (`WorkoutService`)

**El service.**
- Es un foreground service de tipo `specialUse`.
- Arranca con "Empezar" o "Continuar sesión" y se detiene al terminar o descartar.
- No guarda estado propio: observa la sesión `ACTIVE` en Room y reacciona a `restEndsAt`.

**La notificación fija** (canal "Sesión en curso", importancia baja):
- mientras entrena dice "Sesión en curso · Press banca · S2/4";
- en el descanso dice "Descanso" y muestra la cuenta regresiva del sistema (`setUsesChronometer(true)` + `setChronometerCountDown(true)` + `setWhen(restEndsAt)`), sin redibujar cada segundo;
- tocarla abre la sesión.

**Fin del descanso.**
- El service programa una corrutina hasta `restEndsAt`, y la reprograma cada vez que cambia `restEndsAt` o se pausa.
- Al llegar a `restEndsAt`, según dónde esté el alumno:
  - **Con la sesión a la vista** (la pantalla entre `onResume` y `onPause`, registrado en `WorkoutScreenVisibility`): el service no publica la notificación. La pantalla avisa adentro con un snackbar, vibración y sonido.
    - El snackbar dice lo mismo que la notificación: "Descanso terminado · Próxima: 70 kg × 8". Si el que sigue es otro ejercicio, suma el nombre: "Descanso terminado · Remo con barra · Próxima: 60 kg × 10".
    - La vibración repite el patrón del canal (0, 400, 200, 400 ms). El sonido es el de notificación del celular.
    - Respeta el celular: el sonido suena solo en modo normal y si el canal "Fin del descanso" no está silenciado (importancia menor a DEFAULT o sin sonido, como en Android); vibra salvo en modo silencio.
    - Solo avisa si el descanso llegó a 0 (no si lo saltaron ni estaba en pausa) y dentro de los 5 s posteriores a `endsAt`: si la app vuelve mucho después, ya no es noticia.
    - Con la pantalla en pausa pero visible (cortina de notificaciones, pantalla dividida) avisa solo el service.
  - **Con el celular bloqueado o la app en segundo plano:** publica "Descanso terminado · Próxima: 70 kg × 8" en el canal "Fin del descanso" (importancia alta, sonido y vibración), visible con la pantalla bloqueada.
  - **No se repite al volver:** pantalla y service se reparten cada fin de descanso con un reclamo atómico por `endsAt` (`WorkoutScreenVisibility.claimRestEnd`, compareAndSet sobre `notifiedRestEnd`): el primero que lo reclama avisa y el otro no (si la pantalla avisó y enseguida pasa a segundo plano, el service no publica; y viceversa). Un descanso nuevo tiene otro `endsAt` y se reclama de nuevo. Se limpia al arrancar otro descanso o al cerrar la sesión.

**Si Android mata el proceso:** al reabrir se retoma desde Room.
- Si `restEndsAt` ya pasó, va a la serie siguiente.
- Si no pasó, sigue la cuenta.
- En este caso se pierde solo el aviso sonoro.

**Manifest.**
- `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE` y `VIBRATE`.
- `POST_NOTIFICATIONS`: se pide al tocar "Empezar" la primera vez, en Android 13 o más.
- El `<service>` con `foregroundServiceType="specialUse"` y su `<property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE">`.

**Sin permiso de notificaciones:**
- la sesión y el timer en pantalla funcionan igual;
- la pantalla de la sesión muestra un aviso: "Sin notificaciones no vas a escuchar el fin del descanso con el celular bloqueado". Tocarlo abre los Ajustes de la app.

## 6. Estados y errores

**Retomar al abrir la app** con una sesión `ACTIVE`:
- Hoy muestra "Continuar sesión";
- la pantalla vuelve a `currentPosition`/`currentSet`;
- el descanso se recalcula desde `restEndsAt` con la hora real.

**Lo que no requiere red:** empezar, registrar, reemplazar y terminar. Ninguna pantalla de esta tarjeta llama a Retrofit.

**Si la rutina del día se refresca vacía o distinta durante la sesión,** la sesión no cambia, porque usa su copia del plan.

**Si falla una escritura en Room** (raro):
- se muestra "No pudimos guardar la serie. Probá de nuevo";
- el cursor no avanza, así que no se pierde la serie en pantalla.

**Rotación y muerte del proceso:** el estado sale de Room y el ViewModel no guarda nada que no esté en Room. Lo único que vive en el ViewModel son los valores que el alumno está ajustando de la serie en curso. Esos se reconstruyen con la precarga.

## 7. Pruebas

**Unitarias:**
- la lógica pura de §4: precarga con y sin historial, avance de serie y de ejercicio con saltos, descanso con pausa, ±15 y piso en 0, reglas de reemplazo y resumen;
- `WorkoutRepository` con `FakeWorkoutDao`: start con otra sesión activa, confirm, corrección, reemplazo, finish, discard y finish sin series;
- `WorkoutViewModel`;
- el logout con sesión activa.

**Instrumentadas:**
- `WorkoutDaoTest`: transacciones, `observeActive` filtrado por dueño, `lastSetFor` ignorando sesiones `ACTIVE` y de otro dueño, y que `discard` borre en cascada;
- la migración 3→4.

**E2E en emulador:**
1. rutina de 5 × 4 completa;
2. corregir una serie;
3. reemplazar un ejercicio;
4. cerrar la app a la mitad y retomar;
5. descartar;
6. timer con el emulador bloqueado y la notificación;
7. permiso de notificaciones denegado;
8. Hoy y la biblioteca sin cambios.

**En un celular físico:** el timer con el celular bloqueado de verdad. Se junta con las pruebas pendientes de las tarjetas 6 y 8.

## 8. Contrato propuesto para el backend (tarjeta 10 de Pablo · Módulo Sessions)

No se implementa acá. Es lo que va a mandar la tarjeta 11, para que Pablo arme su endpoint compatible:

- `POST /sessions` → `{ id, routine_id, started_at, finished_at }`. Es solo para el alumno; el `student_id` sale del token.
- `POST /sessions/:id/sets` → `{ id, exercise_id, original_exercise_id, routine_exercise_id, set_number, actual_reps, actual_kg, executed_at }`.
- Los dos son **idempotentes por `id`**: reenviar el mismo id no duplica, y una corrección posterior actualiza la fila.
- Las fechas van en ISO 8601 UTC.

> **Nota (tarjeta 29, backend):** el backend recibe las series en lote, no una por request: `POST /sessions/:id/sets` con `{ "sets": [...] }` (1 a 100) y responde `{ saved, failed }`. Detalle y manejo de errores en [`contratos-api.md`](../../arquitectura/contratos-api.md) (sección POST /sessions/:id/sets).

## 9. Fuera de alcance

- Subir las sesiones al backend (tarjeta 11).
- RPE y notas al cerrar, e historial de sesiones (tarjeta 12).
- El botón IA (sprint 5).
- La progresión automática de carga definida por el PT (no existe en el schema).
- Agregar series extra o ejercicios fuera de la rutina.
- Una sesión libre sin rutina.
