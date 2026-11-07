---
tags: [spec, tarjeta-52]
---

# Suite de pruebas del backend (unitarias + integración) — diseño

Tarjeta de equipo **52** "[S7] Suite de pruebas del backend" ([Trello](https://trello.com/c/68GZsDSt)) · MIS TAREAS 23 · Plan de pruebas (`docs/proceso/plan-de-pruebas.md`).

## 1. Objetivo y criterio de aceptación

Cerrar los cinco bloques de riesgo de la tarjeta con tests que prueben lo que se puede romper en la defensa, y dejar el plan de pruebas con evidencia real. No se persigue un porcentaje de cobertura.

**Criterio (de la tarjeta):** `npm test` pasa completo; los cinco bloques de riesgo tienen tests; el flujo de integración de punta a punta pasa; el plan de pruebas está actualizado con evidencia.

## 2. Punto de partida (relevamiento 02/11 sobre develop)

- ~1146 tests unitarios en 133 archivos, todos con Supabase mockeado. Ningún test de integración (`tests/integration/` solo tiene un README); no está Supertest.
- **Autorización:** `assertCanAccessStudent` y los chequeos de dueño están testeados en casi todos los services. Faltan: `PATCH`/`DELETE /challenges/:id` (ajeno y global), `GET /students/:id/challenges` (403) y `DELETE /notifications/tokens/:token` (solo hay test de repo).
- **Idempotencia del lote de series:** reenvío, ids repetidos, carreras y reintento de `POST /sessions` están cubiertos. Falta un `update` que falla a mitad del `Promise.all` (`persist-sets.js`) y el reintento de un lote que antes dejó `failed`.
- **Progreso:** la lógica vive en SQL (`exercise_progress`, `session_records`, `progress_exercises`, `weekly_volume`, `last_session_kg`): Epley con reps ≤ 12, peso corporal excluido, máximo, volumen, día argentino. **Ningún test la ejercita.** La "exclusión de sustituciones" se resuelve filtrando por el ejercicio realmente hecho (ADR 0004).
- **Gamificación:** racha con días asignados (ADR 0005), logros sin duplicar y desafíos bien cubiertos en unitarios.
- **Rutina del día:** `dayName` en AR con el servidor en UTC cubierto. Faltan la frontera 23:59 AR (02:59Z), el día de descanso explícito y dos rutinas activas el mismo día (se toma la más reciente).
- `docs/proceso/plan-de-pruebas.md` está desactualizado (`/api/session-sets`, `substituted_exercise_id`, `calcularVolumenSesion`) y no tiene columnas de resultado ni evidencia.

## 3. Decisiones (grilling 02/11)

| # | Decisión |
|---|----------|
| Q1 | La integración corre contra **Supabase dev** (base compartida con Igna), con datos de QA creados por la API y borrados al final. |
| Q2 | `npm test` sigue solo con los unitarios. La integración es **`npm run test:integration`** (lee `backend/.env`). |
| Q3 | La evidencia va en **`docs/proceso/plan-de-pruebas.md`** (Notion es solo lectura): se actualiza, se suman columnas Resultado y Evidencia y los casos de aislamiento por endpoint. Comentario en la tarjeta aclarando que se hizo en `docs/`. |
| Q4 | **CI** con GitHub Actions en cada PR: lint + tests unitarios de backend y web (sin integración). |
| Q5 | Un problema real chico y seguro se arregla en la misma PR con su test; uno grande o que cambie comportamiento se documenta como limitación en el plan. La racha recalculada con los días de hoy (`findAssignedDays`) se documenta como limitación. |
| Q6 | La integración cubre: (1) flujo de punta a punta; (2) aislamiento real entre dos entrenadores y dos alumnos en todos los endpoints con id; (3) cálculo de progreso con números conocidos; (4) idempotencia real del lote de series. La rutina del día con zona horaria queda en unitarios. |
| Q7 | Durante la integración: FCM apagado (en `NODE_ENV=test` ya lo está), sin fotos (chat solo texto), sin jobs (`createApp()` no los arranca). |
| Q8 | Se rellenan los huecos unitarios de §2. |
| Q9 | La integración se corre **a mano** antes de cada PR grande y antes de la defensa; cada corrida se anota en el plan. |
| Q10 | Datos con id de corrida: emails `it.<corrida>.<rol>@test.fittrainer.dev`, nombres "IT · …". Limpieza en `afterAll` y `npm run test:integration:clean` como red de seguridad (§5). |
| Q11 | Todo se crea **por la API** (sesiones pasadas con `started_at`); lo único directo es el borrado. |
| Q12 | La agenda entra en la prueba de aislamiento: **la implementación arranca después del merge de la #49**. El spec y el plan se escriben antes. |
| Q13 | El CI corre backend y web; la web con `--maxWorkers=2` y timeout de 15 s solo en el CI. Lo que siga fallando ahí se anota para la tarjeta 25. |

## 4. Tests de integración (`backend/tests/integration/`)

Jest con Supertest sobre `createApp()` en el mismo proceso (sin `listen`). Configuración aparte (`jest.integration.config.js`), en serie (`--runInBand`), timeout amplio (30 s), con `NODE_ENV=test` y las credenciales de Supabase dev del `.env`. Si falta `SUPABASE_URL` real (sigue en `localhost:54321`), la suite se corta con un mensaje claro en vez de fallar caso por caso.

**Helpers:** `api(token)` (Supertest con Bearer), `createTrainer()`, `inviteAndJoin(trainer)` (invitación + `POST /students`), `createRoutine(...)`, `uploadSession(student, {startedAt, sets})`, y el registro de ids creados para la limpieza.

### 4.1 Flujo de punta a punta (`flow.int.test.js`)
Registro del PT → login → invitación → alta del alumno → ejercicio propio → rutina asignada → el alumno ve `/routines/today` (o `null` si hoy no toca) y `/routines/mine` → sube una sesión con series → historial (`GET /students/:id/sessions` y detalle) → progreso (`/progress/exercise/:id`, `/progress/overview`) → comentario del PT en la sesión → racha y logros (`/students/:id/streak`, `/achievements`). Cada paso valida el código y la forma de la respuesta.

### 4.2 Aislamiento (`isolation.int.test.js`)
Dos PT (A y B), cada uno con un alumno, una rutina, una sesión, una plantilla, un desafío propio, un ejercicio propio, un mensaje y (con la #49) disponibilidad y un turno. Tabla de casos `it.each`:
- **PT B sobre datos de A:** todos los endpoints que reciben id de alumno, rutina, ejercicio de rutina, sesión, plantilla, ejercicio, desafío, mensaje, turno, medida y notificación → **403 o 404** (el que corresponda al contrato), y ningún dato de A en el cuerpo.
- **Alumno B sobre datos del alumno A** (sus endpoints: sesiones, progreso, medidas, logros, mensajes) → 403/404.
- **Alumno sobre endpoints de PT** → 403.
- Control positivo: el dueño sí accede (200), para que un 403 no sea por un error del test.

### 4.3 Progreso con números conocidos (`progress.int.test.js`)
Un alumno con sesiones en tres semanas pasadas (vía `started_at`) y series armadas a mano: una serie de 13 reps (no cuenta para Epley), una de peso corporal (no cuenta para peso máximo ni e1RM), una semana sin sesiones, y una sesión cerca de la medianoche argentina. Se comparan contra valores calculados a mano: e1RM Epley, peso máximo, volumen por sesión y por semana (`weekly_volume`), récords (`session_records`: la primera vez no cuenta) y `last_session_kg` en `/routines/today` o `/routines/mine`.

### 4.4 Idempotencia del lote (`sets-idempotency.int.test.js`)
`POST /sessions` dos veces con el mismo id (reintento), `POST /sessions/:id/sets` con el mismo lote dos veces y un lote con un id repetido; se verifica por el detalle de la sesión que no hay series duplicadas y que el reintento completa lo que faltaba.

## 5. Datos y limpieza

- **Id de corrida:** `Date.now().toString(36)` + 4 caracteres al azar. Emails `it.<corrida>.<rol>@test.fittrainer.dev`.
- **Teardown (`afterAll`, aunque fallen los tests):** con el cliente de servicio, borrar `notifications`, `push_tokens` y `refresh_tokens` por `user_id in (PT y alumnos de la corrida)` (no tienen FK) y después los `trainers` de la corrida (cascada a todo lo demás). Sin fotos, Storage no queda sucio.
- **`npm run test:integration:clean`:** script que busca `trainers` con email `it.%@test.fittrainer.dev` creados hace más de una hora y los borra igual que el teardown (incluidos sus alumnos y las filas sin FK).
- La integración nunca toca filas que no creó. Las filas de `notifications`, `push_tokens` y `refresh_tokens` cuyo `user_id` ya no existe (sin dueño) no se sabe quién las creó: el clean solo las informa, `--check` las cuenta (sale con 1 si hay) y se borran únicamente con el flag explícito `--orphans`.

## 6. Tests unitarios nuevos

- **Aislamiento:** `PATCH`/`DELETE /challenges/:id` con desafío ajeno y global → 404; `GET /students/:id/challenges` ajeno → 403; `DELETE /notifications/tokens/:token` solo borra el token propio (service o ruta).
- **Lote de series:** un `update` que falla a mitad del lote → qué queda guardado y qué devuelve; el reintento completa sin duplicar.
- **Rutina del día:** 23:59 AR (02:59Z) es todavía el día argentino; día de descanso → `null` explícito; dos rutinas activas el mismo día → la más reciente.

## 7. CI (`.github/workflows/ci.yml`)

En cada PR y push a `develop`: Node 22, `npm ci`, y en `backend/` `npm run lint && npm test`; en `frontend/` `npm run lint && npx vitest run --maxWorkers=2 --testTimeout=15000 && npm run build`. Sin secretos (los unitarios no usan red). Mobile queda afuera (lo maneja Igna).

## 8. Plan de pruebas

`docs/proceso/plan-de-pruebas.md`: sacar lo obsoleto, sumar columnas **Resultado** (✅/❌/⚠️) y **Evidencia** (archivo de test y fecha de la corrida), casos de aislamiento por endpoint, los de §4 y §6, una sección "Corridas de integración" (fecha, commit, resultado) y "Limitaciones conocidas" (racha con los días de hoy; lote de series sin transacción si lo confirma el test; `GET /appointments` sin paginar).

## 9. Fuera de alcance

Cobertura por porcentaje, tests de mobile, pruebas de carga (tarjeta 24), pruebas manuales de la web (tarjeta 25), CI de integración.
