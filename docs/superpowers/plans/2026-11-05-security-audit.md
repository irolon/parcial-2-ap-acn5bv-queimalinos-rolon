# Plan — Auditoría de seguridad, RLS y prueba de carga (tarjeta 54 · MIS 24)

Spec: `docs/superpowers/specs/2026-11-05-security-audit-design.md`. Rama `feature/security-hardening`. Reglas de CONTRIBUTING: 200 líneas por archivo, capa → módulo, hasta 10 archivos por carpeta. Commits sin firma de IA.

### Task 1: Errores del body (400 / 413)

**Files:** Modify `backend/src/shared/middlewares/error.middleware.js`, `backend/src/shared/utils/errors.js` (si hace falta `payloadTooLarge`), `docs/arquitectura/contratos-api.md` (errores comunes). Tests en `backend/tests/unit/shared/middlewares/`.

- body-parser marca `err.type`: `'entity.parse.failed'` → `400 VALIDATION_ERROR` "El cuerpo no es JSON válido"; `'entity.too.large'` → `413 PAYLOAD_TOO_LARGE` "El cuerpo es demasiado grande". `details: []`.
- Tests con Supertest sobre `createApp()`: JSON roto → 400; 200 kB → 413; con `NODE_ENV=production` un error no controlado → 500 con `details: []` y sin `stack` en el body.
- Commit `fix(api): JSON mal formado da 400 y un body demasiado grande 413`.

### Task 2: Rate limiting

**Files:** Create `backend/src/shared/middlewares/rate-limit.middleware.js`; Modify `backend/src/config/env.js` (`TRUST_PROXY`, `RATE_LIMIT_*`), `backend/src/app.js` (`trust proxy`), rutas de auth, invitations y students; `backend/.env.example`; `docs/arquitectura/contratos-api.md`; `backend/README.md`. Dependencia `express-rate-limit`.

- Fábrica `rateLimit({ max, windowMs, key })` sobre `express-rate-limit` que responde `429 RATE_LIMIT_EXCEEDED` con el formato del contrato y `Retry-After`. Tres limitadores: `loginLimiter` (IP + email en minúsculas), `authLimiter` (IP), `publicLimiter` (IP). Límites y ventana por env; con `NODE_ENV=test`, 100× por defecto.
- `app.set('trust proxy', env.TRUST_PROXY)` cuando está definido (número de saltos).
- Tests: el 11.º login del mismo IP+email da 429 con `Retry-After`; otro email desde la misma IP no está limitado; `register`/`refresh`/`invitations/:token`/`POST /students` limitados con la app armada con límites bajos; el 429 tiene el formato del contrato.
- Commit `feat(auth): rate limiting en login, registro, refresh e invitaciones`.

### Task 3: Dependencias

**Files:** `backend/package.json`, `backend/package-lock.json`.

- `npm audit fix` (sin `--force`) y `multer@2.5.0`. `npm test` y `npm run lint` verdes. Anotar el `npm audit` antes/después (`--omit=dev` y completo).
- Commit `chore(backend): npm audit fix y multer 2.5.0`.

### Task 4: Helmet, CORS y barrido de validación

**Files:** tests en `backend/tests/unit/app/` (o la carpeta de tests de `app.js` que ya exista).

- Helmet: CSP, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, sin `X-Powered-By`. CORS: `Origin` ajeno no recibe su origen; el de `FRONTEND_URL` sí.
- Barrido: recorrer `app._router.stack` (o el router de cada módulo) y, para cada `POST`/`PUT`/`PATCH`, exigir un middleware de `validate(...)` en la cadena. Para identificarlo, `validate` marca la función que devuelve (por ejemplo `fn.isValidation = true`). Excepciones en una lista con el motivo (endpoints sin body, como `POST /messages/:studentId/read` y `PATCH /notifications/read-all`). Si aparece un endpoint con body sin validar: se arregla si es chico; si no, se documenta.
- Commit `test(api): headers de seguridad, CORS y validación en todas las rutas con body`.

### Task 5: Barrido de rutas de aislamiento (espera la #76)

**Arranca solo cuando la #76 esté en `develop`:** `git merge origin/develop`.

**Files:** Create `backend/tests/unit/app/isolation-coverage.test.js` (o en `tests/integration/isolation/` si conviene compartir las tablas).

- Listar las rutas con parámetro de recurso y cruzarlas con las filas de `trainer-cross`, `student-cross`, `wrong-role`, `lists` y `agenda`. Las que faltan: se suman filas a la suite o se justifican en una lista de excepciones (por ejemplo, `GET /invitations/:token`, que es pública por diseño).
- Commit `test(integration): barrido de rutas contra la tabla de aislamiento`.

### Task 6: Secretos en el historial

- Prender Docker Desktop y correr `docker run --rm -v <repo>:/repo zricethezav/gitleaks:v8.21.2 detect --source /repo --log-opts="--all" --report-format json --report-path /repo/.gitleaks-report.json` (el reporte no se commitea). Revisar cada hallazgo: real → rotar y documentar; falso positivo → documentarlo.
- Sin commit de código; el resultado va al documento (Task 8).

### Task 7: Prueba de carga con k6

**Files:** Create `backend/load/README.md`, `backend/load/hot-endpoints.js` (script de k6), `backend/load/setup-users.mjs` (crea el pool de QA por la API e imprime los tokens en JSON para k6).

- Escenario: `GET /routines/today` y `POST /sessions/:id/sets` (lote de 3 series con UUID nuevo por iteración), rampa 0 → 100 VUs en 30 s, meseta 60 s, bajada 10 s. Umbrales `http_req_duration{p(95)}<500`, `http_req_failed<0.01`.
- Corrida de línea base: backend local (`npm run dev`, `NODE_ENV=development`, límites por env subidos para la carga) contra Supabase dev. Limpieza con `npm run test:integration:clean` y `--check` = 0.
- Commit `test(load): escenario de k6 para rutina del día y lote de series`.

### Task 8: Documento de auditoría y tablero

**Files:** Create `docs/proceso/auditoria-seguridad.md`; Modify `docs/proceso/plan-de-pruebas.md` (link), `docs/adr/0001-…` o la doc de arquitectura donde diga "16 tablas" → 23.

- Una fila por ítem del checklist de la tarjeta 54 con resultado y evidencia; secciones "Pasos manuales (06/11)" (`schema-checks.sql`, restringir la key de Firebase, con instrucciones), "Post-deploy (pendiente)" y "Línea base de carga".
- Trello: agregar el requisito del webhook de n8n al checklist de la tarjeta de IA del equipo (dueño: Igna).
- Commit `docs(security): auditoría de seguridad con resultados y evidencia (tarjeta 54)`.

### Task 9: Verificación final y PR

- `npm ci`, `npm run lint`, `npm test`, `npm audit --omit=dev`; review de dos ejes; PR a `develop` titulada `feat(security): rate limiting, errores del body y auditoría de seguridad (tarjeta 54)`; comentario en MIS 24.
