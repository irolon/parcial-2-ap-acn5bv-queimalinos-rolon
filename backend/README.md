# FitTrainer — Backend

API REST (monolito modular) en **Node.js + Express**, datos en **Supabase/PostgreSQL**.

## Patrón por módulo: Controller → Service → Repository → Model

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Controller | `*.controller.js` | Recibe el request, llama al service, responde. Nada más. |
| Service | `*.service.js` | Lógica de negocio, permisos, orquestación. |
| Repository | `*.repository.js` | Queries a Supabase. Única capa que toca la DB. |
| Model | `*.model.js` | Entidad de dominio: estructura + mapeo de filas. Sin lógica. |
| (Routes) | `*.routes.js` | Define rutas y enchufa middlewares (validación, auth, rol). |
| (Validation) | `*.validation.js` | Validadores de input del módulo. |

> **Regla:** cada capa solo conoce a la inmediatamente inferior. El Controller nunca toca la DB.

## Estructura

Módulos implementados: `health`, `auth`, `invitations`, `students`, `body-metrics`, `exercises`, `routines`, `routine-templates`, `sessions`, `gamification`, `notifications`.

```
src/
├── config/                  # env.js (variables de entorno) y supabase.js (cliente service role)
├── shared/                  # transversal a todos los módulos
│   ├── middlewares/         # authenticate, requireRole, validate, errores
│   └── utils/               # errors, password (bcrypt), jwt, qr, asyncHandler
├── controllers/<modulo>/<modulo>.controller.js
├── services/<modulo>/<modulo>.service.js
├── repositories/<modulo>/<modulo>.repository.js
├── models/<modulo>/<entidad>.model.js
├── validations/<modulo>/<modulo>.validation.js
├── routes/<modulo>/<modulo>.routes.js
├── database/
│   ├── schema/              # DDL por dominio: 01…07 en orden (ver su README)
│   ├── migrations/          # cambios de schema con fecha, para bases ya creadas
│   ├── checks/              # schema-checks.sql, exercises-checks.sql y check-anon-access.js
│   └── seeds/               # exercises.sql (50 ejercicios globales), achievements.sql (catálogo de logros), challenges.sql (desafíos globales)
├── app.js                   # arma la app de Express y monta las rutas
└── server.js                # entrypoint (levanta el server)

scripts/                     # mantenimiento: check-file-length.js (límite de 200 líneas)

tests/                       # TODOS los tests viven acá (fuera de src/)
├── helpers/<modulo>/        # utilidades compartidas por los tests
├── unit/                    # unitarios — espejan la estructura de src/
│   ├── services/<modulo>/<modulo>.service.test.js   (o carpeta <modulo>.service/ si se dividió)
│   ├── models/<modulo>/<entidad>.model.test.js
│   ├── scripts/lib/         # tests de scripts/lib/ (file-length)
│   └── validations/<modulo>/
└── integration/             # end-to-end de endpoints HTTP (Supertest) — pendiente
```

> Reglas de tamaño y orden: ver `../CONTRIBUTING.md`.

> Cada módulo nuevo agrega su carpeta `<modulo>/` dentro de cada capa que
> necesite: `controllers/<modulo>/`, `services/<modulo>/`, etc. El módulo `auth`
> sirve de referencia del patrón.

## Setup

Los pasos para levantar el backend (variables de entorno, base de datos, usuarios de prueba)
están en la guía: [`docs/proceso/setup-tecnico.md`](../docs/proceso/setup-tecnico.md).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev con nodemon (hot reload) |
| `npm start` | Producción |
| `npm test` | Tests (Jest) |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Tests con cobertura |
| `npm run lint` | ESLint + chequeo de 200 líneas por archivo (`scripts/check-file-length.js`) |
| `npm run lint:fix` | ESLint con autofix |
| `npm run format` | Prettier sobre `src`, `tests` y `scripts` |
| `npm run db:check-anon` | Verifica que la clave `anon` no vea filas por la API pública |
| `npm run gamification:daily` | Corre una vez el job diario de gamificación (racha, logros, desafíos vencidos); es idempotente |
| `npm run notifications:inactivity` | Corre una vez la alerta de inactividad (avisa al PT de los alumnos con 3 o más días asignados sin entrenar; un aviso por alumno cada 7 días) |

## Endpoints

Rol: `—` público · `trainer` / `student` requieren `Authorization: Bearer <token>` con ese rol.

### Health
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/health` | — | Liveness |
| GET | `/health/db` | — | Conectividad con Supabase |

### Auth
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/auth/register` | — | Registra un trainer |
| POST | `/api/auth/login` | — | Login (trainer o alumno; resuelve el rol) |
| POST | `/api/auth/refresh` | — | Nuevo access token |
| POST | `/api/auth/logout` | trainer/student | Revoca el refresh token |

### Invitaciones (onboarding) — Fase 1
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/invitations` | trainer | Genera invitación (token, `join_url`, QR base64 y/o link de WhatsApp). Acepta opcionales `gym_equipment`, `injuries` y `level`, que pasan al alumno en el alta |
| GET | `/api/invitations/:token` | — | Valida token y devuelve datos precargados |

### Alumnos y medidas corporales — Fase 1/2

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/students` | — | Alta del alumno desde token de invitación |
| GET | `/api/students` | trainer | Lista los alumnos del PT con `last_session_at`. Por defecto **solo activos**; `?active=false` trae los dados de baja. También `search`, `page`, `limit` |
| GET | `/api/students/:id` | trainer dueño / el propio alumno | Ficha completa: `gym_equipment`, `injuries`, `level`, `latest_metrics` (con `bmi`), `active_routine` (`{ id, name, days }`) y `last_session_at` |
| PATCH | `/api/students/:id` | trainer dueño | Edita `name`, `goal`, `level`, `active`, `birth_date`, `gym_equipment`, `injuries` (al menos uno). `active: false` = baja: revoca sus refresh tokens (el alumno puede seguir usando la app hasta 1 h, `JWT_EXPIRES_IN`) |
| GET | `/api/students/:id/metrics` | trainer dueño / el propio alumno | Historial de medidas, de la más vieja a la más nueva, con `bmi` |
| POST | `/api/students/:id/metrics` | trainer dueño / el propio alumno | Carga una medida. 201 si es nueva, 200 si es un reintento con el mismo `id` |
| DELETE | `/api/students/:id/metrics/:metricId` | trainer dueño (cualquiera) / alumno (solo las suyas) | Borra una medida. 204 |

Valores válidos: `goal` = `tonify` | `weight_loss` | `hypertrophy` | `strength`; `level` = `beginner` | `intermediate` | `advanced`. Un `:id` o `:metricId` que no es UUID responde 400 `VALIDATION_ERROR`.

Ajeno o inexistente → **403** (no revela qué ids existen).

En el borrado de medidas, una medida inexistente o de otro alumno responde **404** `METRIC_NOT_FOUND`, y un alumno que borra una medida cargada por el entrenador responde **403**.

### Ejercicios — Fase 2
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/exercises` | trainer | Biblioteca: globales + propios (`muscle_group`, `equipment`, `search`, `include_global`) |
| GET | `/api/exercises/library` | student | Biblioteca del alumno: globales + los de su entrenador, ordenada por nombre. Solo `id, name, muscle_group, equipment, description, video_url`. Sin filtros (mobile filtra offline) |
| POST | `/api/exercises` | trainer | Crea ejercicio propio (valida equipamiento, URL de video y descripción) |
| PATCH | `/api/exercises/:id` | trainer | Edita (solo el dueño; valida equipamiento, URL de video y descripción) |
| DELETE | `/api/exercises/:id` | trainer | Elimina (solo el dueño); 409 `EXERCISE_IN_USE` si está en uso |

### Rutinas — Fase 2
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/routines` | trainer | Crea y asigna rutina a un alumno (con ejercicios); `template_id` ajeno o inexistente → 404 `TEMPLATE_NOT_FOUND`. El `order` de los ejercicios se renumera 0..n-1 |
| GET | `/api/routines` | trainer | Lista rutinas (`student_id`, `active`) |
| GET | `/api/routines/:id` | trainer | Detalle de la rutina con sus ejercicios |
| PATCH | `/api/routines/:id` | trainer | Edita / desactiva una rutina |
| POST | `/api/routines/:id/exercises` | trainer | Agrega ejercicios a la rutina, después de los existentes |
| PATCH | `/api/routines/:id/exercises/:routineExerciseId` | trainer | Edita un ejercicio de la rutina (`sets`, `reps`, `rest_seconds`, `suggested_kg`, `tempo`, `notes`; al menos uno). Devuelve la rutina completa |
| DELETE | `/api/routines/:id/exercises/:routineExerciseId` | trainer | Quita un ejercicio de la rutina. 204; 409 `ROUTINE_NEEDS_EXERCISE` si es el último |
| GET | `/api/routines/today` | student | Rutina activa del alumno para hoy; cada ejercicio trae `last_session_kg` (mayor peso de la última sesión en que lo hizo, o `null`) |
| GET | `/api/routines/mine` | student | Rutinas activas del alumno con sus ejercicios (caché offline de mobile) |

### Plantillas de rutina — Fase 2
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/routine-templates` | trainer | Lista las plantillas propias (`goal`, `level`, `generated_by_ai`), sin `structure`, con `days` y `exercise_count` |
| GET | `/api/routine-templates/:id` | trainer | Plantilla con `structure` y los datos de cada ejercicio |
| POST | `/api/routine-templates` | trainer | Crea una plantilla (`name`, `goal`, `level?`, `structure`). 201 |
| POST | `/api/routine-templates/from-routine` | trainer | Guarda una rutina propia como plantilla (`routine_id`, `name?`, `goal?`, `level?`). 201 |
| PATCH | `/api/routine-templates/:id` | trainer | Edita `name`, `goal`, `level` o `structure` (al menos uno) |
| DELETE | `/api/routine-templates/:id` | trainer | Borra la plantilla; sus rutinas quedan con `template_id = null`. 204 |
| POST | `/api/routine-templates/:id/instantiate` | trainer | Crea una rutina **copia** para un alumno (`student_id`, `name?`, `days?`). 201. Ver [ADR 0003](../docs/adr/0003-plantillas-se-copian.md) |

Plantilla ajena o inexistente → 404 `TEMPLATE_NOT_FOUND`. `instantiate` responde 409 `TEMPLATE_STRUCTURE_INVALID` si la plantilla está incompleta (cargada por otra vía) y 409 `TEMPLATE_EXERCISES_UNAVAILABLE` si algún ejercicio ya no está disponible. Los errores de `from-routine` salen con `field: "routine_id"`. El `order` de los ejercicios se renumera 0..n-1.

### Sesiones — Fase 3

Escritura del alumno: solo rol `student`; el `student_id` sale del token. Sesión ajena o inexistente → 404 `SESSION_NOT_FOUND`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/sessions` | Inicia la sesión (id del cliente). Idempotente: 201 si es nueva, 200 en un reintento (completa `finished_at`, `rpe`, `notes`), 409 `SESSION_ID_CONFLICT` si el id es de otro alumno. Un `routine_id` ajeno o borrado se guarda como `null` |
| POST | `/api/sessions/:id/sets` | Lote de 1 a 100 series, upsert por `id` (reenviar no duplica; corrige). Siempre 200 `{ data: { saved, failed, unlocked_achievements } }`; fallos por serie: `VALIDATION_ERROR`, `EXERCISE_NOT_FOUND`, `SET_ID_CONFLICT`. Una sustitución deja `has_modifications = true`. Cada serie acepta `rest_seconds` (descanso real después de la serie, 0-3600 o `null`) |
| PATCH | `/api/sessions/:id` | Cierra la sesión o corrige `finished_at`, `rpe` (1-10), `notes` (al menos uno) |
| GET | `/api/students/:id/sessions?page=&limit=` | Historial paginado `{ data, meta }`, más recientes primero (trainer: sus alumnos; student: él mismo): `routine`, `duration_min`, `sets`, `volume_kg`, `has_pr`, `trainer_comment` |
| GET | `/api/students/:id/sessions/:sessionId` | trainer / student. Resumen + `exercises` (real vs planificado, sustituciones, `is_pr`, descanso real por serie y `planned.rest_seconds`); 404 `SESSION_NOT_FOUND` si no es de ese alumno |
| PATCH | `/api/sessions/:id/comment` | Solo `trainer`: `{ trainer_comment }` (≤ 1000 o `null`; `""` borra) en una sesión de sus alumnos (ajena o inexistente: 404). Devuelve el resumen; el alumno lo ve en su historial |

### Progreso — Fase 3

Roles `trainer` y `student`. El alumno puede omitir `student_id` (por defecto es él mismo); el trainer lo manda siempre y tiene que ser su alumno (403 si no).

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/progress/exercise/:exerciseId` | Curva de carga: un punto por día con `max_kg`, `volume_kg`, `e1rm_kg` (Epley), `sets` y `reps`; más `pr` y `default_metric`. Query `student_id`, `from`, `to`. Ejercicio no visible para el alumno → 404 `EXERCISE_NOT_FOUND`. Ver [ADR 0004](../docs/adr/0004-metrica-de-progreso.md) |
| GET | `/api/progress/overview` | Ejercicios entrenados (`id`, `name`, `muscle_group`, `days`, `last_date`) y volumen semanal (`week_start` lunes AR, `volume_kg`, `sessions`; semanas vacías en 0). Query `student_id`, `from`, `to`; 400 si `to` es posterior a mañana (hora AR). Ver [contrato](../docs/arquitectura/contratos-api.md) |
| GET | `/api/progress/body/:studentId` | Historial de medidas (como `/students/:id/metrics`) más `summary` por campo (`first`, `last`, `delta`) |

### Gamificación — Fase 5

Rol: `trainer` / `student`. Sobre un alumno rige la regla de siempre (trainer dueño o el propio alumno; si no, 403). El detalle de cada body y respuesta está en [`contratos-api.md`](../docs/arquitectura/contratos-api.md).

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/achievements` | trainer/student | Catálogo de logros |
| GET | `/api/students/:id/achievements` | trainer dueño / el propio alumno | Logros desbloqueados, el más reciente primero |
| GET | `/api/students/:id/streak` | trainer dueño / el propio alumno | `{ current_streak_days, longest_streak_days, last_session_date }` ([ADR 0005](../docs/adr/0005-racha-contra-dias-asignados.md)) |
| GET | `/api/students/:id/achievements/progress` | trainer dueño / el propio alumno | Solo lectura: `{ streak, facts, assigned_days, achievements }` con `current`/`target`/`unlocked_at` de cada logro del catálogo (lo usa el celular, tarjeta 15) |
| GET | `/api/challenges` | trainer/student | Globales + del entrenador. Query `goal_type`; `active_only` se acepta y se ignora. Para trainer suma `assignments_count` y `active_count` |
| GET | `/api/challenges/:id/active-students` | trainer | `{ data: string[] }` con los alumnos suyos que lo tienen activo; no visible → 404 `CHALLENGE_NOT_FOUND` |
| POST | `/api/challenges` | trainer | Crea un desafío (`duration_days` obligatorio). 201 |
| PATCH | `/api/challenges/:id` | trainer dueño | Edición parcial; global o ajeno → 404 `CHALLENGE_NOT_FOUND`; cambiar `goal_type`/`goal_value` con asignaciones activas → 409 `CHALLENGE_IN_USE` |
| DELETE | `/api/challenges/:id` | trainer dueño | 204; con cualquier asignación (aun terminada) 409 `CHALLENGE_IN_USE`, para conservar el historial |
| POST | `/api/challenges/:id/assignments` | trainer | `{ student_ids }` (1 a 50). 201 `{ created, skipped }` |
| POST | `/api/students/:id/challenges` | trainer dueño / el propio alumno | `{ challenge_id }`. 201; ya activo 409 `CHALLENGE_ALREADY_ACTIVE` |
| GET | `/api/students/:id/challenges` | trainer dueño / el propio alumno | Asignaciones con `current_progress`, `progress_pct` y `status` |

`PATCH /api/sessions/:id`, `POST /api/sessions` (cuando queda cerrada) y `POST /api/sessions/:id/sets` (sobre una sesión cerrada) suman `unlocked_achievements` dentro de `data` (`[]` si no hubo).

**Job diario.** Corre a las 03:00 (hora de Buenos Aires) dentro del proceso del server, con un `setTimeout` que se reprograma solo. Lo controla `CRON_ENABLED` (por defecto activo; `false` lo apaga y en `NODE_ENV=test` siempre está apagado). Para correrlo a mano: `npm run gamification:daily`. Recalcula racha, logros y progreso de los desafíos de los alumnos activos y marca `failed` los desafíos vencidos hace más de 2 días (`CHALLENGE_GRACE_DAYS`: hasta entonces siguen activos y una sesión offline sincronizada tarde todavía los puede completar); reejecutarlo no duplica nada. A las 03:00 el scheduler corre en secuencia los jobs de gamificación y de inactividad (ver abajo); si uno falla, el otro corre igual.

### Notificaciones — Fase 5

Rol: `trainer` / `student`; todo es propio del usuario autenticado. La tabla `notifications` es la fuente de verdad y el push (FCM HTTP v1) es un aviso best-effort sin reintentos ([ADR 0006](../docs/adr/0006-notificaciones-tabla-fuente-de-verdad-fcm-v1.md)). Tipos, `data` y respuestas en [`contratos-api.md`](../docs/arquitectura/contratos-api.md).

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/notifications?unread_only=&limit=&before=` | Propias, más nuevas primero. `{ data, meta: { unread_count, next_before } }` (20 por página, máx. 100). `next_before` termina en `+00:00`: codificarlo (`%2B`) al reenviarlo |
| PATCH | `/api/notifications/read-all` | Marca todas como leídas. 204 |
| PATCH | `/api/notifications/:id/read` | Marca una como leída. 204; inexistente o ajena: 404 `NOTIFICATION_NOT_FOUND` |
| POST | `/api/notifications/tokens` | `{ token, platform }` con `platform` `android` o `web`. Upsert del token de FCM del dispositivo: 201 si es nuevo, 200 si ya existía |
| DELETE | `/api/notifications/tokens/:token` | Baja el token del usuario. 204 siempre |

**Push.** Se configura con `FCM_SERVICE_ACCOUNT_PATH` (local) o `FCM_SERVICE_ACCOUNT_JSON` en base64 (VPS); sin credenciales el push queda apagado y las notificaciones se guardan igual. Pasos en [`setup-tecnico.md`](../docs/proceso/setup-tecnico.md). Un token se borra solo cuando FCM lo señala como inválido (`UNREGISTERED` o token mal formado).

**Disparadores.** Se llaman desde Sessions y nunca rompen la operación que los origina: `routine_modified` (PT), `pr` y `achievement` al cerrar una sesión (alumno con push, PT solo en la base) y `comment` cuando el PT comenta (alumno).

**Job de inactividad.** `runInactivityAlerts` recorre los alumnos activos y avisa al PT de los que tienen rutina activa y acumulan 3 o más días asignados sin entrenar desde su última sesión cerrada (desde el alta si nunca entrenaron), como máximo una vez cada 7 días por alumno. Corre a las 03:00 ART justo después del job de gamificación, bajo el mismo `CRON_ENABLED`. A mano: `npm run notifications:inactivity`; correrlo de nuevo es seguro (el límite de 7 días evita duplicados).

### Autenticación

- **Access token:** JWT firmado con `JWT_SECRET` (`{ sub, role, email }`), expira según `JWT_EXPIRES_IN`.
- **Refresh token:** token opaco; en la DB se guarda solo su hash SHA-256. El logout lo revoca.

## Notas de implementación (desvíos respecto del DER de Notion)

Estos ajustes fueron necesarios para que el backend funcione. Todos están aplicados en `src/database/schema/`.

1. **`trainers.password_hash` y `students.password_hash`** — el DER no incluía
   credenciales; el login por email/password las requiere.
2. **Tabla `refresh_tokens`** — no estaba en el DER; permite revocar tokens en el logout.
3. **`invitations.student_email`** — lo exige el contrato de API (entra en POST y sale en GET).
4. **`routine_exercises.order_index`** — el DER lo llamaba `order`, palabra reservada en SQL.
5. **Enum de `exercises.muscle_group`** — el DER no listaba los valores; se definió el set
   (`chest, back, shoulders, legs, glutes, biceps, triceps, core, calves, full_body, cardio`).
6. **Expiración de invitaciones: 48 hs** (constante `INVITATION_EXPIRY_HOURS`) — CU-01 y el
   Plan dicen 48 hs; el DER/ejemplo de contrato mostraban 72 hs.

## Desvíos respecto del contrato de API (Notion v1.1)

El contrato de Notion no se actualizó (el plan gratis está lleno). **Lo que vale es esto.**

### Invitaciones (`/invitations`)

- **`POST /invitations`:** suma tres campos **opcionales**, con las mismas reglas que en `PATCH /students/:id`: `gym_equipment` (lista de hasta 30 textos de 1 a 50 caracteres), `injuries` (texto de hasta 1000) y `level` (`beginner | intermediate | advanced`). `null` cuenta como ausente. Al aceptar la invitación (`POST /students`), se copian al alumno, igual que `goal`.
- `GET /invitations/:token` **no** los devuelve: lo puede leer cualquiera que tenga el link, y las lesiones son un dato sensible.

### Alumnos (`/students`)

- **`GET /students`:** cada alumno trae `last_session_at` (timestamp, o `null` si nunca entrenó), que sale de la vista `student_last_session`. **Por defecto trae solo los activos**; los dados de baja se piden con `?active=false`.
- **`GET /students/:id`:** responde `{ data }`, con `latest_metrics` (la última medida con `bmi`, o `null`) y `active_routine` (`{ id, name, days }`, o `null`).
- **`PATCH /students/:id`:** devuelve la ficha completa en `{ data }`, con la misma forma que el GET.
- **Baja del alumno** (`active: false`): no se borra nada.
  - El login del alumno responde `401 ACCOUNT_DISABLED`.
  - Sus refresh tokens se revocan: su `POST /api/auth/refresh` responde `401 UNAUTHORIZED` ("Refresh token inválido"), no `ACCOUNT_DISABLED`. El access token que tenga dura como mucho `JWT_EXPIRES_IN` (1 h).
  - Con `active: true` vuelve a entrar con la misma contraseña.
  - Solo el entrenador da de baja; nada lo hace de forma automática por inactividad.

### Medidas corporales (`/students/:id/metrics`)

- Las rutas siguen el contrato (`/students/:id/metrics`), no `/body-metrics`.
- **`POST`:**
  - suma `height_cm`, que hace falta para el IMC;
  - suma un `id` opcional (UUID generado en el cliente): un reintento con el mismo `id` responde 200 con lo ya guardado, sin duplicar; un `id` ya usado por otro alumno responde 409 `METRIC_ID_CONFLICT`;
  - las medidas van como **números JSON** (`"80"` como string da 400), son ≥ 0 y `body_fat_pct` ≤ 100;
  - tiene que venir al menos una;
  - `recorded_at` es opcional (por defecto, ahora; `null` cuenta como ausente), en ISO 8601 **con zona** (`Z` o `-03:00`), y no puede estar más de 5 minutos en el futuro (se tolera el reloj adelantado del celular);
  - `recorded_by` lo pone el backend según el rol.
- **`bmi` se calcula en cada respuesta y no existe en la tabla.** Si la medida no trae altura, se usa la última registrada antes de esa medida. Puede venir `null`.
- **Nuevos:** `GET /students/:id/metrics` (historial ascendente) y `DELETE /students/:id/metrics/:metricId`. No hay `PATCH`: para corregir, se borra y se vuelve a cargar.

### Rutinas (`/routines`)

- **Nuevo `GET /routines/mine`** (solo alumno): devuelve `{ data: [...] }` con **todas** las rutinas activas del alumno, cada una con `routine_id`, `name`, `goal`, `days`, `created_at` y `exercises` (la misma forma que en `/today`, sin `last_session_kg`), la más nueva primero; `[]` si no tiene. Lo usa la app mobile para guardar la rutina offline y resolver el día en el teléfono: `/today` no distingue "día de descanso" de "sin rutina" y no sirve para un caché que se usa otro día.
- `GET /routines/today` no cambia.

### Lo que le toca a la web

- **Panel de alumnos:**
  - mostrar `last_session_at` ("Nunca entrenó" si es `null`);
  - sumar un filtro o una pestaña "Dados de baja" que pida `?active=false`.
- **Formulario de invitación:** pedir `gym_equipment`, `injuries` y `level` al crear la invitación (son opcionales, pero sin ellos la IA del S4 arranca sin contexto). Pasan solos al alumno cuando acepta.
- **Ficha del alumno:**
  - mostrar y editar `gym_equipment` (lista de textos), `injuries` y `level`;
  - pedirlos al editar, porque sin esos datos los asistentes IA del S4 sugieren cualquier cosa;
  - mostrar `latest_metrics` y `active_routine`, contemplando que vengan en `null`.
- **Dar de baja o reactivar:** es un `PATCH` con `active: false` o `true`. Pedir confirmación, porque la baja revoca los refresh tokens del alumno (puede seguir usando la app hasta 1 h, `JWT_EXPIRES_IN`).
- **Rutinas:** nada. `GET /routines/mine` es solo para mobile.
- **Medidas:**
  - historial con `GET` (ya viene ordenado para graficar);
  - carga con `POST` (convertir los inputs a número y mandar `recorded_at` con zona);
  - borrado con `DELETE`;
  - el IMC no se calcula en la web: se usa el `bmi` de la respuesta.
- **Login web:** si el login de un alumno responde `ACCOUNT_DISABLED`, mostrar "Tu entrenador dio de baja tu cuenta". Si el refresh falla (`401`), tratarlo como cierre de sesión: el mensaje aparece en el próximo login.

### Sesiones (`/sessions`)

- **Series en lote:** el contrato decía `POST /session-sets`; ahora es `POST /sessions/:id/sets` con `{ "sets": [...] }` (1 a 100) y respuesta `{ saved, failed }`. El `id` de cada serie lo genera el celular.
- **Sustitución:** `substituted_exercise_id` se reemplaza por `exercise_id` (lo realmente hecho) + `original_exercise_id` (lo planificado).
- **Cierre:** `POST /sessions` acepta `finished_at` y además existe `PATCH /sessions/:id`.
- **Historial:** `GET /students/:id/sessions`, `GET /students/:id/sessions/:sessionId` y `PATCH /sessions/:id/comment` (solo `trainer`); ver el contrato.
- **Descanso real (01/11, compatible):** `session_sets.rest_seconds` (migración `2026-11-01-session-sets-rest.sql`). El celular lo manda en cada serie de `POST /sessions/:id/sets`: los segundos que el alumno descansó **después** de esa serie, con su ajuste, la pausa y "Saltar". `null` = sin dato (series anteriores, última serie de la sesión, ejercicio sin descanso). El detalle del historial lo devuelve en cada serie y suma `planned.rest_seconds` (el de la rutina actual).
  - **Para la web (Pablo):** en el detalle de una sesión del alumno, mostrar el descanso de cada serie ("desc. 2:00") y marcarlo cuando difiere del plan ("desc. 2:00 (plan 1:30)"). Si alguno de los dos es `null`, sin marca. **Hecho** en la web: el detalle muestra la columna "Desc." y la sesión web del alumno también manda `rest_seconds` (spec del alumno en la web, §8).

### Gamificación (`/achievements`, `/challenges`)

- **Racha:** cuenta días asignados seguidos entrenados, no días corridos (ADR 0005); reemplaza lo que decía el contrato v1.1.
- **`GET /challenges`:** `active_only` se acepta pero no filtra, porque `challenges` no tiene estado de vigencia.
- **Logros:** `GET /students/:id/achievements` devuelve `context` con `session_id` (y `exercise_id` en los de récords) en lugar de datos del ejercicio.
- **Desafíos:** se suman `PATCH` y `DELETE /challenges/:id` y `POST /challenges/:id/assignments`, y `duration_days` es obligatorio.

### Ejercicios (`/exercises`)

- **`GET /exercises/library` (nuevo, solo alumno):** lo usa la biblioteca offline de mobile. El entrenador sale de la ficha del alumno, no del request. Un alumno sin entrenador recibe solo los globales; uno que no existe, 404. **Para la web: nada que hacer**, `GET /exercises` sigue igual y solo para trainer.

### Progreso (`/progress`) y `/routines/today`

- Rutas nuevas (no están en el contrato de Notion): `GET /progress/exercise/:exerciseId` y `GET /progress/body/:studentId`. La agregación vive en funciones SQL (`exercise_progress`, `last_session_kg`) llamadas con `supabase.rpc`; son `security invoker`, con `search_path` fijo y ejecutables solo por `service_role`. Migración: `src/database/migrations/2026-10-29-progress.sql`. `GET /progress/overview` usa `progress_exercises` y `weekly_volume` (`schema/04b-progress-overview.sql`, migración `2026-10-30-progress-overview.sql`).
- **`GET /routines/today`:** `last_session_kg` deja de ser siempre `null`: es el mayor peso de la última sesión en que el alumno hizo el ejercicio.
