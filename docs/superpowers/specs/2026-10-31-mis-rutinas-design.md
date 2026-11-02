---
tags: [spec]
tarjeta: 9b
---
# Mis rutinas del alumno (mobile) — diseño

- **Tarjeta:** https://trello.com/c/MxVrMpdq (tablero personal, S5, ~7 h, no depende de Pablo). En el tablero
  de equipo es la continuación de la 9 (Biblioteca de ejercicios), sin tarjeta propia: en el índice figura
  como **9b**.
- **Rama:** `feature/android-mis-rutinas`, base `develop` (rebasada después del merge de la #40). PR #46.
- **Fecha:** 31/10/2026 · actualizado el 01/11 con las correcciones de la revisión de la PR #46.

## 1. Objetivo

Hoy la pestaña **Mis rutinas** abre la biblioteca de ejercicios (provisorio desde la tarjeta 9). El
alumno solo ve la rutina del día y no tiene dónde ver todo lo que le asignó el entrenador.

**Criterio de aceptación (tarjeta):** el alumno abre Mis rutinas, ve las rutinas que le asignó su
entrenador, entra a una y ve sus ejercicios, también sin red. Desde ahí sigue pudiendo abrir la
biblioteca de ejercicios.

**Agregado en el debate (decisión de Igna):** desde el detalle de una rutina el alumno puede
**empezar a entrenarla aunque hoy no le toque** (entrena solo: cambia el orden, recupera un día).

### Fuera de alcance

- Editar rutinas (es del entrenador, en la web).
- Rutinas inactivas o historial de rutinas viejas: solo las activas que devuelve `GET /routines/mine`.
- Cambios de backend, de API o de Room.

## 2. Datos

No hay cambios en Room, ni en la API, ni migración. Todo sale de lo que ya existe:

- `RoutineRepository.observeCache(ownerId)`: rutinas activas con sus ejercicios (series, reps, kg,
  descanso, tempo, notas) y la última sincronización. Lo llena `refresh()` desde `/routines/mine`
  (tarjeta 8).
- `WorkoutRepository.observeActive(ownerId)`: la sesión abierta, con su `routineId` (nullable) y su
  `routineName`.
- `WorkoutRepository.start(ownerId, routine)`: arranca la sesión; **si ya hay una abierta devuelve
  esa** (una sola a la vez) y exige que la rutina tenga ejercicios.

La marca **"Hoy"** de la lista usa `resolveToday` (`data/routine/TodayResolver.kt`): se marca la
rutina que la pestaña Hoy muestra como `Training`. Si dos rutinas tienen el día de hoy, solo se marca
la que elige Hoy (la más nueva), para que las dos pestañas digan lo mismo.

## 3. Pantallas

### 3.1 Mis rutinas — `student/routines` (pestaña)

- Arriba, siempre visible (también sin rutinas ni red): tarjeta de entrada **"Biblioteca de
  ejercicios"** que navega a `student/library`.
- Debajo, una tarjeta por rutina, ordenadas por `createdAt` descendente (como Hoy):
  - nombre y objetivo (si hay);
  - días como chips con la inicial (`dayInitial`: L M X J V S D), en orden de lunes a domingo;
  - "N ejercicios" (singular con 1);
  - marca **"Hoy"** según §2.
  - Toque → `student/routines/{routineId}`.
- Estados (mismos criterios que Hoy):
  - **Nunca sincronizó** (`lastSyncedAt == null`): aviso de que hace falta conectarse una vez para
    traer las rutinas, con reintento.
  - **Sincronizó, sin rutinas**: "Tu entrenador todavía no te asignó rutinas".
  - **Offline con caché**: se ve lo guardado con el aviso de sin conexión.
- Refresco igual que Hoy: al quedar visible, al volver la red y con pull-to-refresh. Nunca dos pedidos
  a la vez (ver §4.1).

### 3.2 Detalle de rutina — `student/routines/{routineId}`

- Barra superior con flecha atrás y el nombre; debajo objetivo y días.
- Lista de ejercicios en el orden del entrenador. Cada fila: nombre y una línea con
  `setsReps` · kg sugeridos · descanso · grupo muscular, omitiendo lo que falte (sin separadores
  colgando). Ejemplo: "4×10 · 60 kg · 90 s · Pecho".
- Toque en un ejercicio → `ExerciseDetailSheet` (el de la biblioteca), con `RoutineExercise.toDetail()`.
  El video queda deshabilitado sin red.
- Barra inferior con la acción, que sale de `startAction` (§4.3):

  | Caso | Se ve |
  |---|---|
  | Sin sesión abierta | Botón **"Empezar"** |
  | Sesión abierta de esta rutina | Botón **"Continuar sesión"** |
  | Sesión abierta de otra rutina | Botón deshabilitado + "Tenés una sesión abierta de *<rutina>*, terminala primero" + link **"Ir a la sesión"** |
  | Rutina sin ejercicios | Botón deshabilitado + "Esta rutina no tiene ejercicios" |

  El nombre de la otra rutina es el `routineName` de la sesión abierta (`Workout`), copiado al
  empezarla: se ve aunque esa rutina ya no esté activa.
- "Empezar" llama a `WorkoutRepository.start` y **recién después** navega a la sesión. Si Room falla,
  aviso de error y no navega (como Hoy). Es la misma entrada que usa Hoy: `WorkoutEntryViewModel.start`,
  no un segundo `try/catch` en el ViewModel del detalle.
- **Rutina que ya no está** (no existe en el caché, o desapareció mientras se miraba porque el
  entrenador la desactivó): "Esta rutina ya no está disponible" y botón para volver.

### 3.3 Biblioteca — `student/library`

La `LibraryScreen` actual, con flecha atrás (parámetro `onBack` opcional; sin él se ve como hoy).

### 3.4 Hoy con una sesión abierta de otra rutina

Como ahora se puede entrenar una rutina que no es la del día, Hoy puede tener abierta una sesión de otra
rutina (agregado en la revisión de la PR #46). El hero de Hoy usa el mismo `startAction` que el detalle:

| Caso | Hero | Arriba del hero |
|---|---|---|
| Sin sesión abierta | **"Empezar"** | — |
| Sesión abierta de la rutina de hoy | **"Continuar sesión"** (vuelve a la sesión, no crea otra) | — |
| Sesión abierta de otra rutina (o con `routineId` nulo) | Botón deshabilitado + "Tenés una sesión abierta de *<rutina>*, terminala primero" | Tarjeta **"Sesión en curso de *<rutina>*"** con "Continuar sesión" |
| Rutina de hoy sin ejercicios | Botón deshabilitado + "Esta rutina no tiene ejercicios" | — |

En descanso, sin rutina, sin datos o cargando, la tarjeta "Sesión en curso de *<rutina>*" aparece siempre
que haya una sesión abierta (como antes).

## 4. Arquitectura

### 4.1 Refresco compartido

`TodayViewModel` tiene hoy la coordinación del refresco (al quedar visible, al volver la red,
pull-to-refresh, cancelación y "nunca dos pedidos a la vez"). Se extrae a una clase reutilizable que
usan Hoy y Mis rutinas, para no duplicarla y para que las dos pestañas vivas no disparen dos pedidos
simultáneos a `/routines/mine` (el single-flight vive en un `@Singleton` compartido, no en cada
ViewModel). **Hoy no cambia de comportamiento:** sus tests actuales (`TodayViewModelTest`,
`TodayViewModelRefreshTest`) siguen pasando sin modificarse. El nombre y el paquete exactos de la clase
se definen en el plan, después de leer `TodayViewModel` entero.

### 4.2 Archivos nuevos (`ui/routines/`)

```
ui/routines/
  RoutinesScreen.kt, RoutinesViewModel.kt, RoutinesUiState.kt
  components/   (tarjeta de rutina, entrada a la biblioteca, estados)
  detail/
    RoutineDetailScreen.kt, RoutineDetailViewModel.kt, RoutineDetailUiState.kt, DetailTexts.kt
    components/ (fila de ejercicio, barra de acción)
```

`StartAction.kt` vive en `ui/today/` porque lo usan Hoy y el detalle (el detalle ya importa de `ui.today`;
al revés sería una dependencia circular entre paquetes).

- Los textos reutilizan `ui/today/RoutineTexts.kt` (`dayInitial`, `setsReps`, `toDetail`) por import;
  no se mueve el archivo, para no chocar con la rama de la 13.
- `RoutineDetailViewModel` lee el `routineId` del `SavedStateHandle` y combina caché + sesión activa.
- Ningún ViewModel ni pantalla llama a Retrofit: solo repositorios (Room es la fuente de verdad).
- Todo archivo ≤ 200 líneas físicas.

### 4.3 `startAction`

Función pura en `ui/today/StartAction.kt`, compartida por el hero de Hoy (§3.4) y la barra del detalle (§3.2):

```kotlin
sealed interface StartAction {
    data object Start : StartAction
    data object Continue : StartAction
    data class Blocked(val otherRoutineName: String) : StartAction
    data object NoExercises : StartAction
}
fun startAction(routine: Routine, active: Workout?): StartAction
fun startActionHint(action: StartAction): String?   // texto de Blocked / NoExercises, null en el resto
```

Orden: si hay sesión con `routineId == routine.id` → `Continue` (aunque hoy tenga 0 ejercicios); si hay
otra sesión (incluida una con `routineId` nulo) → `Blocked(active.routineName)`; si la rutina no tiene
ejercicios → `NoExercises`; si no → `Start`.

### 4.4 Navegación

- `RoleTabs.kt`: la constante de la pestaña pasa de `STUDENT_LIBRARY_ROUTE` a `STUDENT_ROUTINES_ROUTE`
  (el valor sigue siendo `"student/routines"`). Rutas nuevas: `ROUTINE_DETAIL_ROUTE =
  "student/routines/{routineId}"` con `routineDetailRoute(id)`, y `STUDENT_LIBRARY_ROUTE = "student/library"`
  (fuera de `student/routines/` para que no compita con el patrón `{routineId}`).
- `isTabSelected` se generaliza: `student/routines/...` y `student/library` dejan marcada Mis rutinas, igual que
  `student/history/...` con Progreso. `RoleNavigationBar` ya vuelve a la raíz de la pestaña si se la
  toca estando en una hija.
- **Salida de la sesión activa:** `WorkoutScreen` hoy hace `popBackStack(STUDENT_TODAY_ROUTE)` fijo.
  Pasa a volver a donde se entró (detalle de rutina u Hoy) con `popBackStack()`. Si no hay nada atrás
  (por ejemplo, se entró desde la notificación con la pila vacía), cae a Hoy. Si al leer el código
  aparece una razón para mantener la vuelta fija, se documenta en el plan.

## 5. Tests

Unitarios (JUnit + fakes, como los de Hoy), espejando el árbol de `ui/routines/`:

- `startAction`: los cuatro casos, más sesión abierta con `routineId` nulo → `Blocked`; `startActionHint`.
- `showsActiveWorkoutCard`: Training con sesión de otra rutina → sí; de la misma → no; `routineId` nulo → sí;
  fuera de Training con sesión → sí; sin sesión → no.
- Compose (`androidTest/.../ui/today/TodayBodyTest.kt`): Hoy toca Piernas con una sesión de Pecho abierta →
  "Empezar" deshabilitado, el aviso de Pecho, "Sesión en curso de Pecho" y "Continuar sesión" vuelve a la
  sesión sin crear otra.
- Marca "Hoy" y chips de días (orden lunes→domingo, rutina sin días).
- `RoutinesViewModel`: nunca sincronizó, sin rutinas, con rutinas, offline con caché.
- `RoutineDetailViewModel`: rutina inexistente, rutina que desaparece, continuar la de esta rutina, bloqueado
  por otra sesión. "Empezar" navega solo si Room no falla: lo cubre `WorkoutEntryViewModelTest`.
- Clase de refresco extraída: no dispara dos pedidos a la vez; los tests de Hoy siguen verdes.
- Salida de la sesión: con pila vacía cae a Hoy (test de la función de navegación, o prueba manual
  documentada si no es testeable sin Compose).

## 6. Verificación

- `gradlew checkFileLength assembleDebug testDebugUnitTest` sin errores.
- E2E en el emulador con `alumna.card8` (Prueba1234). Antes se le crea una **segunda rutina** en Supabase
  dev, con días distintos a la actual, para ver la lista, la marca "Hoy" y el caso bloqueado:
  1. Mis rutinas lista las dos rutinas; la de hoy tiene la marca.
  2. Entrar a la que no toca hoy → ejercicios con series/reps/kg → tocar uno abre el detalle.
  3. "Empezar" → sesión activa → salir → vuelve al detalle.
  4. Con esa sesión abierta, entrar a la otra rutina → botón bloqueado e "Ir a la sesión" funciona.
  5. Modo avión: la lista y el detalle se ven desde Room; la biblioteca abre.
  6. Con la sesión de la rutina que no toca hoy abierta, ir a Hoy → hero deshabilitado con el aviso y la
     tarjeta "Sesión en curso de …" arriba, que vuelve a esa sesión.
- **Prueba manual de la salida de la sesión** (§4.4, no testeable sin Compose y navegación reales): entrar
  desde el detalle, terminar la sesión y en el resumen tocar **dos veces seguidas "Saltar"** → se vuelve una
  sola vez, al detalle de la rutina (el segundo toque no saca también el detalle). Hecha en el emulador
  con `alumna.card8` (ver la PR #46).
- Prueba en celular físico: queda pendiente, como en las tarjetas anteriores.

## 7. Riesgos

- **Conflicto con la rama de la 13** (`feature/android-graficos`, sin commitear): toca 2 líneas de
  `RoleShell.kt`. Conflicto chico, se resuelve en el rebase de la que entre segunda.
- **Extracción del refresco:** es lo único que toca código de Hoy. Se cubre con sus tests actuales sin
  tocarlos.
