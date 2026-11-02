---
tags: [plan]
tarjeta: descanso-ajustable
---
# Descanso ajustable — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** el alumno ajusta el descanso de un ejercicio, la app registra el descanso real de cada serie, lo sube y el historial (celular y API para la web) lo muestra contra el plan.

**Architecture:** columna `session_sets.rest_seconds` (backend), que viaja en `POST /sessions/:id/sets` y vuelve en el detalle del historial junto a `planned.rest_seconds`. En mobile, Room v9 suma el override por ejercicio y el descanso real por serie; el repositorio lo escribe en la misma transacción que cierra el descanso.

**Tech Stack:** Node 20 + Express + Supabase (Jest); Kotlin + Compose + Room + Hilt (JUnit).

**Spec:** `docs/superpowers/specs/2026-11-01-descanso-ajustable-design.md`

## Global Constraints

- Ningún archivo de código (tests y `.sql` incluidos) pasa de 200 líneas físicas; si se pasa, se divide en una carpeta propia.
- Capa → módulo → archivo; los tests copian el árbol del código.
- `rest_seconds` en la API: entero 0 a 3600, o `null`. Ajuste en el celular: 0 a 600 s, de a 15 s.
- Room nunca con migración destructiva; v8 → v9 con `AutoMigration` y su caso en el test de migración.
- Agentes no commitean: cada tarea termina en verde, sin commit (Igna commitea).
- Cambio de contrato avisado en `backend/README.md` y en `docs/arquitectura/contratos-api.md`.

## Review Focus

1. La app estuvo cerrada y el descanso venció: se registra hasta `endsAt`, no hasta que se reabrió → test en Task 3.
2. Descanso pausado y después saltado: cuenta el tiempo pausado → test en Task 3.
3. Se confirma una serie nueva con un descanso todavía corriendo (cambió de ejercicio desde la lista): el descanso anterior se registra igual → test en Task 3.
4. Corregir una serie (mismo id) no le borra el descanso ya registrado → test en Task 3.
5. Serie vieja sin `rest_seconds` (sesiones anteriores, caché del historial v8) → el historial no muestra nada y no rompe → tests en Tasks 1 y 5.

---

### Task 1: Backend — columna, validación e historial

**Files:**
- Create: `backend/src/database/migrations/2026-11-01-session-sets-rest.sql`
- Modify: `backend/src/database/schema/04-progress.sql` (tabla `session_sets`), `backend/src/database/checks/schema-checks.sql`
- Modify: `backend/src/validations/sessions/session-set.validation.js` (`parseSet`)
- Modify: `backend/src/repositories/sessions/session-history.repository.js` (`SET_COLUMNS`, select del plan en la línea ~100)
- Modify: `backend/src/models/sessions/session-history.model.js` (`toPlanned`, `toSetOut`)
- Modify: `backend/README.md`, `docs/arquitectura/contratos-api.md` (§ POST sets línea ~608 y detalle del historial líneas ~711-719)
- Test: `backend/tests/unit/validations/sessions/session-set.validation.test.js`, `backend/tests/unit/models/sessions/session-history.model.test.js`, `backend/tests/unit/repositories/sessions/session-history.repository.test.js`

**Interfaces:**
- Produces: serie del POST acepta `rest_seconds`; detalle devuelve `sets[].rest_seconds` y `planned.rest_seconds` (number | null).

- [ ] **Step 1: Tests que fallan**
  - Validación: `rest_seconds: 90` → `value.rest_seconds === 90`; ausente o `null` → `null`; `0` y `3600` válidos; `-1`, `3601`, `1.5`, `"90"` → `ok: false` con `field: 'rest_seconds'`.
  - Modelo: `groupSetsByExercise` con una serie `rest_seconds: '120'` → `120` (coerción como los otros numéricos); sin el campo → `null`; plan `{ rest_seconds: 90 }` → `planned.rest_seconds === 90`.
  - Repositorio: el select de series incluye `rest_seconds` y el del plan `id, sets, reps, suggested_kg, rest_seconds`.
- [ ] **Step 2:** `cd backend && npm test -- session-set.validation session-history` → FAIL.
- [ ] **Step 3: Implementar**
  - SQL: `alter table session_sets add column if not exists rest_seconds int check (rest_seconds >= 0);` en la migración; en el `create table` del schema, la columna después de `executed_at`. Sumarla a `schema-checks.sql` como las otras columnas.
  - `parseSet`: `rest_seconds` opcional, con el mismo patrón que `actual_kg` pero entero (`Number.isInteger`, 0-3600). `persistSets` ya la inserta y actualiza (hace spread de `value`).
  - Repositorio y modelo: sumar la columna; `toSetOut` y `toPlanned` usan `toNum`.
  - README: aviso de contrato (campo nuevo, compatible) y tarea para Pablo en la web: mostrar el descanso por serie en el detalle y marcarlo si difiere de `planned.rest_seconds`.
- [ ] **Step 4:** `npm run lint && npm test` → todo verde.
- [ ] **Step 5:** aplicar la migración en Supabase dev (`mcp__claude_ai_Supabase__apply_migration`) y verificar la columna con `list_tables`.

### Task 2: Mobile — Room v9, dominio y DTO de subida

**Files:**
- Modify: `mobile/app/src/main/java/com/fittrainer/data/db/workout/WorkoutEntities.kt` (`WorkoutExerciseEntity`, `WorkoutSetEntity`)
- Modify: `mobile/app/src/main/java/com/fittrainer/data/db/workout/history/HistoryEntities.kt` (`HistoryExerciseEntity`, `HistorySetEntity`)
- Modify: `mobile/app/src/main/java/com/fittrainer/data/db/FitTrainerDatabase.kt` (version 9, `AutoMigration(from = 8, to = 9)`)
- Modify: `mobile/app/src/main/java/com/fittrainer/data/workout/Workout.kt`, `WorkoutMapper.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/data/api/SessionApi.kt` (`SessionSetDto`) y el `toDto()` de las series (en `data/sync`)
- Test: `mobile/app/src/androidTest/java/com/fittrainer/data/db/FitTrainerDatabaseMigrationTest.kt` (181 líneas: si el caso nuevo lo pasa de 200, dividir en `androidTest/.../data/db/migration/` por rangos de versiones), test del mapper/DTO en `test/.../data/sync/`

**Interfaces:**
- Produces:
  - `WorkoutExerciseEntity.restOverrideSeconds: Int? = null`; `WorkoutSetEntity.restSeconds: Int? = null`
  - `HistoryExerciseEntity.plannedRestSeconds: Int? = null`; `HistorySetEntity.restSeconds: Int? = null`
  - `WorkoutExercise.restOverrideSeconds: Int?`; `WorkoutExercise.restTotal` = `(restOverrideSeconds ?: restSeconds ?: DEFAULT_REST_SECONDS).coerceAtLeast(0)`; `WorkoutExercise.plannedRest: Int` = `(restSeconds ?: DEFAULT_REST_SECONDS).coerceAtLeast(0)`
  - `WorkoutSet.restSeconds: Int?` (último parámetro, default `null`)
  - `SessionSetDto.restSeconds` con `@SerialName("rest_seconds")`, `Int? = null`

- [ ] **Step 1: Tests que fallan:** `migra8a9ConLosDescansosNulos` (inserta una serie y un ejercicio en v8, migra, valida y lee `restSeconds`/`restOverrideSeconds` nulos); `restTotal` usa el override y `plannedRest` no; el DTO serializa `"rest_seconds":95` y `null`.
- [ ] **Step 2:** `gradlew testDebugUnitTest` → FAIL (no compila).
- [ ] **Step 3: Implementar** los campos, el mapeo ida y vuelta en `WorkoutMapper` y el export del schema 9 (`app/schemas/.../9.json` lo genera el build).
- [ ] **Step 4:** `gradlew checkFileLength assembleDebug testDebugUnitTest` → verde. El test de migración corre en el emulador: `gradlew connectedDebugAndroidTest --tests "*FitTrainerDatabaseMigrationTest*"`.

### Task 3: Mobile — registro del descanso real y override

**Files:**
- Modify: `mobile/app/src/main/java/com/fittrainer/data/workout/WorkoutRules.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/data/workout/WorkoutRepository.kt` (`saveSet`, `updateRest`, `finish`, nuevo `adjustPlannedRest`)
- Modify (si hace falta una query): `mobile/app/src/main/java/com/fittrainer/data/db/workout/WorkoutDao.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/workout/RestRulesTest.kt`, nuevo `WorkoutRepositoryRestTest.kt` al lado

**Interfaces:**
- Consumes: campos de Task 2.
- Produces:
  - `fun Rest.endedAt(now: Instant): Instant` = `endsAt` si `isOver(now)`, si no `now`.
  - `fun Workout.closingRest(now: Instant): WorkoutSet?` → la `lastDoneSet()` con `restSeconds` = segundos redondeados (`Math.round(ms / 1000.0)`) de `executedAt` a `rest.endedAt(now)`, `coerceIn(0, 3600)`; `null` si no hay descanso corriendo o no hay serie.
  - `const val MAX_REST_PICK_SECONDS = 600`, `const val REST_STEP_SECONDS = 15`
  - `suspend fun WorkoutRepository.adjustPlannedRest(ownerId: String, position: Int, deltaSeconds: Int)`: nuevo valor `(restTotal + delta).coerceIn(0, 600)`, guardado en `restOverrideSeconds`.

- [ ] **Step 1: Tests que fallan** (reloj fijo como en los tests actuales):
  - Reglas: venció con la app cerrada (now = endsAt + 5 min) → restSeconds 90; saltado a los 40 s → 40; pausado 30 s y saltado → incluye los 30 s; −15″ hasta 0 → el tiempo hasta ese toque; sin descanso → `null`.
  - Repositorio: `skipRest` deja `restSeconds` en la serie anterior y la sesión sin descanso, en una sola escritura; `endRestIfOver` antes de vencer no escribe nada; `finish` con descanso corriendo lo registra; la última serie de la sesión queda nula y la última de un ejercicio (que dispara el descanso de transición) lo registra; serie nueva confirmada con un descanso corriendo registra el anterior; corregir una serie conserva su `restSeconds`; `adjustPlannedRest` +15 desde 90 → 105, −15 en 0 → 0, +15 en 600 → 600, y la siguiente serie arranca el timer con el override.
- [ ] **Step 2:** `gradlew testDebugUnitTest --tests "*Rest*"` → FAIL.
- [ ] **Step 3: Implementar:** `updateRest`, `finish` y `saveSet` (serie nueva) llaman a `closingRest` y, si hay serie, usan `dao.saveSet(set, session)` para escribir las dos cosas juntas. La corrección de `saveSet` copia el `restSeconds` viejo (ya lo hace al usar `old.copy`).
- [ ] **Step 4:** `gradlew checkFileLength testDebugUnitTest` → verde.

### Task 4: Mobile — control de descanso en la pantalla de la serie

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/workout/components/RestPicker.kt`
- Modify: `ui/workout/WorkoutContent.kt` (fila entre `LoadPanel` y el CTA; nuevo `WorkoutActions.onPlannedRestAdjust: (Int) -> Unit`), `WorkoutScreen.kt` (cablearlo), `WorkoutViewModel.kt` (`fun onPlannedRestAdjust(delta: Int)` con `write { repository.adjustPlannedRest(it, cursor.position, delta) }`), `WorkoutTexts.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/workout/WorkoutTextsTest.kt`, `WorkoutViewModelTest.kt`

**Interfaces:**
- Consumes: `adjustPlannedRest`, `restTotal`, `plannedRest` (Tasks 2-3).
- Produces: `fun restPickerLabel(chosen: Int, plan: Int): String`.

- [ ] **Step 1: Tests que fallan:** `restPickerLabel(90, 90) == "Descanso 1:30"`; `restPickerLabel(120, 90) == "Descanso 2:00 · plan 1:30"`; `restPickerLabel(0, 90) == "Sin descanso · plan 1:30"`; el VM llama al repositorio con la posición del cursor.
- [ ] **Step 2:** correr los tests → FAIL.
- [ ] **Step 3: Implementar** `RestPicker(label, onMinus, onPlus)`: texto + dos `FilledTonalButton` "−15″" / "+15″" con `heightIn(min = Spacing.minTouchTarget)`; deshabilitado −15″ en 0 y +15″ en 600. No se muestra mientras se corrige una serie (`editingSet != null`). Revisar que `WorkoutViewModel` siga ≤ 200 líneas (hoy 193).
- [ ] **Step 4:** `gradlew checkFileLength assembleDebug testDebugUnitTest` → verde.

### Task 5: Mobile — historial con el descanso

**Files:**
- Modify: `data/api/history/HistoryDtos.kt` (`PlannedDto.restSeconds`, `HistorySetDto.restSeconds`, ambos `@SerialName("rest_seconds") Int? = null`)
- Modify: `data/workout/history/HistoryModels.kt` (`HistorySet.restSeconds: Int? = null`, `HistoryExercise.plannedRestSeconds: Int? = null`), `HistoryMapper.kt`, `HistoryLocalMapper.kt` (plan local = `WorkoutExerciseEntity.restSeconds`, sin default ni override)
- Modify: `ui/workout/history/HistoryTexts.kt` (`setLine`), `ui/workout/history/detail/components/ExerciseBlock.kt`
- Test: `test/.../ui/workout/history/HistoryTextsTest.kt`, tests de los mappers en `test/.../data/workout/history/`

**Interfaces:**
- Produces: `fun setLine(set: HistorySet, plannedRest: Int?): String`; `fun restDiffers(set: HistorySet, plannedRest: Int?): Boolean` (true solo si los dos existen y son distintos).

- [ ] **Step 1: Tests que fallan:** `setLine` con rest 120 y plan 90 termina en `" · desc. 2:00 (plan 1:30)"`; rest 90 y plan 90 → `" · desc. 1:30"`; rest 90 y plan `null` → `" · desc. 1:30"`; rest `null` → igual que hoy; `restDiffers` en esos cuatro casos; mapper del servidor y local copian descanso y plan; un DTO sin `rest_seconds` deserializa con `null`.
- [ ] **Step 2:** correr los tests → FAIL.
- [ ] **Step 3: Implementar.** `ExerciseBlock` pinta la línea de una serie con `restDiffers` en `FtColors.Amber`.
- [ ] **Step 4:** `gradlew checkFileLength assembleDebug testDebugUnitTest` → verde.

### Task 6: Verificación de punta a punta y auditoría

- [ ] **Step 1:** `cd backend && npm run lint && npm test`; `cd mobile && gradlew checkFileLength assembleDebug testDebugUnitTest` → verde, con la salida a mano.
- [ ] **Step 2: E2E en el emulador** contra el backend local, con `alumna.card8`: cambiar el descanso de un ejercicio a 2:00, hacer una serie con pausa y otra con "Saltar", terminar, esperar la subida y ver en el historial "desc. 2:00 (plan 1:30)" marcado. Verificar en Supabase (`execute_sql`) que `session_sets.rest_seconds` tiene los valores y en `GET /students/:id/sessions/:sessionId` que vienen `rest_seconds` y `planned.rest_seconds`.
- [ ] **Step 3:** mover la tarjeta dwQI3sGR a 🔍 AUDITORÍA CODEX con el comentario `🛠️ CLAUDE · Lista para auditar` (rama, base, carpetas, spec y plan, criterio, cómo se probó, pendientes: web de Pablo, celular físico, conflicto posible con la #50).
