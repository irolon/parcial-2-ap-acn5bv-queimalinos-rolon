# Plan — Seed de la biblioteca: 50 ejercicios globales

- **Spec:** `docs/superpowers/specs/2026-10-17-seed-exercises-design.md` (autoridad; ante conflicto, manda el spec).
- **Rama:** `feature/seed-exercises` (sale de `origin/develop`).
- **Directorio del backend:** `backend/`. Comandos: `npm test`, `npm run lint` (desde `backend/`; correr `npm install` si falta `node_modules`).

## Global Constraints

- `CONTRIBUTING.md`: ningún archivo de código (`.js`, `.sql`, tests incluidos) pasa de 200 líneas físicas; capa → módulo → archivo; los tests espejan el árbol de `src/`; lint y tests en verde antes de terminar.
- **Sin ninguna firma de IA**: los commits NO llevan `Co-Authored-By` ni mención a Claude/IA; nada de "Generated with…". Mensajes en Conventional Commits, en español (ej. `feat(db): …`, `test(exercises): …`).
- Producto en español: nombres y descripciones de ejercicios en español. Códigos de `muscle_group` y `equipment` en inglés.
- `MUSCLE_GROUPS` (existente, no se toca): `chest, back, shoulders, legs, glutes, biceps, triceps, core, calves, full_body, cardio`.
- `EQUIPMENT` (nuevo), en este orden: `barbell, dumbbell, machine, cable, bodyweight, kettlebell, band`.
- No tocar Supabase ni ninguna base: todo es archivos del repo. No pushear.

## Task 1: Constante EQUIPMENT e índice único de globales

**Archivos:**
- `backend/src/models/exercises/exercise.model.js`: agregar, debajo de `MUSCLE_GROUPS`, `export const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band'];` con un comentario de una línea: códigos de equipamiento de la biblioteca global (los usa la IA para sustituciones; la API todavía no los exige).
- `backend/src/database/schema/03-routines.sql`: debajo de los índices de `exercises`, agregar
  `create unique index if not exists uq_exercises_global_name on exercises (name) where is_global;`
  con un comentario: un nombre no se repite entre los globales; hace idempotente el seed (`on conflict`).
- `backend/src/database/migrations/2026-10-17-exercises-global-name.sql`: encabezado con el mismo estilo que `migrations/2026-10-17-students-body-metrics.sql` ("Tarjeta 1 · Seed de ejercicios. Re-ejecutable. …También está en database/schema/ (03-routines.sql)."), y el mismo `create unique index if not exists …`.
- Test: `backend/tests/unit/models/exercises/exercise.model.test.js` — `EQUIPMENT` tiene exactamente esos 7 valores, sin repetidos.

**Commit:** `feat(db): índice único de nombres globales en exercises y constante EQUIPMENT`

## Task 2: Seed de 50 ejercicios con video

**Archivos:**
- `git mv backend/src/database/seeds/seed.sql backend/src/database/seeds/exercises.sql` y reescribirlo.
- Test primero: `backend/tests/unit/database/seeds/exercises.seed.test.js` (y helpers en `backend/tests/helpers/exercises/` si hace falta un parser) que lea el `.sql` y verifique todo lo de §5 "Test" del spec: 50 filas, `is_global` true, `muscle_group` ∈ `MUSCLE_GROUPS`, `equipment` ∈ `EQUIPMENT`, el reparto exacto de §3, nombres únicos, `video_url` con formato `https://www.youtube.com/watch?v=<11 chars>` o `https://youtu.be/<11 chars>`, y que estén los 18 nombres actuales (copiarlos literal del `seed.sql` actual). Además: en cada grupo con 4 o más ejercicios, al menos 2 equipamientos distintos.

**Contenido del seed:**
- Encabezado: qué es, que se corre DESPUÉS de `schema/` 01 a 07 (y de la migración en una base existente), que es re-ejecutable.
- Un solo `insert into exercises (name, muscle_group, equipment, description, video_url, is_global) values … on conflict (name) where is_global do update set muscle_group = excluded.muscle_group, equipment = excluded.equipment, description = excluded.description, video_url = excluded.video_url;`
- Una fila por ejercicio, agrupadas por `muscle_group` en el orden de `MUSCLE_GROUPS`, con un comentario de una línea por grupo.
- Los 18 nombres actuales se conservan **literalmente** (mismo texto). Se pueden mejorar sus descripciones.
- 32 nuevos según el reparto del spec §3. Ejercicios comunes de gimnasio, nombres en español rioplatense neutro y reconocibles (ej. "Fondos en paralelas", "Zancadas con mancuernas", "Swing con kettlebell").
- Descripción: 1–2 oraciones en español con la técnica clave. Escapar comillas simples (`''`).
- `video_url`: un video real de YouTube que demuestre ese ejercicio. Preferir videos en español; en inglés solo si no hay uno bueno. **Verificar cada uno** con `https://www.youtube.com/oembed?url=<url>&format=json` (debe responder 200 y el título tiene que corresponder al ejercicio). Guardar la evidencia (url → título devuelto, idioma) en el report file, en una tabla.
- El archivo no puede pasar de 200 líneas.

**Commit(s):** `test(exercises): verificación del seed de la biblioteca global` y `feat(db): seed de 50 ejercicios globales con video`

## Task 3: Check en la base y documentación

**Archivos:**
- `backend/src/database/checks/exercises-checks.sql`: una sola query (o `union all` de queries) que devuelve 0 filas si está todo bien, con una columna `problema` (texto) y, cuando aplique, el ejercicio afectado. Problemas: cantidad de globales ≠ 50; global con `trainer_id` no nulo; global con `muscle_group` o `equipment` fuera de las listas (copiadas literal de las constantes); global con `video_url` nulo o vacío; nombre global repetido. Mismo estilo de encabezado que `checks/schema-checks.sql`.
- `backend/README.md`: en "Setup", el paso 2 pasa a `src/database/seeds/exercises.sql`, y se agrega: en una base ya creada, correr antes las migraciones de `src/database/migrations/` que falten; después, `src/database/checks/exercises-checks.sql` tiene que devolver 0 filas.
- `backend/src/database/schema/README.md`: mencionar que después del seed corre `../checks/exercises-checks.sql` (0 filas = OK).
- Buscar en el repo cualquier otra referencia a `seeds/seed.sql` y actualizarla.

**Commit:** `docs(db): check de la biblioteca global y pasos del seed`
