# Auditoría de seguridad, RLS y prueba de carga

Tarjeta 54 (equipo) · MIS 24. Spec: `docs/superpowers/specs/2026-11-05-security-audit-design.md`.

Se hace en dos etapas: lo que se audita en local (05/11, esta rama) y lo que necesita el servidor real (después del deploy del S7). Resultado: ✅ cumple · ⚠️ cumple con una salvedad · ❌ no cumple · ⏳ pendiente.

## 1. Resultados

| # | Ítem del checklist | Resultado | Evidencia |
|---|---|---|---|
| 1 | Cruce entre dos trainers en todos los endpoints → 403 | ✅ | Suite de integración, en la rama de la #76 (todavía no está en `develop`): 113 casos de aislamiento (PT B y alumno B sobre los datos de A, rol equivocado, listados y agenda), 0 fugas; los rechazos tampoco traen ids de A en el body del error. Corrida final 05/11: 178/178. El barrido que cruza **todas** las rutas con la tabla de aislamiento se suma cuando entre la #76 (plan, Task 5). |
| 2 | RLS activado en todas las tablas | ⏳ | Decisión en el ADR 0001: RLS activo **sin políticas** en las **23** tablas de `public` (la tarjeta dice 16: el schema creció), y la autorización vive en los services. `schema/07-rls.sql` lo activa en todas. `npm run db:check-anon` contra dev (05/11): **"Ninguna tabla expuesta"**. Las 8 funciones SQL tienen `revoke` a `public`, `anon` y `authenticated`. Falta correr `schema-checks.sql` en el SQL Editor de dev (paso manual 1). |
| 3 | Ningún secreto en el historial de git | ⚠️ | `gitleaks` 8.21.2 (Docker) sobre un `git clone --mirror` del repo (524 commits de todas las ramas y tags; `git rev-list --all` en un worktree cuenta más porque suma refs locales como stashes y PRs bajadas), 05/11: 14 hallazgos y **0 secretos reales**. 13 son placeholders (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` truncado en `.env.example` y `setup-tecnico.md`, `JWT_SECRET=cambia-esto…`, un `Bearer <token>` de ejemplo) o tokens de invitación inventados en tests. El restante es la API key de Firebase Android en `mobile/app/google-services.json`: no es un secreto (viaja dentro del APK), pero hay que restringirla (paso manual 2). |
| 4 | Helmet puesto | ✅ | `app.js`: `helmet()`. Test `tests/unit/app/`: CSP, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` y sin `X-Powered-By`. |
| 5 | CORS restringido al dominio del frontend | ✅ local · ⏳ prod | Un solo origen (`FRONTEND_URL`). Test: un `Origin` ajeno no recibe su origen en `Access-Control-Allow-Origin`. Falta verificarlo con el dominio real (post-deploy). |
| 6 | Rate limiting en login y en `/invitations/:token` | ✅ | `express-rate-limit` 8.7.3 montado en `app.js` antes de los routers. La IP se agrupa por subred (IPv6 /56, con `ipKeyGenerator`), así no se esquiva rotando direcciones. `POST /auth/login`: 10 cada 15 min por IP + email y, además, 50 por IP sola (frena el password spraying: probar una contraseña contra muchos emails); `POST /auth/register` y `POST /auth/refresh`: 30 por IP (cada uno su cupo); `GET /invitations/:token` y `POST /students`: 30 por IP (cada uno su cupo). Responde `429 RATE_LIMIT_EXCEEDED` con el formato del contrato y `Retry-After`. Límites por env (`RATE_LIMIT_*`), 100× con `NODE_ENV=test`. `TRUST_PROXY` (saltos de proxy, `1` detrás de nginx) es **obligatorio en producción**: sin él el backend no arranca, porque detrás del proxy todos los clientes compartirían la IP de nginx y un solo cupo. Tests del limitador con límites bajos. |
| 7 | Validación de entrada en todos los endpoints con body | ✅ | Validadores propios con `validate(...)` (no Zod: ya estaban, con tests, y migrar no suma seguridad). Test de barrido: recorre el router y falla si un `POST`/`PUT`/`PATCH` no valida el body. Excepciones sin body, con su motivo en el test: `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`, `POST /messages/:studentId/read`. `POST /appointments` valida según el rol con su propio middleware (marcado). |
| 8 | Webhook de n8n autenticado | ⏳ Igna | La IA todavía no está; **la hace Igna**. Requisito agregado al checklist de la tarjeta de equipo "[S4] n8n en LOCAL + workflow trainer-ia": header con `N8N_WEBHOOK_SECRET` (por env), comparado con `crypto.timingSafeEqual`, 401 si falta o no coincide. |
| 9 | `npm audit` sin vulnerabilidades explotables | ✅ | Backend `--omit=dev`: de 5 (1 crítica `proxy-addr`, altas `body-parser` y `multer`) a **0**, con `npm audit fix` y `multer@2.5.0`. Completo: de 17 a 8, todas de desarrollo y bajas o moderadas (`deepmerge` por la cadena de `jest`, que pide bajar a jest 25; `minimatch` dentro de `nodemon`): no se instalan ni corren en producción. Web: 0. |
| 10 | Los errores no filtran stack traces | ✅ local · ⏳ prod | Un 500 devuelve `INTERNAL_ERROR` genérico; `details` solo con `NODE_ENV=development`, nunca el stack (test con `NODE_ENV=production`). Arreglado: un JSON mal formado daba 500 y ahora da **400 `VALIDATION_ERROR`**; un body de más de 100 kB daba 500 y ahora da **413 `PAYLOAD_TOO_LARGE`**; una codificación o charset no soportados dan **415**, y cualquier otro error 4xx del body, 400 (nunca 500). Falta verificarlo en el servidor con `NODE_ENV=production`. |
| 11 | ⚪ Prueba de carga con k6 | ⚠️ | Ver la sección 3: `GET /routines/today` cumple RNF-01. `POST /sessions/:id/sets` **falla el umbral del script** (`p(95)<500`: dio 1,11 s); la causa es la latencia a Supabase y no la carga. La medición que vale es la del VPS. |

## 2. Pasos manuales (06/11)

1. **RLS en vivo** (Pablo): en Supabase dev → SQL Editor, pegar y correr `backend/src/database/checks/schema-checks.sql`. Tiene que devolver **0 filas** (RLS activo en las 23 tablas, cero políticas, FKs como se espera). Anotar la fecha y el resultado en la fila 2.
2. **Restringir la API key de Firebase** (Pablo o Igna): Google Cloud Console del proyecto de Firebase → *APIs y servicios* → *Credenciales* → la key *Android key (auto created by Firebase)*:
   - *Restricciones de aplicación*: apps de Android, paquete `com.fittrainer` con el SHA-1 del keystore de debug y del de release (`./gradlew signingReport` en `mobile/`).
   - *Restricciones de API*: solo las APIs de Firebase que usa la app (Cloud Messaging / Firebase Installations).
   - Probar que el push sigue llegando y anotarlo en la fila 3.

## 3. Prueba de carga (línea base, 05/11)

Backend local (`NODE_ENV=development`, Windows) contra Supabase dev, k6 0.57.0 por Docker, `backend/load/hot-endpoints.js`: rampa a **100 usuarios virtuales** (30 s), meseta de 60 s, 1–3 s de pausa por iteración, 10 alumnos de QA compartidos.

| Métrica | `GET /routines/today` | `POST /sessions/:id/sets` (3 series) | Total |
|---|---|---|---|
| p95 | **450 ms** ✅ | **1,11 s** ❌ (umbral `p(95)<500` no cumplido) | 1,03 s ❌ |
| mediana | 398 ms | 976 ms | 906 ms |
| mínimo | 361 ms | 905 ms | — |
| Errores | 0 | 0 | **0 % de 4774 requests** |
| Throughput | | | 46 req/s, 23 iteraciones/s |

**Lectura:**
- Con 100 usuarios concurrentes no hubo ni un error, y los tiempos casi no se movieron entre el mínimo y el p95: la API no se satura.
- El costo es la **latencia a Supabase**. Hasta el `today` más rápido tarda 361 ms porque hace varias consultas en serie desde una PC hogareña. El lote de series hace más consultas (validar la sesión, los ejercicios, guardar y marcar la sesión), así que su piso ya es 905 ms con o sin carga.
- `POST /sessions/:id/sets` es la sincronización del celular: le aplica RNF-03 (sincronizar en menos de 5 s), que cumple de sobra. Para RNF-01 la medición que vale es la del VPS (sección 4), más cerca de Supabase. Si ahí sigue por encima de 500 ms, el siguiente paso es juntar consultas del lote (una sola lectura de ejercicios, upsert en bloque).

## 4. Post-deploy (pendiente, S7)

Después del deploy (23–27/11), sobre el servidor real:

- [ ] Headers de helmet presentes en las respuestas de `https://<dominio>/api` (`curl -I`).
- [ ] CORS: el frontend de producción funciona y un origen ajeno no recibe `Access-Control-Allow-Origin` con su origen.
- [ ] `NODE_ENV=production` **definido** en el servidor (si falta, el backend asume `development` y un 500 devuelve el mensaje del error en `details`): un error forzado devuelve `INTERNAL_ERROR` sin `details` ni stack.
- [ ] `TRUST_PROXY=1` detrás de nginx: el rate limit cuenta por IP real (11 logins seguidos → 429).
- [ ] Certificado TLS válido, firewall y SSH por clave (los configura la tarjeta de deploy; acá se verifica).
- [ ] k6 contra el VPS (`API_URL=https://<dominio>/api`): anotar la tabla de la sección 3 para la defensa.
