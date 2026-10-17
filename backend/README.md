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

Módulos implementados: `health`, `auth`, `invitations`, `students`, `body-metrics`, `exercises`, `routines`.

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
│   └── seeds/exercises.sql  # 50 ejercicios globales iniciales (con video)
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

```bash
cp .env.example .env     # completar con credenciales de Supabase + JWT_SECRET
npm install
```

Luego, en el **SQL Editor** de Supabase, ejecutar en orden:
1. los archivos de `src/database/schema/` en orden (ver su README) — crean todas las tablas.
2. `src/database/seeds/exercises.sql` — carga los 50 ejercicios globales (re-ejecutable).

En una base ya creada, correr antes las migraciones de `src/database/migrations/`
que falten. Después del seed, `src/database/checks/exercises-checks.sql` tiene
que devolver 0 filas.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev con nodemon (hot reload) |
| `npm start` | Producción |
| `npm test` | Tests (Jest) |
| `npm run test:coverage` | Tests con cobertura |
| `npm run lint` | ESLint + chequeo de 200 líneas por archivo (`scripts/check-file-length.js`) |

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
| GET | `/api/students/:id` | trainer dueño / el propio alumno | Ficha completa: `gym_equipment`, `injuries`, `level`, `latest_metrics` (con `bmi`) y `active_routine` (`{ id, name, days }`) |
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
| POST | `/api/exercises` | trainer | Crea ejercicio propio |
| PATCH | `/api/exercises/:id` | trainer | Edita (solo el dueño) |
| DELETE | `/api/exercises/:id` | trainer | Elimina (solo el dueño) |

### Rutinas — Fase 2
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/routines` | trainer | Crea y asigna rutina a un alumno (con ejercicios) |
| GET | `/api/routines` | trainer | Lista rutinas (`student_id`, `active`) |
| GET | `/api/routines/:id` | trainer | Detalle de la rutina con sus ejercicios |
| PATCH | `/api/routines/:id` | trainer | Edita / desactiva una rutina |
| POST | `/api/routines/:id/exercises` | trainer | Agrega ejercicios a la rutina |
| GET | `/api/routines/today` | student | Rutina activa del alumno para hoy |
| GET | `/api/routines/mine` | student | Rutinas activas del alumno con sus ejercicios (caché offline de mobile) |

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
