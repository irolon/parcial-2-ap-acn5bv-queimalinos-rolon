# Módulo Sessions en el backend — inicio, series y cierre

- **Tarjeta de equipo:** [S3] Módulo Sessions backend — inicio, series y cierre (https://trello.com/c/TVIA2Zmo), fuente de verdad del alcance y del criterio de aceptación.
- **Tablero personal:** "10 · Módulo Sessions backend" (orden y el contrato que dejó Igna en un comentario).
- **Fecha:** 2026-10-27 · **Rama:** `feature/sessions` (desde `develop`).

## 1. Objetivo y criterio de aceptación

El backend del entrenamiento: iniciar una sesión, registrar cada serie y cerrarla con el feedback del alumno. Bloquea la sincronización offline del celular (tarjeta 11 de mobile).

**Criterio de aceptación (tarjeta de equipo):** se registra una sesión con 24 series en un solo request; reenviar el mismo lote no duplica nada; una sustitución deja `has_modifications = true`.

## 2. De dónde sale cada decisión

| Tema | Tarjeta de equipo | Contrato de Igna (spec mobile §8) | Decisión |
|---|---|---|---|
| Ruta de las series | `POST /session-sets` con array | `POST /sessions/:id/sets`, una serie | `POST /sessions/:id/sets` con **array** (`{ sets: [...] }`) |
| Idempotencia | UUID del cliente como clave | upsert por `id`; la corrección actualiza | upsert por `id` |
| Sustitución | `substituted_exercise_id` | `exercise_id` (hecho) + `original_exercise_id` (planificado) | columnas del schema: `exercise_id` + `original_exercise_id` |
| Cierre | `PATCH /sessions/:id` | `finished_at` en el `POST /sessions` | las dos: `POST` idempotente acepta `finished_at`, y `PATCH` |

El schema (`backend/src/database/schema/04-progress.sql`) ya tiene `sessions` y `session_sets` con estas columnas: **no hay migración**.

## 3. Endpoints (solo rol `student`; el `student_id` sale del token, nunca del body)

### 3.1 `POST /api/sessions`

Body:

```json
{ "id": "uuid", "routine_id": "uuid | null", "started_at": "ISO", "finished_at": "ISO | null", "rpe": "1-10 | null", "notes": "string ≤1000 | null" }
```

- `id`, `started_at` obligatorios; el resto opcional. `finished_at ≥ started_at`.
- `routine_id`, si viene, tiene que ser una rutina **del alumno** (activa o no); si no lo es (ajena, o borrada antes de que el celular sincronice), la sesión se guarda con `routine_id = null` — nunca se enlaza una rutina ajena y nunca se pierde la sesión ("ante la duda, guardá").
- **Idempotente por `id`:**
  - no existe → se crea → **201** `{ data: session }`;
  - existe y es del alumno → **200**: se completan `finished_at`, `rpe`, `notes` que vengan **y estén en `null` en la base** (nunca se pisa un valor guardado: las correcciones van por `PATCH`; si no hay nada para completar no se actualiza y se devuelve lo guardado); `started_at` y `routine_id` quedan como estaban (si llegan distintos se ignoran, sin error, y `routine_id` no se valida); si el `finished_at` del reintento es anterior al `started_at` guardado, se ignora ese campo y se guardan los demás;
  - existe y es de otro alumno → **409** `SESSION_ID_CONFLICT`.

### 3.2 `POST /api/sessions/:id/sets`

Body: `{ "sets": [ set, ... ] }` con 1 a 100 elementos. Cada `set`:

| Campo | Regla |
|---|---|
| `id` | UUID, obligatorio (lo genera el cliente) |
| `exercise_id` | UUID, obligatorio: el ejercicio **realmente hecho** |
| `original_exercise_id` | UUID o `null`: el planificado, si hubo sustitución |
| `routine_exercise_id` | UUID o `null` |
| `set_number` | entero 1–100 |
| `actual_reps` | entero 0–1000 (0 = serie fallida) |
| `actual_kg` | número 0–1000 o `null` (peso corporal) |
| `completed` | booleano, opcional, por defecto `true` |
| `executed_at` | ISO 8601 con zona, obligatorio; **se guarda tal cual**, sin chequear futuro |

Sin clave única en `(session_id, set_number)`.

**Rechazo del request entero:**
- 400 `VALIDATION_ERROR` si `sets` no es un array de 1–100;
- 404 `SESSION_NOT_FOUND` si la sesión no existe o es de otro alumno (no se distingue).

**Por serie** (las válidas se guardan aunque otras fallen):
- datos inválidos → `failed` con `VALIDATION_ERROR` y el campo;
- `exercise_id` / `original_exercise_id` que el alumno no puede ver (ni globales ni de su entrenador) → `failed` con `EXERCISE_NOT_FOUND`;
- `routine_exercise_id` que no pertenece a la rutina de la sesión (o la sesión no tiene rutina, o se borró) → la serie **se guarda** con `routine_exercise_id = null` (es solo un enlace al plan; la serie vale igual);
- `id` que ya existe en **otra** sesión (de este u otro alumno) → `failed` con `SET_ID_CONFLICT`, sin tocar la fila;
- `id` nuevo → se inserta (`created: true`); `id` existente en esta sesión → se **actualiza** con los datos nuevos (`created: false`).

Respuesta: **siempre 200** si la sesión es válida:

```json
{ "data": { "saved": [{ "id": "uuid", "created": true }], "failed": [{ "id": "uuid", "index": 3, "code": "EXERCISE_NOT_FOUND", "message": "…" }] } }
```

Se aceptan series aunque la sesión ya esté cerrada (el celular sube después de terminar).

**Sustitución:** si alguna serie guardada tiene `original_exercise_id` no nulo y distinto de `exercise_id`, la sesión queda `has_modifications = true`. Nunca vuelve a `false` automáticamente.

### 3.3 `PATCH /api/sessions/:id`

Body con al menos uno de `finished_at` (ISO, ≥ `started_at`), `rpe` (entero 1–10) y `notes` (≤1000). Repetible (corregir RPE o notas). Sesión ajena o inexistente → 404 `SESSION_NOT_FOUND`. Responde 200 `{ data: session }`.

### 3.4 Forma de `session`

`{ id, student_id, routine_id, started_at, finished_at, rpe, notes, has_modifications }` (sin `trainer_comment`, que llega con la tarjeta 12).

## 4. Diseño interno

- Módulo `sessions` con el layering de siempre (routes → controllers → services → repositories → models → validations), montado en `/api/sessions`. Tests espejando `src`.
- **Autorización en el service (ADR 0001):** la sesión se lee por `id` y se compara `student_id` con `req.user.id`; tests de propiedad para cada endpoint.
- **Ejercicios accesibles:** los del alumno = globales + de su entrenador (`students.trainer_id`); reutilizar la consulta de ejercicios accesibles que ya usa `routines`.
- **Lote de series:**
  1. validar cada serie (las inválidas a `failed`);
  2. traer en una consulta las filas existentes con esos `id` → conflicto si `session_id` ≠ la sesión;
  3. validar ejercicios y `routine_exercise_id` en dos consultas (no una por serie);
  4. guardar sin pisar filas de otra sesión, aunque aparezcan entre la lectura (paso 2) y la escritura:
     - las **no encontradas** en el paso 2 se insertan con `upsert(..., { onConflict: 'id', ignoreDuplicates: true }).select('id')`; los ids devueltos son `created: true`;
     - las **encontradas en esta sesión** se actualizan una a una con `.update(campos).eq('id', id).eq('session_id', sesión).select('id')` (en paralelo, máx. 100); la que devuelve fila es `created: false`;
     - las que el insert omitió (el `id` apareció mientras tanto) se **releen**: si quedaron en **esta** sesión (otra copia del mismo lote corriendo a la vez) se actualizan con los valores de este request (`created: false`); si están en **otra** sesión, o ya no existen, van a `failed` como `SET_ID_CONFLICT`;
     - lo que un update filtrado por `session_id` no devuelve también va a `SET_ID_CONFLICT`;
     - no es una sola sentencia atómica: si el request falla a medias (5xx) pueden haber quedado series guardadas, y no importa, porque reenviar el lote es idempotente;
  5. si alguna serie **guardada** es sustitución, `update sessions set has_modifications = true`.
- Errores nuevos en `shared/utils/errors.js`: `SESSION_NOT_FOUND` (404), `SESSION_ID_CONFLICT` (409); códigos por serie `SET_ID_CONFLICT`, `EXERCISE_NOT_FOUND`, `VALIDATION_ERROR` (un `routine_exercise_id` inválido no es error: se guarda `null`).
- Los helpers de UUID y fecha ISO de `validations/body-metrics` pasan a `shared/utils` si se reutilizan.

## 5. Fuera de alcance

- `GET` de sesiones (historial) y `PATCH /sessions/:id/comment` del entrenador → tarjeta 12.
- `last_session_kg` en `/routines/today` → tarjeta 11 (Progress).
- Notificación al entrenador por `has_modifications` → tarjeta 20 (push).
- `last_session_at` ya sale de la vista `student_last_session`: no cambia nada.

## 6. Documentación

- `docs/arquitectura/contratos-api.md`: módulo Sesiones con los tres endpoints de arriba; se reemplaza `/session-sets` y `substituted_exercise_id`.
- `backend/README.md`: tabla de endpoints y desvíos.
- `docs/tarjetas.md`: fila de la tarjeta.
- PR: en "Observaciones para el revisor", el cambio para el celular (array en `sets`; respuesta `saved`/`failed`).

## 7. Verificación

- `npm run lint` y `npm test` en `backend/`.
- Tests unitarios: validaciones; service con propiedad (sesión ajena = 404, id de otro alumno = 409); **el mismo lote dos veces no duplica** (la segunda vez actualiza por sesión, `created` false); carrera: insert que devuelve menos ids o update sin fila → `SET_ID_CONFLICT`; corrección de una serie; series mixtas válidas e inválidas; `SET_ID_CONFLICT`; ejercicio ajeno; `routine_exercise_id` de otra rutina; sustitución → `has_modifications`; sesión cerrada acepta series; PATCH.
- **Contra el backend real y Supabase dev**, con un alumno de prueba: crear la sesión, subir **24 series en un request**, contarlas en la base; reenviar el lote y volver a contar (24); una sustitución deja `has_modifications = true`; reenviar `POST /sessions` con `finished_at` la cierra.
