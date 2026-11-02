---
tags: [plan]
tarjeta: mapa-muscular
---
# Mapa muscular Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un cuerpo de frente y espalda que pinta en azul el músculo del ejercicio actual en la sesión activa y los músculos de la rutina del día en una hoja que se abre desde Hoy.

**Architecture:** Los trazos de `react-native-body-highlighter` v3.1.3 (MIT) se convierten una vez, con un script Node, a un JSON en `assets/`. Un componente Compose (`ui/components/bodymap/`) lo lee, lo cachea y lo dibuja en un `Canvas`. La lógica (grupo → partes, agregación de la rutina, cuándo mostrar) son funciones puras con tests JVM; la sesión activa y Hoy solo las consumen.

**Tech Stack:** Kotlin, Jetpack Compose (Canvas, `PathParser`, `ModalBottomSheet`), kotlinx.serialization (ya está en el módulo), JUnit 4. Node solo para el script de generación.

**Spec:** `docs/superpowers/specs/2026-10-31-mapa-muscular-design.md`

## Global Constraints

- Rama `feature/android-mapa-muscular` en el worktree `C:\Users\igna_\Desktop\fittrainer-mapa-muscular`. Los agentes **no commitean**: los pasos de commit de esta skill se reemplazan por "dejar listo para que Igna commitee".
- Ningún `.kt`/`.kts` (ni el script `.js`) pasa de **200 líneas físicas**; ordenado capa → módulo → archivo, tests copiando el árbol.
- Room es la única fuente de verdad: nada de Retrofit ni red en estas pantallas.
- Colores: pintado `FtColors.Brand` (`#2952D9`), músculo `#343B39`, neutro `#232927`, borde entre partes `#0B0D0C` (`FtColors.Background`), contorno `#3A4240`.
- Toque mínimo 44 dp (`Spacing.minTouchTarget`).
- Atribución: el JSON y el script citan `react-native-body-highlighter@3.1.3`, MIT, © 2022 ELABBASSI Hicham; el aviso MIT completo va en `assets/body_map/`.
- Verificación final: `./gradlew checkFileLength assembleDebug testDebugUnitTest` desde `mobile/`.

## Review Focus

- **Ejercicio reemplazado a mitad de sesión:** la tarjeta muestra el grupo del reemplazo (`WorkoutRepository` ya copia `replacement.muscleGroup`; la tarjeta lee `state.exercise`, nunca la rutina) → la tarjeta recibe el `WorkoutExercise` actual (Task 4) y se prueba a mano en Task 6.
- **Rutina solo de espalda/glúteos/isquios:** la miniatura de Hoy usa la vista de espalda → test en Task 2 (`busiestView`).
- **Grupo nuevo que el backend agregue mañana** (código desconocido): ni crash ni tarjeta/fila → tests en Task 2 y Task 5.
- **Celular de pantalla baja:** el botón "Serie completa" sigue visible; la tarjeta se oculta → test de `showsMuscleCard` en Task 4 + prueba manual en un emulador chico.
- **Asset ausente o JSON roto:** `parseBodyMap` devuelve `null` y el componente no dibuja nada → test en Task 1.

---

### Task 1: Datos del dibujo (script + JSON + parser)

**Files:**
- Create: `mobile/tools/body-map/generate-body-map.js`
- Create: `mobile/app/src/main/assets/body_map/body_map.json` (salida del script)
- Create: `mobile/app/src/main/assets/body_map/LICENSE-react-native-body-highlighter.txt`
- Create: `mobile/app/src/main/assets/body_map/README.md`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/components/bodymap/BodyMapData.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/components/bodymap/BodyMapDataTest.kt`

**Interfaces:**
- Produces:
  - JSON: `{ "source": "react-native-body-highlighter@3.1.3 (MIT, © 2022 ELABBASSI Hicham)", "views": { "front": View, "back": View } }`, con `View = { "viewBox": [x, y, w, h], "outline": "M…", "parts": [ { "slug": "chest", "paths": ["M…", …] } ] }`. `viewBox` frente `[30, 90, 670, 1280]`, espalda `[754, 90, 670, 1280]`.
  - `@Serializable data class BodyMapData(val views: Map<String, BodyViewData>)`
  - `@Serializable data class BodyViewData(val viewBox: List<Float>, val outline: String, val parts: List<BodyPartData>)`
  - `@Serializable data class BodyPartData(val slug: String, val paths: List<String>)`
  - `enum class BodyView(val key: String) { FRONT("front"), BACK("back") }`
  - `fun parseBodyMap(json: String): BodyMapData?` — `null` si el JSON no parsea o le falta alguna de las dos vistas. `Json { ignoreUnknownKeys = true }`.
  - `fun BodyMapData.view(v: BodyView): BodyViewData` (siempre existe si `parseBodyMap` no devolvió null).
  - `const val BODY_MAP_ASSET = "body_map/body_map.json"`

- [ ] **Step 1: Bajar el paquete fuera del repo** a una carpeta temporal propia (no al worktree): `assets/bodyFront.ts`, `assets/bodyBack.ts`, `components/SvgMaleWrapper.tsx` y `LICENSE` de `https://cdn.jsdelivr.net/npm/react-native-body-highlighter@3.1.3/…`.

- [ ] **Step 2: Escribir `generate-body-map.js`** (`node generate-body-map.js <carpeta-del-paquete> <salida.json>`). Lee cada `.ts` como texto, saca la línea `import` y cambia `export const <nombre>: BodyPart[] =` por una asignación, y lo evalúa con `vm.runInNewContext` (contexto vacío, `timeout: 1000`). Por parte junta `path.left`, `path.right` y `path.common`. Los dos contornos son los dos `d="…"` de `SvgMaleWrapper.tsx` (el primero frente, el segundo espalda). No toca las coordenadas. Encabezado con la atribución.

- [ ] **Step 3: Generar el JSON** y copiar el `LICENSE` del paquete como `LICENSE-react-native-body-highlighter.txt`. `README.md`: origen (paquete, versión, licencia) y el comando para regenerar.

- [ ] **Step 4: Escribir el test que falla** (`BodyMapDataTest`), leyendo `File("src/main/assets/$BODY_MAP_ASSET")` (el directorio de trabajo de los unit tests es `app/`):

```kotlin
@Test fun `el json del dibujo trae las dos vistas`() {
    val data = parseBodyMap(asset())!!
    assertEquals(listOf(30f, 90f, 670f, 1280f), data.view(BodyView.FRONT).viewBox)
    assertEquals(listOf(754f, 90f, 670f, 1280f), data.view(BodyView.BACK).viewBox)
    assertTrue(data.view(BodyView.FRONT).outline.startsWith("M"))
    assertTrue(data.view(BodyView.FRONT).parts.any { it.slug == "chest" && it.paths.isNotEmpty() })
    assertTrue(data.view(BodyView.BACK).parts.any { it.slug == "gluteal" })
}
@Test fun `json roto o sin una vista no rompe`() {
    assertNull(parseBodyMap("no es json"))
    assertNull(parseBodyMap("""{"views":{"front":{"viewBox":[0,0,1,1],"outline":"M0 0","parts":[]}}}"""))
}
```

- [ ] **Step 5: Correr y ver que falla** — `./gradlew testDebugUnitTest --tests "*BodyMapDataTest"` → no compila (`parseBodyMap` no existe).

- [ ] **Step 6: Implementar `BodyMapData.kt`** con las firmas de arriba.

- [ ] **Step 7: Correr y ver que pasa** — mismo comando → PASS.

---

### Task 2: Grupo → partes, vista más pintada y equipo en castellano

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/components/bodymap/MuscleMap.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/components/exercise/ExerciseTexts.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/components/bodymap/MuscleMapTest.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/components/bodymap/BodyMapDataTest.kt` (agrega casos)
- Test: `mobile/app/src/test/java/com/fittrainer/ui/components/exercise/ExerciseTextsTest.kt` (agrega casos)

**Interfaces:**
- Consumes: `BodyMapData`, `BodyView`, `view()` (Task 1).
- Produces:
  - `val NEUTRAL_PARTS: Set<String>` = `head, hair, hands, feet, ankles, knees`.
  - `val ALL_MUSCLE_PARTS: Set<String>` = las partes no neutras de las dos vistas: `chest, obliques, abs, biceps, triceps, neck, trapezius, deltoids, adductors, quadriceps, tibialis, calves, forearm, upper-back, lower-back, gluteal, hamstring`.
  - `fun partsFor(group: String?): Set<String>` — tabla del spec §4; `full_body` → `ALL_MUSCLE_PARTS`; `cardio`, nulo o desconocido → vacío.
  - `fun paints(group: String?): Boolean` = `partsFor(group).isNotEmpty()`.
  - `fun busiestView(data: BodyMapData, painted: Set<String>): BodyView` — la vista con más partes de `painted` presentes; empate → `FRONT`.
  - `fun equipmentLabel(raw: String?): String` en `ExerciseTexts.kt`: `barbell` Barra, `dumbbell` Mancuernas, `machine` Máquina, `cable` Polea, `bodyweight` Peso corporal, `kettlebell` Kettlebell, `band` Banda; desconocido tal cual; nulo → `""`.

- [ ] **Step 1: Tests que fallan.**

```kotlin
// MuscleMapTest
@Test fun `cada grupo pinta sus partes`() {
    assertEquals(setOf("chest"), partsFor("chest"))
    assertEquals(setOf("upper-back", "lower-back", "trapezius"), partsFor("back"))
    assertEquals(setOf("deltoids"), partsFor("shoulders"))
    assertEquals(setOf("quadriceps", "hamstring", "adductors"), partsFor("legs"))
    assertEquals(setOf("gluteal"), partsFor("glutes"))
    assertEquals(setOf("biceps"), partsFor("biceps"))
    assertEquals(setOf("triceps"), partsFor("triceps"))
    assertEquals(setOf("abs", "obliques"), partsFor("core"))
    assertEquals(setOf("calves"), partsFor("calves"))
    assertEquals(ALL_MUSCLE_PARTS, partsFor("full_body"))
}
@Test fun `cardio, nulo y desconocido no pintan`() {
    listOf("cardio", null, "yoga").forEach { assertTrue(partsFor(it).isEmpty()); assertFalse(paints(it)) }
}
// BodyMapDataTest (con el JSON real)
@Test fun `toda parte nombrada existe en el dibujo y las no neutras son ALL_MUSCLE_PARTS`() {
    val slugs = BodyView.entries.flatMap { v -> data.view(v).parts.map { it.slug } }.toSet()
    assertEquals(ALL_MUSCLE_PARTS, slugs - NEUTRAL_PARTS)
}
@Test fun `la miniatura usa la vista con mas musculo pintado`() {
    assertEquals(BodyView.BACK, busiestView(data, partsFor("back") + partsFor("glutes")))
    assertEquals(BodyView.FRONT, busiestView(data, partsFor("chest")))
    assertEquals(BodyView.FRONT, busiestView(data, partsFor("triceps"))) // está en las dos: empate
}
// ExerciseTextsTest
@Test fun `equipo traducido, desconocido tal cual y nulo vacio`() {
    assertEquals("Barra", equipmentLabel("barbell"))
    assertEquals("Peso corporal", equipmentLabel("bodyweight"))
    assertEquals("Polea", equipmentLabel("cable"))
    assertEquals("trx", equipmentLabel("trx"))
    assertEquals("", equipmentLabel(null))
}
```

- [ ] **Step 2: Correr y ver que fallan** — `./gradlew testDebugUnitTest --tests "*MuscleMapTest" --tests "*BodyMapDataTest" --tests "*ExerciseTextsTest"` → no compila.

- [ ] **Step 3: Implementar** `MuscleMap.kt` y `equipmentLabel` con las firmas y valores de arriba.

- [ ] **Step 4: Correr y ver que pasan** — mismo comando → PASS.

---

### Task 3: Componente `BodyMap` (Compose)

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/components/bodymap/BodyMap.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/components/bodymap/BodyMapAssets.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/theme/Color.kt` (agrega `BodyMuscle = 0xFF343B39`, `BodyNeutral = 0xFF232927`, `BodyOutline = 0xFF3A4240` en `FtColors`)

**Interfaces:**
- Consumes: Task 1 y Task 2.
- Produces:
  - `@Composable fun rememberBodyMap(): BodyMapData?` — lee `BODY_MAP_ASSET` con `LocalContext.current.assets` una sola vez por proceso (caché en un `object`), fuera del hilo principal (`produceState` + `Dispatchers.IO`); `null` mientras carga o si falla.
  - `@Composable fun BodyMap(painted: Set<String>, views: List<BodyView>, contentDescription: String, modifier: Modifier = Modifier)` — sin datos no dibuja nada. Las vistas van lado a lado, cada una con la proporción de su `viewBox` (670 × 1280), dentro del tamaño que le dé `modifier`.

- [ ] **Step 1: Implementar `BodyMapAssets.kt`** (`rememberBodyMap`).

- [ ] **Step 2: Implementar `BodyMap.kt`.** Por vista: `Canvas` con `semantics { this.contentDescription = … }` en el contenedor; los `Path` se construyen con `PathParser().parsePathString(d).toPath()` dentro de `remember(data)` (no en cada frame); se traslada por `-viewBox.x, -viewBox.y` y se escala a `size.width / 670f` (el mismo factor en los dos ejes). Cada parte: relleno `Brand` si está en `painted`, `BodyNeutral` si está en `NEUTRAL_PARTS`, si no `BodyMuscle`; borde `FtColors.Background` de 3 unidades del viewBox. Al final el contorno con `BodyOutline` y solo borde. El color pintado puede animarse con `animateColorAsState` (opcional).

- [ ] **Step 3: Compila** — `./gradlew checkFileLength assembleDebug` → BUILD SUCCESSFUL.

---

### Task 4: Tarjeta del músculo en la sesión activa

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/workout/WorkoutMuscles.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/workout/components/MuscleCard.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/workout/WorkoutContent.kt` (entre `LoadPanel(...)` y el `Button` principal)
- Test: `mobile/app/src/test/java/com/fittrainer/ui/workout/WorkoutMusclesTest.kt`

**Interfaces:**
- Consumes: `paints`, `partsFor`, `equipmentLabel`, `muscleLabel`, `BodyMap`, `BodyView`.
- Produces:
  - `val MUSCLE_CARD_MIN_HEIGHT: Dp = 720.dp` — alto disponible mínimo para mostrar la tarjeta. Ajustarlo en el emulador: con un alto apenas mayor, el botón principal y `BottomActions` se ven enteros sin scroll.
  - `fun showsMuscleCard(muscleGroup: String?, availableHeight: Dp): Boolean` = `paints(muscleGroup) && availableHeight >= MUSCLE_CARD_MIN_HEIGHT`.
  - `fun muscleCardLine(exercise: WorkoutExercise): String` — `"Barra · 4 series"`; sin equipo `"4 series"`; `"1 serie"` en singular. Usa `exercise.totalSets`.
  - `@Composable fun MuscleCard(exercise: WorkoutExercise, modifier: Modifier = Modifier)` — fila con fondo `FtColors.Card`, borde `FtColors.Border`, forma `MaterialTheme.shapes.large`: `BodyMap(partsFor(group), listOf(FRONT, BACK), "Músculo trabajado: <label>", Modifier.size(122.dp, 112.dp))`; a la derecha "TRABAJÁS" (`labelSmall`, `TextSecondary`), `muscleLabel(group)` (`headlineSmall`, `BrandText`) y `muscleCardLine` (`bodySmall`, `TextSecondary`).

- [ ] **Step 1: Test que falla.**

```kotlin
private fun ex(group: String?, equipment: String?, sets: Int?) = WorkoutExercise(
    0, null, "e1", null, "Press", group, equipment, null, null, sets, 8, 90, 60.0,
)
@Test fun `la tarjeta solo aparece si pinta algo y entra en la pantalla`() {
    assertTrue(showsMuscleCard("chest", 800.dp))
    assertTrue(showsMuscleCard("full_body", 800.dp))
    assertFalse(showsMuscleCard("cardio", 800.dp))
    assertFalse(showsMuscleCard(null, 800.dp))
    assertFalse(showsMuscleCard("yoga", 800.dp))
    assertFalse(showsMuscleCard("chest", 600.dp))
}
@Test fun `linea de equipo y series`() {
    assertEquals("Barra · 4 series", muscleCardLine(ex("chest", "barbell", 4)))
    assertEquals("4 series", muscleCardLine(ex("chest", null, 4)))
    assertEquals("Peso corporal · 1 serie", muscleCardLine(ex("core", "bodyweight", 1)))
    assertEquals("Mancuernas · 3 series", muscleCardLine(ex("chest", "dumbbell", null))) // DEFAULT_SETS
}
```

- [ ] **Step 2: Correr y ver que falla** — `./gradlew testDebugUnitTest --tests "*WorkoutMusclesTest"` → no compila.

- [ ] **Step 3: Implementar `WorkoutMuscles.kt` y `MuscleCard.kt`.**

- [ ] **Step 4: Integrar en `WorkoutContent`:** el `Column` de la serie (no el del timer) pasa a estar dentro de un `BoxWithConstraints(Modifier.fillMaxSize())`; después de `LoadPanel(...)`: `if (showsMuscleCard(exercise.muscleGroup, maxHeight)) MuscleCard(exercise)`. La rama del descanso no cambia.

- [ ] **Step 5: Correr y ver que pasa** — `./gradlew checkFileLength assembleDebug testDebugUnitTest --tests "*WorkoutMusclesTest"` → PASS, `WorkoutContent.kt` sigue debajo de 200 líneas.

---

### Task 5: Fila y hoja con los músculos de la rutina en Hoy

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/TodayMuscles.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/components/MusclesRow.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/today/components/TodayMusclesSheet.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/today/components/RoutineHeroCard.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/today/TodayScreen.kt` (estado de la hoja y llamada a `RoutineHeroCard`, línea ~128)
- Test: `mobile/app/src/test/java/com/fittrainer/ui/today/TodayMusclesTest.kt`

**Interfaces:**
- Consumes: `paints`, `partsFor`, `muscleLabel`, `busiestView`, `rememberBodyMap`, `BodyMap`, `DEFAULT_SETS` (`data/workout/Workout.kt`), `Routine`.
- Produces:
  - `data class MuscleGroupSummary(val group: String, val label: String, val exercises: List<String>, val sets: Int)`
  - `fun todayMuscles(routine: Routine): List<MuscleGroupSummary>` — solo ejercicios con `paints(muscleGroup)`; agrupados en orden de primera aparición; `sets` = suma de `sets ?: DEFAULT_SETS`.
  - `fun musclesRowText(groups: List<MuscleGroupSummary>): String` — labels unidos por `" · "`; más de tres: los tres primeros + `" +N"` (ej. `"Pecho · Espalda · Hombros +2"`).
  - `fun paintedParts(groups: List<MuscleGroupSummary>): Set<String>` = unión de `partsFor(group)`.
  - `@Composable fun MusclesRow(groups: List<MuscleGroupSummary>, onClick: () -> Unit)` — fila clickeable entera, alto ≥ `Spacing.minTouchTarget`, fondo `FtColors.Surface`, borde `FtColors.Border`: miniatura `BodyMap(paintedParts, listOf(busiestView(data, paintedParts)), "", Modifier.size(29.dp, 56.dp))` (sin datos: sin miniatura), `musclesRowText` (`bodyMedium`), "Ver músculos de hoy" (`bodySmall`, `TextSecondary`) y un chevron.
  - `@Composable fun TodayMusclesSheet(routineName: String, groups: List<MuscleGroupSummary>, onDismiss: () -> Unit)` — `ModalBottomSheet(containerColor = FtColors.Surface)`: "MÚSCULOS DE HOY", `routineName`, botón ✕ (`IconButton`, `contentDescription = "Cerrar"`), `BodyMap(paintedParts, listOf(FRONT, BACK), "Músculos de hoy: …", Modifier.size(282.dp, 260.dp))` centrado sobre `FtColors.Card`, y por grupo: punto `Brand`, label, ejercicios unidos por `" · "` y `"N SERIES"` (`"1 SERIE"`).
  - `RoutineHeroCard(routine, workoutActive, onStart, onOpenMuscles: () -> Unit)` — calcula `remember(routine) { todayMuscles(routine) }` y, si no está vacía, pone `MusclesRow` entre el resumen y "Empezar".

- [ ] **Step 1: Test que falla.**

```kotlin
private fun re(name: String, group: String?, sets: Int?) =
    RoutineExercise(name, "x-$name", name, group, null, null, sets, 8, 90, null, null, null)
private fun routine(vararg e: RoutineExercise) = Routine("r", "Empuje", null, emptySet(), Instant.EPOCH, e.toList())

@Test fun `agrupa en orden de aparicion y suma series`() {
    val g = todayMuscles(routine(re("Banca", "chest", 4), re("Militar", "shoulders", null), re("Inclinado", "chest", 3)))
    assertEquals(listOf("chest", "shoulders"), g.map { it.group })
    assertEquals(listOf("Banca", "Inclinado"), g[0].exercises)
    assertEquals(7, g[0].sets)
    assertEquals(3, g[1].sets) // DEFAULT_SETS
    assertEquals("Pecho", g[0].label)
}
@Test fun `sin grupo, desconocido y cardio no cuentan`() {
    assertTrue(todayMuscles(routine(re("Bici", "cardio", 1), re("Nuevo", "yoga", 2), re("Otro", null, 3))).isEmpty())
}
@Test fun `texto de la fila con mas de tres grupos`() {
    val g = todayMuscles(routine(re("a", "chest", 1), re("b", "back", 1), re("c", "shoulders", 1), re("d", "legs", 1), re("e", "core", 1)))
    assertEquals("Pecho · Espalda · Hombros +2", musclesRowText(g))
    assertEquals("Pecho", musclesRowText(g.take(1)))
}
@Test fun `partes pintadas de la rutina`() {
    val g = todayMuscles(routine(re("a", "chest", 1), re("b", "triceps", 1)))
    assertEquals(setOf("chest", "triceps"), paintedParts(g))
}
```

- [ ] **Step 2: Correr y ver que falla** — `./gradlew testDebugUnitTest --tests "*TodayMusclesTest"` → no compila.

- [ ] **Step 3: Implementar `TodayMuscles.kt`, `MusclesRow.kt` y `TodayMusclesSheet.kt`; cambiar `RoutineHeroCard`.**

- [ ] **Step 4: Integrar en `TodayScreen`:** `var musclesOpen by rememberSaveable { mutableStateOf(false) }`; `RoutineHeroCard(..., onOpenMuscles = { musclesOpen = true })`; si `musclesOpen` y el contenido es `TodayContent.Training`, `TodayMusclesSheet(routine.name, todayMuscles(routine)) { musclesOpen = false }`. Pasar el callback por `todayItems` igual que `onStartWorkout`. `TodayScreen.kt` tiene que quedar ≤ 200 líneas (hoy 146).

- [ ] **Step 5: Correr y ver que pasa** — `./gradlew checkFileLength assembleDebug testDebugUnitTest --tests "*TodayMusclesTest"` → PASS.

---

### Task 6: Verificación completa y prueba en el emulador

**Files:** ninguno nuevo.

- [ ] **Step 1: Suite completa** — desde `mobile/`: `./gradlew checkFileLength assembleDebug testDebugUnitTest` → BUILD SUCCESSFUL, 0 tests fallidos.

- [ ] **Step 2: Emulador (API `http://10.0.2.2:3001/api`), con el alumno de prueba** y una rutina que tenga pecho, espalda, piernas, un `full_body` y un ejercicio sin grupo (cargarla desde la web o Supabase dev si no existe):
  - Hoy: la fila muestra los grupos y la miniatura; tocarla abre la hoja; se cierra con ✕, deslizando y tocando afuera; "Empezar" sigue funcionando y no abre la hoja.
  - Sesión activa: la tarjeta aparece debajo del peso sugerido con el músculo correcto; cambia al pasar de ejercicio y al reemplazar; no aparece en el descanso ni en el ejercicio sin grupo; `full_body` dice "Cuerpo completo".
  - En un emulador de pantalla baja (por ejemplo 720 × 1280, 320 dpi): el botón "Serie completa" y `BottomActions` se ven enteros; ajustar `MUSCLE_CARD_MIN_HEIGHT` si hace falta.
  - Modo avión: todo lo anterior sigue funcionando.

- [ ] **Step 3: Dejar listo para Igna:** `git status` limpio salvo los archivos de este plan; listar los archivos tocados para el commit.
