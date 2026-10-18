---
title: Plan de Pruebas — FitTrainer
aliases: [Plan de Pruebas — FitTrainer]
notion: https://app.notion.com/p/33c5ffbef7b581798c54e8c3e85a4125
notion_editado: 2026-05-01
migrado: 2026-10-17
tags: [proceso]
---

# Plan de Pruebas — FitTrainer

Documento que define la estrategia, tipos, casos y criterios de aceptación para las pruebas del sistema FitTrainer (web + Android).

---

## 1. Objetivos

- Garantizar que las funcionalidades core (auth, invitaciones, rutinas, sesiones, progreso, IA, gamificación) funcionen correctamente en ambas plataformas y para ambos roles.
- Detectar regresiones antes de cada entrega.
- Validar la experiencia de usuario en los dos roles (Trainer y Alumno) **en ambos clientes** (web y mobile), confirmando paridad funcional.
- Verificar comportamiento del modo offline en sesiones de entrenamiento.
- Verificar que ambos asistentes IA respondan dentro de los timeouts establecidos y manejen fallbacks correctamente.
- Verificar tests cruzados: alumno usando la web, entrenador usando la mobile.

---

## 2. Alcance

| Incluido | Excluido |
|---|---|
| Auth (registro, login, roles) | Tests de carga/stress masivos |
| Invitaciones por WhatsApp y QR | Tests de penetración |
| CRUD de alumnos (web) | Compatibilidad con iOS |
| CRUD de ejercicios y rutinas |  |
| Plantillas de rutinas |  |
| Asistente IA del entrenador (generación de rutinas) |  |
| Asistente IA del alumno (en sesión) |  |
| Registro de sesiones (Android, online y offline) |  |
| Sustitución de ejercicios en sesión |  |
| Dashboard de progreso (web) |  |
| Sistema de gamificación (logros, rachas, challenges) |  |
| Notificaciones por inactividad y modificaciones |  |

---

## 3. Tipos de Pruebas

### 3.1 Pruebas Unitarias

**Herramientas:** Jest (backend Node.js), React Testing Library (frontend), JUnit + MockK (Android)

| ID | Módulo | Función a probar | Entrada | Resultado esperado |
|---|---|---|---|---|
| UT-01 | Auth | `hashPassword()` | String plano | String hasheado ≠ entrada |
| UT-02 | Auth | `verifyToken()` | JWT válido | `{ userId, role }` |
| UT-03 | Auth | `verifyToken()` | JWT expirado | Lanza error `TOKEN_EXPIRED` |
| UT-04 | Rutinas | `calcularVolumenSesion()` | Array de series | Número total (series × reps × kg) |
| UT-05 | Rutinas | `validarEjercicio()` | Objeto sin nombre | Lanza error de validación |
| UT-06 | Invitaciones | `buildWhatsAppDeepLink()` | Teléfono + URL | String `wa.me/<phone>?text=<encoded>` |
| UT-07 | Invitaciones | `generateQRBase64()` | URL de invitación | String base64 PNG válido |
| UT-08 | Progreso | `calcularProgresion()` | Historial de cargas | Porcentaje de mejora |
| UT-09 | Progreso | `detectarPR()` | Serie nueva + historial | True si supera el récord previo |
| UT-10 | Gamificación | `calcularStreakDias()` | Array de fechas de sesiones | Número de días consecutivos hasta hoy |
| UT-11 | Gamificación | `evaluarCriteriosLogro()` | Achievement.criteria + datos del alumno | True si cumple, False si no |
| UT-12 | Gamificación | `actualizarProgresoChallenge()` | Sesión finalizada + challenge activo | current_progress incrementado correctamente |
| UT-13 | TrainerAI | `buildPromptForRoutineGeneration()` | Parámetros del alumno + biblioteca | String con prompt estructurado |
| UT-14 | TrainerAI | `parseRoutineFromAIResponse()` | JSON del LLM | Estructura validada de rutina o error |
| UT-15 | StudentAI | `buildContextForChat()` | Sesión activa | Objeto con contexto enriquecido para n8n |

### 3.2 Pruebas de Integración

**Herramientas:** Supertest (API REST)

| ID | Endpoint | Método | Descripción | Resultado esperado |
|---|---|---|---|---|
| IT-01 | `/api/auth/register` | POST | Registro con datos válidos | 201 + token JWT |
| IT-02 | `/api/auth/register` | POST | Email ya registrado | 409 Conflict |
| IT-03 | `/api/auth/login` | POST | Credenciales correctas | 200 + token JWT |
| IT-04 | `/api/auth/login` | POST | Contraseña incorrecta | 401 Unauthorized |
| IT-05 | `/api/invitations` | POST | Crear invitación canal QR | 201 + qr_base64 incluido |
| IT-06 | `/api/invitations` | POST | Crear invitación canal WhatsApp | 201 + whatsapp_share_url |
| IT-07 | `/api/invitations` | POST | Canal both sin teléfono | 400 VALIDATION_ERROR |
| IT-08 | `/api/invitations/:token` | GET | Token válido | 200 + datos precargados |
| IT-09 | `/api/invitations/:token` | GET | Token expirado | 410 INVITATION_EXPIRED |
| IT-10 | `/api/students` | GET | Trainer autenticado | 200 + lista de alumnos |
| IT-11 | `/api/students` | GET | Sin token | 401 Unauthorized |
| IT-12 | `/api/students` | GET | Alumno autenticado intenta listar | 403 Forbidden |
| IT-13 | `/api/routines` | POST | Crear rutina válida | 201 + rutina creada |
| IT-14 | `/api/sessions` | POST | Iniciar sesión | 201 + session_id |
| IT-15 | `/api/session-sets` | POST | Batch con sustitución de ejercicio | 201 + sessions.has_modifications=true |
| IT-16 | `/api/progress/exercise/:id` | GET | Trainer ve progreso de su alumno | 200 + datos |
| IT-17 | `/api/progress/exercise/:id` | GET | Trainer ve alumno ajeno | 403 Forbidden |
| IT-18 | `/api/trainer-ai/generate-routine` | POST | Solicitud válida con todos los parámetros | 200 + routine_proposal estructurada |
| IT-19 | `/api/trainer-ai/generate-routine` | POST | n8n inalcanzable (mock timeout) | 503 AI_UNAVAILABLE |
| IT-20 | `/api/trainer-ai/refine` | POST | Refinar generación previa | 200 + nueva propuesta |
| IT-21 | `/api/chat` | POST | Mensaje con sesión activa | 200 + respuesta IA |
| IT-22 | `/api/chat` | POST | Sesión finalizada | 400 SESSION_FINISHED |
| IT-23 | `/api/students/:id/achievements` | GET | Alumno con logros desbloqueados | 200 + lista poblada |
| IT-24 | `/api/students/:id/streak` | GET | Alumno con sesiones consecutivas | 200 + current_streak_days correcto |
| IT-25 | `/api/challenges` | POST | Trainer crea challenge personalizado | 201 + challenge creado |
| IT-26 | `/api/students/:id/challenges` | POST | Asignar challenge al alumno | 201 + status=active |

### 3.3 Pruebas End-to-End (E2E)

**Herramientas:** Playwright (web), pruebas manuales guiadas y Espresso (Android)

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
| E2E-11 | Sustituir ejercicio en sesión y notificar al PT | Android + Web | session_sets.substituted_exercise_id ≠ null + notificación al PT |
| E2E-12 | Ver progreso del alumno | Web | Gráfico con historial de cargas y modificaciones |
| E2E-13 | Usar asistente IA del alumno | Android | Sugerencia coherente del chatbot, opción de aplicarla |
| E2E-14 | Asistente IA del alumno offline | Android | Mensaje claro de no disponibilidad sin romper la sesión |
| E2E-15 | Desbloquear logro de racha | Android | Notificación visual al alumno + registro en student_achievements |
| E2E-16 | Cumplir challenge asignado | Android + Web | Status pasa a completed, alumno notificado, PT notificado |
| E2E-17 | Notificación de alumno inactivo | Web | El PT recibe la notificación tras N días sin sesiones |
| E2E-18 | **Cruzado:** alumno entra desde la web y registra una sesión | Web (rol alumno) | La sesión se guarda igual que desde mobile, queda visible en el dashboard del PT |
| E2E-19 | **Cruzado:** entrenador usa la mobile para responder mensajes y dejar comentarios | Android (rol PT) | El comentario aparece en la sesión del alumno, el alumno recibe notificación |
| E2E-20 | **Cruzado:** entrenador genera rutina con IA desde la mobile | Android (rol PT) | La propuesta IA llega correctamente al cliente mobile, el PT puede editarla y asignarla |
| E2E-21 | **Cruzado:** mismo usuario entra desde web y mobile en sesiones distintas | Web + Android | Los datos están sincronizados, la sesión iniciada en una plataforma puede continuarse en la otra |

### 3.4 Pruebas de Regresión

Se ejecutan automáticamente (CI) antes de cada merge a `main`. Incluyen todos los unit tests e integración. Las E2E corren manualmente antes de cada entrega.

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

- ✅ 100% de pruebas unitarias pasando
- ✅ 100% de pruebas de integración críticas (IT-01 al IT-12, IT-18, IT-21) pasando
- ✅ Los 17 flujos E2E completados sin errores bloqueantes
- ✅ Tiempo de respuesta de la API < 500ms en endpoints CRUD bajo carga normal
- ✅ Asistente IA del entrenador responde en < 30s en el 95% de los casos
- ✅ Asistente IA del alumno responde en < 10s en el 95% de los casos
- ✅ Modo offline: 0 pérdida de datos al sincronizar
- ✅ La app Android funciona en Android 9+ (API 28+)

---

## 5. Ambiente de Pruebas

| Ambiente | Descripción | URL/Acceso |
|---|---|---|
| Local | Desarrollo, tests unitarios e integración | `localhost:3001` |
| Staging | Pruebas E2E, n8n con LLM mockeado, pre-entrega | Supabase proyecto `fittrainer-dev` |
| Producción | Demo final | A definir |

---

## 6. Datos de Prueba

**Trainer de prueba:**

- Email: `trainer@test.com` / Password: `Test1234!`
- Alumnos pre-cargados: 3 (con historial de 4 semanas, 1 con racha activa)
- Plantillas pre-cargadas: 2 (1 manual, 1 generada por IA)

**Alumno de prueba:**

- Email: `alumno@test.com` / Password: `Test1234!`
- Rutina asignada: "Hipertrofia 4 días — intermedio"
- Logros desbloqueados: 2 (`STREAK_7_DAYS`, `MILESTONE_10`)
- Challenge activo: "12 sesiones en 30 días" (al 50% de progreso)

---

## 7. Responsables y Cronograma

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
