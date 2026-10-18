---
title: Plan de desarrollo
aliases: [Plan de desarrollo]
notion: https://app.notion.com/p/33c5ffbef7b5813081dfcd994047276f
notion_editado: 2026-06-20
migrado: 2026-10-17
tags: [proceso]
---

# Plan de desarrollo

Hoja de ruta completa para construir FitTrainer desde cero hasta la demo final.

| Campo | Detalle |
|---|---|
| Duración estimada | 14 semanas (~3.5 meses) |
| Total de tareas | 42 |
| Fases | 4 |
| MVP listo en | ~10 semanas (fases 1–3) |

> Las tareas marcadas como **MVP** son las mínimas para que la app funcione y puedas defenderla. Todo lo demás es iteración.

**Etiquetas de capa:**

- `Back` — Node.js/Express
- `Web` — React (dashboard del PT)
- `Mobile` — Android nativo (Kotlin + Jetpack Compose)
- `DB` — Supabase / PostgreSQL
- `Infra` — Docker, VPS, CI/CD, n8n

---

## Fase 1 — Infraestructura, auth y QR

**Duración:** 2–3 semanas · **Tipo:** MVP

**Criterio de done:** El PT puede registrarse, loguearse y generar un QR funcional. El alumno puede escanearlo y quedar registrado con sus datos precargados.

### Infraestructura y base

| Capa | MVP | Tarea |
|---|---|---|
| Infra | ✅ | **Setup del proyecto** — repo Git, estructura de carpetas (modules/shared), ESLint + Prettier, variables de entorno |
| DB | ✅ | **Crear proyecto Supabase** — tablas trainers, students, invitations con RLS habilitado |
| Infra | ✅ | **Docker Compose local** — contenedores para backend + Supabase local para desarrollo |
| Infra | ✅ | **Deploy inicial en VPS** — Nginx + Docker, HTTPS con Let's Encrypt, GitHub Actions para CI/CD |

### Autenticación

| Capa | MVP | Tarea |
|---|---|---|
| Back | ✅ | **Módulo auth** — registro de trainer (POST /auth/register), login (POST /auth/login), refresh token |
| Back | ✅ | **Middleware JWT** — validación de token en cada request, extracción de [user.id](http://user.id) y user.role |
| Web | ✅ | **Pantallas de auth (web)** — login y registro del PT, manejo de tokens en localStorage, redirect al dashboard |
| Mobile | ✅ | **Pantallas de auth (mobile)** — login del alumno, almacenamiento seguro del JWT con EncryptedSharedPreferences |

### Onboarding por QR

| Capa | MVP | Tarea |
|---|---|---|
| Back | ✅ | **POST /invitations** — genera token UUID, guarda en DB con expires_at = now + 48hs, retorna QR en base64 |
| Back | ✅ | **GET /invitations/:token** — valida token (existe, no usado, no vencido), retorna datos precargados |
| Back | ✅ | **POST /students** — crea alumno desde token, marca used_at, retorna JWT de sesión |
| Web | ✅ | **UI generación de QR (web)** — formulario de nuevo alumno, render del QR descargable con qrcode.js |
| Mobile | ✅ | **Flujo de escaneo (mobile)** — CameraX + ML Kit Barcode Scanning para leer QR, pantalla de confirmación de datos, elección de contraseña |

---

## Fase 2 — Rutinas y biblioteca de ejercicios

**Duración:** 2–3 semanas · **Tipo:** MVP

**Criterio de done:** El PT puede crear una rutina con ejercicios y asignarla a un alumno. El alumno puede ver su rutina del día en la app.

### Ejercicios

| Capa | MVP | Tarea |
|---|---|---|
| DB | ✅ | **Tabla exercises** — seed con ~50 ejercicios globales (is_global = true) organizados por grupo muscular |
| Back | ✅ | **CRUD /exercises** — GET (con filtro por músculo/trainer), POST, PATCH, DELETE. Solo el trainer dueño puede modificar los suyos. |
| Web | ✅ | **Biblioteca de ejercicios (web)** — listado filtrable por músculo/equipamiento, modal para crear ejercicio propio, soporte de video URL |

### Rutinas

| Capa | MVP | Tarea |
|---|---|---|
| DB | ✅ | **Tablas routines + routine_exercises** — con índices en student_id y trainer_id |
| Back | ✅ | **POST /routines** — crea rutina con validación (alumno pertenece al PT, al menos 1 ejercicio) |
| Back | ✅ | **POST /routines/:id/exercises** — agrega ejercicios con sets/reps/descanso/tempo/peso sugerido/orden |
| Back | ✅ | **GET /routines/today** — retorna la rutina activa del alumno para el día actual según el campo days[] |
| Back | ➖ | **GET /routines (templates)** — lista rutinas del trainer para reutilizar como plantilla |
| Web | ✅ | **UI crear rutina (web)** — formulario con drag & drop para ordenar ejercicios, selector de días, peso sugerido por ejercicio |
| Mobile | ✅ | **Pantalla rutina del día (mobile)** — lista de ejercicios con series, reps, descanso y peso sugerido. Cacheado localmente con Room / DataStore. |

### Perfil del alumno

| Capa | MVP | Tarea |
|---|---|---|
| DB | ✅ | **Tabla body_metrics** — migración con índice en student_id + recorded_at |
| Back | ✅ | **CRUD /students + /body-metrics** — gestión de perfil físico del alumno, historial de medidas |
| Web | ✅ | **Panel de alumnos (web)** — lista de alumnos con foto, objetivo, última sesión y badge de inactivo |

---

## Fase 3 — Sesiones, tracking y progreso

**Duración:** 3–4 semanas · **Tipo:** MVP

**Criterio de done:** El alumno puede ejecutar una sesión completa, registrar pesos por serie y el PT puede ver el historial y progresión de cargas del alumno.

### Ejecución de sesión

| Capa | MVP | Tarea |
|---|---|---|
| DB | ✅ | **Tablas sessions + session_sets** — con índices en student_id + started_at |
| Back | ✅ | **POST /sessions** — inicia sesión, registra started_at |
| Back | ✅ | **POST /session-sets** — registra cada serie (peso real, reps reales, completed). Acepta batch para sync offline. |
| Back | ✅ | **PATCH /sessions/:id** — finaliza sesión con finished_at, rpe y notes del alumno |
| Mobile | ✅ | **Pantalla de sesión activa (mobile)** — flujo ejercicio → serie → input peso/reps → timer → siguiente serie |
| Mobile | ✅ | **Timer de descanso (mobile)** — countdown con vibración/notificación al terminar, skip y pause |
| Mobile | ✅ | **Modo offline (mobile)** — cola de session_sets en Room (base de datos local), sync automática al recuperar red con WorkManager |
| Mobile | ➖ | **Pantalla de feedback post-sesión (mobile)** — slider RPE 1–10, campo de nota libre |

### Historial y progreso

| Capa | MVP | Tarea |
|---|---|---|
| Back | ✅ | **GET /students/:id/sessions** — historial paginado con duración, RPE y resumen de volumen |
| Back | ✅ | **GET /progress/exercise/:exerciseId** — curva de progresión de carga agrupada por fecha |
| Back | ➖ | **GET /progress/body/:studentId** — evolución de peso corporal y medidas a lo largo del tiempo |
| Web | ✅ | **Vista de progreso del alumno (web)** — gráfico con Recharts, tabla de sesiones recientes, comentario del PT |
| Mobile | ✅ | **Historial en mobile** — lista de sesiones pasadas, detalle por sesión con todos los sets ejecutados |
| Mobile | ➖ | **Gráficos de progreso (mobile)** — curva de carga por ejercicio con MPAndroidChart / Compose charts |

---

## Fase 4 — Features avanzados

**Duración:** 3–4 semanas · **Tipo:** Iteración post-MVP

**Criterio de done:** El asistente IA responde en sesión, el PT recibe alertas de inactividad, el alumno puede agendar turnos y el sistema está listo para demo.

### Chat IA con n8n

| Capa | Tarea |
|---|---|
| Infra | **Setup n8n** — instancia self-hosted en VPS, webhook endpoint, variables de entorno con API key del LLM |
| Infra | **Workflow n8n** — recibe contexto (ejercicio, músculo, equipamiento), arma prompt, llama al LLM, retorna respuesta formateada |
| DB | **Tabla chat_messages** — migración con role enum (user/assistant), índice en session_id |
| Back | **POST /chat** — recibe mensaje + session_id, obtiene contexto, llama webhook n8n, guarda en chat_messages, retorna respuesta |
| Mobile | **UI chat IA (mobile)** — botón dentro de cada ejercicio, pantalla estilo bubble, timeout 10s con mensaje de error amigable |

### Notificaciones push

| Capa | Tarea |
|---|---|
| Infra | **Setup FCM (Firebase Cloud Messaging)** — registro de push token del dispositivo en la tabla students |
| Back | **Cron job de inactividad** — job nocturno que detecta alumnos sin sesión en N días y notifica al PT vía FCM |
| DB | **Tabla notifications** — registro de todas las notificaciones con estado read/unread |
| Mobile | **Centro de notificaciones (mobile)** — campana con badge, lista de notificaciones, marcar como leída |

### Agenda y turnos

| Capa | Tarea |
|---|---|
| DB | **Tabla appointments** — con status enum (pending/confirmed/cancelled) |
| Back | **CRUD /appointments** — el alumno crea solicitud, el PT confirma o cancela, push en cada cambio de estado |
| Web | **Calendario del PT (web)** — vista semanal con todos los turnos, confirmar/cancelar desde el calendario |
| Mobile | **Solicitud de turno (mobile)** — el alumno ve disponibilidad del PT y pide un horario |

### Pulido final y demo

| Capa | Tarea |
|---|---|
| Mobile | **Logros y rachas** — racha de días entrenados, badges de PR y semanas consecutivas |
| Web + Mobile | **Mensajería interna** — chat uno a uno PT–alumno con soporte de imágenes |
| Infra | **Testing de carga y seguridad** — pruebas con k6, validar RLS de Supabase, headers HTTP (CORS, helmet) |
| Infra | **APK de demo** — build de producción con Gradle (Android Studio), instalable para mostrar en la defensa |

> [!info] Las tareas viven en el tablero de Trello "FitTrainer — Desarrollo · Igna + Pablo".
