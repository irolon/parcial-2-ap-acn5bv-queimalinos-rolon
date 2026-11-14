# Asistente IA para armar rutinas en el celular del entrenador (tarjeta E15)

Tarjeta: *E15 · Asistente IA para armar rutinas* (tablero App del ENTRENADOR). Rama
`feature/android-asistente-rutinas`, salida de `feature/ai-rag-nvidia` (PR #90), que trae el backend
`trainer-ai` (spec `2026-11-06-trainer-ai-design.md`) y el editor de rutinas de la E8.

**Criterio de aceptación:** el entrenador genera una rutina con IA desde el celular, la ajusta y la asigna.

## Decisiones (Igna, 09/11)

| # | Pregunta | Decisión |
|---|---|---|
| Q1 | ¿Hasta dónde llega el flujo? | **"Guardar y asignar"** en un solo paso: guarda las plantillas, asigna cada bloque al alumno con sus días y vuelve a la ficha; el ajuste se hace en el editor de la E8. La propuesta no se puede editar antes de guardar (`save-as-template` solo recibe el `generation_id`). |
| Q2 | ¿Desde dónde se entra? | Solo desde la **ficha del alumno**: tercera opción **"Con IA ✦"** en la hoja "Asignar rutina". Sin red queda deshabilitada. |
| Q3 | ¿Equipamiento? | Se muestra **el de la ficha tal cual** con **"Cambiar"**. Sin tocarlo, `available_equipment` no viaja y el backend usa la ficha (con su normalización y el texto que no mapea). Con "Cambiar", 7 chips del catálogo y se manda esa lista. |
| Q4 | ¿Dónde vive la propuesta? | En el **`SavedStateHandle`**, no en Room. Ver "Excepción a Room". |

## Excepción a "Room es la única fuente de verdad"

La propuesta es el **borrador de una escritura**: la devuelve un `POST` una sola vez y el backend no
tiene un `GET` para releerla, así que no hay nada que refrescar desde la API. Vive en el
`SavedStateHandle` (sobrevive a rotar la pantalla y a que Android mate el proceso), igual que el
formulario de "Desde plantilla" o el borrador del chat. Salir con "atrás" pide confirmar el descarte.
Lo que sí es dato del servidor (las rutinas asignadas) entra a Room por `refreshList`, y la ficha lo
lee de ahí. Sin migración: la base sigue en la versión de la rama base.

## Flujo

1. **Entrada.** Ficha de un alumno activo → "Asignar rutina" → "Rutina nueva", "Desde plantilla",
   **"Con IA ✦"** → pantalla "Rutina con IA" (ruta `trainerStudentAiRoutineRoute(studentId)`).
2. **Formulario** (una pantalla con scroll):
   - **Objetivo** (`hypertrophy`, `strength`, `weight_loss`, `tonify`) y **Nivel** (`beginner`,
     `intermediate`, `advanced`): chips, precargados de la ficha; si la ficha no los tiene, sin elegir.
   - **Días por semana** 1–7: precargado con los días de la rutina activa (`activeRoutine.days.size`)
     o 3.
   - **Duración**: chips 30 / 45 / 60 / 75 / 90 min, por defecto 60.
   - **Equipamiento**: el texto de la ficha ("Del perfil: mancuernas, barra, Banco plano", o "Sin
     cargar") con "Cambiar"; al cambiar, 7 chips (barra, mancuernas, máquina, polea, peso corporal,
     pesa rusa, banda) premarcados vacíos. Ninguno marcado = solo peso corporal (manda `[]`).
     "Usar el del perfil" vuelve al modo sin tocar.
   - **Lesiones**: precargadas de la ficha, editables (máx. 500). Vacío = "sin lesiones": viaja `null`.
     Sin tocar el campo, viaja igual el texto de la ficha (es el mismo dato; se manda explícito).
   - **Preferencias**: texto opcional (máx. 500).
   - Debajo de lesiones y preferencias: **"No pongas datos personales (nombre, documento, contacto):
     este texto se le manda a la IA."**
   - **"Generar propuesta"**: mientras espera, "Armando la rutina… puede tardar hasta 30 s", campos
     bloqueados y sin doble envío. Siempre manda `student_id`.
3. **Propuesta** (misma pantalla, segundo paso):
   - Arriba, **"Por qué la armó así"** (`rationale`), plegable.
   - Una tarjeta por bloque: nombre, días ("Lun · Mié · Vie") y cada ejercicio con series × reps,
     descanso, kg sugeridos si hay y la nota de la IA.
   - **"Generar otra"** vuelve al formulario con los mismos datos (cuenta para el límite por hora).
   - **"Guardar y asignar"** abre una hoja con el **nombre de la plantilla** (precargado
     "IA · <Objetivo> · dd/MM", 1–120, editable) y, si el alumno tiene rutinas activas, el check
     "Pausar <rutinas activas>" (mismo texto y comportamiento que "Desde plantilla"). Con varios
     bloques, una línea aclara que cada plantilla se llama "<nombre> · <bloque>".
   - "Atrás" con una propuesta sin guardar → "¿Descartar la propuesta?".
4. **Guardar y asignar** (`AiAssignController`):
   1. `POST /trainer-ai/save-as-template` → ids de las plantillas, una por bloque y en orden.
   2. Por cada plantilla, `instantiate` con `student_id`, **el nombre del bloque** como nombre de la
      rutina y **los días del bloque**.
   3. Si eligió pausar, pausa las activas de antes con `deactivateOthers`, sin tocar ninguna nueva.
   4. `refreshList` del alumno y vuelta a la ficha con el aviso **"Rutina asignada: ajustala desde
      Rutinas"** (o el aviso de pausa fallida, como hoy). Cada rutina nueva se abre en el editor E8.
5. **Falla a mitad de camino:** el progreso (ids de plantillas y bloques ya asignados) vive en el
   `SavedStateHandle`. La hoja muestra "Se asignaron k de n" con **"Reintentar"**, que sigue desde el
   primer paso pendiente; nunca vuelve a guardar si ya hay plantillas.

## Recuperación de respuestas perdidas

- **`save-as-template` llegó pero la respuesta no** (timeout o red): el reintento recibe **409
  `GENERATION_ALREADY_SAVED`**. El celular hace `GET /routine-templates` y toma las plantillas con los
  nombres esperados (`templateNameFor`: el nombre solo si hay un bloque, "<nombre> · <bloque>" cortado
  a 120 si hay varios), la más nueva de cada nombre. Si falta alguna, avisa "No se pudo recuperar lo
  guardado: asigná las plantillas desde «Desde plantilla»" y no reintenta más.
- **`instantiate` llegó pero la respuesta no:** antes de reintentar un bloque, `refreshList` del alumno;
  si ya hay una rutina con ese nombre y esos días creada después de guardar, el bloque cuenta como
  asignado (con ese id) y no se duplica.

## Errores

**Al generar** (aviso arriba del botón; el formulario no se pierde):

| Caso | Texto / acción |
|---|---|
| Sin red | "Con IA ✦" deshabilitado; adentro, "Necesitás conexión para usar el asistente." |
| Timeout del cliente (50 s) | "La IA tardó demasiado. Probá de nuevo." |
| 429 `RATE_LIMIT_EXCEEDED` | Mensaje del backend + "Probá de nuevo en N min" con `Retry-After` (sin él, "más tarde"). |
| 503 `AI_UNAVAILABLE` | Mensaje del backend + botón **"Armar a mano"** → "Rutina nueva" del alumno. |
| 502 `AI_INVALID_RESPONSE` | Mensaje del backend; se puede volver a generar. |
| 400 `VALIDATION_ERROR` | Error en el campo (`goal`, `level`, `frequency_per_week`, …); si no hay campo conocido, el mensaje. |
| 404 `STUDENT_NOT_FOUND` | Vuelve a la lista de alumnos (como `onGone` de la ficha). |
| Otro | "Algo salió mal. Probá de nuevo." |

**Al guardar:** 404 `GENERATION_NOT_FOUND` → "La propuesta ya no existe. Generá otra." (vuelve al
formulario); 400 `TEMPLATE_EXERCISES_UNAVAILABLE` → "Un ejercicio dejó de estar disponible. Generá
otra."; 409 → recuperación; red/timeout/5xx → aviso + "Reintentar". **Al asignar:** los textos de
`assignMessage()` de "Desde plantilla" + "Reintentar".

## Código (200 líneas por archivo; capa → módulo → archivo)

- `data/api/trainerai/`: `TrainerAiApi` (`POST trainer-ai/generate-routine`, `POST
  trainer-ai/save-as-template`, con `@Tag RequiredUser`) y `TrainerAiDtos`.
- `di/trainerai/TrainerAiModule`: Retrofit con `client.newBuilder()` y `callTimeout`/`readTimeout` de
  **50 s** (desde el 14/11: el backend le da 38 s a n8n; antes eran 40 s contra 30).
- `data/trainerai/`: dominio (`AiRoutineProposal`, `AiProposalBlock`, `AiProposalExercise`,
  `AiRoutineParams`), mapper, errores (`TrainerAiError` + traducción de HTTP) y `TrainerAiRepository`
  (`generate`, `save`, `Result`). No toca Room.
- `ui/routines/trainer/ai/`: `AiRoutineScreen`, `AiRoutineViewModel`, `AiRoutineUiState`,
  `AiRoutineTexts`, `AiAssignController`, y `components/` (formulario, equipamiento, tarjeta de bloque,
  hoja de guardar).
- Cambios: `AssignRoutineAction`/`AssignChoiceSheet` (+ `onWithAi`), `TrainerStudentRoutes` (ruta
  nueva), `deactivateOthers` si hace falta aceptar varios ids a conservar.

## Pruebas

- **Unitarias:** DTOs con una propuesta real de 3 bloques; cada código → su error; repositorio
  (body: equipamiento ausente sin "Cambiar", `[]` con nada marcado, lesiones vacías → `null`);
  ViewModel (precarga, días por defecto, sin doble envío, restaurar formulario y propuesta del
  `SavedStateHandle`, confirmar descarte, 503 → "Armar a mano"); `AiAssignController` (1 y 3 bloques,
  falla en el bloque 2 + reintento sin volver a guardar, 409 recuperado y no recuperable, bloque ya
  creado que no se duplica, pausar sin tocar las nuevas).
- **Sin migración**, así que no hay test de Room.
- **Manual (emulador)** con el backend de la #90, n8n y KIMI (3 req/min: de a una): split de 3 días
  para alumna.card8 → guardar y asignar → 3 rutinas en la ficha → ajustar una en el editor; n8n
  pausado → 503 con "Armar a mano"; modo avión.
- `gradlew checkFileLength assembleDebug testDebugUnitTest`.

## Fuera de alcance

Generar sin alumno (desde Plantillas); "adaptar una plantilla mía" (`base_template_id`); editar la
propuesta antes de guardar (`refine`); guardar la propuesta en Room.
