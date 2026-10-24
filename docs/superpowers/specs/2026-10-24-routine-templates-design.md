# Spec — Módulo Routine Templates (plantillas reutilizables)

- **Tarjeta:** "8 · Módulo Routine Templates" (tablero personal de Pablo) → tarjeta de equipo https://trello.com/c/j5mHtamt ("[S2] Módulo Routine Templates — plantillas reutilizables", tarjeta 25).
- **Fecha:** 2026-10-24
- **Rama:** `feature/routine-templates`, sale de `develop`.
- **Reglas:** `CONTRIBUTING.md` (200 líneas por archivo, capa → módulo → archivo, tests espejados) y ADR 0001 (autorización en los services, RLS deny-all).
- **Producto:** PT-12, HU-07 (`docs/producto/propuesta.md`), CU-04 2a "Usa plantilla".
- **Schema:** `routine_templates` y `routines.template_id` (`on delete set null`) ya existen en `backend/src/database/schema/03-routines.sql`. **No hay migración.**
- **Alcance:** solo backend. El selector "Partir de una plantilla" de la web es de la tarjeta 9.

## 1. Objetivo

Que el entrenador guarde rutinas como plantillas y cree rutinas nuevas a partir de ellas sin rearmar todo para cada alumno. Además es donde la IA del entrenador (S4) va a guardar lo que genere (`generated_by_ai = true`).

**Criterio de aceptación (de la tarjeta):** el PT guarda una rutina como plantilla, la asigna a dos alumnos distintos, personaliza los pesos de uno, y la plantilla original queda intacta. Editar la plantilla después no modifica las rutinas ya asignadas.

## 2. Decisiones tomadas

### Forma de una plantilla (una plantilla = una rutina)
- `structure` replica una rutina:
  ```json
  { "version": 1,
    "days": ["monday", "thursday"],
    "exercises": [ { "exercise_id": "uuid", "sets": 4, "reps": 8, "rest_seconds": 90,
                     "suggested_kg": 60, "tempo": "3-1-1", "notes": "…", "order": 0 } ] }
  ```
- Los ejercicios valen para todos los días de la plantilla, igual que en `routine_exercises`. Un "Push/Pull" son dos plantillas. La IA del S4 agrupa su propuesta por días y guarda una plantilla por grupo.
- `version` permite evolucionar el documento sin migrar datos.
- `reps` sigue siendo entero (sin rangos ni "AMRAP"); no hay RIR/RPE ni duración en semanas: no existen en el schema.

### Metadatos y validación
- `name`: 2 a 120 caracteres (trim).
- `goal`: obligatorio en la API (`tonify | weight_loss | hypertrophy | strength`), aunque la base lo permite nulo (HU-07: "clasificada por objetivo").
- `level`: opcional (`beginner | intermediate | advanced` o `null`).
- `frequency_per_week`: **se deriva** de `structure.days.length`; no se acepta en el body.
- `generated_by_ai`: siempre `false` desde estos endpoints (lo usará el S4).
- `structure.days`: al menos 1, valores de `DAYS`, sin repetidos.
- `structure.exercises`: 1 a **50**; cada uno con las reglas de los ejercicios de una rutina (`exercise_id` uuid; `sets` y `reps` enteros > 0; `rest_seconds` entero ≥ 0 o `null`; `suggested_kg` número ≥ 0 o `null`; `tempo` hasta 20 caracteres o `null`; `notes` hasta 500 o `null`; `order` entero ≥ 0 opcional). **Orden:** se ordena estable por `order` explícito (sin `order` = su posición) y se renumera 0..n-1 (`normalizeExerciseOrder`); nunca hay órdenes repetidos. Lo usan la structure de plantillas y `POST /routines` / `POST /routines/:id/exercises`.
- Cada `exercise_id` tiene que ser global o del entrenador (`findAccessibleExerciseIds`); si no, 403 como en `POST /routines` (no se revela si existe).

### Endpoints (`/api/routine-templates`, solo trainer)
| Método | Path | Qué hace |
|---|---|---|
| GET | `/` | Lista las plantillas del entrenador (más nuevas primero). Filtros: `goal`, `level`, `generated_by_ai`. Sin `structure`; suma `days` y `exercise_count`. |
| GET | `/:id` | Plantilla con `structure`, y cada ejercicio con sus datos (`exercise: { id, name, muscle_group, equipment, video_url }`). |
| POST | `/` | Crea con `{ name, goal, level?, structure }` → 201. |
| POST | `/from-routine` | "Guardar rutina como plantilla": `{ routine_id, name?, goal?, level? }`. Copia `goal` (el `goal?` del body lo pisa; si la rutina no tiene y no viene → 400), `days` y los ejercicios de una rutina del entrenador. `name` por defecto, el de la rutina → 201. |
| PATCH | `/:id` | `name`, `goal`, `level`, `structure` (al menos uno). `structure` se reemplaza entera. |
| DELETE | `/:id` | 204. Las rutinas que salieron de ella quedan con `template_id = null` (FK existente). |
| POST | `/:id/instantiate` | `{ student_id, name?, days? }` → 201 con la rutina creada en la forma de `GET /routines/:id`. |

- Plantilla inexistente o de otro entrenador → **404 `TEMPLATE_NOT_FOUND`** (no se revelan ids); también en `POST /routines` con `template_id`.
- **Structure incompleta** (la columna es `jsonb default '{}'`; una plantilla de seed o IA puede no tener `days`/`exercises`): `GET /:id` y el listado la toleran (`[]`) para poder corregirla con PATCH; `instantiate` responde **409 `TEMPLATE_STRUCTURE_INVALID`** con los `details` de la validación, antes de chequear ejercicios.
- **Errores de `from-routine`:** si la structure armada desde la rutina no valida, el 400 se re-emite con `field: 'routine_id'` y mensajes en términos de la rutina ("El ejercicio 3 de la rutina: ...", "La rutina tiene que tener entre 1 y 50 ejercicios", "Los días de la rutina: ..."). Rutina ajena en `from-routine` → 403 como el resto de `routines`; alumno ajeno al instanciar → 403.

### Instanciar = copia (ADR 0003)
- Crea una `routine` (`template_id` de origen, `name`/`days` de la plantilla salvo que vengan en el body, `goal` de la plantilla, activa) y una fila de `routine_exercises` por ejercicio de `structure`.
- **Es una copia, no una referencia viva:** editar o borrar la plantilla después no toca las rutinas ya asignadas. Queda escrito en el service y en el ADR 0003.
- Antes de copiar se revalida que todos los ejercicios sigan accesibles: si falta alguno → **409 `TEMPLATE_EXERCISES_UNAVAILABLE`** con `details: [{ field: 'exercise_id', message: <id> }]`. El borrado de ejercicios no se toca.
- La rutina nueva convive con las otras activas del alumno (no se desactivan; `/today` sigue tomando la más reciente del día).
- **Atomicidad por compensación** (patrón de la invitación): se inserta la rutina, después los ejercicios; si falla el segundo paso se borra la rutina (los ejercicios caen por cascade) y se propaga el error. **`POST /routines` pasa a usar el mismo helper**: hoy puede dejar una rutina sin ejercicios.

### Personalizar una rutina asignada
- `PATCH /routines/:id/exercises/:routineExerciseId` (trainer dueño): `sets`, `reps`, `rest_seconds`, `suggested_kg`, `tempo`, `notes` (al menos uno; mismas reglas que arriba; `null` borra los opcionales). Devuelve la rutina completa (forma de `GET /routines/:id`).
- `DELETE /routines/:id/exercises/:routineExerciseId` → 204. Si es el único ejercicio de la rutina → **409 `ROUTINE_NEEDS_EXERCISE`** ("La rutina tiene que tener al menos un ejercicio"): una rutina nunca queda vacía, como `POST /routines`, que exige ≥ 1. (Decisión cambiada en la review de la PR #26.)
- Un `routineExerciseId` que no es de esa rutina → 404 `ROUTINE_EXERCISE_NOT_FOUND`.

### Fuera de alcance
- Plantilla inicial al invitar (Guía Web p.14): necesita `invitations.template_id` e instanciar al aceptar. Se suma a la tarjeta deseable "Datos extra al invitar un alumno".
- Personalizaciones dentro de `instantiate` (`customizations` del contrato viejo): se instancia y después se edita.
- Una sola rutina activa por alumno.
- La UI web (tarjeta 9).

## 3. Estructura (orientativa)
- `routes/`, `controllers/`, `services/`, `repositories/`, `validations/`, `models/` → módulo `routine-templates/` (archivos `routine-templates.*.js`), router montado en `app.js` como `/api/routine-templates`.
- `services/routines/`: helper de creación con compensación compartido por `POST /routines` y `instantiate`; métodos para editar y borrar un ejercicio de rutina.
- `shared/utils/errors.js`: `templateNotFound`, `templateExercisesUnavailable`, `routineExerciseNotFound`.
- Docs: `docs/adr/0003-plantillas-se-copian.md`; `docs/arquitectura/contratos-api.md` (módulo de plantillas completo y los dos endpoints nuevos de rutinas; se reemplaza el `customizations` viejo); `backend/README.md` (tabla de endpoints); `docs/tarjetas.md` (fila de la tarjeta 25).

## 4. Verificación
- `npm run lint` y `npm test` en `backend/`.
- Tests: validaciones de plantilla (structure, límites, días repetidos, `frequency_per_week` derivado); service (ownership 404/403, from-routine copia, instantiate copia y guarda `template_id`, 409 por ejercicio faltante, compensación cuando falla el insert de ejercicios — también en `POST /routines`); editar/borrar ejercicio de rutina (ownership, 404, validación).
- **E2E contra el backend real y Supabase dev** con un script HTTP (en el scratchpad, no se commitea), con un entrenador y dos alumnos de prueba:
  1. crear una rutina y guardarla como plantilla;
  2. instanciarla para los dos alumnos;
  3. cambiar `suggested_kg` de un ejercicio en la rutina de uno;
  4. comprobar que la plantilla y la otra rutina siguen igual;
  5. editar la plantilla y comprobar que ninguna de las dos rutinas cambió;
  6. borrar la plantilla: las rutinas quedan con `template_id = null`.
  La salida va en la PR.
