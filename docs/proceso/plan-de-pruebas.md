---
title: Plan de Pruebas — FitTrainer
aliases: [Plan de Pruebas — FitTrainer]
notion: https://app.notion.com/p/33c5ffbef7b581798c54e8c3e85a4125
notion_editado: 2026-05-01
migrado: 2026-10-17
actualizado: 2026-11-05
tags: [proceso]
---

# Plan de Pruebas — FitTrainer

Documento que define la estrategia, tipos, casos y criterios de aceptación para las pruebas del sistema FitTrainer (web + Android). Desde la tarjeta 52 cada caso automatizado lleva su **Resultado** (✅ pasa, ❌ falla, ⚠️ sin cobertura automática o pendiente) y su **Evidencia** (archivo de test y fecha de la corrida). La evidencia vive acá: Notion queda como copia de lectura.

---

## 1. Objetivos

- Garantizar que las funcionalidades core (auth, invitaciones, rutinas, sesiones, progreso, IA, gamificación) funcionen correctamente en ambas plataformas y para ambos roles.
- Detectar regresiones antes de cada entrega.
- Validar la experiencia de usuario en los dos roles (Trainer y Alumno) **en ambos clientes** (web y mobile), verificando que el alumno tenga en la web lo central (rutina del día, sesión simplificada, historial, progreso, logros y medidas) y que lo que queda solo en el celular esté documentado.
- Verificar que un usuario nunca vea ni modifique datos de otro entrenador o de otro alumno (aislamiento).
- Verificar comportamiento del modo offline en sesiones de entrenamiento.
- Verificar que ambos asistentes IA respondan dentro de los timeouts establecidos y manejen fallbacks correctamente.
- Verificar tests cruzados: alumno usando la web, entrenador usando la mobile.

---

## 2. Alcance

| Incluido | Excluido |
|---|---|
| Auth (registro, login, roles) | Tests de carga/stress masivos (tarjeta 24) |
| Invitaciones por WhatsApp y QR | Tests de penetración |
| CRUD de alumnos (web) | Compatibilidad con iOS |
| CRUD de ejercicios y rutinas | Cobertura por porcentaje |
| Plantillas de rutinas |  |
| Asistente IA del entrenador (generación de rutinas) |  |
| Asistente IA del alumno (en sesión) |  |
| Registro de sesiones (Android, online y offline) |  |
| Sustitución de ejercicios en sesión |  |
| Dashboard de progreso (web) |  |
| Sistema de gamificación (logros, rachas, challenges) |  |
| Notificaciones por inactividad y modificaciones |  |
| Aislamiento entre entrenadores y entre alumnos |  |

---

## 3. Tipos de Pruebas

### 3.1 Pruebas Unitarias

**Herramientas:** Jest (backend Node.js), Vitest + React Testing Library (web), JUnit + MockK (Android).

**Cómo se corren:** `npm test` en `backend/` y en `frontend/`; las dos corren solas en el CI (§3.4). Las rutas de evidencia son relativas a `backend/tests/unit/`.

**Última corrida (03/11/2026, rama `test/backend-suite`):** backend 1181/1181 tests en 138 suites, sin `.env` (como en el CI); web 838/838 en 132 archivos con `npx vitest run --maxWorkers=2 --testTimeout=15000`, más lint y build.

#### Auth e invitaciones

| ID | Unidad | Caso | Resultado esperado | Resultado | Evidencia |
|---|---|---|---|---|---|
| UT-01 | `register` (`hashPassword`) | Registro de un trainer | Guarda el hash, nunca la contraseña plana | ✅ | `services/auth/auth.service/register-login.test.js` · 03/11 |
| UT-02 | `authenticate` (`verifyAccessToken`) | JWT válido | `req.user = { id, role, email }` | ✅ | `shared/middlewares/auth.middleware.test.js` · 04/11 |
| UT-03 | `authenticate` | JWT expirado o sin token | 401 `UNAUTHORIZED` | ✅ | `shared/middlewares/auth.middleware.test.js` (expirado, otra firma y sin Bearer) · 04/11 |
| UT-04 | `login` / `refresh` | Contraseña incorrecta, refresh expirado, cuenta dada de baja | `INVALID_CREDENTIALS` / rechazo / `ACCOUNT_DISABLED` | ✅ | `services/auth/auth.service/register-login.test.js`, `refresh-logout.test.js`, `account-disabled.test.js` · 03/11 |
| UT-05 | `createInvitation` (`buildWhatsappShareUrl`) | Canal `both` con teléfono | `https://wa.me/<phone>?text=<encoded>` | ✅ | `services/invitations/invitations.service.test.js` · 03/11 |
| UT-06 | `createInvitation` (`toQrDataUrl`) | Canal `qr` | `qr_base64` presente, sin link de WhatsApp | ✅ | `services/invitations/invitations.service.test.js` · 03/11 |
| UT-07 | `getByToken` | Invitación usada, vencida o inexistente | `INVITATION_ALREADY_USED` / `INVITATION_EXPIRED` / `INVITATION_NOT_FOUND` | ✅ | `services/invitations/invitations.service.test.js` · 03/11 |

#### Rutinas, sesiones y progreso

| ID | Unidad | Caso | Resultado esperado | Resultado | Evidencia |
|---|---|---|---|---|---|
| UT-08 | validación de ejercicios | Objeto sin nombre | Error de validación | ✅ | `validations/exercises/exercises.validation.test.js` (sin `name`, vacío, en blanco, `null`, 1 y 121 caracteres) · 04/11 |
| UT-09 | `summarizeSets` | Series de una sesión | Cantidad de series y volumen (reps × kg) | ✅ | `models/sessions/session-history.model.test.js` · 03/11 |
| UT-10 | `toProgressPoints` | Historial de series | Un punto por día argentino; e1RM Epley solo hasta 12 reps; peso corporal sin `max_kg` | ✅ | `models/progress/progress.model.test.js` · 03/11 |
| UT-11 | `computePr` | Serie nueva + historial | Récord solo si supera el previo (la primera vez no cuenta) | ✅ | `models/progress/progress.model.test.js` · 03/11 |
| UT-12 | `dayName` | 23:59 AR (02:59Z) | Todavía es el día argentino | ✅ | `models/routines/routine.model.test.js` · 03/11 |
| UT-13 | `today` (rutina del día) | Día de descanso | `null` explícito, sin consultar `last_session_kg` | ✅ | `services/routines/routines.service/update-and-today.test.js` · 03/11 |
| UT-14 | repositorio de rutinas | Dos rutinas activas el mismo día | La más reciente | ✅ | `repositories/routines/routines.repository.test.js` · 03/11 |
| UT-15 | `persistSets` | Un `update` que falla a mitad del lote | Rechaza; las series nuevas ya quedaron insertadas | ✅ | `services/sessions/persist-sets.test.js` · 03/11 |
| UT-16 | `persistSets` | Reintento del mismo lote | Completa sin duplicar; la serie que antes quedó `failed` se guarda | ✅ | `services/sessions/persist-sets.test.js` · 03/11 |
| UT-17 | lote de series | Falla a mitad en una sesión cerrada con sustitución | No marca la sesión, no evalúa logros ni dispara avisos | ✅ | `services/sessions/session-sets.service/partial-failure.test.js` · 03/11 |
| UT-18 | lote de series | Sustitución (`original_exercise_id`) | Avisa al PT con from/to; sin sustitución no avisa | ✅ | `services/sessions/session-sets.service/triggers.test.js`, `rules.test.js` · 03/11 |

#### Gamificación

| ID | Unidad | Caso | Resultado esperado | Resultado | Evidencia |
|---|---|---|---|---|---|
| UT-19 | `computeStreak` / `missedAssignedDays` | Fechas de sesiones + días asignados | Días consecutivos; solo cortan los días asignados | ✅ | `models/gamification/streak/streak.test.js`, `missed-days.test.js` · 03/11 |
| UT-20 | `meetsCriteria` / `evaluateCriteria` | `criteria` de un logro + datos del alumno | `true` si cumple, `false` si no | ✅ | `models/gamification/criteria.test.js` · 03/11 |
| UT-21 | `challengeProgress` | Sesión finalizada + desafío activo | Progreso incrementado correctamente | ✅ | `models/gamification/challenge-progress.test.js` · 03/11 |

#### Aislamiento (unitarios nuevos de la tarjeta 52)

| ID | Unidad | Caso | Resultado esperado | Resultado | Evidencia |
|---|---|---|---|---|---|
| UT-22 | `assertCanAccessStudent` | PT o alumno sobre un alumno ajeno | 403 antes de leer datos | ✅ | `services/students/student-access.service.test.js` (y los servicios que lo usan) · 03/11 |
| UT-23 | desafíos (`PATCH`/`DELETE`) | Desafío ajeno, global o inexistente | 404 `CHALLENGE_NOT_FOUND`; no se llama a update/remove | ✅ | `services/gamification/challenges.service/write.test.js` · 03/11 |
| UT-24 | desafíos del alumno | `GET /students/:id/challenges` de un alumno ajeno | 403 sin consultar sus desafíos | ✅ | `services/gamification/challenge-assignments.service.test.js` (`listForStudent`) · 03/11 |
| UT-25 | asignaciones de desafíos | Desafío ajeno | `CHALLENGE_NOT_FOUND` | ✅ | `services/gamification/challenge-assignments.service.test.js` · 03/11 |
| UT-26 | `removeToken` | `DELETE /notifications/tokens/:token` | Borra solo el token del usuario | ✅ | `services/notifications/notifications.service.test.js` · 03/11 |

#### Infraestructura de la integración

| ID | Unidad | Caso | Resultado esperado | Resultado | Evidencia |
|---|---|---|---|---|---|
| UT-27 | `assertRealSupabase` | Sin `SUPABASE_URL` real (sigue en `localhost:54321`) | Corta la suite con un mensaje claro | ✅ | `scripts/lib/qa-env.test.js` · 03/11 |
| UT-28 | `deleteQaData` | Datos de una corrida | Borra filas sin FK, después alumnos y por último el trainer (sin romper FK) | ✅ | `scripts/lib/qa-cleanup.test.js` · 03/11 |
| UT-31 | `settleInFlight` | Avisos lanzados con `void` / `runInBackground` | Espera a todos (también a los rechazados y a los que se lanzan mientras tanto) antes del borrado | ✅ | `shared/utils/async/in-flight.test.js` · 05/11 |
| UT-32 | `findOrphanRows` / `deleteOrphanRows` | Filas de `notifications`, `push_tokens` y `refresh_tokens` sin usuario | Las cuenta por tabla (paginando) y borra solo las que, releídas, siguen sin dueño | ✅ | `scripts/lib/qa-orphans.test.js` · 05/11 |

#### IA (pendiente)

| ID | Unidad | Caso | Resultado esperado | Resultado | Evidencia |
|---|---|---|---|---|---|
| UT-29 | TrainerAI | Prompt y parseo de la rutina propuesta | Estructura validada o error | ⚠️ | Pendiente (tarjeta 13) |
| UT-30 | StudentAI | Contexto de la sesión activa para n8n | Objeto con contexto enriquecido | ⚠️ | Pendiente (tarjeta 13) |

### 3.2 Pruebas de Integración

**Herramientas:** Jest + Supertest sobre `createApp()` en el mismo proceso, contra Supabase **dev** (`backend/tests/integration/`, `jest.integration.config.js`, en serie, timeout de 30 s).

**Cómo se corren:** desde `backend/`, con el `.env` de dev: `npm run test:integration` (o `-- <archivo>`). Cada corrida crea sus datos y los borra en el `afterAll`; `npm run test:integration:clean -- --check` cuenta lo que haya quedado. No corre en el CI. Las rutas de evidencia son relativas a `backend/tests/integration/` salvo las marcadas como unitario.

#### Casos por endpoint

| ID | Endpoint | Método | Descripción | Resultado esperado | Resultado | Evidencia |
|---|---|---|---|---|---|---|
| IT-01 | `/api/auth/register` | POST | Registro con datos válidos | 201 + token JWT | ✅ | `flow.int.test.js` · 04/11 |
| IT-02 | `/api/auth/register` | POST | Email ya registrado | 409 `EMAIL_ALREADY_EXISTS` | ✅ | `rejections.int.test.js` (mismo email y en mayúsculas; no crea otra cuenta) · 04/11 |
| IT-03 | `/api/auth/login` | POST | Credenciales correctas | 200 + token JWT | ✅ | `flow.int.test.js` · 04/11 |
| IT-04 | `/api/auth/login` | POST | Contraseña incorrecta | 401 | ✅ | Unitario `services/auth/auth.service/register-login.test.js` · 03/11 |
| IT-05 | `/api/invitations` | POST | Crear invitación canal QR | 201 + `qr_base64` | ✅ | `flow.int.test.js` · 04/11 |
| IT-06 | `/api/invitations` | POST | Crear invitación canal WhatsApp | 201 + `whatsapp_share_url` | ✅ | Unitario `services/invitations/invitations.service.test.js` · 03/11 |
| IT-07 | `/api/invitations` | POST | Canal `both` sin teléfono | 400 `VALIDATION_ERROR` | ✅ | `rejections.int.test.js` (sin teléfono, vacío y con menos de 8 dígitos; no guarda la invitación) · 04/11 |
| IT-08 | `/api/invitations/:token` | GET | Token válido | 200 + datos precargados | ✅ | `flow.int.test.js` · 04/11 |
| IT-09 | `/api/invitations/:token` | GET | Token expirado | 410 `INVITATION_EXPIRED` | ✅ | Unitario `services/invitations/invitations.service.test.js` · 03/11 |
| IT-10 | `/api/students` | GET | Trainer autenticado | 200 + lista de alumnos | ✅ | `smoke.int.test.js`, `isolation/lists.int.test.js` · 04/11 |
| IT-11 | `/api/students` | GET | Sin token | 401 | ✅ | Unitario `routes/messages/messages.routes/messages.http.test.js` (mismo middleware) · 03/11 |
| IT-12 | `/api/students` | GET | Alumno autenticado intenta listar | 403 `FORBIDDEN` | ✅ | `isolation/wrong-role.int.test.js` (#74) · 04/11 |
| IT-13 | `/api/routines` | POST | Crear rutina válida | 201 + rutina creada | ✅ | `flow.int.test.js` · 04/11 |
| IT-14 | `/api/sessions` | POST | Subir una sesión | 201 + `id` | ✅ | `flow.int.test.js`, `sets-idempotency.int.test.js` · 04/11 |
| IT-15 | `/api/sessions/:id/sets` | POST | Lote con sustitución (`original_exercise_id`) | 200 + aviso al PT con from/to | ✅ | Unitario `services/sessions/session-sets.service/triggers.test.js` · 03/11; `progress.int.test.js` (S5: `has_modifications`, el detalle agrupa D con original P y la serie suma a D, no a P) · 05/11 |
| IT-16 | `/api/progress/exercise/:id` | GET | Trainer ve progreso de su alumno | 200 + datos | ✅ | `flow.int.test.js`, `progress.int.test.js` · 04/11 |
| IT-17 | `/api/progress/exercise/:id` | GET | Trainer ve alumno ajeno | 403 | ✅ | `isolation/trainer-cross.int.test.js` (#40) · 04/11 |
| IT-18 | IA del entrenador (generar rutina) | POST | Solicitud válida | 200 + propuesta estructurada | ⚠️ | Pendiente (tarjeta 13) |
| IT-19 | IA del entrenador | POST | n8n inalcanzable | 503 `AI_UNAVAILABLE` | ⚠️ | Pendiente (tarjeta 13) |
| IT-20 | IA del entrenador (refinar) | POST | Refinar generación previa | 200 + nueva propuesta | ⚠️ | Pendiente (tarjeta 13) |
| IT-21 | Chat IA del alumno | POST | Mensaje con sesión activa | 200 + respuesta IA | ⚠️ | Pendiente (tarjeta 13) |
| IT-22 | Chat IA del alumno | POST | Sesión finalizada | 400 `SESSION_FINISHED` | ⚠️ | Pendiente (tarjeta 13) |
| IT-23 | `/api/students/:id/achievements` | GET | Alumno con logros | 200 + lista | ✅ | `flow.int.test.js` · 04/11 |
| IT-24 | `/api/students/:id/streak` | GET | Alumno con sesiones | 200 + `current_streak_days` | ✅ | `flow.int.test.js` · 04/11 |
| IT-25 | `/api/challenges` | POST | Trainer crea challenge propio | 201 + challenge creado | ✅ | `isolation/*` (lo arma `buildWorld`) · 04/11 |
| IT-26 | `/api/challenges/:id/assignments` | POST | Asignar challenge a sus alumnos | 201 | ✅ | `isolation/lists.int.test.js` (IT-26: `created` con la asignación de su alumno, `skipped` vacío) · 05/11 |

#### Flujo, idempotencia y progreso

| ID | Archivo | Qué cubre | Casos | Resultado | Evidencia |
|---|---|---|---|---|---|
| IT-27 | `smoke.int.test.js` | PT recién registrado lista alumnos vacío; el alumno ve su perfil; la limpieza borra la corrida y es idempotente | 3 | ✅ | 3/3 · 04/11 |
| IT-28 | `flow.int.test.js` | PT se registra → invita por QR → alta del alumno → ejercicio y rutina → rutina de hoy y las suyas → sesión con 3 series → historial y detalle → progreso y resumen → comentario del PT → racha y logros | 10 | ✅ | 10/10 · 04/11 |
| IT-29 | `sets-idempotency.int.test.js` | `POST /sessions` con reintento; mismo lote dos veces (3 series, no 6); id repetido en el lote; serie con ejercicio inexistente y reintento corregido; el alumno B no reusa ids de A | 5 | ✅ | 5/5 · 04/11 |
| IT-30 | `progress.int.test.js` | Tres semanas con números calculados a mano: e1RM Epley, serie de 13 reps, peso corporal, semana vacía, sesión cerca de la medianoche AR, `weekly_volume`, récords, `last_session_kg` y una serie sustituida (planificado P, hecho D) que suma a D y no a P | 8 | ✅ | 8/8 · 05/11 |

#### Aislamiento (dos PT, cada uno con un alumno)

Cada fila de la tabla de la tarea 9 del plan es un caso `it.each` con el código del contrato (403 o 404) y la verificación de que el cuerpo no trae ningún id del otro mundo. Los GET suman un control positivo (el dueño sí accede) para que un 403 no sea un error del test. Sin hallazgos: ningún 200 con datos ajenos.

| ID | Grupo (filas del plan) | Endpoints | Casos | Resultado | Evidencia |
|---|---|---|---|---|---|
| IT-31 | PT B sobre datos de A (1–48) | alumnos, medidas, asistencia, sesiones y comentarios, logros, racha, desafíos y asignaciones, rutinas y sus ejercicios, plantillas, ejercicios, progreso, mensajes y masivos | 48 + 18 controles | ✅ | `isolation/trainer-cross.int.test.js` · 66/66 · 04/11 |
| IT-32 | Alumno B sobre datos del alumno A (49–73) | perfil, asistencia, medidas, sesiones y series (ids de A), progreso, logros, racha, desafíos, mensajes, notificaciones y tokens push | 25 + 14 controles | ✅ | `isolation/student-cross.int.test.js` · 39/39 · 04/11 |
| IT-33 | Rol equivocado (74–93) | alumno en endpoints de PT y PT en endpoints de alumno → 403 `FORBIDDEN` aunque el recurso sea propio | 20 | ✅ | `isolation/wrong-role.int.test.js` · 20/20 · 04/11 |
| IT-34 | Listados (94–105) | 8 listados del PT B y 4 del alumno B → 200 sin nada de A; `unread-count` exacto; control positivo por listado (plantillas, ejercicios, desafíos, conversaciones y notificaciones traen lo de B); asignación de desafío (IT-26) | 14 + 6 controles + 1 | ✅ | `isolation/lists.int.test.js` · 21/21 · 05/11 |
| IT-35 | Agenda (106–113) | PT B y alumno B sobre el turno de A (`PATCH`/`POST /appointments` → 403 `FORBIDDEN` sin ningún id de A en el body, el turno de A sigue confirmado), listados de turnos y franjas solo propios, huecos libres del alumno B solo en el horario de B (A atiende 08–10 y B 18–20), alumno en `/availability` → 403; control de que A ve su turno y sus huecos | 8 (la #113 en 2 casos) + 1 control | ✅ | `isolation/agenda.int.test.js` · 10/10 · 05/11 |

### 3.3 Pruebas End-to-End (E2E)

**Herramientas:** Playwright (web), pruebas manuales guiadas y Espresso (Android). Las de la web son de la tarjeta 25.

| ID | Flujo | Plataforma | Resultado esperado |
|---|---|---|---|
| E2E-01 | Registro de trainer | Web | Redirige al dashboard |
| E2E-02 | Generar invitación por WhatsApp | Web | Se abre el deep link de WhatsApp con mensaje precargado |
| E2E-03 | Generar invitación por QR | Web | QR descargable que apunta a la URL correcta |
| E2E-04 | Generar rutina con IA y asignarla | Web | Propuesta válida, editable, asignación exitosa |
| E2E-05 | Crear y asignar rutina manual | Web | Rutina visible en perfil del alumno |
| E2E-06 | Onboarding del alumno desde QR | Android | Cuenta creada, vinculada al PT, autenticada |
| E2E-07 | Onboarding del alumno desde link de WhatsApp | Android | Cuenta creada, vinculada al PT, autenticada |
| E2E-08 | Login de alumno existente | Android | Pantalla home del alumno |
| E2E-09 | Registrar sesión completa online | Android | Sesión guardada en Supabase con todas las series |
| E2E-10 | Registrar sesión en modo offline | Android | Datos guardados localmente, sincronizados al recuperar conexión |
| E2E-11 | Sustituir ejercicio en sesión y notificar al PT | Android + Web | `session_sets.original_exercise_id` ≠ null + notificación al PT |
| E2E-12 | Ver progreso del alumno | Web | Gráfico con historial de cargas y modificaciones |
| E2E-13 | Usar asistente IA del alumno | Android | Sugerencia coherente del chatbot, opción de aplicarla |
| E2E-14 | Asistente IA del alumno offline | Android | Mensaje claro de no disponibilidad sin romper la sesión |
| E2E-15 | Desbloquear logro de racha | Android | Notificación visual al alumno + registro en `student_achievements` |
| E2E-16 | Cumplir challenge asignado | Android + Web | Status pasa a completed, alumno notificado, PT notificado |
| E2E-17 | Notificación de alumno inactivo | Web | El PT recibe la notificación tras N días sin sesiones |
| E2E-18 | **Cruzado:** alumno entra desde la web, entrena una sesión corta y la guarda | Web (rol alumno) | La sesión se guarda igual que desde mobile (mismo contrato `POST /sessions` + series), queda visible en el historial del alumno y en el dashboard del PT |
| E2E-19 | **Cruzado:** entrenador usa la mobile para responder mensajes y dejar comentarios | Android (rol PT) | El comentario aparece en la sesión del alumno, el alumno recibe notificación |
| E2E-20 | **Cruzado:** entrenador genera rutina con IA desde la mobile | Android (rol PT) | La propuesta IA llega correctamente al cliente mobile, el PT puede editarla y asignarla |
| E2E-21 | **Cruzado:** mismo usuario entra desde web y mobile en sesiones distintas | Web + Android | Los datos están sincronizados: lo que el alumno entrenó en una plataforma se ve en la otra. La sesión en curso no se continúa en la otra (la de la web vive en el navegador) |
| E2E-22 | **Portal del alumno en la web** (tarjeta 50): Hoy con la rutina del día → Empezar entrenamiento → registrar series → Terminar con RPE → ver el resumen → Historial → Mi progreso (racha y logros, con avance en los bloqueados) → Mi perfil → Registrar medición | Web (rol alumno, Supabase dev) | La sesión aparece en el historial y en el progreso, suma a la racha, la medida se ve en Mi perfil y ninguna pantalla queda en blanco. Con la red cortada al guardar, las series siguen en el navegador y Reintentar no duplica. Capturas en `docs/superpowers/specs/assets/50/` |

### 3.4 Pruebas de Regresión

El CI (`.github/workflows/ci.yml`, GitHub Actions) corre en cada PR y en cada push a `develop`, con Node 22 y sin secretos:

| Job | Carpeta | Pasos |
|---|---|---|
| `backend` | `backend/` | `npm ci` → `npm run lint` → `npm test` |
| `frontend` | `frontend/` | `npm ci` → `npm run lint` → `npx vitest run --maxWorkers=2 --testTimeout=15000` → `npm run build` |

La integración (§3.2) no corre en el CI porque necesita Supabase dev: se corre a mano antes de mergear lo que toque endpoints y se anota en §7. Mobile tampoco entra (lo corre Igna con Gradle). Las E2E corren manualmente antes de cada entrega.

### 3.5 Pruebas de Usabilidad

| ID | Escenario | Perfil del tester | Criterio de éxito |
|---|---|---|---|
| UX-01 | Generar invitación y enviarla por WhatsApp | PT sin experiencia técnica | Completa en < 1 min sin ayuda |
| UX-02 | Generar primera rutina con asistente IA | PT sin experiencia técnica | Obtiene una rutina aceptable en < 5 min |
| UX-03 | Onboarding del alumno desde QR/WhatsApp | Alumno no tech-savvy | Cuenta lista para entrenar en < 2 min |
| UX-04 | Registrar sesión en el gym | Alumno en sesión real | Registrar serie en < 3 taps |
| UX-05 | Ver progreso de alumno | Trainer | Encuentra la info en < 3 clics, navega entre alumnos sin perderse |
| UX-06 | Visibilidad de logros y rachas | Alumno | Identifica fácilmente sus logros y challenges activos |

---

## 4. Criterios de Aceptación

- ✅ 100% de pruebas unitarias pasando (backend y web, en el CI)
- ✅ 100% de pruebas de integración pasando contra Supabase dev, con `--check` = 0 al terminar
- ✅ Ningún caso de aislamiento devuelve 200 con datos de otro entrenador o de otro alumno
- ✅ Los 21 flujos E2E completados sin errores bloqueantes
- ✅ Tiempo de respuesta de la API < 500ms en endpoints CRUD bajo carga normal
- ✅ Asistente IA del entrenador responde en < 30s en el 95% de los casos
- ✅ Asistente IA del alumno responde en < 10s en el 95% de los casos
- ✅ Modo offline: 0 pérdida de datos al sincronizar
- ✅ La app Android funciona en Android 9+ (API 28+)

---

## 5. Ambiente de Pruebas

| Ambiente | Descripción | URL/Acceso |
|---|---|---|
| Local | Desarrollo y tests unitarios (sin red ni `.env`) | `localhost:3001` |
| CI | Lint, unitarios y build en cada PR | GitHub Actions (`ubuntu-latest`) |
| Integración | Supertest en proceso contra la base de dev | Supabase proyecto `fittrainer-dev` (`backend/.env`) |
| Staging | Pruebas E2E, n8n con LLM mockeado, pre-entrega | Supabase proyecto `fittrainer-dev` |
| Producción | Demo final | A definir |

---

## 6. Datos de Prueba

**Integración (automática):** cada corrida crea sus PT y alumnos con emails `it.<corrida>.<rol>@test.fittrainer.dev` y los borra al terminar, aunque fallen los tests. `npm run test:integration:clean` borra lo que haya quedado de corridas de hace más de una hora; de los usuarios solo toca trainers con email de QA. Además borra las filas de `notifications`, `push_tokens` y `refresh_tokens` cuyo `user_id` ya no está en `trainers` ni en `students` (sin FK, nadie las puede leer); `--check` las cuenta. Antes de borrar, cada `afterAll` espera a los avisos que quedaron corriendo, para que no aparezcan filas así.

**Trainer de prueba (manual):**

- Email: `trainer@test.com` / Password: `Test1234!`
- Alumnos pre-cargados: 3 (con historial de 4 semanas, 1 con racha activa)
- Plantillas pre-cargadas: 2 (1 manual, 1 generada por IA)

**Alumno de prueba (manual):**

- Email: `alumno@test.com` / Password: `Test1234!`
- Rutina asignada: "Hipertrofia 4 días — intermedio"
- Logros desbloqueados: 2 (`STREAK_7_DAYS`, `MILESTONE_10`)
- Challenge activo: "12 sesiones en 30 días" (al 50% de progreso)

---

## 7. Corridas de integración

| Fecha | Commit | Alcance | Resultado | Duración | `--check` |
|---|---|---|---|---|---|
| 04/11/2026 | `999bdfe` | `flow` | ✅ 10/10 | 17,7 s | 0 |
| 04/11/2026 | `435780f` | `sets-idempotency` | ✅ 5/5 | 26,4 s | 0 |
| 04/11/2026 | `d25d75f` | `progress` | ✅ 7/7 | 27,2 s | 0 |
| 04/11/2026 | `a9bb46c` | Suite completa (8 archivos) | ✅ 164/164 | 186 s | 0 |
| 04/11/2026 | `cd437ba` | Suite completa (9 archivos, suma `rejections`) | ✅ 168/168 | 193 s | 0 |
| 05/11/2026 | `8ef9fa5` | Suite completa con `develop` traído (#70–#75) | ✅ 168/168 | 208 s | 0 |
| 05/11/2026 | `751e605` | Suite completa con la agenda (#49) y `isolation/agenda` | ✅ 178/178 | 219 s | 0 |
| 05/11/2026 | `52465a3` | **Corrida final** sobre `develop` con la #49 mergeada, guard solo contra dev y rechazos sin ids de A | ✅ 178/178 | 220 s | 0 |
| 05/11/2026 | `633fdec` | Review de la #76: teardown que espera los avisos, serie sustituida, agenda con `expectNoLeak`, controles por listado e IT-26 (dos corridas) | ✅ 186/186 y 186/186 | 334 s y 310 s | 0 QA y 0 filas sin dueño |

Fechas en UTC (en Argentina fue la noche del 03/11). La corrida final de la tarjeta 52 es la de `52465a3`.

---

## 8. Limitaciones conocidas

| Tema | Qué pasa | Cómo se ve en los tests |
|---|---|---|
| Racha | Se recalcula con los días asignados **de hoy** (`findAssignedDays`): si el PT cambia los días de la rutina, la racha pasada se mide con los días nuevos. | `models/gamification/streak/*.test.js` usan los días que reciben; no hay historial de días asignados. |
| Lote de series | `POST /sessions/:id/sets` no es transaccional: si un `update` falla a mitad, responde 500 y lo ya insertado queda guardado. El reintento del mismo lote completa sin duplicar. | `services/sessions/persist-sets.test.js`, `session-sets.service/partial-failure.test.js`. |
| Turnos (#49) | `GET /appointments` no está paginado: trae todo el rango `from`/`to` pedido. | Sin test de volumen (tarjeta 24). |

---

## 9. Responsables y Cronograma

| Fase | Responsable | Semana estimada |
|---|---|---|
| Tests unitarios backend | Ignacio | Semana 6-7 |
| Tests integración API | Ignacio | Semana 8 |
| Tests módulos IA (mocking de n8n) | Ignacio | Semana 9 |
| Tests gamificación | Ignacio | Semana 10 |
| Tests E2E web | Ignacio / Pablo | Semana 13 |
| Tests E2E Android (modo offline incluido) | Pablo | Semana 13-14 |
| Pruebas de usabilidad | Ambos | Semana 14 |
| Corrección de bugs | Ambos | Semana 15 |
