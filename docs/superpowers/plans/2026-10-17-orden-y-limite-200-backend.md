# Límite de 200 líneas y orden (tanda backend) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el backend sin ningún archivo de código de más de 200 líneas físicas, todo ordenado capa → módulo → archivo, con un chequeo que hace fallar `npm run lint`, y la regla documentada en `CONTRIBUTING.md` para Igna y Pablo.

**Architecture:** Un script Node (`backend/scripts/check-file-length.js`) cuenta líneas físicas de `.js` y `.sql`, y ESLint pasa `max-lines` a error contando todo. Los tres tests largos se dividen en carpetas con el nombre de la unidad, y sus mocks compartidos van a `tests/helpers/<módulo>/`. `schema.sql` se reparte en `database/schema/01..07`, y los chequeos y el seed pasan a sus carpetas.

**Tech Stack:** Node 20 ESM, Jest 29 (ESM, `jest.unstable_mockModule`), ESLint 8, PostgreSQL/Supabase.

**Spec:** `docs/superpowers/specs/2026-10-17-orden-y-limite-200-design.md`

## Global Constraints

- **Límite:** 200 líneas **físicas** (`wc -l`), todo incluido, para `.js` y `.sql` de `backend/src`, `backend/tests` y `backend/scripts`.
- **Orden:** capa → módulo (nombre del recurso de la API, en inglés) → archivo. En la raíz de `src/` solo van `server.js` y `app.js`. Un test dividido va en una carpeta con el nombre de la unidad (`tests/unit/services/students/students.service/`).
- **Sin cambios de comportamiento.** `npm test` tiene que pasar con **la misma cantidad de tests que antes** (155 al empezar) y ningún test se pierde ni se duplica.
- **Git y base:** los agentes no hacen git que escriba. Los commits los hace Igna, sin firmas de IA. La base de Supabase se toca solo en la Task 4, Step 6, para correr de nuevo un schema idempotente (Igna ya autorizó escribir en Supabase dev para esta tarjeta).
- **Comentarios en español, como el resto del código.** No se toca `docs/superpowers/` viejo (specs y planes anteriores).

## Review Focus

1. **Un test que deja de correr al dividirse** (un `describe` que no se copió, o un archivo que no termina en `.test.js`): la cantidad total de tests tiene que ser exactamente la misma. → En cada task de división, comparar el `Tests: N passed` antes y después.
2. **Un mock compartido que no se aplica** porque `jest.unstable_mockModule` resuelve la ruta desde otro archivo: el service cargaría el repositorio real y el test pegaría a Supabase o fallaría por las variables de entorno. → Task 2 lo verifica antes de seguir.
3. **Un `schema/` que, corrido en orden, crea una tabla antes que otra de la que depende**, o pierde una sentencia. → Task 4 compara el conjunto de sentencias y lo vuelve a correr en dev.
4. **El chequeo que no ve los `.sql`, o que cuenta mal un archivo sin salto de línea final.** → Task 1 lo testea.
5. **Referencias rotas a rutas movidas** (`db:check-anon`, comentarios que apuntan a `schema.sql`). → Task 4 hace un grep final.

---

### Task 1: Chequeo de largo de archivos

**Files:**
- Create: `backend/scripts/check-file-length.js`
- Create: `backend/scripts/lib/file-length.js`
- Test: `backend/tests/unit/scripts/file-length.test.js`

**Interfaces:**
- Produces:
  - `countLines(text: string) → number`: líneas físicas. Un texto vacío da 0. Un archivo sin salto final cuenta su última línea.
  - `findOversized(files: Array<{ path, text }>, max = 200) → Array<{ path, lines }>`
  - `MAX_LINES = 200`, `CODE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.sql']`
  - Script: `node scripts/check-file-length.js` (desde `backend/`). Recorre `src`, `tests` y `scripts`, sin entrar a `node_modules` ni `coverage`. Imprime `OK: ningún archivo pasa de 200 líneas` y sale con 0, o lista `NNN ruta` y sale con 1.

- [ ] **Step 1: Test que falla** — `backend/tests/unit/scripts/file-length.test.js`:

```js
import { countLines, findOversized, MAX_LINES } from '../../../scripts/lib/file-length.js';

describe('file-length — countLines', () => {
  it('cuenta líneas físicas, blancos y comentarios incluidos', () => {
    expect(countLines('a\n\n// c\nb\n')).toBe(4);
  });
  it('cuenta la última línea aunque no termine en salto', () => {
    expect(countLines('a\nb')).toBe(2);
  });
  it('un archivo vacío tiene 0 líneas', () => {
    expect(countLines('')).toBe(0);
  });
  it('acepta fin de línea CRLF', () => {
    expect(countLines('a\r\nb\r\n')).toBe(2);
  });
});

describe('file-length — findOversized', () => {
  const lines = (n) => 'x\n'.repeat(n);
  it('el límite es 200', () => expect(MAX_LINES).toBe(200));
  it('200 líneas pasa, 201 no', () => {
    const result = findOversized([
      { path: 'ok.js', text: lines(200) },
      { path: 'largo.sql', text: lines(201) },
    ]);
    expect(result).toEqual([{ path: 'largo.sql', lines: 201 }]);
  });
  it('ordena de más largo a más corto', () => {
    const result = findOversized([
      { path: 'a.js', text: lines(250) },
      { path: 'b.js', text: lines(300) },
    ]);
    expect(result.map((r) => r.path)).toEqual(['b.js', 'a.js']);
  });
});
```

- [ ] **Step 2:** `cd backend && npm test -- tests/unit/scripts` → FAIL, "Cannot find module".

- [ ] **Step 3: Implementar** `backend/scripts/lib/file-length.js`:

```js
/**
 * Regla del proyecto (CONTRIBUTING.md): ningún archivo de código pasa de 200
 * líneas FÍSICAS, todo incluido (blancos, comentarios, imports).
 */

export const MAX_LINES = 200;

/** Extensiones de código que controla el backend (ESLint no lee los .sql). */
export const CODE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.sql'];

/** Líneas físicas de un texto: la última cuenta aunque no termine en salto. */
export function countLines(text) {
  if (text === '') return 0;
  const breaks = text.match(/\n/g)?.length ?? 0;
  return text.endsWith('\n') ? breaks : breaks + 1;
}

/** Archivos que pasan el límite, del más largo al más corto. */
export function findOversized(files, max = MAX_LINES) {
  return files
    .map(({ path, text }) => ({ path, lines: countLines(text) }))
    .filter((f) => f.lines > max)
    .sort((a, b) => b.lines - a.lines);
}
```

`backend/scripts/check-file-length.js`:

```js
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { CODE_EXTENSIONS, MAX_LINES, findOversized } from './lib/file-length.js';

// Uso (desde backend/): node scripts/check-file-length.js — lo corre `npm run lint`.
const ROOTS = ['src', 'tests', 'scripts'];
const SKIP_DIRS = new Set(['node_modules', 'coverage']);

/** Recorre una carpeta y devuelve los archivos de código. */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : walk(path);
    return CODE_EXTENSIONS.includes(extname(entry.name)) ? [path] : [];
  });
}

const files = ROOTS.flatMap(walk).map((path) => ({
  path: relative('.', path).replaceAll('\\', '/'),
  text: readFileSync(path, 'utf8'),
}));
const oversized = findOversized(files);

if (oversized.length === 0) {
  console.log(`OK: ningún archivo pasa de ${MAX_LINES} líneas (${files.length} revisados)`);
} else {
  console.error(`Archivos de más de ${MAX_LINES} líneas (ver CONTRIBUTING.md):`);
  for (const f of oversized) console.error(`  ${f.lines} ${f.path}`);
  process.exit(1);
}
```

- [ ] **Step 4:** `npm test -- tests/unit/scripts` → PASS (7 tests). Después `node scripts/check-file-length.js` → sale con 1 y lista exactamente los 4 archivos del spec §5 (`schema.sql` 391 y los tres tests). Con eso queda probado que el script ve los `.sql`.

- [ ] **Step 5: Commit (Igna):** `git add backend/scripts backend/tests/unit/scripts && git commit -m "chore(backend): chequeo de largo de archivos (200 líneas físicas)"`

---

### Task 2: Dividir `students.service.test.js` (360 líneas)

**Files:**
- Create: `backend/tests/helpers/students/students-service.setup.js` (mocks + fixtures)
- Create: `backend/tests/unit/services/students/students.service/list.test.js`
- Create: `backend/tests/unit/services/students/students.service/register-from-invitation.test.js`
- Create: `backend/tests/unit/services/students/students.service/get-by-id.test.js`
- Create: `backend/tests/unit/services/students/students.service/update.test.js`
- Delete: `backend/tests/unit/services/students/students.service.test.js`

**Interfaces:**
- Produces: `tests/helpers/students/students-service.setup.js` exporta `mockInvitationsRepo`, `mockStudentsRepo`, `mockIssueTokens`, `mockAuthRepo`, `mockRoutinesRepo`, `mockBodyMetricsService`, `service` y las fixtures del archivo original (`VALID_INVITATION`, `CREATED_STUDENT`, `TRAINER`, `STUDENT_ROW`, `LATEST`, `ROUTINE`).

- [ ] **Step 1: Línea de base.** `cd backend && npm test 2>&1 | grep '^Tests:'`. Anotar el número (hoy 155) y la cantidad de `it(` del archivo: `grep -c "^\s*it(" tests/unit/services/students/students.service.test.js`.

- [ ] **Step 2: Crear el setup compartido.** Va en `tests/helpers/students/students-service.setup.js` y contiene **todo lo que hoy está arriba del primer `describe`** en `students.service.test.js`: los mocks, los `jest.unstable_mockModule`, el `await import` del service y las fixtures. Se agregan `export`, y además se mueven ahí las fixtures que hoy están entre los `describe` (`TRAINER`, `STUDENT_ROW`, `LATEST`, `ROUTINE`).

  Las rutas de los `jest.unstable_mockModule` y del `import()` se arman como **absolutas**, desde la ubicación del helper, para que no dependan de qué archivo llama:

```js
import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures compartidos por los tests de students.service (divididos en
// tests/unit/services/students/students.service/). Rutas absolutas: el mock
// tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockInvitationsRepo = { /* igual que en el archivo original */ };
// … resto de los mocks, igual que el original …
jest.unstable_mockModule(src('repositories/invitations/invitations.repository.js'), () => mockInvitationsRepo);
// … un unstable_mockModule por cada dependencia, igual que el original …
export const service = await import(src('services/students/students.service.js'));
// … fixtures exportadas …
```

- [ ] **Step 3: Repartir los `describe`, copiándolos sin cambios.**
  - `describe('students.service — list'…)` va a `list.test.js`.
  - `describe('students.service — registerFromInvitation'…)` va a `register-from-invitation.test.js`.
  - `describe('students.service — getById'…)` va a `get-by-id.test.js`.
  - `describe('students.service — update'…)` va a `update.test.js`.

  Cada archivo arranca con `import { … } from '../../../../helpers/students/students-service.setup.js';`, importando solo lo que usa. Un import sin usar es un warning de lint. Después se borra el archivo original.

- [ ] **Step 4: Verificar que los mocks aplican.** `npm test -- tests/unit/services/students` → PASS. Si algún test intenta usar el repositorio real (errores de `SUPABASE_URL` o de red), el mock no se aplicó. En ese caso, como alternativa:
  - los `jest.unstable_mockModule` y el `await import` vuelven a cada archivo de test;
  - en el helper quedan solo las fixtures y las fábricas de mocks (`export const makeStudentsRepoMock = () => ({ … })`);
  - cada test sigue teniendo menos de 200 líneas.

- [ ] **Step 5: Mismo total.** `npm test 2>&1 | grep '^Tests:'` tiene que dar el mismo número del Step 1. Además, la suma de `it(` de los 4 archivos nuevos tiene que dar igual a la del original. Ningún archivo nuevo pasa de 200: `wc -l` sobre los 5.

- [ ] **Step 6: Commit (Igna):** `git add -A backend/tests && git commit -m "test(students): divide los tests de students.service en carpeta propia"`

---

### Task 3: Dividir `auth.service.test.js` (240) y `routines.service.test.js` (224)

**Files:**
- Create: `backend/tests/helpers/auth/auth-service.setup.js`
- Create: `backend/tests/unit/services/auth/auth.service/register-login.test.js` (los `describe` `register` y `login`)
- Create: `backend/tests/unit/services/auth/auth.service/refresh-logout.test.js` (los `describe` `refresh` y `logout`)
- Create: `backend/tests/unit/services/auth/auth.service/account-disabled.test.js` (el `describe` 'alumno dado de baja (active = false)')
- Create: `backend/tests/helpers/routines/routines-service.setup.js`
- Create: `backend/tests/unit/services/routines/routines.service/create.test.js` (el `describe` `create`)
- Create: `backend/tests/unit/services/routines/routines.service/exercises-and-detail.test.js` (los `describe` `addExercises` y `getById`)
- Create: `backend/tests/unit/services/routines/routines.service/update-and-today.test.js` (los `describe` `update` y `today`)
- Delete: los dos archivos originales

**Interfaces:**
- Consumes: el patrón de helper que quedó funcionando en la Task 2 (con rutas absolutas, o la alternativa del Step 4 de esa task si fue la que anduvo).

- [ ] **Step 1: Línea de base.** El total de `npm test` y `grep -c "^\s*it("` de cada original.

- [ ] **Step 2: Hacer lo mismo que en la Task 2.** Lo que está arriba del primer `describe` va al helper: para auth, `mockRepo`, `mockStudentsRepo`, `authService`, `hashPassword`, `verifyAccessToken`, `hashToken` y `TRAINER`; para routines, `mockRepo`, `service`, `TRAINER_ID`, `ROUTINE` y `BODY`. Los `describe` se reparten como dice **Files**, copiados sin cambios.
  - Los dos originales tienen un `describe` externo (`'auth.service'` y `'routines.service'`). Se mantiene ese `describe` externo en cada archivo nuevo, para que los nombres de los tests no cambien.
  - El `beforeEach` de routines (`findAccessibleExerciseIds.mockImplementation(...)`) se repite en cada archivo de routines, dentro de su `describe` externo.

- [ ] **Step 3:** `npm test -- tests/unit/services/auth tests/unit/services/routines` → PASS. Se cumple lo mismo que en la Task 2, Step 5: igual total de tests e igual suma de `it(`, y todos los archivos por debajo de 200 líneas.

- [ ] **Step 4: Commit (Igna):** `git add -A backend/tests && git commit -m "test(auth,routines): divide los tests largos en carpetas propias"`

---

### Task 4: Repartir `schema.sql` y ordenar `database/`

**Files:**
- Create: `backend/src/database/schema/01-auth.sql` … `07-rls.sql` y `backend/src/database/schema/README.md`
- Move: `backend/src/database/schema-checks.sql` → `backend/src/database/checks/schema-checks.sql`
- Move: `backend/src/database/check-anon-access.js` → `backend/src/database/checks/check-anon-access.js`
- Move: `backend/src/database/seed.sql` → `backend/src/database/seeds/seed.sql`
- Delete: `backend/src/database/schema.sql`
- Modify: `backend/package.json` (script `db:check-anon`), y los comentarios que nombran `schema.sql`: `migrations/2026-10-17-students-body-metrics.sql`, `seeds/seed.sql`, `models/students/student.model.js` y `checks/check-anon-access.js`.

- [ ] **Step 1: Repartir por rangos de líneas** del `schema.sql` actual, copiándolos sin cambios. Cada archivo arranca con un encabezado de 2 o 3 líneas: qué tablas tiene, que va después del archivo anterior y que se puede volver a correr.

| Archivo | Líneas del original |
|---|---|
| `01-auth.sql` | 1–45: el encabezado general (adaptado) y `create extension`, `trainers`, `refresh_tokens` |
| `02-students.sql` | 46–95: `students` e `invitations`, con sus `alter` |
| `03-routines.sql` | 96–149, y después 177–202: `exercises`, `routines`, `routine_exercises`, `routine_templates` y la FK `routines_template_id_fkey` |
| `04-progress.sql` | 150–176, y después 203–254: `body_metrics` (con `recorded_by`), `sessions`, la vista `student_last_session` y `session_sets` |
| `05-gamification.sql` | 255–304 |
| `06-ai-and-agenda.sql` | 305–367 |
| `07-rls.sql` | 368–391 |

Antes de cortar, se confirman los límites de cada rango con `grep -n "^-- ──" schema.sql`: cada rango tiene que empezar en un encabezado de sección. Si no coincide, se corrige el rango, respetando el criterio de la tabla.

- [ ] **Step 2: Dependencias.** Recorrer los archivos en orden y confirmar que cada `references <tabla>` apunta a una tabla creada en ese archivo, más arriba, o en un archivo anterior. Por ejemplo: `04` usa `students` (de `02`) y `routines` (de `03`); `06` usa `sessions` (de `04`).

- [ ] **Step 3: Mismo conjunto de sentencias.** Con un script de una sola vez en el scratchpad (no va al repo):
  1. se separan el original y `cat schema/0*.sql` en sentencias por `;`, sacando comentarios y espacios;
  2. se ordenan las dos listas y se comparan;
  3. tienen que ser idénticas.

- [ ] **Step 4: `schema/README.md`.** Va en `database/schema/README.md` y explica:
  - qué contiene cada archivo;
  - que se corren en orden (01 a 07), en el SQL Editor de Supabase o con el MCP;
  - que todos se pueden volver a correr;
  - que un cambio nuevo de schema va al archivo de su dominio y también a `migrations/`.

- [ ] **Step 5: Mover chequeos y seed, y actualizar referencias.**
  - En `package.json`: `"db:check-anon": "node src/database/checks/check-anon-access.js"`.
  - Dentro de `check-anon-access.js`, revisar si usa rutas relativas, como el `dotenv`, que lee `.env` desde el cwd. Si las usa, siguen funcionando desde `backend/`.
  - Los comentarios que dicen `schema.sql` pasan a decir `database/schema/` y nombran el archivo de su dominio.
  - Para verificar: `grep -rn "schema\.sql\|database/check-anon\|database/schema-checks" backend --include=*.js --include=*.json --include=*.sql | grep -v node_modules` tiene que dar vacío.

- [ ] **Step 6: Volver a correrlo en Supabase dev** (proyecto `yqjhonnetginzayzymyr`). Igna ya autorizó escribir en Supabase dev para esta tarjeta, y el schema es idempotente.
  1. Se aplican `01` a `07` en orden con el MCP `apply_migration` (nombre `schema_split_check`) o con `execute_sql`, y tienen que terminar sin error.
  2. Después se corre `checks/schema-checks.sql`, que tiene que devolver 0 filas.
  3. Por último, `npm run db:check-anon`, que tiene que dar "Ninguna tabla expuesta".

- [ ] **Step 7:** `npm test` en verde, con el mismo total. `node scripts/check-file-length.js`: `schema.sql` ya no aparece y cada `0N-*.sql` tiene 200 líneas o menos.

- [ ] **Step 8: Commit (Igna):** `git add -A backend/src/database backend/package.json backend/src/models && git commit -m "refactor(db): reparte schema.sql por dominio en database/schema y ordena checks y seeds"`

---

### Task 5: `CONTRIBUTING.md`, README y `AGENTS.md`

**Files:**
- Create: `CONTRIBUTING.md` (raíz)
- Modify: `README.md` (raíz): un aviso al principio
- Modify: `backend/README.md`: la sección "Estructura" y la de setup (líneas 36, 60 y 140), que hoy nombran `schema.sql`
- Modify: `AGENTS.md` (local, **no se commitea**): una sección nueva

- [ ] **Step 1: Escribir `CONTRIBUTING.md`** con este contenido, sin achicarlo:

````markdown
# Cómo se escribe código en FitTrainer

Dos reglas, **no negociables**, para todo el repo (backend, web y mobile) y para cualquiera que escriba código, persona o agente de IA. Si una tarea las rompe, no está terminada.

## Regla 1 — Ningún archivo de código pasa de 200 líneas

- Se cuentan **líneas físicas, todo incluido**: blancos, comentarios e imports. Es el número que muestra el editor.
- Entra todo el código escrito a mano, **tests incluidos**: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.kt`, `.kts` y `.sql`.
- No entran: `.md`, lockfiles, generados (`node_modules/`, `build/`, `dist/`, `coverage/`), XML de recursos de Android y JSON de configuración.
- **Si un archivo se pasa, se refactoriza o se divide.** Lo que se divide va **junto, en una carpeta con el nombre de lo dividido**, nunca suelto al lado del resto.
- Sin excepciones. Un caso que de verdad no se pueda dividir se discute entre los dos y se anota acá **antes** de commitearlo.

Ejemplo: `tests/unit/services/students/students.service.test.js` pasó de 200 y quedó así:

```
tests/unit/services/students/students.service/
  list.test.js
  register-from-invitation.test.js
  get-by-id.test.js
  update.test.js
tests/helpers/students/students-service.setup.js   ← mocks y datos compartidos
```

## Regla 2 — Todo ordenado: capa → módulo → archivo

- Primero la **capa** (`services/`, `ui/`, `pages/`…), después el **módulo** y adentro los archivos.
- El módulo es **el nombre del recurso de la API, en inglés**: `students`, `routines`, `invitations`, `body-metrics`, `auth`… Nada de nombres de "feature" que solo entiende quien los inventó.
- **Nada suelto:** en la raíz de `src/`, de `tests/` o de un paquete solo van los puntos de entrada.
- **Los tests copian el árbol del código.** Un test dividido va en una carpeta con el nombre de la unidad.
- **Las utilidades de test** van en `tests/helpers/<módulo>/` (backend y web) o en `testing/` (mobile).
- **Una carpeta con más de 10 archivos se subdivide por tema.**

### Backend (`backend/`)

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
  unit/<capa>/<módulo>/   (mismo árbol que src)
  integration/
  helpers/<módulo>/
scripts/                  (mantenimiento: chequeo de largo, etc.)
```

### Web (`frontend/`)

```
src/
  main.jsx, App.jsx                ← únicos en la raíz
  pages/<módulo>/          components/<módulo>/   components/shared/
  hooks/<módulo>/          hooks/shared/          api/<módulo>/
  routes/   styles/   utils/
tests/                     (mismo árbol que src)
```

### Mobile (`mobile/app/src/`)

```
main/java/com/fittrainer/
  MainActivity.kt, FitTrainerApp.kt     ← únicos en la raíz
  data/<módulo>/   ui/<módulo>/   (pantalla dividida → ui/<módulo>/components/)
  navigation/   di/
test/java/com/fittrainer/
  testing/   testing/fakes/   data/<módulo>/   ui/<módulo>/   (mismo árbol que main)
```

## Cómo se controla

Las reglas no dependen de acordarse: **el lint o el build fallan**.

- **Backend:** `npm run lint` corre ESLint (`max-lines` 200 como error, contando todo) y `scripts/check-file-length.js`, que controla también los `.sql`.
- **Mobile:** `gradlew checkFileLength` (corre solo con `check` y antes de compilar) falla si un `.kt` o `.kts` pasa de 200.
- **Web:** al crear `frontend/`, la misma regla de ESLint: `"max-lines": ["error", { "max": 200, "skipBlankLines": false, "skipComments": false }]`.

Antes de dar una tarea por terminada: lint y tests en verde.
````

  Nota para el implementador: el bloque de afuera usa cuatro backticks porque adentro hay bloques de código. En el archivo real, el contenido va sin ese envoltorio.

  La línea de mobile ("corre solo con `check`…") describe lo que deja la tanda de mobile. Mientras no se haga, se agrega "(pendiente: lo agrega la tanda de mobile)" al final de esa línea.

- [ ] **Step 2: `README.md` de la raíz.** Justo debajo del título va:

```markdown
> **Antes de escribir código, leé [`CONTRIBUTING.md`](CONTRIBUTING.md).** Ningún archivo de código pasa de 200 líneas y todo va ordenado capa → módulo → archivo. No es negociable.
```

- [ ] **Step 3: `backend/README.md`.**
  - El árbol de "Estructura" muestra `database/schema/`, `checks/`, `seeds/` y `scripts/`, y arriba lleva la línea "Reglas de tamaño y orden: ver `../CONTRIBUTING.md`".
  - En el setup (la línea 60), en lugar de `schema.sql` dice "los archivos de `src/database/schema/` en orden (ver su README)".
  - La línea 140 queda así: "Todos están aplicados en `src/database/schema/`".

- [ ] **Step 4: `AGENTS.md` local.** Se agrega antes de la sección "Antes de dar una tarea por terminada":

```markdown
## Tamaño y orden de archivos (no negociable)

- Ningún archivo de código (tests y `.sql` incluidos) pasa de **200 líneas físicas**. Si se pasa: refactorizar o dividir, y lo dividido va en una carpeta propia.
- Todo ordenado **capa → módulo (recurso de la API) → archivo**, sin archivos sueltos; los tests copian el árbol del código.
- Detalle y árboles por cliente: `CONTRIBUTING.md` (compartido con Pablo).
```

  En "Antes de dar una tarea por terminada", la línea de backend queda: "Backend: `npm run lint` (incluye el chequeo de 200 líneas) y `npm test` en `backend/`". La de mobile suma `gradlew checkFileLength`, cuando exista.

- [ ] **Step 5: Revisar.** Confirmar que `git check-ignore AGENTS.md` lo marca como ignorado y que `CONTRIBUTING.md` no lo está.

- [ ] **Step 6: Commit (Igna):** `git add CONTRIBUTING.md README.md backend/README.md && git commit -m "docs: reglas de tamaño (200 líneas) y orden por carpetas en CONTRIBUTING.md"`

---

### Task 6: Activar el control en `npm run lint` y verificar todo

**Files:**
- Modify: `backend/.eslintrc.json` (regla `max-lines`)
- Modify: `backend/package.json` (script `lint`)

- [ ] **Step 1: ESLint.** En `.eslintrc.json`:

```json
"max-lines": ["error", { "max": 200, "skipBlankLines": false, "skipComments": false }]
```

  `lint` ya incluye `tests/**/*.js`. Hay que sumar `scripts/**/*.js` al patrón:

```json
"lint": "eslint \"src/**/*.js\" \"tests/**/*.js\" \"scripts/**/*.js\" && node scripts/check-file-length.js",
"lint:fix": "eslint \"src/**/*.js\" \"tests/**/*.js\" \"scripts/**/*.js\" --fix",
```

- [ ] **Step 2: Todo verde.** `npm run lint` tiene que dar 0 errores y **0 warnings**, y terminar con "OK: ningún archivo pasa de 200 líneas". `npm test` tiene que dar el mismo total que al empezar (155) más los 7 tests nuevos de la Task 1, o sea **162**.

- [ ] **Step 3: El control muerde.** Se crea `backend/tests/unit/tmp-largo.test.js` con 201 líneas de comentario, y `npm run lint` tiene que **fallar** listándolo. Después se borra. Se hace lo mismo con un `backend/src/database/schema/99-tmp.sql` de 201 líneas, y también se borra.

- [ ] **Step 4: Nada suelto.** Este comando tiene que imprimir solo `src/app.js`, `src/server.js` (los puntos de entrada) y `scripts/check-file-length.js` (el punto de entrada del script, que `npm run lint` llama por esa ruta):

```bash
cd backend && find src tests scripts -maxdepth 1 -type f
```

  Y este, nada: ninguna carpeta con más de 10 archivos directos.

```bash
find src tests scripts -type d | while read d; do n=$(find "$d" -maxdepth 1 -type f | wc -l); [ "$n" -gt 10 ] && echo "$n $d"; done
```

- [ ] **Step 5: Commit (Igna):** `git add backend/.eslintrc.json backend/package.json && git commit -m "chore(backend): npm run lint falla si un archivo pasa de 200 líneas"`
