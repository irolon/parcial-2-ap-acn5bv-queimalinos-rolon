# GX8 en el celular · Nivel de la rutina, plantilla inicial al invitar y aviso al PT (GX8-M1, M2 y M3) · diseño

Tarjetas del tablero del equipo:
- [GX8-M1] Nivel en las rutinas del alumno: https://trello.com/c/TiEpikWz
- [GX8-M2] Nivel en el editor de rutinas del PT: https://trello.com/c/8e1XA0Pz
- [GX8-M3] Plantilla inicial al invitar: https://trello.com/c/kkVTdvPd

Más el tipo de notificación `initial_routine_failed`, que Pablo pidió en la #104.

Las tres las pide Pablo (09/11) para que la GX8 quede completa en los dos clientes. Spec del backend y la web: `2026-11-09-gx8-rutinas-nivel-plantilla-design.md`. Es la #104, que todavía no está mergeada.

## Intención

- **Para qué.** Que el celular haga lo mismo que la web con la GX8:
  - el PT elige el nivel de una rutina y el alumno lo ve;
  - al invitar, el PT puede dejarle una plantilla asignada al alumno para que entre con algo para entrenar el primer día;
  - si esa rutina no se pudo crear en el alta, al PT le llega el aviso y lo puede abrir.
- **Ahora, sin esperar a la #104 (Igna, 10/11).** Se programa ya y la PR espera a que se mergee la #104 para probarla de punta a punta.
- **Una sola rama y una sola PR para todo (Igna, 10/11):** `feature/android-gx8-nivel-plantilla`, con base `develop`.

## Objetivos

1. **M1, el alumno ve el nivel de sus rutinas.** El celular no pide `GET /routines/today`: arma Hoy con el caché de `GET /routines/mine` (`TodayResolver`). El `level` de `GET /routines/mine` entra al DTO (`StudentRoutineDto`), a Room (`routines.level`) y al dominio (`Routine.level`). Se muestra:
   - **en Hoy**, al final del resumen del héroe (`heroSummary`): "6 EJERCICIOS · ~55 MIN · 18 SERIES · INTERMEDIO";
   - **en Mis rutinas**, en la línea del objetivo de la tarjeta: "Hipertrofia · Intermedio".

   Sin nivel, todo queda como hoy.
2. **M2, el PT elige y ve el nivel.**
   - **Crear rutina** (`NewRoutineScreen`): un selector opcional de nivel en el encabezado, con chips Principiante, Intermedio y Avanzado, más la opción de no elegir ninguno. Va en `CreateRoutineRequest.level`.
   - **Editar el encabezado** (`RoutineHeaderSheet`): el mismo selector. `headerPatch` manda `level` solo si cambió; pasar a "sin nivel" manda `level: null` explícito.
   - **Asignar una plantilla** (`instantiate`, desde Plantillas y desde la IA): el backend copia el nivel. El celular guarda en Room la rutina que devuelve, y ahí ya viene el `level`.
   - **Se ve** en la fila de cada rutina en la ficha del alumno (`RoutinesSection`) y en el encabezado del editor. Va al lado del objetivo, con el mismo formato que las plantillas (`templateGoalLine`: "Hipertrofia · Intermedio").
   - El `level` entra a los DTO del PT (`TrainerRoutineSummaryDto`, `TrainerRoutineDetailDto`), a Room (`trainer_routines.level`) y al dominio (`TrainerRoutineSummary.level`).
   - **"Guardar como plantilla"** (`SaveAsTemplateSheet`):
     - arranca con el nivel de la rutina, como la web (`SaveTemplateDialog`);
     - siempre manda el nivel elegido en `from-routine`, también `null` explícito para "sin nivel".

     Hoy el `level` null no se serializa, y con la #104 el backend usaría el de la rutina aunque la hoja muestre "sin nivel". Lo encontró el revisor del spec. **Decisión de Claude:** igual que la web.
3. **M3, plantilla inicial al invitar** (`InviteScreen`). Debajo de Objetivo y Nivel se agrega el campo "Plantilla inicial (opcional)":
   - Es un desplegable con "Sin plantilla" y las plantillas del PT, con la etiqueta "Nombre · 4 días · Intermedio". Se puede usar el `OptionPicker` que ya existe.
   - Las plantillas salen de Room (`TrainerTemplatesRepository.observeList`). Al abrir la pantalla se pide `refreshList`, porque el PT puede no haber entrado nunca a Plantillas.
   - Con una plantilla elegida aparecen los chips de días, precargados con los de la plantilla y editables. Hace falta al menos uno: si no hay ninguno, el error es "Elegí al menos un día".
   - Cambiar de plantilla vuelve a precargar los días. Volver a "Sin plantilla" oculta los días y no se manda nada.
   - **Con plantilla, siempre se mandan `template_id` y `routine_days`**, como en la web. Así da igual si Pablo termina exigiendo los días (pedido de la #104).
   - **Estados del campo:**
     - sin plantillas en Room y cargando: deshabilitado, con "Cargando plantillas…";
     - el refresh falló y no hay nada en Room: deshabilitado, con "No pudimos cargar tus plantillas". La invitación se manda igual, sin plantilla;
     - el PT no tiene plantillas: el texto "Todavía no tenés plantillas", sin desplegable.
   - **Errores del backend:**
     - `details[].field` `template_id` va al campo de la plantilla, y `routine_days` a los días (`inviteFieldOf`);
     - 404 `TEMPLATE_NOT_FOUND` va al campo de la plantilla con "Esa plantilla ya no existe; elegí otra", y se vuelve a pedir la lista.
   - La plantilla elegida y los días sobreviven a rotar la pantalla y a que se mate el proceso, igual que el resto del formulario (`SavedStateHandle` en `InviteViewModel`).
4. **Aviso `initial_routine_failed`.**
   - `NotificationType.INITIAL_ROUTINE_FAILED("initial_routine_failed")`: deja de descartarse en `NotificationMapper`.
   - En `destinationOf` abre la ficha del alumno (`studentProfile(data)`, como `inactivity`). Es un tipo solo del PT: no choca con nada del alumno, y en el push se resuelve sin rol, igual que `inactivity`.
   - Ícono en `NotificationItem.icon`. Título y cuerpo vienen del servidor.

## Lo que no se hace (no-objetivos)

- **Filtrar ni agrupar por nivel,** ni que el nivel cambie qué ve el alumno más allá de mostrarlo. Eso está fuera de alcance en el spec de la GX8.
- **`active_routine.level` de `GET /students/:id`.** La ficha del PT ya muestra cada rutina con su nivel en `RoutinesSection`, que lee `trainer_routines`. Agregar el nivel también a `TrainerStudentDetailEntity` sería guardar dos veces lo mismo. **Decisión de Claude.** Si Igna lo quiere en el encabezado de la ficha, se suma.
- **Precargar el nivel en el asistente IA** (el paso 1 de `AiRoutine`, que arma rutinas para guardar): queda como el seguimiento que ya anota el spec de la GX8. Las plantillas que guarda la IA ya traen su nivel y lo heredan al asignarse.
- **Mostrar la plantilla en la confirmación del alumno** (`ConfirmInvitationScreen`): `GET /invitations/:token` no la expone. El alumno la ve al entrar, en Hoy.

## Lo que haría que salga mal aunque funcione

- **Perder datos de Room al migrar:** cero rutinas ni historial perdidos. Por eso la migración lleva su test.
- **Una invitación con plantilla y sin días.** Es el hueco que encontró Codex en la #104: el PT no se entera si la plantilla se borra.
- **Que el alta o la invitación fallen por la plantilla** cuando el PT no eligió ninguna, o cuando las plantillas no cargaron.
- **Mostrar "Sin definir"** donde una rutina no tiene nivel. Sin nivel no se muestra nada; "Sin definir" queda solo como opción en los selectores.

## Restricciones

- Reglas de AGENTS.md:
  - Room es la única fuente de verdad;
  - ningún archivo pasa de 200 líneas (`RoutineEditorViewModel.kt` ya tiene 200, `FitTrainerDatabase.kt` 194 y `InviteViewModel.kt` 155);
  - orden capa → módulo → archivo, con los tests copiando el árbol;
  - `gradlew checkFileLength assembleDebug testDebugUnitTest`, más `connectedDebugAndroidTest` para la migración.
- **Room pasa de la v25 a la v26** con una sola `AutoMigration(25, 26)`: dos columnas nuevas que aceptan null, `routines.level` y `trainer_routines.level`. Incluye el `26.json` exportado y un test de migración con el patrón de `MigrationV2xTest`: filas en v25 → migrar → siguen ahí con `level` en null.
  - Después del primer refresh con el backend nuevo se llenan solas.
  - Con el backend viejo (sin la #104), `level` no llega, queda null y no se muestra nada. No se rompe.
- **Contrato:** el de la #104 (`contratos-api.md`). El celular no cambia el contrato.
- **Con la #105:** también toca `ui/today/RoutineTexts.kt` (el descanso de 90 s). Si entra primero, al rebasar hay un conflicto chico en ese archivo.

## Decisiones de Claude (para que Igna las revise)

1. **Dónde se ve el nivel:**
   - en Mis rutinas va en la línea del objetivo y no en la de los días como en la web, porque en la tarjeta del celular el objetivo y los días van separados;
   - en Hoy va al final del resumen, como en la web.
2. **El selector de nivel del editor son chips con "sin nivel"** (tocar el chip elegido lo desmarca), igual que en `SaveAsTemplateSheet`. No es un desplegable.
3. **Una sola lista de niveles y una sola etiqueta.** `LEVELS` queda en `data/invitation/invite/InviteForm.kt`, que ya lo usa `StudentPatch`, y se borra la copia de `TemplatesTexts`. Una función compartida `levelLabel(level): String?` reemplaza las dos copias (`InviteTexts`, que devuelve "Sin definir", y `TemplatesTexts`). Los selectores siguen mostrando "Sin definir" como opción.
4. **Componente de días compartido.** Los chips de días hoy están copiados en `RoutineHeaderFields` y en `AssignTemplateSheet`. Para el campo de invitar se saca un `DayChips(value, onToggle, error)` reutilizable, y los dos lugares existentes pasan a usarlo.
5. **`RoutineEditorViewModel.kt` (200 líneas):** lo nuevo del nivel no puede sumarle líneas. Se mueve lo que haga falta a un archivo vecino (por ejemplo, el armado del encabezado) para que quede en 200 o menos.

## Lo que queda a criterio del que construye

- Nombres internos de archivos y clases, y el ícono exacto del aviso.
- Cómo partir los archivos que crezcan, siempre bajo la regla de las 200 líneas y el orden capa → módulo → archivo.
- Los textos de los estados del campo de plantilla, si mejoran los de arriba sin cambiar el sentido.

## Pruebas

- **Unitarias:**
  - mapper y DTO de rutinas (alumno y PT) con y sin `level`;
  - `heroSummary` y la línea de Mis rutinas con y sin nivel;
  - `headerPatch`: `level` cambia, pasa a `null` o no cambia;
  - `CreateRoutineRequest` con y sin nivel;
  - `InviteForm`:
    - sin plantilla no manda nada;
    - con plantilla manda `template_id` y `routine_days` en orden de la semana;
    - con plantilla y sin días da error;
  - `inviteFieldOf` para `template_id` y `routine_days`;
  - `TEMPLATE_NOT_FOUND`, que va al campo y refresca la lista;
  - `InviteViewModel`:
    - elegir una plantilla precarga sus días;
    - cambiar de plantilla los vuelve a precargar;
    - el estado sobrevive al `SavedStateHandle`;
  - `NotificationMapper` y `destinationOf` con `initial_routine_failed` (con `student_id` abre la ficha; sin él, la lista).
- **Instrumentada:** el test de migración de v25 a v26.
- **En el celular, cuando esté la #104 en dev:**
  - invitar con plantilla y L/X/V, registrarse con el link y ver la rutina en Hoy con su nivel;
  - crear y editar el nivel de una rutina como PT y verlo en la ficha y en el celular del alumno;
  - invitar con plantilla, borrarla, registrarse, y ver que al PT le llega el aviso y que tocarlo abre la ficha.
