# Spec — Completar módulo Students + Body Metrics

- **Tarjeta:** "7 · Completar módulo Students + Body Metrics" (tablero personal de Igna) → tarjeta de equipo https://trello.com/c/u30pauul
- **Fecha:** 2026-10-17
- **Rama:** `feature/students-body-metrics`, sale de `develop` con `feature/schema-completo` (PR #4) y `fix/s0-deuda-backend` (PR #2) mergeadas localmente. Las dos se combinan sin conflictos (`git merge-tree`). El PR de esta tarjeta muestra también esos cambios hasta que #2 y #4 entren a `develop`.
- **Reglas que aplican:** `AGENTS.md`, sección Backend: capas, validación antes del controller, ownership en los services.
- **Contrato de base:** *Contratos de API — FitTrainer* v1.1 (Notion), módulo Alumnos.

## 1. Objetivo

Completar la gestión del alumno en el backend:

- la ficha completa;
- la edición por parte del entrenador, incluida la baja;
- el historial de medidas corporales.

`gym_equipment`, `injuries` y `level` son el contexto que usan los asistentes IA del S4, así que tienen que poder cargarse y editarse acá.

**Criterio de aceptación (de la tarjeta):**

1. El entrenador ve solo a sus alumnos, con la fecha de la última sesión.
2. Si pide un alumno de otro entrenador, recibe 403.
3. Carga tres medidas para un alumno y las recupera ordenadas por fecha.

## 2. Decisiones tomadas

- **Las medidas las cargan el entrenador dueño y el propio alumno.** La carga del alumno queda lista para hacerse offline desde mobile:
  - el `id` de la medida puede venir generado en el cliente, y un reintento con el mismo `id` no duplica;
  - `recorded_at` es el momento real de la medición, no el de la sincronización.
- **Solo el entrenador da de baja a un alumno** (`active = false`), y significa que ese alumno ya no va más.
  - Mientras no lo haga, el alumno entra a la app aunque lleve tiempo sin entrenar. Nada lo bloquea de forma automática.
  - Un alumno dado de baja:
    - no puede loguearse (`401 ACCOUNT_DISABLED`, que ya está en el contrato);
    - no aparece en el listado por defecto;
    - conserva todo su historial, porque nunca se borra.
  - Si el entrenador lo reactiva, el alumno vuelve a entrar con la misma contraseña.
- **No hay aviso de inactividad calculado.** El listado trae `last_session_at` y el entrenador decide.
  - El "N días" de la alerta nocturna (CU-13) se define cuando se haga esa tarjeta.
  - La tarjeta daba esto como bloqueado hasta el S3, pero ya no lo está: la tabla `sessions` existe desde la tarjeta 2.
- **Las medidas se cargan, se listan y se borran, pero no se editan.** Un error de carga se corrige borrando la medida y cargándola de nuevo.
- **El contexto para la IA es parte del alta** (agregado tras la auditoría de Codex, como pide la tarjeta de equipo): `POST /invitations` acepta `gym_equipment`, `injuries` y `level` opcionales (columnas `student_*` nuevas en `invitations`), y `POST /students` los copia al alumno, igual que `goal`. `GET /invitations/:token` no los expone. Se validan con las mismas reglas que el `PATCH` (`validations/students/student-context.validation.js`).
- **Las rutas siguen el contrato:** `/students/:id/metrics`, no `/body-metrics` como dice la tarjeta.
- **El IMC se calcula, nunca se guarda.**
- **El listado y la ficha usan consultas distintas,** como pide la tarjeta (§4).

## 3. Endpoints y permisos

| Endpoint | Entrenador dueño | El propio alumno | Otro entrenador / otro alumno |
|---|---|---|---|
| `GET /students` (existe) | sus alumnos | — (rol trainer) | — |
| `GET /students/:id` | ✅ | ✅ | 403 |
| `PATCH /students/:id` | ✅ | 403 | 403 |
| `GET /students/:id/metrics` | ✅ | ✅ | 403 |
| `POST /students/:id/metrics` | ✅ | ✅ | 403 |
| `DELETE /students/:id/metrics/:metricId` | ✅ cualquiera | ✅ solo las que cargó él | 403 |

**Control de acceso.** Todos los endpoints con `:id` pasan por `assertCanAccessStudent(user, studentId)`. Vive en su propio archivo, `services/students/student-access.service.js`, para que `students.service` y `body-metrics.service` lo usen sin importarse entre sí en círculo:

- si el usuario es entrenador, el alumno tiene que existir y su `trainer_id` tiene que ser el del entrenador;
- si es alumno, el `:id` tiene que ser su propio id.

Si no se cumple, responde **403**, también cuando el alumno no existe. Es el mismo criterio que usa `routines`, y así no se revela qué ids existen. Devuelve la fila del alumno para que el service la reutilice.

**Validación.** `:id` y `:metricId` tienen que ser UUID; si no, 400 `VALIDATION_ERROR` antes de llegar al controller. Se pasan a minúsculas, porque Postgres devuelve los UUID en minúsculas y compararlos contra uno en mayúsculas daría un 403 falso.

### `GET /students` (cambios)

- Cada alumno suma `last_session_at`: un timestamp, o `null` si nunca entrenó.
- Por defecto trae solo los activos. Para ver los dados de baja, `?active=false`. Hoy, sin el parámetro, trae todos.
- No cambian `search`, `page`, `limit` ni la forma `{ data, meta }`.

### `GET /students/:id`

**200** → `{ data: StudentDetail }`. Incluye:

- todas las columnas públicas del alumno, entre ellas `gym_equipment`, `injuries`, `level`, `birth_date` y `active`;
- `latest_metrics`: la medida más reciente con `bmi`, o `null` si no tiene ninguna;
- `active_routine`: `{ id, name, days }` de la rutina activa más reciente, sin ejercicios, o `null`.

### `PATCH /students/:id`

- Solo el entrenador dueño.
- Campos opcionales: `name`, `goal`, `active`, `birth_date`, `gym_equipment`, `injuries`, `level`. Tiene que venir al menos uno.
- **200** → `{ data: StudentDetail }`, la misma forma que el GET.

Validaciones:

- `name`: 2 a 100 caracteres después de quitar los espacios de los extremos.
- `goal`: `tonify | weight_loss | hypertrophy | strength`.
- `level`: `beginner | intermediate | advanced`.
- `active`: booleano.
- `birth_date`: fecha `YYYY-MM-DD` válida, no futura. Acepta `null` para borrarla.
- `gym_equipment`: lista de textos no vacíos, de máximo 50 caracteres cada uno, a lo sumo 30 elementos. Acepta `null`. Es texto libre, como `exercises.equipment`.
- `injuries`: texto de hasta 1000 caracteres. Acepta `null`.
- Los campos que no están en la lista se ignoran. `email`, `trainer_id` y `password_hash` no se editan por acá.

### `POST /students/:id/metrics`

Body:

| Campo | Regla |
|---|---|
| `id` | opcional, UUID generado en el cliente |
| `weight_kg`, `height_cm`, `body_fat_pct`, `waist_cm`, `hip_cm`, `chest_cm` | opcionales, números JSON ≥ 0 (`"80"` como string da 400). `body_fat_pct` ≤ 100. Tiene que venir al menos uno. |
| `recorded_at` | opcional, fecha y hora ISO 8601 **con zona** (`Z` o `±hh:mm`); sin zona la hora es ambigua y da 400. Si no viene, es el momento actual. No puede estar más de 5 minutos en el futuro (se tolera algo de desfase de reloj del celular). |

El backend completa `recorded_by` con el rol del usuario (`trainer` o `student`); el cliente nunca lo manda.

Respuestas:

- **201** → `{ data: BodyMetric }`, con `bmi`.
- **200** → `{ data: BodyMetric }`, si el `id` ya existía para ese mismo alumno: es un reintento y devuelve lo que se guardó la primera vez.
- **409** `METRIC_ID_CONFLICT`, si el `id` ya existe para otro alumno.

### `GET /students/:id/metrics`

**200** → `{ data: BodyMetric[] }`, ordenado por `recorded_at` ascendente (el orden de los gráficos), con `bmi` en cada medida. No tiene paginación: son pocas filas por alumno.

### `DELETE /students/:id/metrics/:metricId`

- **204** si se borró.
- **404** `METRIC_NOT_FOUND`, si la medida no existe o no es de ese alumno.
- **403**, si quien la borra es el alumno y la cargó el entrenador.

## 4. Datos y consultas

### Migración

```sql
-- body_metrics.recorded_by: quién cargó la medida. Define quién puede borrarla.
do $$ begin
  if not exists (select 1 from information_schema.columns
                 where table_name = 'body_metrics' and column_name = 'recorded_by') then
    alter table body_metrics
      add column recorded_by varchar(10) not null default 'trainer'
      check (recorded_by in ('trainer', 'student'));
  end if;
end $$;

-- Última sesión de cada alumno, para el listado del entrenador.
create or replace view student_last_session with (security_invoker = true) as
  select student_id, max(started_at) as last_session_at
  from sessions
  group by student_id;
```

- Va en `schema.sql`, junto a la tabla `body_metrics` y después de `sessions`, para que se pueda volver a correr sin romper nada.
- Además va en `backend/src/database/migrations/2026-10-17-students-body-metrics.sql`, para correrla en Supabase dev.
- La vista se suma a `schema-checks.sql` y a `check-anon-access.js`, que verifican que el usuario anónimo no pueda leer nada.
- Una vista común corre con los permisos de su dueño (`postgres`) y saltearía el RLS deny-all: el usuario anónimo podría leer las fechas de sesión de cualquiera. Por eso va con `security_invoker = true`, que aplica el RLS de `sessions` a quien consulta. El backend no se ve afectado, porque la `service_role` saltea el RLS igual.

### Listado y ficha: dos consultas, a propósito

En `student.model.js`:

- `STUDENT_LIST_COLUMNS = 'id, name, email, goal, active, avatar_url, created_at'`.
- `STUDENT_DETAIL_COLUMNS = 'id, trainer_id, name, email, goal, birth_date, avatar_url, active, gym_equipment, injuries, level, created_at'`. Es el `STUDENT_PUBLIC_COLUMNS` de hoy, renombrado, y lo siguen usando el login y el alta.

Un comentario explica la razón. El listado necesita la última sesión, que la ficha no usa. La ficha necesita los campos de contexto para la IA, que el listado no muestra. Unificarlas o trae de más en el listado o deja la ficha sin un campo, sin que nada falle a la vista.

- **Listado:** primero la página de alumnos; después `student_last_session` filtrada con `.in('student_id', ids)`. Se combinan en el service. Son dos consultas por página. No se usan los agregados embebidos de PostgREST, porque vienen apagados en Supabase y prenderlos afecta a toda la API.
- **Ficha:** `Promise.all` con el alumno (ya obtenido en `assertCanAccessStudent`), las medidas más recientes y la rutina activa (`routines` con `active = true` y `order created_at desc limit 1`).

### IMC

`computeBmi(weightKg, heightCm)` en `body-metric.model.js`, una función pura:

- la fórmula es `weight_kg / (height_cm / 100)²`, redondeada a 1 decimal;
- da `null` si falta el peso, si falta la altura o si la altura es 0.

Si una medida no trae altura, se usa la última altura registrada **anterior o igual** a su `recorded_at`:

- en el historial se resuelve recorriéndolo en orden;
- para `latest_metrics` se hacen dos consultas de 1 fila: la última medida, y la última medida con `height_cm` no nula.

`bmi` es un campo calculado en la respuesta; no existe en la tabla.

### Carga sin duplicados

1. `insert` con el `id` del cliente, o sin `id` para que lo genere la base.
2. Si choca con un id existente (código `23505` sobre la clave primaria), se busca esa fila por `id`.
3. Si es del mismo alumno, responde 200 con la fila guardada.
4. Si es de otro alumno, responde 409.

### Archivos

Módulo nuevo `body-metrics`, una capa por archivo:

- `routes/body-metrics/body-metrics.routes.js`: router con `mergeParams`, montado en el router de alumnos como `/:id/metrics`;
- `controllers/body-metrics/body-metrics.controller.js`;
- `services/body-metrics/body-metrics.service.js`: usa `assertCanAccessStudent`;
- `repositories/body-metrics/body-metrics.repository.js`;
- `validations/body-metrics/body-metrics.validation.js`;
- `models/body-metrics/body-metric.model.js`: tabla, columnas y `computeBmi`.

En el módulo `students` se suman `getById`, `update` y `assertCanAccessStudent`, más sus validaciones y consultas.

## 5. Baja del alumno

Cuando un `PATCH` trae `active: false` (aunque ya estuviera inactivo, para que un reintento complete una revocación que falló):

- `authRepository.revokeAllForUser(userId, 'student')` revoca todos los refresh tokens activos del alumno, **antes** de guardar la baja: si la revocación falla, la baja no se guarda.

Además:

- **Login:** si el alumno existe y la contraseña es correcta pero `active = false`, responde **401 `ACCOUNT_DISABLED`**. La contraseña se verifica antes: con una contraseña incorrecta sigue saliendo `INVALID_CREDENTIALS`, para no revelar el estado de la cuenta.
- **Refresh:** la baja revoca sus refresh tokens, así que el refresh responde **401 `UNAUTHORIZED`** ("Refresh token inválido") y el cliente cierra la sesión; `ACCOUNT_DISABLED` le llega en el próximo login. Además, si un token de un alumno inactivo escapó de la revocación, el refresh responde **401 `ACCOUNT_DISABLED`** (segunda barrera).
- **Access token vigente:** dura hasta 1 h (`JWT_EXPIRES_IN`) y no se invalida. Cortarlo exigiría consultar la base en cada request de toda la API, y no lo justifica una baja que no es urgente.
- **Reactivación:** `PATCH` con `active: true`. El alumno se vuelve a loguear con la misma contraseña.

## 6. Errores nuevos (`errors.js`)

| Código | HTTP | Cuándo |
|---|---|---|
| `ACCOUNT_DISABLED` | 401 | login de un alumno dado de baja (y refresh con un token que escapó de la revocación) |
| `METRIC_NOT_FOUND` | 404 | DELETE de una medida que no existe o no es de ese alumno |
| `METRIC_ID_CONFLICT` | 409 | POST con un `id` que ya existe para otro alumno |

El resto usa los que ya existen: `VALIDATION_ERROR` y `FORBIDDEN`.

## 7. Tests

Son tests unitarios con jest sobre services, modelos y validaciones, con los repositorios simulados (el patrón de `tests/unit/services`). No se usa supertest; esa decisión ya está tomada por el presupuesto de horas.

- **Permisos:** entrenador dueño, propio alumno, otro entrenador, otro alumno y alumno inexistente, en GET y PATCH de la ficha, y en GET, POST y DELETE de medidas.
- **Listado:**
  - combina `last_session_at` y deja `null` si el alumno no tiene sesiones;
  - por defecto pide solo activos;
  - con `active=false` pide los dados de baja.
- **Ficha:** `latest_metrics` y `active_routine`, presentes y en `null`.
- **PATCH:**
  - devuelve los campos actualizados;
  - revoca los tokens al pasar a inactivo, y no lo hace si ya estaba inactivo o si no se tocó `active`.
- **Auth:**
  - el login de un alumno inactivo con la contraseña correcta da `ACCOUNT_DISABLED`;
  - con la contraseña incorrecta da `INVALID_CREDENTIALS`;
  - el refresh de un alumno inactivo con un token no revocado da `ACCOUNT_DISABLED`;
  - al reactivarlo, el login vuelve a funcionar.
- **Medidas:**
  - tres cargas que vuelven ordenadas;
  - `recorded_by` según el rol;
  - un reintento con el mismo `id` del mismo alumno da 200 sin un insert nuevo;
  - el mismo `id` de otro alumno da 409;
  - el DELETE responde 204, 404 o 403 según el caso.
- **IMC:**
  - el cálculo y el redondeo;
  - el uso de la última altura previa cuando falta;
  - `null` si falta el peso, si no hay altura o si la altura es 0.
- **Validaciones:**
  - body vacío, valores negativos y no numéricos;
  - `goal` o `level` fuera de los permitidos;
  - `birth_date` futura o inválida;
  - `recorded_at` en el futuro;
  - `gym_equipment` que no es una lista;
  - `:id` que no es un UUID.

**Prueba real del criterio de aceptación**, contra Supabase dev con los usuarios de prueba y curl:

1. El entrenador lista a sus alumnos y ve `last_session_at`.
2. Pide un alumno de otro entrenador y recibe 403.
3. Carga tres medidas y las recupera ordenadas.
4. Da de baja a la alumna: el login de ella responde `ACCOUNT_DISABLED`. La reactiva y el login vuelve a andar.

**Antes de darla por terminada:** `npm run lint` y `npm test` pasan en `backend/`.

## 8. Fuera de esta tarjeta

- **Mensaje en mobile para `ACCOUNT_DISABLED`** ("Tu entrenador dio de baja tu cuenta"): unos 30 minutos, en la próxima tarjeta mobile que toque el login. Hasta entonces, la app ya cierra la sesión cuando el refresh falla.
- **Umbral de inactividad y alerta nocturna** (CU-13): se definen en su tarjeta.
- **Editar una medida** (`PATCH`): no se hace. Para corregir, se borra y se vuelve a cargar.
- **Actualizar el contrato en Notion:** no se hace, porque el plan gratis está lleno. Los cambios quedan en `backend/README.md` (§9).

## 9. Cambios al contrato, para Pablo

**Dónde quedan escritos.** Van en `backend/README.md`, en el mismo commit que el código, para que el README no documente endpoints que todavía no existen. Es el archivo que leen Pablo y su agente cuando trabajan en el backend o consumen la API desde la web:

- la tabla **Endpoints → Alumnos** suma las filas nuevas, con el rol y los permisos;
- una sección nueva, **"Desvíos respecto del contrato de API (Notion v1.1)"**, junto a la de desvíos del DER, con el punteo de abajo y la lista de lo que le toca a la web;
- el resumen va también en la descripción del PR.

No se escribe nada en archivos de configuración de agentes (`CLAUDE.md`, `AGENTS.md`). Lo que necesita el agente de Pablo está en el README, que es documentación común del repo.

**Qué cambia respecto del contrato:**

- `GET /students`: cada alumno suma `last_session_at`. **Por defecto trae solo los activos**; los dados de baja se piden con `?active=false`.
- `GET /students/:id`: forma `{ data }`. `active_routine` es `{ id, name, days }` y las medidas llevan `bmi` calculado.
- `PATCH /students/:id`: devuelve la ficha completa (`{ data }`), con la misma forma que el GET.
- `POST /students/:id/metrics`: suma `height_cm` (hace falta para el IMC) y un `id` opcional generado en el cliente. Un reintento con el mismo `id` responde 200.
- **Nuevos:** `GET /students/:id/metrics` (historial ascendente) y `DELETE /students/:id/metrics/:metricId`.
- Login: un alumno dado de baja recibe `401 ACCOUNT_DISABLED`. Su refresh falla con `401 UNAUTHORIZED` porque la baja revoca sus tokens; el cliente lo trata como cierre de sesión.

**Lo que le toca a la web (Pablo), cuando arme estas pantallas:**

- **Panel de alumnos:** mostrar `last_session_at`, con "Nunca entrenó" si es `null`. Sumar un filtro o una pestaña "Dados de baja" que pida `?active=false`, porque el listado ya no los trae por defecto.
- **Ficha del alumno:**
  - mostrar y editar `gym_equipment` (lista de textos), `injuries` y `level`;
  - en el alta o la edición, pedir que se completen, porque sin esos datos los asistentes IA del S4 sugieren cualquier cosa;
  - mostrar `latest_metrics` (con `bmi`) y `active_routine`, y contemplar que cualquiera de los dos venga en `null`.
- **Dar de baja o reactivar:** es un `PATCH` con `active: false` o `true`. Conviene pedir confirmación, porque la baja cierra las sesiones del alumno; puede seguir usando la app hasta 1 h más.
- **Medidas:**
  - mostrar el historial con `GET /students/:id/metrics`, que ya viene ordenado de la más vieja a la más nueva, listo para graficar;
  - cargar con `POST`, mandando al menos una medida;
  - borrar con `DELETE`;
  - no hay edición: para corregir, se borra y se vuelve a cargar;
  - el IMC no se calcula en la web: viene en `bmi` y puede ser `null`.
- **Login web:** si un alumno entra por la web, mostrar un mensaje claro cuando llega `ACCOUNT_DISABLED`.
