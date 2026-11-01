# Gráficos de progreso en mobile (tarjeta 13) — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Objetivo:** que el alumno vea en Progreso → Gráficos la curva de carga de cada ejercicio y la evolución de sus medidas, con período elegible y también sin conexión.

> **Cambio tras la revisión de la PR #44 (1/11):** la lista del desplegable sale de `GET /progress/overview` guardado en `progress_exercises` (Room v9, misma `AutoMigration(8 → 9)`), no del historial. Se descartaron la columna `history_exercises.exerciseId` y su relleno (Tareas 1 y 2), y `di/ProgressModule.kt` pasó a `di/CacheCleanersModule.kt`. El detalle vigente está en el spec, §4.1.

**Arquitectura:** Room v9 suma `exerciseId` a `history_exercises` y tres tablas de caché (`progress_*`). `ProgressRepository` baja el historial completo de un ejercicio (`GET /progress/exercise/:id`) o de las medidas (`GET /progress/body/:studentId`) y reemplaza el caché; la UI lee de Room y filtra el período en memoria con funciones puras. La pestaña Progreso pasa a tener dos solapas (Historial de la 12, Gráficos nueva).

**Stack:** Kotlin, Jetpack Compose, Hilt, Retrofit + kotlinx.serialization, Room (auto-migración), Vico (gráficos), JUnit4 + coroutines-test.

**Spec:** `docs/superpowers/specs/2026-10-31-graficos-progreso-design.md`

## Restricciones globales

- Room es la única fuente de verdad: ninguna pantalla ni ViewModel llama a Retrofit.
- Ningún archivo de código (tests incluidos) pasa de **200 líneas físicas**. Orden capa → módulo → archivo; el módulo es `progress/` (recurso `/progress`). `HistoryRepository.kt` está en 184: la Tarea 2 le suma como mucho 3 líneas.
- Migración 8 → 9 automática y sin pérdida (`AutoMigration(from = 8, to = 9)`); `9.json` se commitea.
- Todo el caché nuevo va **por dueño** (`ownerId`), como el historial: otra cuenta en el mismo celular no ve nada ajeno y `clearUserData` borra solo lo suyo.
- Períodos: **1M = 30 días, 3M = 90, 6M = 180, Todo**; por defecto **3M**; uno solo para Cargas y Medidas.
- Refresco solo si lo guardado tiene más de **5 minutos** (`5 * 60_000L` ms) o si el alumno toca Reintentar.
- Textos exactos de la tabla §3.4 del spec.
- Tema oscuro: `FtColors.Brand` para la línea, `FtColors.Amber` para el récord, `FtColors.Green` si la carga sube, `FtColors.TextSecondary` para medidas y para bajas. Toque mínimo `Spacing.minTouchTarget`.
- Commits sin firmas de IA. **Los commits los hace Igna**: los agentes no commitean.
- Antes de cerrar: `gradlew checkFileLength assembleDebug testDebugUnitTest` en verde, y `connectedDebugAndroidTest` del test de migración en el emulador.

## Foco de revisión

1. **App actualizada desde la v8 con historial guardado:** el desplegable no queda vacío. El primer refresco con red vuelve a bajar los detalles sin `exerciseId`. Se prueba en la Tarea 2.
2. **Fechas del período en el borde:** un punto de exactamente hace 30 días entra en 1M, y uno de hace 31 no. `date` llega como `YYYY-MM-DD` local y se compara contra el `LocalDate` de hoy del `Clock`, nunca contra UTC. Se prueba en la Tarea 4.
3. **Cambio de cuenta mientras baja un gráfico:** la respuesta que llega después del logout no escribe filas del dueño anterior (mismo patrón `clearGeneration` + chequeo de dueño que `HistoryRepository`). Se prueba en la Tarea 5.
4. **Error al refrescar:** un 5xx o un timeout no borra lo guardado. Un 404 saca el ejercicio de la lista y el ViewModel elige el siguiente. Se prueba en las Tareas 5 y 6.
5. **Rotar o volver del detalle de una sesión:** se conservan la solapa, la vista, el ejercicio, la métrica y el período. Para eso van en `SavedStateHandle` y `rememberSaveable`. Se prueba en la Tarea 6 (ViewModel) y a mano en la Tarea 8.

---

## Mapa de archivos

Base: `mobile/app/src/main/java/com/fittrainer/`; tests: `mobile/app/src/test/java/com/fittrainer/` (mismo árbol).

| Archivo | Qué | Tarea |
|---|---|---|
| `data/db/workout/history/HistoryEntities.kt` | + `exerciseId: String?` en `HistoryExerciseEntity` | 1 |
| `data/workout/history/HistoryMapper.kt` | `exerciseEntities()` guarda `e.exercise.id` | 1 |
| `data/db/progress/ProgressEntities.kt` (nuevo) | `ProgressExercisePointEntity`, `ProgressExerciseMetaEntity`, `ProgressBodyPointEntity` | 1 |
| `data/db/progress/ProgressDao.kt` (nuevo) | Lecturas, reemplazos y limpieza; lista de ejercicios entrenados | 1 |
| `data/db/FitTrainerDatabase.kt`, `di/DatabaseModule.kt` | v9, entidades, `progressDao()` | 1 |
| `data/db/workout/history/HistoryDao.kt`, `data/workout/history/HistoryRepository.kt` | Relleno de `exerciseId` | 2 |
| `data/api/progress/ProgressApi.kt`, `ProgressDtos.kt` (nuevos), `di/NetworkModule.kt` | Endpoints y DTOs | 3 |
| `data/progress/ChartModels.kt`, `ChartMath.kt` (nuevos) | Tipos y lógica pura | 4 |
| `data/progress/ProgressRepository.kt`, `ProgressMapper.kt` (nuevos), `di/ProgressModule.kt` | Refresco, observación, limpieza | 5 |
| `ui/progress/charts/ChartsViewModel.kt`, `ChartsUiState.kt` (nuevos) | Estado de la solapa Gráficos | 6 |
| `ui/progress/charts/ChartsScreen.kt`, `components/*`, `ChartsTexts.kt` (nuevos); `gradle/libs.versions.toml`, `app/build.gradle.kts` | UI y Vico | 7 |
| `ui/progress/ProgressScreen.kt` (nuevo), `ui/workout/history/HistoryScreen.kt`, `navigation/RoleShell.kt` | Solapas y cableado | 8 |

---

### Tarea 1: Room v9 — `exerciseId` en el historial y caché de progreso

**Archivos:** los de la Tarea 1 del mapa; tests `data/workout/history/HistoryMapperTest.kt` (modificar), `androidTest/.../data/db/FitTrainerDatabaseMigrationTest.kt` (modificar), `testing/fakes/history/FakeHistoryDao.kt` (si el cambio de entidad lo pide), `testing/fakes/progress/FakeProgressDao.kt` (nuevo).

**Interfaces:**
- Produce las entidades (todas con `ownerId`):
  - `ProgressExercisePointEntity(ownerId: String, exerciseId: String, date: String /* YYYY-MM-DD */, maxKg: Double?, e1rmKg: Double?, sets: Int, reps: Int)`. PK (`ownerId`, `exerciseId`, `date`).
  - `ProgressExerciseMetaEntity(ownerId, exerciseId, defaultMetric: String, prMaxKg: Double?, prMaxKgDate: String?, prE1rmKg: Double?, prE1rmDate: String?, fetchedAt: Long)`. PK (`ownerId`, `exerciseId`).
  - `ProgressBodyPointEntity(id: String, ownerId, recordedAt: Long, weightKg: Double?, heightCm: Double?, bodyFatPct: Double?, waistCm: Double?, hipCm: Double?, chestCm: Double?, bmi: Double?)`. PK `id`.
  - `ProgressBodyMetaEntity(ownerId: String /* PK */, fetchedAt: Long)`, para saber cuándo se bajaron las medidas. Es la cuarta tabla.
  - `TrainedExercise(exerciseId: String, name: String, lastTrainedAt: Long)` (POJO de consulta).
- Produce `ProgressDao`:
  - `observeTrainedExercises(ownerId): Flow<List<TrainedExercise>>`: `history_exercises` ⨝ `history_sessions` del dueño con `exerciseId NOT NULL`, agrupado por `exerciseId`, con el nombre de la sesión más reciente y `MAX(startedAt)`, ordenado desc.
  - `observePoints(ownerId, exerciseId): Flow<List<ProgressExercisePointEntity>>` (asc por `date`).
  - `observeMeta(ownerId, exerciseId): Flow<ProgressExerciseMetaEntity?>`.
  - `meta(ownerId, exerciseId): ProgressExerciseMetaEntity?`.
  - `replaceExercise(meta, points)`: `@Transaction`, borra los puntos de ese dueño y ejercicio e inserta.
  - `deleteExercise(ownerId, exerciseId)`: puntos y meta.
  - `observeBody(ownerId): Flow<List<ProgressBodyPointEntity>>` (asc por `recordedAt`, después `id`).
  - `bodyMeta(ownerId): ProgressBodyMetaEntity?` y `observeBodyMeta(ownerId): Flow<ProgressBodyMetaEntity?>`.
  - `replaceBody(ownerId, points, fetchedAt)`: `@Transaction`.
  - `clear(ownerId)` y `clearAll()`.
  - `inTransaction(block)`, igual que `HistoryDao`.

- [ ] **Paso 1:** en `HistoryMapperTest`, `exerciseEntitiesGuardaElIdDelEjercicioEjecutado`. Con `exercise = NamedRefDto("e2", "Press inclinado")` y `originalExercise = NamedRefDto("e1", "Press")`, verificar `entities[0].exerciseId == "e2"`.
- [ ] **Paso 2:** en `FitTrainerDatabaseMigrationTest`, `migra8a9ConElIdDelEjercicioNuloYLasTablasDeProgresoVacias`. Insertar en v8 una fila en `history_sessions` y otra en `history_exercises`, migrar con `runMigrationsAndValidate(DB, 9, true)` y verificar que la fila sigue, con `exerciseId` nulo, y que `progress_exercise_points` tiene 0 filas.
- [ ] **Paso 3:** correr `gradlew testDebugUnitTest --tests "*HistoryMapperTest*"`. Esperado: FALLA (no existe `exerciseId`).
- [ ] **Paso 4:** implementar las entidades, el DAO, la versión 9 con `AutoMigration(from = 8, to = 9)`, `progressDao()`, `provideProgressDao` y el mapper. Crear `FakeProgressDao` en memoria (listas y `MutableStateFlow`) con la misma interfaz, para las Tareas 5 y 6.
- [ ] **Paso 5:** correr `gradlew testDebugUnitTest assembleDebug`. Esperado: PASA y se genera `app/schemas/.../9.json`. Correr en el emulador `gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.fittrainer.data.db.FitTrainerDatabaseMigrationTest`. Esperado: PASA.

### Tarea 2: Relleno de `exerciseId` en los detalles ya guardados

**Archivos:** modificar `HistoryDao.kt`, `HistoryRepository.kt` (`loadList`) y `FakeHistoryDao.kt`. Test nuevo: `data/workout/history/HistoryRepositoryBackfillTest.kt`.

**Interfaces:**
- Produce `HistoryDao.sessionIdsMissingExerciseId(ownerId: String): List<String>`: ids de `history_sessions` del dueño con `detailLoaded = 1` y algún `history_exercises.exerciseId IS NULL`.

- [ ] **Paso 1:** test `refrescoVuelveABajarDetallesSinIdDeEjercicio`. Preparar el `FakeHistoryDao` con la sesión `s1` guardada, `detailLoaded = true`, el mismo resumen que devuelve la API (o sea que `detailMatches` da true) y un ejercicio con `exerciseId = null`. Después de `refresh(ownerId)`, verificar que `api.detailCalls` contiene `s1` y que el ejercicio guardado tiene `exerciseId == "e1"`. Un segundo `refresh` ya no pide el detalle de `s1`.
- [ ] **Paso 2:** correr el test. Esperado: FALLA (no se pide el detalle).
- [ ] **Paso 3:** en `loadList`, sumar `dao.sessionIdsMissingExerciseId(ownerId)` al conjunto `stale`. Agregar a lo sumo 3 líneas al archivo.
- [ ] **Paso 4:** correr `gradlew testDebugUnitTest --tests "*HistoryRepository*"`. Esperado: todo PASA, los tests viejos incluidos.

### Tarea 3: API de progreso

**Archivos:** crear `data/api/progress/ProgressApi.kt` y `ProgressDtos.kt`; modificar `di/NetworkModule.kt`. Test: `data/api/progress/ProgressDtosTest.kt`.

**Interfaces:**
- `ProgressApi` (cliente principal, como `SessionApi`):
  - `@GET("progress/exercise/{exerciseId}") suspend fun exercise(@Path("exerciseId") id: String): ExerciseProgressResponse`
  - `@GET("progress/body/{studentId}") suspend fun body(@Path("studentId") studentId: String): BodyProgressResponse`
- DTOs, envueltos en `{ "data": … }`:
  - `ExerciseProgressDto(exercise: NamedRefDto-like {id, name}, points: List<ExercisePointDto>, pr: PrDto, @SerialName("default_metric") defaultMetric: String)`;
  - `ExercisePointDto(date, @SerialName("max_kg") maxKg: Double?, @SerialName("volume_kg") volumeKg: Double?, @SerialName("e1rm_kg") e1rmKg: Double?, sets: Int, reps: Int)`;
  - `PrDto(@SerialName("max_kg") maxKg: PrValueDto?, @SerialName("e1rm_kg") e1rmKg: PrValueDto?)`, con `PrValueDto(value: Double, date: String)`;
  - `BodyPointDto(id, @SerialName("recorded_at") recordedAt: String, weight_kg, height_cm, body_fat_pct, waist_cm, hip_cm, chest_cm, bmi`: todos `Double?`, con su `@SerialName`).
  - `summary` se ignora: el celular calcula sus propios números.

- [ ] **Paso 1:** en `ProgressDtosTest`, parsear el JSON de ejemplo de la spec del backend §3.1 (copiado tal cual) y uno de body con `bmi` y campos nulos y `muscle_group` presente. Verificar `points[1].e1rmKg == 88.7`, `pr.e1rmKg?.date == "2026-10-27"` y `defaultMetric == "e1rm_kg"`. Con `points: []` y `pr` con los dos nulos, también parsea.
- [ ] **Paso 2:** correr el test. Esperado: FALLA (no compila).
- [ ] **Paso 3:** implementar los DTOs con el `Json` del proyecto (`ignoreUnknownKeys`) y `provideProgressApi`.
- [ ] **Paso 4:** correr el test. Esperado: PASA.

### Tarea 4: Modelos y lógica pura de los gráficos

**Archivos:** crear `data/progress/ChartModels.kt` y `ChartMath.kt`. Test: `data/progress/ChartMathTest.kt`.

**Interfaces (produce):**
- `enum class ChartRange(val days: Int?) { M1(30), M3(90), M6(180), ALL(null) }`, `DEFAULT_RANGE = ChartRange.M3`.
- `enum class ChartMetric(val apiName: String) { E1RM("e1rm_kg"), MAX_KG("max_kg"), REPS("reps") }`.
- `enum class BodyField { WEIGHT, BODY_FAT, WAIST, HIP, CHEST, BMI }`, en ese orden.
- `data class ChartPoint(val date: LocalDate, val value: Double)`.
- `data class ExerciseChart(val exerciseId: String, val points: List<ProgressExercisePointEntity>, val meta: ProgressExerciseMetaEntity?)`. Lo que guarda Room, sin filtrar.
- `data class Record(val value: Double, val date: LocalDate)`.
- Funciones:
  - `availableMetrics(points: List<ProgressExercisePointEntity>): List<ChartMetric>`: E1RM si algún `e1rmKg > 0`; MAX_KG si algún `maxKg > 0`; `[REPS]` si ninguna de las dos.
  - `initialMetric(defaultMetric: String?, available: List<ChartMetric>): ChartMetric`: la de `apiName == defaultMetric` si está en `available`; si no, `available.first()`.
  - `series(points, metric): List<ChartPoint>`: saltea los nulos y los ≤ 0 de E1RM y MAX_KG; REPS usa `reps.toDouble()`.
  - `inRange(series: List<ChartPoint>, range: ChartRange, today: LocalDate): List<ChartPoint>`: `date >= today.minusDays(days)`; ALL no filtra.
  - `delta(series: List<ChartPoint>): Double?`: último − primero; `null` con menos de 2 puntos.
  - `record(meta, points, metric): Record?`: E1RM y MAX_KG salen de `meta.pr*`; REPS es el día con más `reps` (el primero si empatan).
  - `bodySeries(points: List<ProgressBodyPointEntity>, field, zone: ZoneId): List<ChartPoint>`: fecha local de `recordedAt` y saltea los nulos.
  - `availableFields(points): List<BodyField>`: los que tienen algún valor, en el orden del enum.

- [ ] **Paso 1:** tests en `ChartMathTest`, con hoy = `2026-10-31`:
  - `unPuntoDeHace30DiasEntraEn1M` (`2026-10-01`) y `unoDeHace31NoEntra` (`2026-09-30`).
  - `todoNoFiltra`.
  - `deltaConCeroYUnPuntoEsNulo`; `deltaEsUltimoMenosPrimero` (`[100, 95, 112.5]` → `12.5`).
  - `ejercicioConKgPeroSin1rmSoloOfreceKgMax`: `availableMetrics == [MAX_KG]`.
  - `pesoCorporalSoloOfreceReps`: con `maxKg` 0 o nulo en todos → `[REPS]`.
  - `metricaInicialRespetaLaDelBackendSiEstaDisponible`; `siNoEstaUsaLaPrimera` (`"e1rm_kg"` con `[MAX_KG]` → `MAX_KG`).
  - `seriesSalteaDiasSinValor`.
  - `recordDeRepsEsElDiaConMasRepsSumadas`; `recordDe1rmSaleDelBackend`.
  - `camposDeMedidasSoloLosCargadosEnOrden`: peso y cintura cargados → `[WEIGHT, WAIST]`.
  - `bodySeriesUsaLaFechaLocal`: `recordedAt` = `2026-10-31T01:00:00Z` con zona `America/Argentina/Buenos_Aires` → `2026-10-30`.
- [ ] **Paso 2:** correr el test. Esperado: FALLA (no compila).
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** correr `gradlew testDebugUnitTest --tests "*ChartMathTest*"`. Esperado: PASA.

### Tarea 5: `ProgressRepository`

**Archivos:** crear `data/progress/ProgressRepository.kt`, `data/progress/ProgressMapper.kt` y `di/ProgressModule.kt` (`@Binds @IntoSet UserDataCleaner`, igual que `HistoryModule`). Tests: `data/progress/ProgressRepositoryTest.kt` y `testing/fakes/progress/FakeProgressApi.kt`.

**Interfaces:**
- Consume `ProgressApi` (Tarea 3), `ProgressDao` (Tarea 1), `Provider<SessionRepository>` y `Clock`.
- Produce `@Singleton class ProgressRepository : UserDataCleaner`:
  - `fun observeTrainedExercises(ownerId): Flow<List<TrainedExercise>>`: excluye los ids de `notFound` (un `MutableStateFlow<Set<String>>` en memoria).
  - `fun observeExercise(ownerId, exerciseId): Flow<ExerciseChart>`.
  - `fun observeBody(ownerId): Flow<BodyChart>`, con `data class BodyChart(val points: List<ProgressBodyPointEntity>, val fetchedAt: Long?)` definido en `ChartModels.kt`.
  - `suspend fun refreshExercise(ownerId, exerciseId, force: Boolean = false): Result<Unit>`: no hace nada si `!force` y `meta.fetchedAt` tiene menos de 5 min. Un 404 borra el caché de ese ejercicio y suma el id a `notFound` (devuelve success). Cualquier otro error devuelve `Result.failure(DataException(...))` y no toca Room.
  - `suspend fun refreshBody(ownerId, force: Boolean = false): Result<Unit>`, con la misma regla de los 5 minutos usando `bodyMeta`.
  - "Nunca se bajó" se deduce de `ExerciseChart.meta == null` (o de `BodyChart.fetchedAt == null`); no hace falta una función aparte.
  - `clearUserData(ownerId: String?)`: sube `clearGeneration`, vacía `notFound` y llama a `dao.clear(ownerId)` o `dao.clearAll()`.
  - Antes de escribir, `checkOwner(ownerId, gen)`, como en `HistoryRepository`: `AccountChangedException` si cambió la cuenta o hubo limpieza.
- `ProgressMapper`: `ExerciseProgressDto.toEntities(ownerId, fetchedAt): Pair<ProgressExerciseMetaEntity, List<ProgressExercisePointEntity>>` y `BodyPointDto.toEntity(ownerId)` (`recordedAt` con `OffsetDateTime.parse`, como `HistoryMapper.millis`).

- [ ] **Paso 1:** tests en `ProgressRepositoryTest`:
  - `refrescoGuardaPuntosYRecord`.
  - `noVuelveAPedirAntesDeCincoMinutos`: avanzar el `TestClock` 4:59 → 1 llamada; 5:01 → 2.
  - `forceIgnoraLosCincoMinutos`.
  - `errorDelServidorNoBorraLoGuardado` (503).
  - `notFoundBorraYSacaElEjercicioDeLaLista` (404).
  - `respuestaQueLlegaDespuesDelLogoutNoEscribe`: la API suspende, llamar a `clearUserData`, liberar y verificar que no hay filas y que el resultado es failure.
  - `medidasSeReemplazanEnteras`.
- [ ] **Paso 2:** correr el test. Esperado: FALLA (no compila).
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** correr `gradlew testDebugUnitTest --tests "*ProgressRepositoryTest*"`. Esperado: PASA.

### Tarea 6: `ChartsViewModel`

**Archivos:** crear `ui/progress/charts/ChartsUiState.kt` y `ChartsViewModel.kt`. Test: `ui/progress/charts/ChartsViewModelTest.kt` (con `FakeProgressDao` + `FakeProgressApi` + `FakeStudentSession` + el `ConnectivityObserver` falso que ya usan los tests del historial).

**Interfaces:**
- `enum class ChartsView { LOADS, BODY }`.
- `ChartsUiState`:
  - `view`, `exercises: List<TrainedExercise>`, `selectedExerciseId: String?`, `metrics: List<ChartMetric>`, `metric: ChartMetric?`, `range: ChartRange`;
  - `exerciseSeries: List<ChartPoint>` (ya filtrada), `totalExercisePoints: Int`, `record: Record?`, `exerciseDelta: Double?`, `exerciseEverLoaded: Boolean`;
  - `bodyFields: List<BodyField>`, `bodyField: BodyField?`, `bodySeries: List<ChartPoint>`, `bodyLast: ChartPoint?`, `bodyDelta: Double?`, `bodyEverLoaded: Boolean`;
  - `isOffline`, `isRefreshing`, `refreshFailed`.
- `ChartsViewModel(repository: ProgressRepository, sessionRepository: SessionRepository, connectivity: ConnectivityObserver, clock: Clock, savedState: SavedStateHandle)`:
  - Funciones: `onViewSelected(ChartsView)`, `onExerciseSelected(id)`, `onMetricSelected(ChartMetric)`, `onRangeSelected(ChartRange)`, `onBodyFieldSelected(BodyField)`, `onRetry()` (`force = true`), `onStart()`.
  - En `SavedStateHandle` van `view`, `exerciseId`, `metric`, `range` y `bodyField`.
  - Ejercicio por defecto: el primero de `exercises`. Si el elegido desaparece de la lista (404), pasa al primero que quede.
  - Al cambiar de ejercicio, la métrica vuelve a `initialMetric(meta.defaultMetric, available)`.
  - Al elegir un ejercicio, al entrar en `BODY` y en `onStart` se llama al refresh correspondiente, sin `force`.

- [ ] **Paso 1:** tests en `ChartsViewModelTest`:
  - `arrancaEnCargasConElUltimoEjercicioEntrenadoYTresMeses`.
  - `cambiarElPeriodoFiltraSinPedirDeNuevo`: la API recibe 1 sola llamada.
  - `elPeriodoEsElMismoEnMedidas`.
  - `cambiarDeEjercicioReiniciaLaMetrica`.
  - `si404PasaAlSiguienteEjercicio`.
  - `sinRedMuestraLoGuardadoYMarcaOffline`.
  - `errorDeRefrescoMarcaRefreshFailedYReintentarFuerza`.
  - `restauraElEstadoDesdeSavedStateHandle`: arranca con `range = M6` y `exerciseId = "e2"` y los respeta.
- [ ] **Paso 2:** correr el test. Esperado: FALLA (no compila).
- [ ] **Paso 3:** implementar con `combine` + `flatMapLatest` sobre el dueño y el ejercicio elegido, como `HistoryViewModel`, y las funciones de la Tarea 4.
- [ ] **Paso 4:** correr `gradlew testDebugUnitTest --tests "*ChartsViewModelTest*"`. Esperado: PASA.

### Tarea 7: Vico y la solapa Gráficos

**Archivos:**
- Modificar `gradle/libs.versions.toml` (`vico = "2.1.3"`, `vico-compose-m3 = { group = "com.patrykandpatrick.vico", name = "compose-m3", version.ref = "vico" }`) y `app/build.gradle.kts`.
- Crear en `ui/progress/charts/`: `ChartsScreen.kt`, `ChartsTexts.kt`, `components/LineChart.kt`, `components/ExerciseChartsSection.kt`, `components/BodyChartsSection.kt`, `components/ChartChips.kt` y `components/ChartStats.kt`.
- Test: `ui/progress/charts/ChartsTextsTest.kt`.

**Interfaces:**
- `ChartsTexts`:
  - `formatKg(Double): String` → `"112,5 kg"` (coma decimal, sin decimales si es entero: `"80 kg"`);
  - `formatDelta(Double, unit: String): String` → `"+17,5 kg"` / `"−2,3 kg"` (signo menos real `−`) / `"0 kg"`;
  - `metricLabel(ChartMetric)` → `"1RM est."`, `"Kg máx"`, `"Reps totales"`;
  - `rangeLabel(ChartRange)` → `"1M"`, `"3M"`, `"6M"`, `"Todo"`;
  - `fieldLabel(BodyField)` → `"Peso"`, `"% grasa"`, `"Cintura"`, `"Cadera"`, `"Pecho"`, `"IMC"`;
  - `fieldUnit(BodyField)` → `"kg"`, `"%"`, `"cm"`, `"cm"`, `"cm"`, `""`;
  - `formatShortDate(LocalDate)` → `"24 oct"`.
- `LineChart(points: List<ChartPoint>, highlight: LocalDate?, lineColor: Color, modifier)`: es el único archivo que importa Vico. Si `highlight` está en la serie, ese punto va marcado en `FtColors.Amber`.
- `ChartsScreen(viewModel: ChartsViewModel = hiltViewModel())`: selector segmentado Cargas | Medidas (`SingleChoiceSegmentedButtonRow`) y la sección que corresponda. Los estados de la §3.4 van con los textos exactos, `NoticeBanner` para "Sin conexión · mostrando lo guardado" y "No pudimos actualizar" + Reintentar, y "Ver todo" llama a `onRangeSelected(ALL)`.

- [ ] **Paso 1:** tests en `ChartsTextsTest`: `formatKg(112.5) == "112,5 kg"`, `formatKg(80.0) == "80 kg"`, `formatDelta(17.5, "kg") == "+17,5 kg"`, `formatDelta(-2.3, "kg") == "−2,3 kg"`, `formatShortDate(2026-10-24) == "24 oct"`.
- [ ] **Paso 2:** correr el test. Esperado: FALLA.
- [ ] **Paso 3:** agregar Vico y correr `gradlew assembleDebug`. Si `2.1.3` no compila con el BOM `2025.08.00` y Kotlin 2.2.10, probar la última 2.x estable. Si ninguna compila, escribir `LineChart` con `Canvas` (línea, puntos, eje Y con mínimo y máximo, primera y última fecha abajo), sin tocar la firma, y anotar el cambio en el informe de la tarea.
- [ ] **Paso 4:** implementar `ChartsTexts` y los componentes. Cada archivo queda por debajo de 200 líneas.
- [ ] **Paso 5:** correr `gradlew checkFileLength assembleDebug testDebugUnitTest`. Esperado: PASA.

### Tarea 8: Solapas en Progreso y cableado

**Archivos:** crear `ui/progress/ProgressScreen.kt`; modificar `ui/workout/history/HistoryScreen.kt` (sacar `item { HistoryHeader(...) }`) y `navigation/RoleShell.kt` (`STUDENT_PROGRESS_ROUTE -> ProgressScreen(onOpen = …)`).

**Interfaces:**
- `ProgressScreen(onOpen: (String) -> Unit, historyViewModel: HistoryViewModel = hiltViewModel())`:
  - `HistoryHeader(weekSummary)` arriba;
  - `PrimaryTabRow` con "Historial" | "Gráficos", con el estado en `rememberSaveable` y Historial por defecto;
  - debajo, `HistoryScreen(onOpen, historyViewModel)` o `ChartsScreen()`.
- El badge de la barra inferior no cambia.

- [ ] **Paso 1:** implementar y correr `gradlew checkFileLength assembleDebug testDebugUnitTest`. Esperado: PASA, con los tests del historial incluidos.
- [ ] **Paso 2:** pruebas a mano en el emulador con `alumna.card8` / `Prueba1234`. Son las 4 de la §6 del spec más el Foco de revisión 1: instalar primero el APK de `feature/android-historial` (v8), entrar a Progreso, instalar encima el de esta rama y comprobar que Gráficos lista ejercicios después del primer refresco con red. Anotar el resultado de cada una.
