# Auditoría de seguridad, RLS y prueba de carga — diseño (tarjeta 54 · MIS 24)

- **Tarjeta:** equipo 54 · [Auditoría de seguridad, revisión de RLS y prueba de carga](https://trello.com/c/IOBC3Yxv) · MIS 24
- **Fecha:** 2026-11-05 · grilling Q1–Q13 cerrado con Pablo
- **Rama:** `feature/security-hardening` (desde `develop` 46d14ec)

## 1. Objetivo

Revisar la seguridad antes de la defensa, arreglar lo que falta y dejar evidencia escrita de cada punto del checklist. Medir el rendimiento de los dos endpoints calientes contra RNF-01.

## 2. Estado de partida (relevado el 05/11)

| Punto | Estado | Fuente |
|---|---|---|
| Aislamiento entre trainers | 113 casos, 0 fugas (filas 1–113) | suite de la #76 (`tests/integration/isolation/`) |
| RLS | Decisión: activo **sin políticas** en las **23** tablas de `public`; la autorización vive en los services | ADR 0001, `schema/07-rls.sql` |
| Exposición con la anon key | "Ninguna tabla expuesta" | `npm run db:check-anon` contra dev |
| Funciones SQL | 8, todas con `revoke` a `public`/`anon`/`authenticated` | `database/schema`, `migrations` |
| Helmet | `helmet()` con la config por defecto; sin `x-powered-by` | `app.js:28` |
| CORS | Un solo origen (`FRONTEND_URL`); un origen ajeno no recibe el suyo | `app.js:29` |
| Rate limiting | **No hay** | — |
| Errores | 500 genérico, `details` solo en `development`, sin stack | `error.middleware.js` |
| JSON mal formado / body > 100 kB | **500** (debería ser 400 / 413) | prueba local |
| `npm audit` web | 0 | — |
| `npm audit` backend | 17 (1 crítica `proxy-addr`; altas `body-parser`, `multer`, `brace-expansion`, `js-yaml`, `browserslist`) | — |
| Secretos en el historial | Sin secretos reales. `mobile/app/google-services.json` commiteado (API key de Firebase Android) | `git log --all -p` |
| Webhook de n8n | No existe todavía (lo hace Igna con la IA) | — |
| k6 | No está instalado; hay Docker | — |

## 3. Decisiones (grilling)

**Q1 · Dos etapas.** Esta PR cubre todo lo que se audita en local. Después del deploy (S7, 23–27/11) se verifica sobre el servidor real: headers y CORS con el dominio de producción, certificado, firewall y errores con `NODE_ENV=production`. Esa parte queda como sección **"Post-deploy (pendiente)"** del documento de auditoría, y la tarjeta queda abierta hasta tildarla.

**Q2 · Barrido de rutas para el aislamiento.** Un test recorre las rutas montadas en `createApp()` y falla si una ruta con parámetro de recurso (`:id`, `:studentId`, `:token`…) no aparece en la tabla de aislamiento de la suite de integración ni en una lista de excepciones justificadas. **Depende de la #76** (la suite vive ahí): esta tarea arranca cuando la #76 esté en `develop`.

**Q3 · RLS en vivo.** Pablo corre `backend/src/database/checks/schema-checks.sql` en el SQL Editor de Supabase dev (cero filas = RLS activo en las 23 tablas, cero políticas, FKs como se espera) y pasa el resultado. Se documenta junto con `db:check-anon`. "16 tablas" se corrige por "23" donde aparezca. **Paso de Pablo, 06/11.**

**Q4 · Rate limiting** con `express-rate-limit`, en memoria (el VPS es una sola instancia):

| Endpoint | Límite | Clave |
|---|---|---|
| `POST /auth/login` | 10 cada 15 min | IP + email (en minúsculas) |
| `POST /auth/register`, `POST /auth/refresh` | 30 cada 15 min | IP |
| `GET /invitations/:token`, `POST /students` | 30 cada 15 min | IP |

- Respuesta: `429 RATE_LIMIT_EXCEEDED` con el formato del contrato (`{ error: { code, message, details: [] } }`), mensaje en español y header `Retry-After` (segundos).
- `trust proxy` configurable con `TRUST_PROXY` (por defecto apagado; en el VPS detrás de nginx va `1`). Sin eso, detrás del proxy todos tendrían la misma IP.
- Límites configurables por env (`RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_PUBLIC_MAX`, `RATE_LIMIT_WINDOW_MS`). Con `NODE_ENV=test` el valor por defecto es 100 veces mayor, así la suite de integración (muchos registros desde la misma IP) no los toca. Los tests del limitador arman la app con límites bajos.
- El login cuenta todos los intentos, no solo los fallidos (más simple; 10 en 15 min sobra para un humano).

**Q5 · `npm audit` del backend.** `npm audit fix` sin `--force` y `multer@2.5.0` a mano. Lo que queda (cadena `jest` → `deepmerge`, bajas, solo dev, el arreglo pide bajar jest a la 25) se documenta como no explotable: no se instala ni corre en producción. La web ya está en 0.

**Q6 · `google-services.json`.** No se reescribe el historial: la API key de Firebase Android no es un secreto (va dentro del APK). Se documenta y se **restringe** en Google Cloud Console: solo la app `com.fittrainer` con su SHA-1 y solo las APIs de Firebase que usa. **Paso de Pablo o Igna, 06/11**; las instrucciones van en el documento. Como evidencia formal se corre `gitleaks` (Docker) sobre todo el historial.

**Q7 · Validación de entrada.** No se migra a Zod: el proyecto ya valida con `validate(...)` y validadores propios con tests. Un test recorre el router y falla si un `POST`/`PUT`/`PATCH` no tiene `validate(...)` en su cadena de middlewares, salvo excepciones justificadas en el test (por ejemplo, uno sin body). En la auditoría se anota por qué no se usa Zod.

**Q8 · Errores del body.** JSON mal formado → `400 VALIDATION_ERROR` ("El cuerpo no es JSON válido"); body de más de 100 kB → `413 PAYLOAD_TOO_LARGE`. Los dos con el formato del contrato y `details: []`. Tests con `NODE_ENV=production` que verifican que un 500 no trae `details` ni stack.

**Q9 · Helmet y CORS en local.** Tests: helmet pone sus headers (CSP, `X-Content-Type-Options`, HSTS, sin `X-Powered-By`) y un `Origin` distinto de `FRONTEND_URL` no recibe su propio origen en `Access-Control-Allow-Origin`. La comprobación con el dominio real va en "Post-deploy".

**Q10 · Webhook de n8n.** No aplica todavía: **lo hace Igna** junto con la IA. En la auditoría queda como "pendiente — Igna (IA)", y el requisito (header con un secreto compartido, comparado con `crypto.timingSafeEqual`, 401 si falta o no coincide, secreto por env) se agrega al checklist de la tarjeta de IA en el tablero del equipo, para que quede asentado.

**Q11 · Prueba de carga con k6.** Script en `backend/load/` que corre con `docker run grafana/k6`:
- `GET /routines/today` (alumno) y `POST /sessions/:id/sets` (lote de series de una sesión abierta).
- Rampa hasta **100 usuarios virtuales** (RNF-01: "hasta 100 usuarios concurrentes"), meseta de 1 min, umbral `http_req_duration p(95) < 500 ms` y errores < 1 %.
- Los usuarios de la carga se crean con el mismo esquema de QA (`it.<corrida>…@test.fittrainer.dev`) y se borran con `npm run test:integration:clean`. Un pool chico de alumnos (10) compartido por los VUs, para no chocar el rate limit del registro.
- Corrida de línea base ahora: backend local + Supabase dev (la latencia a Supabase domina; se anota). El número para la defensa sale de la corrida contra el VPS (sección "Post-deploy").

**Q12 · Evidencia.** Documento nuevo `docs/proceso/auditoria-seguridad.md`: cada ítem del checklist con resultado (✅/❌/⚠️/⏳) y evidencia (archivo, comando, fecha), las secciones "Pasos manuales (06/11)" y "Post-deploy (pendiente)", y la línea base de k6. Se linkea desde `plan-de-pruebas.md`.

## 4. Fuera de alcance

- Hardening del VPS (firewall, SSH, certificado): lo configura la tarjeta de deploy; acá solo se verifica después.
- Políticas RLS por usuario: el ADR 0001 sigue vigente (ningún cliente habla con Supabase directo).
- Rate limiting distribuido (Redis): una sola instancia.

## 5. Criterio de aceptación

- `npm test` y `npm run lint` verdes; tests nuevos para: rate limit (429 + `Retry-After` + clave IP+email), 400/413 del body, helmet/CORS, barrido de validación y barrido de rutas de aislamiento.
- `npm audit --omit=dev` del backend sin vulnerabilidades altas ni críticas.
- `gitleaks` sin hallazgos reales (o cada uno explicado).
- `docs/proceso/auditoria-seguridad.md` con todos los ítems; los pasos de Pablo y lo post-deploy marcados ⏳.
- Línea base de k6 corrida y anotada (si Docker no está disponible hoy, queda el script y la corrida pasa a los pasos del 06/11).
