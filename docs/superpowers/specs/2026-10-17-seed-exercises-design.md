# Spec — Seed de la biblioteca: 50 ejercicios globales

- **Tarjeta:** "1 · Seed de la biblioteca: 50 ejercicios globales" (tablero personal de Pablo) → tarjeta de equipo https://trello.com/c/ejfkP9T4
- **Fecha:** 2026-10-17
- **Rama:** `feature/seed-exercises`, sale de `develop` (ya con #9 y #10 mergeadas). PR a `develop`, la revisa Igna.
- **Reglas que aplican:** `CONTRIBUTING.md` (200 líneas por archivo, `.sql` incluido; capa → módulo → archivo).
- **Fuentes:** Notion — *Modelo de datos (DER)*, tabla `exercises`; *Propuesta de Proyecto* (HU-09, HU-10, RNF-16); *Contratos de API* (`available_equipment`, `gym_equipment`); ADR-004.

## 1. Objetivo

La biblioteca global pasa de 18 a 50 ejercicios, todos con video, para que:

- el entrenador arme rutinas sin cargar ejercicios a mano (HU-09);
- el alumno vea la demostración de cada ejercicio (HU-10);
- los asistentes IA tengan opciones con distinto equipamiento para proponer sustituciones (ADR-004).

**Criterio de aceptación (de la tarjeta):** correr el seed en una base limpia deja 50 filas en `exercises`, todas con `is_global = true` y sin ningún `muscle_group` ni `equipment` fuera de los valores definidos.

## 2. Decisiones tomadas

- **Grupos musculares: los 11 del CHECK actual**, sin ampliarlo. Cuádriceps y femorales van como `legs`; la diferencia queda en el nombre y la descripción.
- **`equipment` usa códigos en inglés**, igual que la API y el seed actual. Lista cerrada: `barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`, `kettlebell`, `band`. Traducir es tarea de cada cliente.
- **La lista no se impone en la base ni en la API.** Se define como constante `EQUIPMENT` en `models/exercises/exercise.model.js` y la verifican el test y el check. Restringir lo que cargan los trainers queda para otra tarjeta.
- **Se mantienen los 18 globales actuales** con sus mismos nombres: se les completa `video_url` (y se pule la descripción) y se suman 32 nuevos. No se borra nada, porque `routine_exercises` y `session_sets` los referencian sin cascade.
- **Idempotencia:** índice único parcial `unique (name) where is_global` y el seed hace `on conflict (name) where is_global do update` de `muscle_group`, `equipment`, `description` y `video_url`. Correrlo N veces deja siempre las mismas 50 filas.
- **Video:** los 50 llevan un link de YouTube que existe (verificado con el oEmbed de YouTube). Se prefieren videos en español; en inglés solo si no hay uno bueno. RNF-22 (Storage/CDN) aplica a archivos propios, no a videos embebidos.
- **Nombre y descripción en español.** La descripción tiene 1 o 2 oraciones con la técnica clave. Una fila por ejercicio.

## 3. Reparto

| Grupo | Total | Hoy | Nuevos |
|---|---|---|---|
| chest | 6 | 3 | 3 |
| back | 6 | 3 | 3 |
| shoulders | 5 | 2 | 3 |
| legs | 8 | 3 | 5 |
| glutes | 4 | 1 | 3 |
| biceps | 4 | 1 | 3 |
| triceps | 4 | 1 | 3 |
| core | 5 | 1 | 4 |
| calves | 3 | 1 | 2 |
| full_body | 3 | 1 | 2 |
| cardio | 2 | 1 | 1 |
| **Total** | **50** | **18** | **32** |

Dentro de cada grupo con 4 o más ejercicios hay al menos dos equipamientos distintos.

## 4. Cambios

| Archivo | Cambio |
|---|---|
| `backend/src/database/schema/03-routines.sql` | Índice único parcial `uq_exercises_global_name on exercises (name) where is_global`. |
| `backend/src/database/migrations/2026-10-17-exercises-global-name.sql` | Mismo índice, re-ejecutable, para la base ya creada. |
| `backend/src/database/seeds/seed.sql` → `seeds/exercises.sql` | Renombrado. 50 filas con `video_url`, upsert idempotente. |
| `backend/src/database/checks/exercises-checks.sql` | Query que devuelve 0 filas si está todo bien (ver §5). |
| `backend/src/models/exercises/exercise.model.js` | Constante `EQUIPMENT`. |
| `backend/tests/unit/database/seeds/exercises.seed.test.js` | Test del archivo del seed, sin base (ver §5). |
| `backend/README.md`, `schema/README.md` | Ruta nueva del seed, migración y check. |

## 5. Verificación

**Test (Jest, `npm test`)** que lee `seeds/exercises.sql` y comprueba:

- exactamente 50 filas, todas con `is_global = true`;
- `muscle_group` dentro de `MUSCLE_GROUPS` y `equipment` dentro de `EQUIPMENT`;
- el reparto de §3;
- nombres sin repetir;
- cada `video_url` es un link de YouTube (`https://www.youtube.com/watch?v=…` o `https://youtu.be/…`);
- los 18 nombres actuales siguen presentes.

**Check en la base (`checks/exercises-checks.sql`)**, 0 filas = OK. Reporta un problema si:

- la cantidad de globales es distinta de 50;
- algún global tiene `trainer_id` no nulo;
- algún global tiene `muscle_group` o `equipment` fuera de las listas, o `video_url` vacío;
- hay nombres globales repetidos.

**Además:** `npm run lint` (incluye el límite de 200 líneas de los `.sql`).

## 6. Aplicación en Supabase dev

Con la cadena de conexión en `backend/.env` (`SUPABASE_DB_URL`, nunca se commitea), desde un script descartable fuera del repo, una transacción por paso:

1. Solo lectura: ¿hay globales con nombre repetido? Si hay, se frena y se reporta; no se borra nada sin OK.
2. Migración → seed → check.

La PR documenta los mismos pasos para correrlos a mano en el SQL Editor.

## 7. Fuera de alcance

- Ampliar el CHECK de `muscle_group` o agregar un CHECK de `equipment`.
- Validar `equipment` en la API.
- Traducir `equipment` en mobile y en la web.
- Un comando `npm run db:apply` en el repo.
