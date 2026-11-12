# GX8 en el celular (M1, M2 y M3 + aviso) · Plan de implementación

> **Para agentes:** sub-skill requerida: superpowers:subagent-driven-development o superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:**
- el alumno ve el nivel de sus rutinas;
- el PT lo elige y lo ve;
- al invitar se puede dejar una plantilla inicial con sus días;
- el aviso `initial_routine_failed` abre la ficha.

**Arquitectura:**
- Room pasa de la v25 a la v26 con dos columnas nuevas que aceptan null (`routines.level` y `trainer_routines.level`). El nivel viaja DTO → entidad → dominio → textos de UI.
- La plantilla inicial vive en `InviteForm` (`templateId`, `routineDays`) y sale de las plantillas del PT que ya están en Room (`TrainerTemplatesRepository`).
- La notificación es un valor más del enum, con su destino.

**Stack:** Kotlin, Jetpack Compose, Room (`AutoMigration`), Hilt, Retrofit y kotlinx.serialization, con JUnit para las unitarias y `MigrationTestHelper` para la instrumentada.

**Spec:** `docs/superpowers/specs/2026-11-10-gx8-mobile-nivel-plantilla-design.md`.

Raíz del código: `mobile/app/src/main/java/com/fittrainer/`. Los tests van en `mobile/app/src/test/java/com/fittrainer/`, con el mismo árbol.

## Restricciones globales

- **Ningún archivo pasa de 200 líneas**, tests incluidos. El orden es capa → módulo → archivo, y los tests copian el árbol del código.
- Room es la única fuente de verdad: la UI no llama a Retrofit.
- Niveles válidos: `beginner`, `intermediate` y `advanced`. Etiquetas: Principiante, Intermedio y Avanzado. Sin nivel no se muestra nada. "Sin definir" aparece solo como opción en los selectores.
- Los días van en orden de la semana (`WEEK_DAYS`, de `data/routines/trainer/RoutinePatch.kt`).
- **Con plantilla, siempre se mandan `template_id` y `routine_days`** (no vacío).
- **Textos fijos:**
  - "Plantilla inicial (opcional)", "Sin plantilla" y "Cargando plantillas…";
  - "No pudimos cargar tus plantillas" y "Todavía no tenés plantillas";
  - "Elegí al menos un día" y "Esa plantilla ya no existe; elegí otra".
- **Commits:** ni los agentes ni Claude commitean. Commitea Igna, sin firmas de IA.
- **Antes de terminar:** `gradlew checkFileLength assembleDebug testDebugUnitTest` y `gradlew connectedDebugAndroidTest --tests "*MigrationV26Test"` (con emulador), corridos desde `mobile/`.

## Foco de la revisión

1. **Backend viejo (sin la #104):** `level` no llega. Las rutinas quedan sin nivel y no se ve nada; no se rompe la deserialización. Lo cubren los tests de los mappers con DTO sin `level`, en las tareas 2 y 3.
2. **Plantilla elegida y días sacados uno por uno hasta vaciarlos:** el envío tiene que frenarse en el cliente con "Elegí al menos un día" y no mandar `routine_days: []`. Lo cubre la tarea 5 (`InviteForm.errors`).
3. **El proceso muere con la plantilla elegida** (el PT va a WhatsApp): al volver, la plantilla y los días siguen ahí. Lo cubre la tarea 6, con un test del `SavedStateHandle`.
4. **La plantilla elegida desaparece de Room** porque otro dispositivo la borró y el refresh la quitó: el campo vuelve a "Sin plantilla" y los días desaparecen, en vez de mandar un id que ya no está en la lista. Lo cubre la tarea 6.
5. **El PT pasa una rutina de "Intermedio" a "sin nivel":** el `PATCH` manda `level: null` explícito, no lo omite. Lo cubre la tarea 4.

---

### Tarea 1: Etiqueta de nivel única y chips de días compartidos

**Archivos:**
- Crear: `ui/components/LevelLabel.kt`, con `fun levelLabel(level: String?): String?` (null o desconocido → null; desconocido devuelve el texto tal cual, como hoy) y `fun levelOptionLabel(level: String?): String` (null → "Sin definir"; si no, `levelLabel(level)`).
- Crear: `ui/components/DayChips.kt`, con `@Composable fun DayChips(selected: Set<String>, enabled: Boolean, onToggle: (String) -> Unit)`: los chips de `WEEK_DAYS` con `dayChip(day)`, color de marca y 44 dp de toque mínimo. Es el bloque que hoy está en `RoutineHeaderFields.kt:60-71`.
- Modificar:
  - `ui/invitations/InviteTexts.kt`: borrar su `levelLabel`. `InviteFormFields` pasa a usar `::levelOptionLabel`.
  - `ui/templates/trainer/TemplatesTexts.kt`: borrar su `levelLabel` y su `LEVELS`, y usar el compartido y `data.invitation.invite.LEVELS`.
  - `ui/routines/trainer/components/RoutineHeaderFields.kt` y `ui/templates/trainer/assign/AssignTemplateSheet.kt`: usar `DayChips`.
  - `SaveAsTemplateSheet.kt` y los demás que importaban alguno de los dos `levelLabel`. Buscarlos con `grep -rn "levelLabel" mobile/app/src`.
- Test: `ui/components/LevelLabelTest.kt` (nuevo). Mover los casos de nivel de `InviteTextsTest` hacia acá.

**Interfaces:**
- Produce: `levelLabel(String?): String?`, `levelOptionLabel(String?): String` y `DayChips(selected, enabled, onToggle)`.

- [ ] **Paso 1:** test `LevelLabelTest`:
  - `levelLabel("intermediate") == "Intermedio"`, `levelLabel(null) == null` y `levelLabel("x") == "x"`;
  - `levelOptionLabel(null) == "Sin definir"` y `levelOptionLabel("advanced") == "Avanzado"`.
- [ ] **Paso 2:** `gradlew testDebugUnitTest --tests "*LevelLabelTest"`. Tiene que fallar porque no existe.
- [ ] **Paso 3:** crear los dos archivos, borrar las copias y repuntar los imports.
- [ ] **Paso 4:** `gradlew testDebugUnitTest assembleDebug` en verde, con `InviteTextsTest` y los tests de plantillas sin cambios de comportamiento.

### Tarea 2: Room v26 y el nivel en las rutinas del alumno (datos de M1)

**Archivos:**
- Modificar:
  - `data/api/RoutineApi.kt`: `StudentRoutineDto.level: String? = null`.
  - `data/db/routine/RoutineEntities.kt`: `RoutineEntity.level: String? = null`, como último campo.
  - `data/routine/Routine.kt`: `Routine.level: String? = null`, como último campo con default para no tocar a los que la construyen.
  - `data/routine/RoutineMapper.kt`: `toEntity` y `toDomain` pasan el `level`.
  - `data/db/routines/trainer/TrainerRoutineEntities.kt`: `TrainerRoutineEntity.level: String? = null`, como último campo. Su mapper es de la tarea 3, pero la columna entra acá para que la migración sea una sola.
  - `data/db/FitTrainerDatabase.kt`: `version = 26` y `AutoMigration(from = 25, to = 26)` con el comentario `// v26: nivel de la rutina (GX8), routines.level y trainer_routines.level.` El archivo tiene 194 líneas y queda en 196.
  - `mobile/app/schemas/.../26.json`: lo genera el build (`room.schemaLocation`). Va en la PR.
- Test:
  - `data/routine/RoutineMapperTest.kt`: casos nuevos.
  - `mobile/app/src/androidTest/java/com/fittrainer/data/db/migration/v2x/MigrationV26Test.kt` (nuevo): el patrón de `MigrationV25Test`.

**Interfaces:**
- Produce: `Routine.level: String?` y `TrainerRoutineEntity.level: String?`.

- [ ] **Paso 1:** tests en `RoutineMapperTest`:
  - `dto con level llega al dominio`: `StudentRoutineDto(..., level = "advanced")` → `toEntity().level == "advanced"` y, por `RoutineWithExercises`, `toDomain().level == "advanced"`;
  - `dto sin level queda null`: un JSON sin la clave, decodificado con el `Json` de la app, da `level == null`.
- [ ] **Paso 2:** que fallen.
- [ ] **Paso 3:** campos, mapper y DB v26.
- [ ] **Paso 4:** `MigrationV26Test.migra25a26ConservandoLasRutinas`:
  - `createDatabase(DB, 25)`, insertar una fila en `routines` (id `r1`, name `Push`, goal `NULL`, days `monday`, createdAt 1) y una en `trainer_routines` (trainerId `t1`, id `r2`, studentId `s1`, name `Pull`, goal `NULL`, days `friday`, active 1, createdAt 1);
  - `runMigrationsAndValidate(DB, 26, true)`;
  - `SELECT name, level FROM routines WHERE id='r1'` da `Push` y level null, y lo mismo con `trainer_routines` `r2`.
- [ ] **Paso 5:** `gradlew testDebugUnitTest assembleDebug` en verde y `26.json` generado. `gradlew connectedDebugAndroidTest --tests "*MigrationV26Test"` en verde (necesita emulador; si no hay, anotarlo como pendiente).

### Tarea 3: El alumno ve el nivel en Hoy y en Mis rutinas (UI de M1) y el PT lo ve en la ficha (datos de M2)

**Archivos:**
- Modificar:
  - `ui/today/RoutineTexts.kt`: `heroSummary` suma `levelLabel(routine.level)?.uppercase()` al final, si no es null.
  - `ui/routines/RoutinesUiState.kt`: en `toCard`, `goal = listOfNotNull(goal?.let(::goalLabel), levelLabel(level)).joinToString(" · ").ifEmpty { null }`.
  - `data/api/routines/TrainerRoutineDtos.kt`: `level: String? = null` en `TrainerRoutineSummaryDto` y en `TrainerRoutineDetailDto`.
  - `data/routines/trainer/TrainerRoutine.kt`: `TrainerRoutineSummary.level: String? = null`, como último campo.
  - `data/routines/trainer/TrainerRoutineMapper.kt`: los dos `toEntity` y `toDomain` pasan el `level`.
  - `ui/routines/trainer/section/RoutinesSection.kt:66`: la línea suma `levelLabel(routine.level)` después del objetivo.
  - El encabezado del editor (`RoutineEditorScreen`, donde se muestran el objetivo y los días): suma el nivel con el mismo formato. Sin líneas nuevas en `RoutineEditorViewModel.kt`, que ya tiene 200.
- Test:
  - `ui/today/RoutineTextsTest.kt`;
  - `ui/routines/RoutinesContentTest.kt`;
  - `data/routines/trainer/TrainerRoutineMapperTest.kt` (nuevo, si no existe).

**Interfaces:**
- Consume: `Routine.level` (tarea 2) y `levelLabel` (tarea 1).
- Produce: `TrainerRoutineSummary.level: String?`.

- [ ] **Paso 1:** tests:
  - `heroSummary` con nivel `intermediate` termina en `" · INTERMEDIO"`, y sin nivel queda igual que hoy;
  - la tarjeta de Mis rutinas con `goal = "hypertrophy"` y `level = "intermediate"` da `goal == "Hipertrofia · Intermedio"`; con solo nivel da `"Intermedio"`; sin ninguno da `null`;
  - el mapper del PT: `TrainerRoutineSummaryDto` y `TrainerRoutineDetailDto` con `level` → entidad → `toDomain().level`.
- [ ] **Paso 2:** que fallen.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `gradlew testDebugUnitTest` en verde.

### Tarea 4: El PT elige el nivel al crear, al editar y al guardar como plantilla (M2)

**Archivos:**
- Modificar `data/routines/trainer/RoutinePatch.kt`:
  - `RoutineField` suma `LEVEL`.
  - `RoutineHeaderInput` suma `val level: String? = null`.
  - `toHeaderInput()` pasa `level`.
  - `errors()` no valida el nivel: es opcional y solo sale de los chips.
  - `headerPatch` agrega `"level"` si `after.level != before.level`: `JsonPrimitive(level)`, o `JsonNull` si pasó a null.
  - `routineFieldOf("level") = RoutineField.LEVEL`.
- Modificar `data/api/routines/TrainerRoutineDtos.kt`: `CreateRoutineRequest.level: String? = null`, que no se manda si es null.
- Modificar `ui/routines/trainer/create/NewRoutineViewModel.kt:165`: pasa `level = l.header.level`.
- Modificar `ui/routines/trainer/components/RoutineHeaderFields.kt`: después de OBJETIVO, la etiqueta "NIVEL" con chips de `LEVELS` (`levelLabel`). Tocar el chip elegido lo desmarca (`level = if (it.level == lvl) null else lvl`), y el error de `RoutineField.LEVEL` se muestra igual que los otros. Lo usan la hoja "Editar" y el paso 1 de "Nueva rutina".
- Modificar `ui/routines/trainer/editor/SaveAsTemplateController.kt`: `fun open(routineName: String, level: String?)` arranca con `SaveTemplateState(routineName, level)`.
- Modificar `RoutineEditorViewModel.kt:189`: `saveAsTemplate.open(it.name, it.level)`, sin sumar líneas.
- Modificar `data/api/templates/TrainerTemplateDtos.kt`: `FromRoutineRequest.level` con `@EncodeDefault(EncodeDefault.Mode.ALWAYS)` (y `@OptIn(ExperimentalSerializationApi::class)`), para que el `null` viaje explícito.
- Test:
  - `data/routines/trainer/RoutinePatchTest.kt`;
  - `ui/routines/trainer/create/NewRoutineViewModelTest.kt`;
  - `ui/routines/trainer/editor/SaveAsTemplateControllerTest.kt`;
  - `data/api/templates/TrainerTemplateDtosTest.kt` (nuevo, si no existe).

**Interfaces:**
- Consume: `TrainerRoutineSummary.level` (tarea 3), y `LEVELS`/`levelLabel` (tarea 1).
- Produce: `RoutineHeaderInput.level`, `RoutineField.LEVEL` y `SaveAsTemplateController.open(name, level)`.

- [ ] **Paso 1:** tests:
  - `headerPatch` de `level = null` a `"advanced"` → `{"level":"advanced"}`;
  - de `"advanced"` a null → `{"level":null}` (clave presente con `JsonNull`);
  - sin cambios → null;
  - `routineFieldOf("level") == LEVEL`;
  - crear con nivel: el `CreateRoutineRequest` que recibe el repositorio falso tiene `level == "beginner"`, y sin nivel el JSON codificado no tiene la clave `level`;
  - `open("Push", "intermediate")` deja el estado en `level == "intermediate"`;
  - `FromRoutineRequest("r", "n", null)` codificado contiene `"level":null`.
- [ ] **Paso 2:** que fallen.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `gradlew testDebugUnitTest checkFileLength` en verde, con `RoutineEditorViewModel.kt` en 200 líneas o menos.

### Tarea 5: Plantilla inicial en el formulario y en el pedido (datos de M3)

**Archivos:**
- Modificar `data/invitation/invite/InviteForm.kt`:
  - `InviteField` suma `TEMPLATE` y `DAYS`.
  - `InviteForm` suma `val templateId: String? = null` y `val routineDays: Set<String> = emptySet()`.
  - `errors()`: con `templateId != null` y ningún día de `WEEK_DAYS` → `DAYS to "Elegí al menos un día"`.
  - `toRequest()`: con plantilla manda `templateId` y `routineDays = WEEK_DAYS.filter { it in routineDays }`; sin plantilla, los dos en null.
  - `inviteFieldOf`: `"template_id" -> TEMPLATE` y `"routine_days" -> DAYS`.
- Modificar `data/api/invitation/TrainerInvitationApi.kt`: en `CreateInvitationRequest`, `@SerialName("template_id") val templateId: String? = null` y `@SerialName("routine_days") val routineDays: List<String>? = null`.
- Modificar `data/invitation/invite/InviteRepository.kt`: en `rejected()`, el código `"TEMPLATE_NOT_FOUND"` da `InviteResult.Rejected(mapOf(InviteField.TEMPLATE to TEMPLATE_GONE), null)`, con `TEMPLATE_GONE = "Esa plantilla ya no existe; elegí otra"`.
- Test:
  - `data/invitation/invite/InviteFormTest.kt`;
  - `data/invitation/invite/InviteRepositoryTest.kt`.

**Interfaces:**
- Consume: `WEEK_DAYS`.
- Produce: `InviteForm.templateId`, `InviteForm.routineDays`, `InviteField.TEMPLATE` e `InviteField.DAYS`.

- [ ] **Paso 1:** tests:
  - sin plantilla, el pedido no lleva `template_id` ni `routine_days` (JSON sin las claves);
  - con `templateId = "t1"` y `routineDays = {"friday", "monday"}`, el pedido da `routineDays == ["monday", "friday"]`;
  - con plantilla y sin días, `errors()[DAYS] == "Elegí al menos un día"`;
  - `inviteFieldOf("template_id") == TEMPLATE` e `inviteFieldOf("routine_days") == DAYS`;
  - un 404 con `{"error":{"code":"TEMPLATE_NOT_FOUND"}}` da `Rejected(fields = {TEMPLATE: "Esa plantilla ya no existe; elegí otra"})`.
- [ ] **Paso 2:** que fallen.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `gradlew testDebugUnitTest` en verde.

### Tarea 6: Campo "Plantilla inicial" en la pantalla de invitar (UI de M3)

**Archivos:**
- Crear `ui/invitations/InitialTemplates.kt`:
  - `sealed interface TemplateChoices` con `Loading`, `Failed` y `data class Ready(val templates: List<TemplateSummary>)`. `Ready` vacío equivale a "no tiene plantillas".
  - `fun templateOptionLabel(t: TemplateSummary): String`, que da `"Push A · 4 días · Intermedio"` ("1 día" en singular; sin nivel, sin el último tramo).
  - `class InitialTemplatesSource @Inject constructor(templates: TrainerTemplatesRepository, session: SessionRepository)`:
    - `fun choices(scope: CoroutineScope): StateFlow<TemplateChoices>`. Con un caché presente da `Ready(cache.templates)`. Sin caché da `Loading` hasta que termina `refreshList`, y `Failed` si falla.
    - `suspend fun refresh()`.
    - El trainerId sale de `session.session`, como en `TemplatesViewModel:58`.
- Modificar `ui/invitations/InviteUiState.kt`: `Editing` suma `val templates: TemplateChoices = TemplateChoices.Loading`.
- Modificar `ui/invitations/InviteViewModel.kt`:
  - inyecta `InitialTemplatesSource`;
  - en `init` junta `choices` y lo vuelca en `Editing.templates`. Si `form.templateId` ya no está en un `Ready`, limpia `templateId` y `routineDays` (foco de la revisión 4);
  - `fun onTemplate(id: String?)`: elige una plantilla y precarga los días con los de la plantilla, o con null limpia los dos;
  - `fun onToggleDay(day: String)`;
  - un `Rejected` con `TEMPLATE` llama a `refresh()`;
  - guarda `invite.template` y `invite.days` (ArrayList) en el `SavedStateHandle`;
  - si pasa de 200 líneas, el guardado y la lectura del `SavedStateHandle` van a `ui/invitations/InviteSavedForm.kt`.
- Crear `ui/invitations/components/InitialTemplateField.kt`, con `@Composable fun InitialTemplateField(state: InviteUiState.Editing, onTemplate: (String?) -> Unit, onToggleDay: (String) -> Unit)`:
  - `Loading` o `Failed`: un `OptionPicker` deshabilitado con "Cargando plantillas…" o "No pudimos cargar tus plantillas";
  - `Ready` vacío: el texto "Todavía no tenés plantillas";
  - `Ready` con plantillas: `OptionPicker("PLANTILLA INICIAL (OPCIONAL)", ...)` con ids como opciones, `labelOf` = `templateOptionLabel` o "Sin plantilla", y `allowNone = true`;
  - con una elegida: "DÍAS", el error de `DAYS` y `DayChips`;
  - el error de `TEMPLATE` va debajo del selector.

  Si `OptionPicker` no sabe estar deshabilitado, sumarle `enabled: Boolean = true`.
- Modificar `ui/invitations/components/InviteFormFields.kt`: agregar `InitialTemplateField` debajo de NIVEL.
- Test:
  - `ui/invitations/InviteViewModelTest.kt`;
  - `ui/invitations/InitialTemplatesTest.kt` (nuevo).

**Interfaces:**
- Consume: la tarea 5, `DayChips` (tarea 1), y `TrainerTemplatesRepository.observeList(trainerId): Flow<TemplatesCache?>` y `refreshList(trainerId): Result<Unit>`.
- Produce: `InviteViewModel.onTemplate(String?)` y `InviteViewModel.onToggleDay(String)`.

- [ ] **Paso 1:** tests:
  - `templateOptionLabel` con 4 días y nivel `intermediate` da `"Push A · 4 días · Intermedio"`; con 1 día y sin nivel da `"Push A · 1 día"`;
  - en el VM, `onTemplate("t1")` precarga los días de `t1`; `onTemplate("t2")` los reemplaza; `onTemplate(null)` deja `templateId` null y `routineDays` vacío;
  - un VM nuevo con el mismo `SavedStateHandle` recupera la plantilla y los días;
  - si `Ready` deja de incluir `t1`, la plantilla y los días se limpian;
  - un `Rejected` con `TEMPLATE` hace que se vuelva a pedir la lista;
  - en la fuente: un caché presente da `Ready`; sin caché y con el refresh fallido da `Failed`.
- [ ] **Paso 2:** que fallen.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `gradlew testDebugUnitTest checkFileLength assembleDebug` en verde.

### Tarea 7: Aviso `initial_routine_failed`

**Archivos:**
- Modificar `data/notifications/AppNotification.kt`: `INITIAL_ROUTINE_FAILED("initial_routine_failed")`, y agregarlo al KDoc de los tipos.
- Modificar `data/notifications/NotificationDestination.kt`: `NotificationType.INITIAL_ROUTINE_FAILED.wire -> studentProfile(data)`, y sumarlo al KDoc de los tipos solo del PT.
- Modificar `ui/notifications/components/NotificationItem.kt`: `INITIAL_ROUTINE_FAILED -> "⚠️"`.
- Test:
  - `data/notifications/NotificationDestinationTrainerTest.kt`;
  - `data/notifications/NotificationMapperTest.kt`.

- [ ] **Paso 1:** tests:
  - `destinationOf("initial_routine_failed", mapOf("student_id" to "s1"), Role.TRAINER) == StudentProfile("s1")`, también sin rol (push);
  - sin `student_id` da `NotificationsList`;
  - `NotificationMapper.toEntity` de un DTO `initial_routine_failed` ya no es null.
- [ ] **Paso 2:** que fallen.
- [ ] **Paso 3:** implementar. Si hay un `when` exhaustivo que no compila, completarlo.
- [ ] **Paso 4:** `gradlew testDebugUnitTest` en verde.

### Tarea 8: Verificación, auditoría y PR

- [ ] **Paso 1:** desde `mobile/`, `gradlew checkFileLength assembleDebug testDebugUnitTest` en verde. Anotar la cantidad de tests.
- [ ] **Paso 2:** `gradlew connectedDebugAndroidTest --tests "*MigrationV26Test"` con emulador. Si no hay emulador, queda como pendiente declarado.
- [ ] **Paso 3:** en el tablero del equipo, comentar en las tarjetas GX8-M1, M2 y M3 qué entra. En el tablero de Igna, crear una tarjeta "GX8 mobile", moverla a 🔍 AUDITORÍA CODEX y comentar `🛠️ CLAUDE · Lista para auditar` con:
  - rama y base;
  - spec y plan;
  - qué se probó;
  - pendientes: celular cuando entre la #104 en dev, la decisión de Pablo sobre los días y el posible conflicto con la #105 en `RoutineTexts.kt`.
- [ ] **Paso 4:** con el ✅ de Codex, avisarle a Igna. Commit y PR los hace Igna, o Claude si lo pide. La PR va contra `develop` con la plantilla del repo y "(tarjetas GX8-M1, M2 y M3)", y espera a la #104.
