# Spec — Límite de 200 líneas y orden por carpetas

- **Origen:** pedido de Igna del 2026-10-17, "no negociable", antes de seguir con el desarrollo. Vale para Igna y para Pablo.
- **Fecha:** 2026-10-17
- **Alcance:** todo el monorepo (`backend/`, `frontend/`, `mobile/`). La parte de código se hace en dos tandas, una por rama (§6).

## 1. Las dos reglas

### Regla 1: ningún archivo de código pasa de 200 líneas

- **Cómo se cuenta:** líneas físicas, todo incluido (blancos, comentarios, imports). Es el número que muestra el editor.
- **Qué entra:** todo el código escrito a mano, tests incluidos: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.kt`, `.kts` y `.sql`.
- **Qué no entra:** documentación (`.md`), lockfiles (`package-lock.json`), archivos generados (`node_modules/`, `build/`, `dist/`, `coverage/`), recursos de Android (`res/**/*.xml`), JSON de configuración y binarios.
- **Si un archivo se pasa:** se refactoriza (extraer funciones, constantes, helpers) o se divide. Si se divide, las partes van **juntas en una carpeta propia** con el nombre de lo que dividen; nunca quedan sueltas al lado del resto.
- **Sin excepciones.** Si en el futuro aparece un caso que de verdad no se puede dividir, se discute entre los dos y se anota en `CONTRIBUTING.md` antes de commitearlo.

### Regla 2: todo ordenado por carpetas, primero por capa y después por módulo

- **Patrón único en los tres clientes:** capa → módulo → archivo.
  - El **módulo** es el nombre del recurso de la API, en inglés: `students`, `routines`, `invitations`, `body-metrics`, `auth`…
  - No se arma por "feature". Igna: "la feature solo la entiendo yo, no el que entra a revisar el código".
- **Nada suelto.** En la raíz de `src/`, de `tests/` o de un paquete solo van los puntos de entrada (`server.js`, `app.js`, `main.jsx`, `App.jsx`, `MainActivity.kt`, `FitTrainerApp.kt`).
- **Los tests copian el árbol del código.** El test de `services/students/students.service.js` va en `tests/unit/services/students/`. Si un archivo de test se divide, sus partes van en una carpeta con el nombre de la unidad: `tests/unit/services/students/students.service/*.test.js`.
- **Las utilidades de test van juntas:** fakes, fixtures y reglas de test viven en una carpeta `testing/` (mobile) o `tests/helpers/` (backend y web), también ordenada por módulo si crece.
- **Ninguna carpeta crece sin límite:** si una carpeta pasa de 10 archivos, se subdivide por tema.

## 2. Estructura de cada cliente

### Backend (`backend/`), sin cambios de fondo

```
src/
  server.js, app.js                       ← únicos en la raíz
  config/
  routes/<módulo>/        controllers/<módulo>/   services/<módulo>/
  repositories/<módulo>/  validations/<módulo>/   models/<módulo>/
  shared/middlewares/     shared/utils/
  database/schema/        (NN-<dominio>.sql, en orden de ejecución)
  database/migrations/    database/checks/
tests/
  unit/<capa>/<módulo>/   (mismo árbol que src)
  integration/
  helpers/
scripts/                  (scripts de mantenimiento, como el chequeo de largo)
```

### Web (`frontend/`, de Pablo; todavía no existe)

```
src/
  main.jsx, App.jsx                       ← únicos en la raíz
  pages/<módulo>/          (students/StudentsPage.jsx)
  components/<módulo>/     (students/StudentCard.jsx)   components/shared/
  hooks/<módulo>/          (students/useStudents.js)    hooks/shared/
  api/<módulo>/            (students/students.api.js)
  routes/   styles/   utils/
tests/                     (mismo árbol que src)
```

El `RestTimer.jsx` del PR #1 (`"Código Fuente/RestTimer.jsx"`) queda fuera de la convención. Se anota para que Pablo lo mueva (a `components/sessions/`, por ejemplo) cuando retome ese PR; no lo toca Igna.

### Mobile (`mobile/app/src/`), sin cambios de fondo

```
main/java/com/fittrainer/
  MainActivity.kt, FitTrainerApp.kt       ← únicos en la raíz
  data/<módulo>/   (api, auth, db, invitation, repository, session)
  ui/<módulo>/     (health, join, login, placeholder, theme); pantalla dividida → ui/<módulo>/components/
  navigation/   di/
test/java/com/fittrainer/
  testing/         (MainDispatcherRule)
  testing/fakes/   (FakeAuth, FakeHealth, FakeInvitation)
  data/<módulo>/   ui/<módulo>/   …   (mismo árbol que main)
androidTest/java/com/fittrainer/      (mismo árbol que main)
```

## 3. Dónde queda documentado

- **`CONTRIBUTING.md`, en la raíz y commiteado:** las dos reglas de §1, los árboles de §2, cómo dividir un archivo que se pasa (con un ejemplo), cómo se controla (§4) y el "sin excepciones". Es lo que leen Pablo y su agente.
- **`README.md` de la raíz:** un aviso al principio, "Antes de escribir código, leé `CONTRIBUTING.md`".
- **`backend/README.md`:** la sección "Estructura" apunta a `CONTRIBUTING.md` y muestra `database/schema/` en lugar de `schema.sql`.
- **`AGENTS.md` local de Igna:** una sección corta con las dos reglas y un link a `CONTRIBUTING.md`, para Claude Code y Codex. No se commitea (sigue en `.git/info/exclude`).

## 4. Control automático

La regla escrita sola se rompe. Cada cliente **falla** si un archivo se pasa:

- **Backend:**
  - `.eslintrc.json` pasa a `"max-lines": ["error", { "max": 200, "skipBlankLines": false, "skipComments": false }]`, así el editor marca el problema mientras se escribe.
  - `scripts/check-file-length.js` recorre `src/`, `tests/` y `scripts/`, cuenta líneas físicas de `.js` y `.sql`, y termina con código 1 listando los archivos que se pasan.
  - `npm run lint` corre los dos. La regla de AGENTS.md "antes de dar una tarea por terminada: `npm run lint`" ya lo hace obligatorio.
- **Mobile:** una tarea de Gradle `checkFileLength` en `app/build.gradle.kts`, enganchada a `check` y a `preBuild`. Recorre `src/**/*.kt` y los `.kts` del proyecto, y falla el build listando los archivos que se pasan. `gradlew assembleDebug` ya no compila si algo pasa de 200.
- **Web:** cuando Pablo cree `frontend/`, la misma regla de ESLint en "error". Queda escrito en `CONTRIBUTING.md`.

## 5. Qué hay que arreglar hoy

Relevamiento del 2026-10-17: líneas físicas, más de 200.

### Backend (rama `feature/students-body-metrics`)

| Líneas | Archivo | Cómo se arregla |
|---|---|---|
| 391 | `src/database/schema.sql` | Se divide en `src/database/schema/` (ver abajo). |
| 360 | `tests/unit/services/students/students.service.test.js` | Pasa a la carpeta `students.service/` con `list`, `register-from-invitation`, `get-by-id` y `update`, más una fixture compartida en `tests/helpers/students/`. |
| 240 | `tests/unit/services/auth/auth.service.test.js` | Pasa a `auth.service/` con `register-login`, `refresh-logout` y `account-disabled`. |
| 224 | `tests/unit/services/routines/routines.service.test.js` | Pasa a `routines.service/` con `create`, `exercises-and-detail` y `update-and-today`. |

Además, `body-metrics.service.test.js` (179) y el resto quedan como están: no pasan.

**`schema.sql` dividido**, en orden de ejecución. Cada archivo arranca con un encabezado que dice qué contiene y de cuál depende:

| Archivo | Contenido |
|---|---|
| `01-auth.sql` | extensión pgcrypto, `trainers`, `refresh_tokens` |
| `02-students.sql` | `students`, `invitations` (con sus `alter` idempotentes) |
| `03-routines.sql` | `exercises`, `routines`, `routine_exercises`, `routine_templates`, FK `routines_template_id_fkey` |
| `04-progress.sql` | `body_metrics` (+ `recorded_by`), `sessions`, `session_sets`, vista `student_last_session` |
| `05-gamification.sql` | `achievements`, `student_achievements`, `challenges`, `student_challenges` |
| `06-ai-and-agenda.sql` | `chat_messages`, `ai_routine_generations`, `appointments`, `notifications` |
| `07-rls.sql` | `enable row level security` de todas las tablas (deny-all, ADR 0001) |

- Al lado va un `README.md` que explica cómo se corre: en orden, en el SQL Editor de Supabase o con el MCP. Cada archivo se puede volver a correr.
- El contenido no cambia, solo se reparte. Concatenando `01` a `07` sale **el mismo conjunto de sentencias** que el `schema.sql` actual, sin perder ni duplicar ninguna. El orden solo cambia para agrupar por dominio, y siempre respetando las dependencias: una tabla se crea después de las que referencia. Por ejemplo, `routine_templates` sube a `03` junto a `routines`, y la FK `routines_template_id_fkey` va después de las dos.
- Si alguno de los siete pasa de 200, se vuelve a dividir dentro de la misma carpeta (por ejemplo `03a-`/`03b-`).

**Otros cambios de orden en el backend:**
- `src/database/schema-checks.sql` y `src/database/check-anon-access.js` pasan a `src/database/checks/`. Se actualiza el script `db:check-anon` de `package.json`.
- Las referencias a `schema.sql` (README del backend, comentarios del código, `check-anon-access.js`) pasan a apuntar a `database/schema/`. Los specs y planes viejos de `docs/superpowers/` quedan como están: son historia.

### Mobile (rama `feature/android-onboarding-qr`, segunda tanda)

| Líneas | Archivo |
|---|---|
| 379 | `test/.../data/auth/DataStoreTokenStoreUnitTest.kt` |
| 228 | `main/.../data/auth/TokenStore.kt` |
| 207 | `test/.../data/auth/AuthRepositoryTest.kt` |
| 204 | `main/.../ui/join/ConfirmInvitationScreen.kt` |
| 203 | `test/.../data/FakeAuth.kt` |
| 201 | `main/.../ui/join/JoinScreen.kt` |

Además se mueven los sueltos:
- `MainDispatcherRule` pasa a `testing/`;
- `FakeAuth`, `FakeHealth` y `FakeInvitation` pasan a `testing/fakes/`;
- se suma la tarea de Gradle de §4.

La forma de dividir cada archivo se decide en el plan de esa tanda, después de leerlos. Las condiciones son estas:
- no cambia el comportamiento;
- `testDebugUnitTest` y `assembleDebug` siguen en verde;
- las pantallas divididas reparten sus composables en `ui/join/components/`.

## 6. Orden de trabajo

1. **Tanda backend + documentación** (rama `feature/students-body-metrics`, unas 2,5 h): §3 completo, §4 backend y §5 backend. Va en commits propios, separados de los de la tarjeta 7.
2. **Tanda mobile** (rama `feature/android-onboarding-qr`, unas 3 h): §5 mobile y §4 mobile. Necesita el commit de la tarjeta 7 hecho antes, para cambiar de rama sin arrastrar cambios.
3. **Aviso a Pablo:** el `CONTRIBUTING.md` se lo presenta Igna. Conviene mencionarlo en la descripción del PR donde entre.

## 7. Cómo se verifica

- **Backend:** `npm run lint` pasa sin errores **ni warnings**, y `npm test` sigue en verde con la misma cantidad de tests (hoy 155). Se prueba que el chequeo funciona: un archivo temporal de 201 líneas hace fallar `npm run lint`; después se borra.
- **Schema:** la concatenación de `database/schema/01-07` es equivalente al `schema.sql` original. Correrla otra vez en Supabase dev no da error, porque es idempotente. `checks/schema-checks.sql` sigue devolviendo 0 filas.
- **Mobile:** `gradlew checkFileLength testDebugUnitTest assembleDebug` en verde. Un `.kt` temporal de 201 líneas hace fallar `checkFileLength`.
- **Orden:** un listado de archivos sueltos en raíces de capa (fuera de los puntos de entrada) da vacío.
