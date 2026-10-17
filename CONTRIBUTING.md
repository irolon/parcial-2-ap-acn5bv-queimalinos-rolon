# Cómo trabajamos en FitTrainer

Este archivo es la fuente de verdad del flujo de trabajo. Si Notion o el tablero dicen otra cosa, **manda este archivo**.

## Índice

- [Ramas y releases](#ramas-y-releases)
- [Commits](#commits)
- [Pull requests y review](#pull-requests-y-review)
- [Definition of Done](#definition-of-done)
- [Bloqueos y ritual semanal](#bloqueos-y-ritual-semanal)
- [Specs y plans](#specs-y-plans)
- [Asistentes de IA](#asistentes-de-ia)
- [Reglas de código](#reglas-de-código)

## Ramas y releases

- La rama principal es **`master`**. `develop` es la integración y la rama por defecto del repo.
- `master` representa **las entregas**. Solo recibe una PR de release desde `develop` en cada hito:

  | Hito | Fecha | Tag |
  |---|---|---|
  | Feature freeze | 08/11 | `v0.1` |
  | Congelamiento | 22/11 | `v0.2` |
  | Defensa | 04/12 | `v1.0` |

- Cuando llegue el VPS (S7), `master` es lo que se despliega. El primer release es el del 08/11; antes no se toca `master`.
- Las ramas de trabajo salen de `develop` y vuelven a `develop` por PR:
  - `feature/` para funcionalidad;
  - `fix/` para correcciones;
  - `docs/` para cambios que son solo documentación.
- Nombre de rama en inglés, kebab-case, sin número de tarjeta. Ejemplo: `feature/exercises-library`.
- **Nadie pushea directo a `develop` ni a `master`.**
- Se evitan las PRs apiladas. Si una es inevitable, apunta a la rama base, y al mergear la base se le cambia el destino a `develop`.

## Commits

- Conventional Commits, con tipos `feat`, `fix`, `docs`, `refactor`, `test`, `chore`. Descripción en español.
- El scope es recomendado, no obligatorio. Valores sugeridos: `backend`, `mobile`, `web`, `db`, `docker` o el módulo (`exercises`, `routines`…).
- La referencia a la tarjeta va en el título de la PR (`(tarjeta 9)`); en el commit es opcional.

## Pull requests y review

- **Todo entra por PR.** Revisa, aprueba y **mergea el otro**, nunca el autor.
- Como no hay CI, el revisor:
  - corre lint y tests de lo afectado, combinado con `develop`;
  - compara contra el spec o la tarjeta y contra las reglas de código;
  - aprueba o pide cambios, y marca cada observación como **bloqueante** o **menor**. Las menores no frenan el merge.
- La review se responde en **24 h hábiles**. La tarjeta presupuesta unos 30 minutos por PR: el objetivo es que los dos entiendan todo el sistema antes de la defensa.
- Merge con **merge commit** (no squash ni rebase). La rama se borra después del merge.
- La plantilla de PR está en `.github/pull_request_template.md`: tarjeta y spec, qué hace, cómo se probó y checklist de la DoD.

## Definition of Done

Una tarjeta está terminada cuando:

1. Todos los ítems del checklist de la tarjeta están tildados.
2. Está mergeada a `develop` por una PR aprobada por el otro.
3. Lint y tests pasan:
   - backend: `npm run lint` y `npm test`;
   - mobile: `gradlew checkFileLength testDebugUnitTest`, y `connectedDebugAndroidTest` si tocó Room u otro código instrumentado;
   - web: `npm run lint` y tests, cuando exista.
4. Cumple las [reglas de código](#reglas-de-código) (200 líneas; capa → módulo → archivo).
5. Se probó a mano el flujo completo de punta a punta.
6. Si cambió el contrato de la API o el schema, está actualizado en Notion.

## Bloqueos y ritual semanal

- Si uno queda bloqueado esperando al otro, avisa **el mismo día** por WhatsApp y lo deja anotado en un comentario de la tarjeta o la PR.
- Mientras espera, toma la siguiente tarjeta. El WIP es de **máximo 2 tarjetas en curso por persona**.
- Ritual semanal de 30 minutos, el que ya figura en el tablero:
  - lunes: planificación;
  - jueves: checkpoint (bloqueos, tarjetas con más de 4 días en curso).

## Specs y plans

- Cada tarjeta de más de medio día lleva un spec en `docs/superpowers/specs/AAAA-MM-DD-<tema>-design.md`. Si hace falta, también un plan en `docs/superpowers/plans/`.
- Se commitean en la misma rama que el código. **El spec manda ante cualquier conflicto**, y el revisor compara contra él.

## Asistentes de IA

- Se pueden usar para programar y para revisar.
- Commits, PRs, reviews y comentarios **no llevan firma ni trailers de IA** (`Co-Authored-By`, "Generated with…").
- Una auditoría con IA complementa la review humana, nunca la reemplaza: siempre aprueba la otra persona.

## Reglas de código

Dos reglas, **no negociables**, para todo el repo (backend, web y mobile) y para cualquiera que escriba código, persona o agente de IA. Si una tarea las rompe, no está terminada.

### Regla 1 — Ningún archivo de código pasa de 200 líneas

- Se cuentan **líneas físicas, todo incluido**: blancos, comentarios e imports. Es el número que muestra el editor.
- Entra todo el código escrito a mano, **tests incluidos**: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.kt`, `.kts` y `.sql`.
- No entran: `.md`, lockfiles, generados (`node_modules/`, `build/`, `dist/`, `coverage/`), XML de recursos de Android y JSON de configuración.
- **Si un archivo se pasa, se refactoriza o se divide.** Lo que se divide va **junto, en una carpeta con el nombre de lo dividido**, nunca suelto al lado del resto.
- Sin excepciones. Un caso que de verdad no se pueda dividir se discute entre Igna y Pablo y se anota acá **antes** de commitearlo.

Ejemplo: `tests/unit/services/students/students.service.test.js` pasó de 200 y quedó así:

```
tests/unit/services/students/students.service/
  list.test.js
  register-from-invitation.test.js
  get-by-id.test.js
  update.test.js
tests/helpers/students/students-service.setup.js   ← mocks y datos compartidos
```

### Regla 2 — Todo ordenado: capa → módulo → archivo

- Primero la **capa** (`services/`, `ui/`, `pages/`…), después el **módulo** y adentro los archivos.
- El módulo es **el nombre del recurso de la API, en inglés**: `students`, `routines`, `invitations`, `body-metrics`, `auth`… Nada de nombres de "feature" que solo entiende quien los inventó.
- **Nada suelto:** en la raíz de `src/`, de `tests/` o de un paquete solo van los puntos de entrada.
- **Los tests copian el árbol del código.** Un test dividido va en una carpeta con el nombre de la unidad.
- **Las utilidades de test** van en `tests/helpers/<módulo>/` (backend y web) o en `testing/` (mobile).
- **Una carpeta con más de 10 archivos se subdivide por tema.**

#### Backend (`backend/`)

```
src/
  server.js, app.js                ← únicos en la raíz
  config/
  routes/<módulo>/        controllers/<módulo>/   services/<módulo>/
  repositories/<módulo>/  validations/<módulo>/   models/<módulo>/
  shared/middlewares/     shared/utils/
  database/schema/        (01-…sql a 07-…sql, en orden de ejecución)
  database/migrations/    database/checks/        database/seeds/
tests/
  unit/<capa>/<módulo>/   (mismo árbol que src; unit/scripts/lib/ espeja scripts/lib/, sin módulo)
  integration/
  helpers/<módulo>/
scripts/                  (mantenimiento: chequeo de largo, etc.; sus helpers en scripts/lib/)
```

#### Web (`frontend/`)

```
src/
  main.jsx, App.jsx                ← únicos en la raíz
  pages/<módulo>/          components/<módulo>/   components/shared/
  hooks/<módulo>/          hooks/shared/          api/<módulo>/
  routes/   styles/   utils/
tests/                     (mismo árbol que src)
```

#### Mobile (`mobile/app/src/`) (objetivo; lo aplica la tanda de mobile)

```
main/java/com/fittrainer/
  MainActivity.kt, FitTrainerApp.kt     ← únicos en la raíz
  data/<módulo>/   ui/<módulo>/   (pantalla dividida → ui/<módulo>/components/)
  navigation/   di/
test/java/com/fittrainer/
  testing/   testing/fakes/   data/<módulo>/   ui/<módulo>/   (mismo árbol que main)
```

### Cómo se controla

Las reglas no dependen de acordarse: **el lint o el build fallan**.

- **Backend:** `npm run lint` corre ESLint (`max-lines` 200 como error, contando todo) y `scripts/check-file-length.js`, que controla también los `.sql`.
- **Mobile:** `gradlew checkFileLength` (corre solo con `check` y antes de compilar) falla si un `.kt` o `.kts` pasa de 200. (pendiente: lo agrega la tanda de mobile)
- **Web:** al crear `frontend/`, la misma regla de ESLint: `"max-lines": ["error", { "max": 200, "skipBlankLines": false, "skipComments": false }]`, y que `npm run lint` cubra `.js,.jsx,.ts,.tsx` (todo `src/` y `tests/`).

Antes de dar una tarea por terminada: lint y tests en verde.
