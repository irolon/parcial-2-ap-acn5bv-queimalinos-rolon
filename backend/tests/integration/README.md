# Tests de integración

Supertest sobre `createApp()` (en el mismo proceso, sin `listen`) contra **Supabase dev**
(la base compartida del equipo). `npm test` no los levanta: solo corren con el script propio.

## Cómo correrlos

Desde `backend/`:

```bash
npm run test:integration                    # toda la suite (en serie, timeout 30 s)
npm run test:integration -- smoke           # un archivo
npm run test:integration:clean -- --check   # cuenta los datos de QA que quedaron (debe dar 0)
npm run test:integration:clean              # borra los de QA creados hace más de 1 hora
```

**Precondición:** `backend/.env` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` de dev (no se
commitea). Si falta o sigue en los valores de test (`localhost:54321`), la suite se corta antes de
crear nada con `Integración frenada: …`.

## Datos de QA

- Todo se crea **por la API**, con emails `it.<corrida>.<rol>@test.fittrainer.dev` y nombres
  `IT · …` (`tests/helpers/integration/run-id.js`).
- Al terminar cada archivo (aunque fallen sus tests) el `afterAll` borra la corrida: primero
  `notifications`, `push_tokens` y `refresh_tokens` del PT y sus alumnos (no tienen FK) y después
  los `trainers` (cascada al resto). Es lo único que se hace directo contra la base
  (`scripts/lib/qa-cleanup.js`), y solo toca trainers cuyo email es de QA.
- Si una corrida se corta a la fuerza, `npm run test:integration:clean` es la red de seguridad.

Durante la integración FCM está apagado (`NODE_ENV=test`), no se suben fotos y no corren jobs.
