# Tests de integración

Supertest sobre `createApp()` (en el mismo proceso, sin `listen`) contra **Supabase dev**
(la base compartida del equipo). `npm test` no los levanta: solo corren con el script propio.

## Cómo correrlos

Desde `backend/`:

```bash
npm run test:integration                    # toda la suite (en serie, timeout 30 s)
npm run test:integration -- smoke           # un archivo
npm run test:integration:clean -- --check   # cuenta los QA que quedaron y las filas sin dueño (debe dar 0)
npm run test:integration:clean              # borra los QA de hace más de 1 hora y las filas sin dueño
```

**Precondición:** `backend/.env` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` de dev (no se
commitea). Si falta, sigue en los valores de test (`localhost:54321`) o apunta a otro proyecto que
no sea el de dev (`QA_SUPABASE_PROJECTS` en `scripts/lib/qa-env.js`), la suite se corta antes de
crear nada con `Integración frenada: …`.

## Datos de QA

- Todo se crea **por la API**, con emails `it.<corrida>.<rol>@test.fittrainer.dev` y nombres
  `IT · …` (`tests/helpers/integration/run-id.js`).
- Los avisos (récords, logros, comentarios, sustituciones) corren sin que la request los espere.
  Antes de borrar, el `afterAll` espera a que terminen (`settleInFlight`,
  `src/shared/utils/async/in-flight.js`): si no, un aviso tardío insertaría una fila en
  `notifications` para un usuario ya borrado. `buildWorld` usa lo mismo en vez de reintentar.
- Al terminar cada archivo (aunque fallen sus tests) el `afterAll` borra la corrida: primero
  `notifications`, `push_tokens` y `refresh_tokens` del PT y sus alumnos (no tienen FK), después
  los `students` de esos PT (cascada a rutinas, sesiones y series) y al final los `trainers`
  (cascada al resto: si se borra el trainer primero, su cascada a `exercises` choca con la FK de
  `routine_exercises`). Es lo único que se hace directo contra la base
  (`scripts/lib/qa-cleanup.js`), y solo toca trainers cuyo email es de QA.
- Si una corrida se corta a la fuerza, `npm run test:integration:clean` es la red de seguridad.
- **Filas sin dueño:** `notifications`, `push_tokens` y `refresh_tokens` no tienen FK. Una fila
  cuyo `user_id` no está ni en `trainers` ni en `students` no la puede leer nadie (los uuid no se
  reusan): es lo que habría borrado la cascada. `--check` las cuenta por tabla y el clean las
  borra, releyendo justo antes que el usuario siga sin existir (`scripts/lib/qa-orphans.js`).
- `--check` cuenta **todos** los datos de QA de la base, de cualquier corrida: si otra persona está
  corriendo la suite al mismo tiempo, puede dar más de 0 sin que nada haya quedado colgado.

Durante la integración FCM está apagado (`NODE_ENV=test`), no se suben fotos y no corren jobs.
