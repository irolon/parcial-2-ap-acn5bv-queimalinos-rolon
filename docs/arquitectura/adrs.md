---
title: Architecture Decision Records (ADRs)
aliases: [Architecture Decision Records (ADRs)]
notion: https://app.notion.com/p/33c5ffbef7b5810cbe81e4d8a0a76fc3
notion_editado: 2026-10-13
migrado: 2026-10-17
tags: [arquitectura]
---

# Architecture Decision Records (ADRs)

Registro de decisiones de arquitectura del proyecto FitTrainer. Cada ADR documenta una decisión significativa: el contexto, las opciones evaluadas, la decisión tomada y sus consecuencias.

> **Convención de estados:** 🟢 Aceptado | 🟡 En revisión | 🔴 Reemplazado | ⚪ Deprecado

---

## ADR-001 — Selección de base de datos

**Estado:** 🟢 Aceptado

**Fecha:** Marzo 2026

**Decidido por:** Ignacio Rolon, Pablo Queimaliños

### Contexto

El proyecto necesita persistencia de datos para dos plataformas (web y Android) con sincronización en tiempo real y autenticación integrada. El equipo tiene experiencia previa con Supabase en otros proyectos.

### Opciones evaluadas

| Opción | Pros | Contras |
|---|---|---|
| Firebase Firestore | Real-time out-of-the-box, SDK Android maduro | NoSQL (modelo de datos menos intuitivo), vendor lock-in Google, consultas complejas limitadas |
| **Supabase (PostgreSQL)** | SQL estándar, RLS nativa, Auth incluido, open-source, experiencia previa del equipo | Real-time requiere configuración extra |
| MongoDB Atlas | Flexible, bien documentado | Sin RLS nativa, auth externo requerido |

### Decisión

**Supabase con PostgreSQL.**

### Justificación

- El equipo ya tiene experiencia con Supabase en proyectos previos (ContaLab).
- PostgreSQL permite relaciones complejas entre entidades (trainer → clientes → rutinas → sesiones) de forma natural.
- Row Level Security (RLS) simplifica el control de acceso sin lógica adicional en el backend. ⚠️ Revisado 12/10/2026 (ADR 0001 del repo, docs/adr/`0001-autorizacion-en-services-rls-deny-all.md`): como solo el backend accede a la base con la service_role key, el RLS no aplica a sus queries. Se usa RLS activado SIN políticas (deny-all para anon/authenticated) y la autorización por ownership vive en la capa Service.
- Supabase Auth evita implementar un sistema de autenticación desde cero. ⚠️ Revisado: finalmente no se usa Supabase Auth (ver ADR-005).
- Open-source: se puede migrar a self-hosted si es necesario.

### Consecuencias

- ➕ Consultas SQL expresivas y fáciles de auditar.
- ➕ RLS bloquea todo acceso directo a la base que no venga del backend (deny-all). El aislamiento entre trainers lo garantiza la capa Service, con tests de ownership.
- ➖ El SDK de Supabase para Android (Kotlin) es menos maduro que el de Firebase; requiere usar la API REST directamente o el cliente oficial.
- ➖ El real-time de Supabase usa websockets (Realtime channels) — funciona bien pero hay que configurarlo explícitamente.

---

## ADR-002 — Arquitectura del backend

**Estado:** 🟢 Aceptado

**Fecha:** Marzo 2026

**Decidido por:** Ignacio Rolon, Pablo Queimaliños

### Contexto

Se necesita decidir cómo estructurar el backend de la aplicación y si tener un servidor propio o delegar toda la lógica a Supabase directamente.

### Opciones evaluadas

| Opción | Pros | Contras |
|---|---|---|
| Solo Supabase (sin backend propio) | Cero infraestructura, RLS hace el trabajo | Lógica de negocio en el cliente o en funciones Edge, dificulta testing |
| **Node.js + Express (monolito modular)** | Control total, fácil de testear, patrón conocido por el equipo | Requiere deploy propio |
| NestJS | Muy estructurado, DI, decoradores | Curva de aprendizaje alta, overkill para este scope |

### Decisión

**Node.js + Express con patrón Controller → Service → Repository.**

### Justificación

- El equipo tiene experiencia con Express (proyectos anteriores en la facultad y en la agencia).
- El patrón Controller/Service permite testear la lógica de negocio de forma aislada.
- Centralizar la lógica en el backend evita duplicar validaciones en el cliente web y en la app Android.
- Más fácil de extender con middlewares (auth, rate limiting, logging).

### Consecuencias

- ➕ Un solo punto de entrada para ambas plataformas (web y Android).
- ➕ Lógica de negocio testeable con Jest + Supertest.
- ➖ Requiere deploy del servidor (VPS o Railway).
- ➖ La comunicación Android → API REST necesita manejo de errores de red robusto.

---

## ADR-003 — Plataforma de la app móvil

**Estado:** 🟢 Aceptado

**Fecha:** Marzo 2026 · Actualizado Mayo 2026

**Decidido por:** Ignacio Rolon, Pablo Queimaliños

### Contexto

El proyecto requiere una app móvil para Android que soporte a ambos roles del sistema (entrenador y alumno) con paridad funcional respecto a la web. Ambos roles pueden acceder desde cualquiera de las dos plataformas; la mobile no es exclusiva del alumno aunque represente su caso de uso principal. Se debe decidir entre desarrollo nativo o multiplataforma.

### Opciones evaluadas

| Opción | Pros | Contras |
|---|---|---|
| **Kotlin + Jetpack Compose (nativo)** | Performance óptima, acceso a APIs del sistema, curriculum valorado en el mercado | Solo Android, curva más lenta para quién no conoce Kotlin |
| React Native (Expo) | Reutiliza conocimiento de React, multiplataforma | Performance inferior, abstracción adicional, emulador más lento |
| Flutter | Buen performance, UI consistente | Lenguaje Dart nuevo para el equipo |

### Decisión

**Kotlin + Jetpack Compose.**

### Justificación

- El requisito de la cátedra especifica Android nativo.
- Jetpack Compose es el estándar moderno de Android (reemplazó XML Views).
- Mejor integración con herramientas del ecosistema Android (Android Studio, profiler, etc.).
- Es más valorado en el mercado laboral argentino para proyectos Android.

### Consecuencias

- ➕ Acceso nativo a sensores y APIs del dispositivo.
- ➕ Performance y experiencia de usuario óptimas.
- ➕ La API REST es agnóstica de plataforma, lo que simplifica el desarrollo paralelo de ambos clientes.
- ➖ Pablo lidera el módulo Android; Ignacio lidera la web. Requiere coordinación en el diseño de la API y en el render diferenciado por rol que ambos clientes deben soportar.
- ➖ No hay reutilización de código entre plataformas: la lógica de presentación de cada rol (PT y alumno) se implementa dos veces, una en React y otra en Compose.

---

## ADR-004 — Integración del asistente IA (doble flujo)

**Estado:** 🟢 Aceptado

**Fecha:** Marzo 2026 · Actualizado Abril 2026

**Decidido por:** Ignacio Rolon, Pablo Queimaliños

### Contexto

El proyecto incluye **dos flujos diferenciados** de asistente IA:

1. **IA del entrenador** — genera plantillas de rutinas iniciales a partir de parámetros del alumno (objetivo, frecuencia, equipamiento, lesiones, nivel). El PT revisa y personaliza antes de asignar.
2. **IA del alumno** — durante la sesión, sugiere reemplazos de ejercicios, responde dudas de técnica, calentamiento y prevención de lesiones.

Ambos flujos comparten infraestructura pero atacan momentos y necesidades distintas.

### Opciones evaluadas

| Opción | Pros | Contras |
|---|---|---|
| LLM directo desde el cliente | Simple, sin backend extra | API key expuesta, sin control, lógica duplicada en web y Android |
| LLM directo desde el backend Express | Control total, API key segura | Cada cambio de prompt requiere redeploy del backend |
| **n8n como middleware de IA (dos workflows)** | Flujo visual, modificable sin redeploy, el equipo ya lo usa, separación limpia entre IA del PT e IA del alumno | Dependencia de n8n self-hosted, latencia adicional |

### Decisión

**n8n como middleware con dos workflows independientes:** uno para el asistente del entrenador y otro para el asistente del alumno. El backend Express los expone vía endpoints separados.

### Justificación

- El equipo ya tiene n8n self-hosted funcionando en producción para otros proyectos.
- Permite tener prompts y contextos distintos para cada audiencia (PT vs alumno) sin acoplarlos.
- Cambiar el modelo, el prompt o enriquecer el contexto = editar el flujo en n8n, sin tocar el backend.
- Las API keys del LLM quedan en n8n, no en el cliente.

### Flujo del asistente del entrenador

```javascript
Cliente del entrenador (web o mobile)
  ↓ POST /api/ia/generar-rutina
Backend Express
  ↓ POST al webhook n8n /webhook/trainer-ia
n8n (enriquece el contexto con biblioteca de ejercicios + plantillas previas + LLM)
  ↓ Respuesta con rutina propuesta
Backend Express
  ↓ 200 JSON con la rutina sugerida
Cliente del entrenador (PT revisa, edita y asigna)
```

### Flujo del asistente del alumno

```javascript
Cliente del alumno (web o mobile)
  ↓ POST /api/chat
Backend Express
  ↓ POST al webhook n8n /webhook/student-ia
n8n (contexto: ejercicio actual, músculo objetivo, equipamiento + LLM)
  ↓ Respuesta con sugerencias
Backend Express
  ↓ 200 JSON con respuesta y ejercicios sugeridos
Cliente del alumno (muestra respuesta en chat)
```

### Consecuencias

- ➕ Dos asistentes diferenciados, cada uno con prompt y contexto óptimos.
- ➕ Modificar comportamiento = editar el flujo en n8n, sin redeploy.
- ➕ API keys centralizadas y seguras.
- ➖ Latencia adicional por el salto a n8n (~200-400ms más por request).
- ➖ Dependencia de que n8n esté disponible; se necesita fallback (manejo de timeout 10s + mensaje al usuario).
- ➖ El asistente del alumno requiere conexión activa — en modo offline queda deshabilitado con aviso.

---

## ADR-005 — Estrategia de autenticación

**Estado:** 🟢 Aceptado

**Fecha:** Marzo 2026

**Decidido por:** Ignacio Rolon, Pablo Queimaliños

### Contexto

Dos plataformas (web y Android) necesitan autenticar usuarios con roles diferenciados (Trainer / Alumno).

### Decisión

**Autenticación propia en Express: email + contraseña (bcrypt), JWT de acceso y refresh tokens rotables guardados como hash en la tabla refresh_tokens.** ⚠️ Revisado 12/10/2026: reemplaza a la idea original de Supabase Auth; el flujo de abajo es el original y queda como referencia histórica.

### Flujo

```javascript
Cliente (web o Android)
  → POST supabase.auth.signIn() → JWT
  → Guarda JWT localmente
  → Cada request: Authorization: Bearer <JWT>
Backend Express
  → authMiddleware: verifica JWT con Supabase Admin
  → Extrae { userId, role } → disponible en req.user
  → requireRole('trainer') bloquea acceso si rol no coincide
```

### Consecuencias

- ➕ Un solo sistema de identidad para ambas plataformas.
- ➕ El rol se resuelve en el backend; el cliente no puede falsificarlo.
- ➖ Cada request al backend hace una verificación con Supabase (agregar cache si escala).

---

## ADR-006 — Asistente IA del entrenador para armado de rutinas

**Estado:** 🟢 Aceptado

**Fecha:** Abril 2026

**Decidido por:** Ignacio Rolon, Pablo Queimaliños

### Contexto

La validación con un PT real confirmó que el armado manual de rutinas es uno de los principales dolores: tarda 2-3 horas por rutina nueva. Se decide incorporar un asistente IA dedicado al entrenador, no como reemplazo del criterio profesional, sino como acelerador.

### Decisión

**Incluir el asistente IA del entrenador en el MVP** como un workflow n8n separado del asistente del alumno (ver ADR-004). El PT siempre revisa y edita la rutina antes de asignarla — la IA sugiere, no decide.

### Casos de uso principales

- **Generación inicial:** El PT carga objetivo, frecuencia, equipamiento, lesiones y nivel. La IA propone una rutina completa con ejercicios, series, reps y descansos. El PT edita y asigna.
- **Adaptación:** El PT toma una rutina existente de otro alumno y le pide a la IA que la adapte al perfil de un nuevo alumno (más volumen, menos volumen, sustituir por equipamiento disponible).
- **Sugerencia de progresión:** Dado el historial de un alumno, la IA propone ajustes para la siguiente semana (subir carga, cambiar reps, agregar variantes).

### Justificación

- Reduce significativamente el tiempo administrativo del PT (validado: el entrevistado tarda 2-3hs en una rutina nueva).
- Es un diferenciador competitivo claro: ninguna app del benchmark argentino ofrece IA específica para el armado de rutinas.
- Aprovecha la misma infraestructura de n8n ya prevista para el asistente del alumno.
- El control humano se mantiene: la IA propone, el PT revisa y aprueba.

### Consecuencias

- ➕ Diferenciador fuerte frente a TrueCoach, Trainerize y demás competencia.
- ➕ Reduce el tiempo de armado de rutina de 2-3hs a ~15-20 min (estimado).
- ➕ Acelera el onboarding de nuevos alumnos (rutina lista para asignar el mismo día).
- ➖ Sumar entidad `routine_templates` y endpoints específicos al backend.
- ➖ Costos de tokens del LLM crecen con el uso. Hay que limitar request por trainer/mes en planes gratuitos.
- ➖ Si la IA falla o el resultado es pobre, el PT debe poder seguir armando rutinas a mano sin fricción.

---

## ADR-007 — Gamificación integrada al MVP

**Estado:** 🟢 Aceptado

**Fecha:** Abril 2026

**Decidido por:** Ignacio Rolon, Pablo Queimaliños

### Contexto

Originalmente la gamificación (logros, rachas, badges) estaba planeada como funcionalidad post-MVP. La validación con PT y la sesión de Fresh Eyes con alumnos reveló que la motivación y adherencia es uno de los factores críticos para que el alumno siga entrenando — y para que el PT no pierda clientes. Se decide subirla al MVP.

### Decisión

**Incluir un sistema de gamificación básico pero completo en el MVP**, con tres componentes:

- **Rachas (streaks):** días/semanas consecutivas de entrenamiento.
- **Logros (badges):** primer PR en cada ejercicio, completar N semanas, completar todas las sesiones de un mes.
- **Desafíos (challenges):** objetivos predefinidos asignables (ej: "12 sesiones en 30 días", "alcanzar X kg en sentadilla"). Pueden ser globales o personalizados por el PT.

### Modelo de datos requerido

- `achievements` (catálogo de logros disponibles)
- `student_achievements` (logros desbloqueados por cada alumno)
- `challenges` (catálogo de desafíos)
- `student_challenges` (challenges asignados/asumidos por alumno con su progreso)
- Campo computado de `streak_days` derivado de `sessions`

### Justificación

- La adherencia es el verdadero negocio del PT: si el alumno deja, el PT pierde un cliente.
- En el Fresh Eyes una alumna lo pidió expresamente como motivador.
- Implementación incremental: el MVP puede arrancar con un set fijo de logros pre-definidos y agregar más con el tiempo.
- Diferenciador adicional vs apps profesionales que están más enfocadas en lo técnico.

### Consecuencias

- ➕ Mayor adherencia esperada del alumno.
- ➕ Diferenciador competitivo.
- ➕ Genera contenido visual atractivo para que el alumno comparta (potencial viralidad).
- ➖ Sumar 4 entidades nuevas al modelo de datos.
- ➖ Sumar lógica de detección de logros (cron job o trigger post-sesión).
- ➖ Diseño UX adicional: pantalla dedicada en la app del alumno + visibilidad en el panel del PT.
- ➖ Riesgo de gamificación mal calibrada — desafíos demasiado fáciles aburren, demasiado difíciles desmotivan. Iterar con feedback.

---

## ADR del repo

Decisiones registradas como archivos en `docs/adr/` (numeración propia, distinta de la de arriba):

- **0001** — Autorización en la capa Service, RLS deny-all en la base: [[adr/0001-autorizacion-en-services-rls-deny-all]].
- **0002** — Sesión de la web: access token en memoria, refresh y user en `localStorage`: [[adr/0002-sesion-web]].
