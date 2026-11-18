# Hoy en día de descanso y moverse entre días: plan de implementación

> **Para agentes:** sub-skill obligatoria: superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans. Los pasos usan checkboxes (`- [ ]`).

**Objetivo:** en un día de descanso, Hoy del alumno muestra:
- la semana con ✓;
- la racha;
- tres números;
- el próximo logro;
- el próximo entreno.

En cualquier día, tocar un día de la semana muestra lo que entrenó ese día o lo que le toca.

**Arquitectura:**
- **ViewModel aparte:** un `TodayWeekViewModel` (Hilt) se encarga de la semana, del día elegido y de los datos extra (historial, gamificación y medidas). `TodayViewModel` no se toca, así que Hoy en día de entreno y sus tests siguen iguales.
- **Funciones puras:** la lógica (días hechos, números, qué mostrar para un día, próximo entreno) va en funciones puras con tests JVM.
- **UI:** solo arma componentes nuevos y agrega callbacks de navegación.

**Stack:** Kotlin, Jetpack Compose, Hilt, Room (lectura vía repositorios existentes), JUnit 4 + kotlinx-coroutines-test.

**Spec:** `docs/superpowers/specs/2026-11-17-hoy-descanso-y-dias-design.md`

## Restricciones globales

- **Tamaño y orden:** ningún archivo de código (tests incluidos) pasa de 200 líneas físicas. Todo va en `ui/today/…` siguiendo capa → módulo → archivo, y los tests copian el árbol.
- **Fuente de datos:** la UI lee de Room vía los repositorios. Nada llama a Retrofit directo, y no se toca ni el backend ni el esquema de Room.
- **Zona de las fechas:** el día de una sesión es `startedAt` en `BUSINESS_ZONE` (`data/gamification/LocalStreak.kt`).
- **Sesiones rechazadas:** las sesiones `HistoryOrigin.LOCAL_FAILED` no cuentan.
- **Semana:** solo la actual, de lunes a domingo.
- **Días futuros:** no tienen botón "Empezar" dentro de Hoy.
- **Diseño:** tema oscuro, tokens `FtColors` / `Spacing` / `MaterialTheme.typography`, toque mínimo de 44 dp.
- **Commits:** sin firmas de IA, y solo cuando Igna lo pida (los pasos "Commit" quedan como puntos de control locales: `git add` y nada más).

## Foco de revisión

1. **Domingo como hoy:** la semana es la que termina hoy (lunes anterior → hoy). No hay días futuros, y el próximo entreno cae en la semana siguiente.
2. **Sin gamificación ni medidas en Room** (alumno nuevo o sin red): Hoy de descanso muestra solo la semana, los números que tengan dato y el próximo entreno. No crashea ni muestra "0 días de racha".
3. **Dos sesiones el mismo día:** el día pasado muestra dos tarjetas, y "Esta semana" cuenta ese día una sola vez.
4. **Sesión cerca de la medianoche:** una sesión que empieza el 17/11 a las 23:30 de Argentina, es decir 02:30 UTC del 18, cuenta el 17.
5. **Hoy elegido en día de entreno:** la lista de items es exactamente la de antes, con hero, músculos, plan y "Empezar".

---

### Tarea 1: modelo de la semana (puro)

**Archivos:**
- Crear: `mobile/app/src/main/java/com/fittrainer/ui/today/week/WeekModel.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/today/week/WeekModelTest.kt`

**Interfaces que produce:**
```kotlin
fun sessionDate(startedAt: Instant): LocalDate                       // BUSINESS_ZONE
fun weekDates(today: LocalDate): List<LocalDate>                     // lunes..domingo de la semana de today (7 fechas)
fun trainedDates(sessions: List<HistoryItem>): Set<LocalDate>        // sin LOCAL_FAILED
data class WeekStats(val doneDays: Int, val assignedDays: Int, val monthSessions: Int, val weightDeltaKg: Double?)
fun weekStats(sessions: List<HistoryItem>, assigned: Set<DayOfWeek>, today: LocalDate, weights: List<Pair<Long, Double>>): WeekStats
data class NextTraining(val date: LocalDate, val routine: Routine)
fun nextTraining(routines: List<Routine>, today: LocalDate): NextTraining?   // primer día > today (hasta 7) con rutina
sealed interface DayView {
    data object Today : DayView
    data class Past(val date: LocalDate, val sessions: List<HistoryItem>, val assigned: Boolean) : DayView
    data class Future(val date: LocalDate, val routine: Routine?) : DayView
}
fun dayView(selected: LocalDate, today: LocalDate, sessions: List<HistoryItem>, routines: List<Routine>): DayView
```
`weights`: pares (recordedAt en ms, weightKg) con peso no nulo. El delta es último menos primero, por `recordedAt`, redondeado a 1 decimal, o null si hay menos de 2. `monthSessions` cuenta las sesiones (no los días) del mes calendario de `today`, sin las LOCAL_FAILED. Si dos rutinas comparten el día, `nextTraining` y `Future` toman la primera de la lista, igual que `resolveToday`. En `Past`, las sesiones van ordenadas por `startedAt` descendente.

- [ ] **Paso 1: tests que fallan.** En `WeekModelTest`, con un helper `item(id, startedAt: String ISO, origin = SERVER)` que arma un `HistoryItem`:
  - `sessionDate usa hora argentina`: `sessionDate(Instant.parse("2026-11-18T02:30:00Z")) == LocalDate.of(2026,11,17)`.
  - `weekDates va de lunes a domingo`: para el martes 17/11 da del 16/11 al 22/11, 7 fechas. Para el domingo 22/11, la primera es el 16/11 y la última el 22/11.
  - `trainedDates ignora LOCAL_FAILED`.
  - `weekStats cuenta días distintos y asignados`:
    - con dos sesiones el lunes 16, una el miércoles 18 en LOCAL_FAILED y asignados {MONDAY, WEDNESDAY, FRIDAY}, `doneDays == 1` y `assignedDays == 3`;
    - `monthSessions` cuenta las sesiones de noviembre: 2 si hay otra en octubre;
    - con pesos 72.0 y 67.4 (en cualquier orden de la lista), `weightDeltaKg == -4.6`;
    - con un solo peso, `weightDeltaKg == null`.
  - `weekStats puede pasar de lo asignado`: 4 días con sesión y 3 asignados da `doneDays == 4`.
  - `nextTraining busca el próximo día con rutina`:
    - rutina {WEDNESDAY} y hoy martes 17 da el 18/11;
    - hoy miércoles 18 da el 25/11;
    - sin rutinas da null.
  - `dayView`:
    - `selected == today` da `Today`;
    - lunes 16 con sesión da `Past` con 1 sesión y `assigned == true`;
    - martes pasado no asignado y sin sesión da `Past(sessions = empty, assigned = false)`;
    - jueves 19 con rutina {THURSDAY} da `Future(routine = esa)`;
    - sábado 21 sin rutina da `Future(routine = null)`.
- [ ] **Paso 2:** `cd mobile && ./gradlew testDebugUnitTest --tests "com.fittrainer.ui.today.week.WeekModelTest"`. Tiene que fallar por no compilar (faltan las funciones).
- [ ] **Paso 3:** implementar las interfaces de arriba en `WeekModel.kt`.
- [ ] **Paso 4:** el mismo comando, ahora PASS.
- [ ] **Paso 5:** `git add` de los dos archivos.

### Tarea 2: `TodayWeekViewModel`

**Archivos:**
- Crear: `mobile/app/src/main/java/com/fittrainer/ui/today/week/TodayWeekViewModel.kt` y `.../week/TodayWeekState.kt`.
- Test: `mobile/app/src/test/java/com/fittrainer/ui/today/week/TodayWeekStateTest.kt`.

**Interfaces que consume:** las de la Tarea 1, más:
- `RoutineRepository.observeCache(ownerId)`;
- `HistoryRepository.observe(ownerId)` y `refresh(ownerId)`;
- `GamificationRepository.observeSummary(ownerId)` y `refresh(ownerId)`;
- `ProgressRepository.observeBody(ownerId)` y `refreshBody(ownerId)`;
- `readyState(summary, today)` de `ui/gamification/GamificationUiState.kt`;
- `SessionRepository.session`, igual que `TodayViewModel`.

**Interfaces que produce:**
```kotlin
data class TodayWeekState(
    val today: LocalDate,
    val selected: LocalDate,
    val week: List<LocalDate>,
    val trainingDays: Set<DayOfWeek>,      // unión de los días de las rutinas
    val done: Set<LocalDate>,              // trainedDates ∩ week
    val stats: WeekStats?,                 // null mientras no hay datos
    val streak: Int?,                      // null o 0: no se muestra
    val gamification: GamificationReady?,  // para NextAchievementCard; null sin datos o sin ready.next
    val next: NextTraining?,
    val day: DayView,
)
fun weekState(today: LocalDate, selected: LocalDate, routines: List<Routine>, sessions: List<HistoryItem>,
              summary: GamificationSummary?, weights: List<Pair<Long, Double>>): TodayWeekState   // puro, en TodayWeekState.kt

class TodayWeekViewModel  // @HiltViewModel
    val state: StateFlow<TodayWeekState>
    fun select(date: LocalDate)   // ignora fechas fuera de la semana
    fun backToToday()
    fun onStart()                 // today = LocalDate.now(clock, en BUSINESS_ZONE), selected = today y refresca
    fun refresh()                 // lanza history.refresh, gamification.refresh y progress.refreshBody en paralelo, ignora el Result
```
`gamification` es null cuando `readyState(...).next == null`. `streak` es null cuando es 0.

- [ ] **Paso 1: tests que fallan (`TodayWeekStateTest`, sobre `weekState`):**
  - `sin gamificación ni medidas no hay racha, logro ni peso`: `streak == null`, `gamification == null` y `stats!!.weightDeltaKg == null`.
  - `done solo trae días de esta semana`: una sesión de la semana anterior no aparece en `done`.
  - `racha en 0 no se muestra`: un summary con `currentStreak = 0` da `streak == null`.
  - `selected distinto de hoy da su DayView`.
- [ ] **Paso 2:** correr el test. Tiene que fallar.
- [ ] **Paso 3:** implementar `weekState` y el ViewModel.
  - `combine` del usuario, `observeCache`, `observe`, `observeSummary`, `observeBody`, `today` y `selected` (con flows anidados si pasan de 5) hacia `weekState(...)`.
  - Los pesos salen de `BodyChart.points` con `weightKg != null`, como `recordedAt to weightKg`.
- [ ] **Paso 4:** correr el test y los de `ui/today`. PASS. Los tests existentes de `TodayViewModel` no se tocan.
- [ ] **Paso 5:** `git add`.

### Tarea 3: tira de la semana tocable, con ✓

**Archivos:**
- Modificar: `mobile/app/src/main/java/com/fittrainer/ui/today/components/WeekStrip.kt`.

**Nueva firma:**
```kotlin
@Composable
fun WeekStrip(week: List<LocalDate>, trainingDays: Set<DayOfWeek>, today: LocalDate, done: Set<LocalDate>,
              selected: LocalDate, onSelect: (LocalDate) -> Unit)
```
- **Estados del chip:**
  - Fondo `FtColors.Brand` si está elegido.
  - Si no, fondo verde suave con un "✓" chico debajo de la inicial si está hecho. Usar un token existente de éxito de `FtColors` si lo hay; si no, `FtColors.Elevated` con el ✓ en `FtColors.BrandText`.
  - Si no, el estilo actual.
  - Borde `BrandText` si es hoy.
- **Toque:** cada chip es tocable (área de 44 dp de alto) y su `contentDescription` suma ", entrenado" o ", elegido".
- **Etiqueta:** "SEMANA · N DE M HECHAS" cuando `M > 0`, o "SEMANA" si no.
- **Pasos:**
  - [ ] Implementar.
  - [ ] Compilar con `./gradlew compileDebugKotlin`. Va a fallar en `TodayScreen`, que se arregla en la Tarea 5.
  - [ ] `git add`.

### Tarea 4: secciones del descanso y del día elegido

**Archivos:**
- Crear `mobile/app/src/main/java/com/fittrainer/ui/today/week/RestProgress.kt`:
  - `StreakCard(days: Int)`: 🔥 con "Racha de N días" (o "Racha de 1 día") y el texto "El descanso no la corta: está planificado.".
  - `WeekStatsRow(stats: WeekStats)`: tres celdas con "N/M" / "esta semana", "N" / "sesiones del mes" y "−4,6 kg" / "desde tu primera medida". La de peso se omite si es null. Formato con coma decimal y signo menos tipográfico, "+1,2 kg" si sube.
  - `NextTrainingCard(next: NextTraining, today: LocalDate, onOpenRoutine: (String) -> Unit)`:
    - etiqueta "MAÑANA · MIÉRCOLES" si es mañana, o "JUEVES 20" si no (con `dayName` en mayúsculas);
    - nombre de la rutina y "N ejercicios";
    - botón secundario "Ver rutina".
- Crear `mobile/app/src/main/java/com/fittrainer/ui/today/week/DayDetail.kt`:
  - `PastDay(view: DayView.Past, onOpenSession: (String) -> Unit)`:
    - etiqueta "LUNES 16 · ENTRENADO" (o "· SIN ENTRENAR", o "· DESCANSO");
    - una tarjeta por sesión con rutina, "48 min · 18 series · 2.340 kg · RPE 7", la marca "🏆 Récord" si `hasPr`, y la tarjeta tocable;
    - sin sesiones, `InfoCard("No entrenaste este día", "Era un día de entrenamiento.")` si `assigned`, o `InfoCard("Descanso", "Ese día no tenías entrenamiento.")` si no.
  - `FutureDay(view: DayView.Future, onOpenRoutine: (String) -> Unit)`:
    - etiqueta "JUEVES 19 · TE TOCA";
    - nombre de la rutina y una fila por ejercicio con "series × reps" (o "—" si faltan);
    - botón "Ver rutina";
    - sin rutina, `InfoCard("Descanso", "Ese día no tenés entrenamiento.")`;
    - **sin "Empezar".**
  - `BackToToday(onClick: () -> Unit)`: botón secundario "← Volver a hoy".
- Test: `mobile/app/src/test/java/com/fittrainer/ui/today/week/DayTextsTest.kt`, para los formateadores puros que se extraigan a `week/DayTexts.kt`:
  - `nextTrainingLabel(date, today)` da "MAÑANA · MIÉRCOLES" y "JUEVES 20";
  - `weightDeltaText(-4.6)` da "−4,6 kg" y `weightDeltaText(1.2)` da "+1,2 kg";
  - `sessionSummary(item)` da "48 min · 18 series · 2.340 kg · RPE 7", omitiendo las partes nulas;
  - `pastDayLabel(date, entrenado/sin/descanso)`.
- **Pasos:**
  - [ ] Test que falla.
  - [ ] Correrlo: FAIL.
  - [ ] Implementar.
  - [ ] Correrlo: PASS.
  - [ ] `git add`.

### Tarea 5: armar Hoy y la navegación

**Archivos:**
- Modificar: `mobile/app/src/main/java/com/fittrainer/ui/today/TodayScreen.kt`. Tiene 194 líneas: mover los items de la semana y del descanso a `ui/today/week/TodayWeekItems.kt`, como extensiones `LazyListScope`, para no pasar de 200.
- Modificar: `mobile/app/src/main/java/com/fittrainer/navigation/RoleTabContent.kt`, que hoy llama a `TodayScreen` sin estos callbacks.

**Cambios:**
- `TodayScreen(onOpenWorkout, …, onOpenRoutine: (String) -> Unit = {}, onOpenSession: (String) -> Unit = {}, onOpenAchievements: () -> Unit = {})`. Toma `weekVm: TodayWeekViewModel = hiltViewModel()`.
- **Inicio y refresco:** en el mismo efecto que hoy llama a `onStart` del VM de Hoy, llamar también a `weekVm.onStart()`. Pull-to-refresh llama a los dos: `vm.onPullToRefresh()` y `weekVm.refresh()`.
- **Training / Rest con `week.selected == week.today`:**
  - Training: igual que ahora, cambiando solo el `WeekStrip` por la firma nueva.
  - Rest:
    1. `WeekStrip`;
    2. `RestState(nextDay)`, la tarjeta actual, que queda como saludo corto;
    3. `StreakCard` si `streak != null`;
    4. `WeekStatsRow` si `stats != null`;
    5. `NextAchievementCard(gamification, onOpenAchievements)` si `gamification != null`;
    6. `NextTrainingCard` si `next != null`.
- **Training / Rest con `selected != today`:** `WeekStrip`, después `PastDay` o `FutureDay` según `week.day`, y al final `BackToToday(weekVm::backToToday)`. Los avisos de subidas y la tarjeta de sesión abierta quedan arriba, como ahora.
- **NoRoutine / NeverSynced:** sin cambios.
- **Navegación en `RoleTabContent`**, con `launchSingleTop = true` en las tres:
  - `onOpenRoutine = { navController.navigate(routineDetailRoute(it)) }`;
  - `onOpenSession = { navController.navigate(historyDetailRoute(it)) }`;
  - `onOpenAchievements = { navController.navigate(STUDENT_ACHIEVEMENTS_ROUTE) }`.
- **Pasos:**
  - [ ] Implementar.
  - [ ] `cd mobile && ./gradlew checkFileLength assembleDebug testDebugUnitTest`. Todo en verde, y los tests existentes de `ui/today` sin cambios.
  - [ ] `git add`.

### Tarea 6: prueba en el S10 y cierre

- [ ] Instalar en el S10. Ojo: `installDebug` solo, nunca `connectedAndroidTest`, porque desinstala la app (incidente de la GX2-M2).
- [ ] Recorrer el criterio de aceptación 1–5 de la spec con una cuenta de demo o la alumna de prueba. Incluye modo avión para el 5, y un día de entreno con hoy elegido para confirmar que nada cambió.
- [ ] Mover la tarjeta #76 a 🔍 AUDITORÍA CODEX con el comentario `🛠️ CLAUDE · Lista para auditar`.
