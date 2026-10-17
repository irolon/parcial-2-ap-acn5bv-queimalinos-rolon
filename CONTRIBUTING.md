# Cómo se escribe código en FitTrainer

Dos reglas, **no negociables**, para todo el repo (backend, web y mobile) y para cualquiera que escriba código, persona o agente de IA. Si una tarea las rompe, no está terminada.

## Regla 1 — Ningún archivo de código pasa de 200 líneas

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
  unit/<capa>/<módulo>/   (mismo árbol que src; unit/scripts/lib/ espeja scripts/lib/, sin módulo)
  integration/
  helpers/<módulo>/
scripts/                  (mantenimiento: chequeo de largo, etc.; sus helpers en scripts/lib/)
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

### Mobile (`mobile/app/src/`) (objetivo; lo aplica la tanda de mobile)

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
- **Mobile:** `gradlew checkFileLength` (corre solo con `check` y antes de compilar) falla si un `.kt` o `.kts` pasa de 200. (pendiente: lo agrega la tanda de mobile)
- **Web:** al crear `frontend/`, la misma regla de ESLint: `"max-lines": ["error", { "max": 200, "skipBlankLines": false, "skipComments": false }]`, y que `npm run lint` cubra `.js,.jsx,.ts,.tsx` (todo `src/` y `tests/`).

Antes de dar una tarea por terminada: lint y tests en verde.
