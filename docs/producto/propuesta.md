---
title: Propuesta de Proyecto — Trabajo Final 2 (documento fuente)
aliases: [Propuesta de Proyecto — Trabajo Final 2 (documento fuente)]
notion: https://app.notion.com/p/3855ffbef7b581e4a350f9934f3bef58
notion_editado: 2026-06-20
migrado: 2026-10-17
tags: [producto]
---

# Propuesta de Proyecto — Trabajo Final 2 (documento fuente)

> [!note] 📄
> **Documento fuente de la entrega.** Transcripción de *“PROPUESTA DE PROYECTO – TRABAJO FINAL 2 — FitTrainer — Pablo Queimaliños — Ignacio Rolón”* (Escuela Da Vinci, Carrera Analista de Sistemas, Seminario de Sistemas). Esta página refleja el contenido del PDF entregado y es la fuente con la que debe coincidir el resto del tablero.

---

# 1. Introducción

El personal trainer independiente enfrenta una dispersión constante de herramientas para gestionar su trabajo: arma rutinas en Word o Excel, las envía por WhatsApp en formato PDF, anota cargas en cuadernos o notas del celular y sigue el progreso de los alumnos de memoria o por consultas sueltas. Esta dispersión se traduce en pérdida de tiempo administrativo, falta de seguimiento real del progreso del alumno y una experiencia poco profesional para el cliente. Del lado del alumno, los problemas se reflejan en olvidos de los ejercicios entre sesiones, falta de registro estructurado de los pesos utilizados y baja adherencia al plan a mediano plazo.

Las plataformas internacionales que existen en el mercado (TrueCoach, Trainerize, Hexfit, PT Distinction, entre otras) atienden el problema, pero están en inglés, cobran en dólares y están pensadas para mercados como Estados Unidos o Europa. En el mercado argentino y latinoamericano no existe una solución consolidada, accesible y profesional pensada específicamente para el contexto local, lo que abre una oportunidad concreta de innovación.

## 1.1 Objetivo del documento

Definir la solución de la problemática sobre la cual será desarrollado el proyecto que se llevará adelante durante el Seminario de Sistemas de la carrera Analista de Sistemas en la Escuela Da Vinci.

## 1.2 Descripción del equipo

**Ignacio Rolón** — Entrena en gimnasio desde hace tres años, lo que le da conocimiento de primera mano del dominio (armado de rutinas, registro de cargas, progresión de fuerza, sustitución de ejercicios). Técnicamente desarrolla con el stack del proyecto: React, Node.js + Express (Controller / Service / Repository), PostgreSQL con Supabase, n8n self-hosted y APIs de LLM, deploy en VPS con Docker y Git. Necesita reforzar testing/QA y gestión de proyectos.

**Pablo Queimaliños** — Instructor de Artes Marciales y Autodefensa; arma rutinas y hace seguimiento de sus alumnos. Estudiante de 3er año, trabajó con JavaScript, React, Node, Vite, Tailwind, Express, Firebase, PostgreSQL y API REST. Necesita ampliar Kotlin, Supabase, n8n y pruebas integrales.

> Ver la página dedicada **[[producto/equipo|Descripción del equipo]]** para las biografías completas.

---

# 2. Descripción del proyecto

## 2.1 Nombre

**FitTrainer**

## 2.2 Alcance

FitTrainer es una plataforma compuesta por dos clientes — una aplicación web y una aplicación móvil Android — que comparten un único backend y una única base de datos. Ambos clientes soportan a los dos roles del sistema (entrenador y alumno): el rol del usuario determina qué pantallas y permisos se le muestran. La web ofrece mejor experiencia para tareas largas (armar rutinas, revisar gráficos); la mobile está optimizada para acción rápida en movimiento (registrar series en el gym). El entrenador tiene todo en las dos. El alumno tiene en la web la rutina del día, una sesión activa simplificada que se sube al terminar, Mis rutinas, el historial, Mi progreso con racha y logros, y Mi perfil con medidas; en el celular el alumno tiene hoy la rutina del día, Mis rutinas, la sesión completa con modo offline y reemplazo de ejercicio, el feedback y el historial; sus medidas, progreso y logros, las notificaciones push y pedir turno están pendientes en el celular, y el asistente IA del alumno está pendiente en ambas plataformas.

| Funcionalidad | Descripción | Tipificación | Plataforma |
|---|---|---|---|
| Registro y autenticación de usuarios | El PT crea su cuenta con email, contraseña, nombre y especialidad. Los alumnos se registran desde la invitación de un trainer. Login común para ambos roles con JWT y refresh tokens. | ABM / Lógica de negocio | Ambas |
| Gestión de invitaciones (WhatsApp / QR) | El entrenador genera una invitación única por alumno con datos mínimos. La comparte por WhatsApp o como QR. Token de un solo uso, válido por 48 horas. | Lógica de negocio | Ambas |
| Onboarding del alumno desde invitación | El alumno accede desde el link de WhatsApp o escaneando el QR (web o mobile). Datos precargados, solo elige contraseña. | ABM | Ambas |
| Gestión de alumnos por el entrenador | Panel con todos sus alumnos: datos personales, objetivo, equipamiento, lesiones, métricas corporales y estado activo / inactivo. | ABM / Reporte | Ambas |
| Biblioteca de ejercicios | Catálogo global más biblioteca personalizada por entrenador. Cada ejercicio incluye nombre, grupo muscular, equipamiento, descripción y video / GIF. | ABM | Ambas |
| Armado y asignación de rutinas | El entrenador construye rutinas con ejercicios, series, repeticiones, descansos, tempo y notas. Las asigna a un alumno indicando los días de la semana. | ABM | Ambas |
| Asistente IA del entrenador (generación de rutinas) | Generación asistida de plantillas mediante n8n y un LLM. El entrenador indica objetivo, frecuencia, equipamiento, lesiones y nivel; la IA propone una rutina que revisa y edita antes de asignar. | Lógica de negocio | Ambas |
| Plantillas de rutinas reutilizables | Permite guardar rutinas como plantillas (manuales o generadas por IA) para asignarlas rápidamente a otros alumnos. | ABM | Ambas |
| Rutina del día y registro de sesión | El alumno ve la rutina de hoy con la sugerencia de carga de la sesión anterior. Registra series, reps y peso real. Al finalizar deja un feedback de esfuerzo percibido (RPE). | ABM | Ambas (uso típico mobile) |
| Modo offline para sesiones | La rutina del día se cachea localmente. El alumno entrena y registra sin conexión; los datos se sincronizan al recuperar internet, garantizando cero pérdida de información. | Lógica de negocio | Mobile |
| Asistente IA del alumno en sesión (solo online) | Chat dentro del entrenamiento (n8n + LLM). Consulta sustituciones de ejercicios, dudas de técnica, calentamiento y prevención de lesiones, con respuesta contextualizada. | Lógica de negocio | Ambas |
| Sustitución de ejercicios en sesión | El alumno puede reemplazar un ejercicio durante la sesión (sugerido por la IA o manual). El cambio queda registrado y se notifica al entrenador. | Lógica de negocio | Ambas |
| Seguimiento de progreso del alumno | Tablero del entrenador con historial de sesiones, gráficos de progresión de cargas, evolución de peso y medidas, modificaciones de rutina y comentarios por sesión. | Reporte | Ambas |
| Gamificación: logros, rachas y desafíos | Logros desbloqueables (primer PR, racha de N días, hitos de sesiones), rachas calculadas del historial y desafíos predefinidos asignables por el entrenador. | Lógica de negocio | Ambas |
| Notificaciones push (FCM + Web Push) | Notificaciones por inactividad, modificaciones de rutina, comentarios, logros y challenges. Llegan a mobile vía Firebase Cloud Messaging y a web vía Web Push. | Lógica de negocio | Ambas |

## 2.3 Tecnología

| Aspecto | Detalle |
|---|---|
| Lenguaje de programación | Web / escritorio: JavaScript / TypeScript — Mobile: Kotlin / Java |
| Frameworks | React 18 + Vite + Tailwind CSS + shadcn/ui (web) — Jetpack Compose (mobile) — Express.js (backend) |
| Base de datos | PostgreSQL gestionada por Supabase, con Row-Level Security (RLS) para aislamiento por rol |
| Entorno / sistema operativo | Servidor: VPS de Hostinger con Docker — Cliente mobile: Android 9 (API 28) o superior — Cliente web: navegadores modernos (Chrome, Firefox, Edge, Safari) |
| API de autenticación | Supabase Auth (email + contraseña) con JWT y refresh tokens. Verificación del JWT en el backend Express mediante middleware propio. El rol se resuelve en el backend y es agnóstico de plataforma. |
| Otras APIs | n8n (orquestación de los workflows trainer-ia y student-ia) — KIMI API (LLM consumido desde n8n) — Firebase Cloud Messaging — Web Push API — Deep links de WhatsApp ([wa.me](http://wa.me)) — qrcode (generación de QR en el backend) — Supabase Storage (videos, imágenes y PDFs) |
| ORM | No se utiliza ORM tradicional. El acceso a datos se realiza con el cliente oficial de Supabase (supabase-js / supabase-kt), que expone PostgreSQL como API REST autogenerada. La capa Repository del backend abstrae estas llamadas para mantener el patrón Controller / Service / Repository. |

## 2.4 Necesidades a satisfacer / oportunidad

FitTrainer responde a una necesidad concreta del personal trainer independiente argentino, que hoy gestiona su trabajo con herramientas dispersas e inadecuadas. La oportunidad es triple: (1) el armado manual de rutinas consume entre 2 y 3 horas por cliente nuevo; (2) los alumnos olvidan ejercicios y cargas y no completan la rutina como fue diseñada; (3) existe una brecha de mercado, ya que las plataformas del segmento son extranjeras, en inglés y en dólares. FitTrainer cubre esa brecha con una solución en español, con precios en pesos y dos diferenciadores fuertes: el asistente IA del entrenador y el asistente IA del alumno en sesión.

> Ver las páginas dedicadas **[[producto/beneficios-esperados|Beneficios esperados]]** e **[[producto/investigacion-de-mercado|Investigación de mercado]]** para el detalle completo de las secciones 2.5 y 2.6.

---

# 3. Requerimientos del sistema

## 3.1 Requerimientos funcionales

**Módulo: Autenticación y onboarding**

| ID | Requerimiento |
|---|---|
| PT-01 | Registro de entrenadores (nombre, email, password, certificaciones, especialidad, foto de perfil). |
| PT-02 | Generar una invitación a alumnos del entrenador vía WhatsApp o QR. |
| AL-01 | Registro de alumnos vía link de WhatsApp o QR, con vinculación automática al entrenador. |

**Módulo: Gestión de alumnos (Personal Trainer)**

| ID | Requerimiento |
|---|---|
| PT-03 | Panel de alumnos (foto, nombre, objetivo, último entreno, alertas). |
| PT-04 | Perfil físico de cada alumno (peso, talla, grasa, IMC, circunferencias). |
| PT-05 | Asignar diferentes rutinas a diferentes alumnos (días, ejercicios, series / reps / descanso / tempo / notas). |
| PT-06 | Biblioteca de ejercicios (con GIFs o videos y descripción). |
| PT-07 | Seguimiento del progreso de cada alumno (historial, cargas, gráficos). |
| PT-08 | Registrar notas y comentarios por sesión. |
| PT-09 | Alertas por inactividad y recordatorios de ajustes de rutinas. |
| PT-10 | Sugerencias nutricionales básicas (recomendaciones generales o PDF, sin módulo completo en MVP). |
| PT-11 | Calendario de entrenamientos y coordinación de sesiones en agenda. |
| PT-12 | Plantillas de planes de entrenamiento reutilizables. |
| PT-13 | Mensajería interna (chat 1 a 1 + mensaje de difusión a todos los alumnos). |
| PT-14 | Asistente IA para armado, modificación o personalización de rutinas. |

**Módulo: Entrenamiento (Alumno)**

| ID | Requerimiento |
|---|---|
| AL-02 | Ver la rutina del día. |
| AL-03 | Registrar pesos y cargas en sesión. |
| AL-04 | Timer de descanso con notificación. |
| AL-05 | Asistente IA del alumno (n8n) para dudas puntuales durante la sesión. |
| AL-06 | Historial de entrenamientos con gráficos. |
| AL-07 | Registro de medidas corporales. |
| AL-08 | Feedback post-entreno (RPE 1-10 + nota libre / comentarios). |
| AL-09 | GIFs / video + descripción técnica por ejercicio. |
| AL-10 | Modo offline (rutina cacheada, sincronización al recuperar conexión). |
| AL-11 | Logros, rachas y desafíos (gamificación). |
| AL-12 | Solicitar turno / coordinar agenda con el PT. |

**Fuera del MVP (futuro):** pasarela de pago integrada con checkout automático, integración con wearables (Apple Health, Garmin, Samsung Health, Fitbit), videollamadas integradas, bot de WhatsApp, plataforma de webinars / cursos para entrenadores y marketplace alumno ↔ PT.

> **Nota sobre pagos:** el sistema contempla Mercado Pago únicamente mediante transferencia. El entrenador muestra su alias / CBU para que el alumno pague por transferencia; la aplicación no procesa pagos internamente. La pasarela de pago con checkout automático queda como mejora futura.

## 3.2 Requerimientos no funcionales

**Rendimiento**

| ID | Requisito |
|---|---|
| RNF-01 | Tiempo de respuesta de la API. |
| RNF-02 | Carga de pantalla inicial: la rutina del día carga en menos de 2 segundos en conexión 4G. |
| RNF-03 | Sincronización offline: los datos registrados offline se sincronizan al recuperar conectividad, sin pérdida de información. |
| RNF-04 | Respuesta del asistente IA del alumno: si el tiempo es muy largo, la app sigue funcionando sin la IA y se informa que no está disponible momentáneamente. |
| RNF-05 | Respuesta del asistente IA del entrenador: si el tiempo es muy largo, la app sigue funcionando sin la IA y se informa que no está disponible momentáneamente. |

**Seguridad**

| ID | Requisito |
|---|---|
| RNF-06 | Autenticación JWT. |
| RNF-07 | Autorización por rol: el alumno no accede a datos de otros alumnos y el PT solo ve sus propios alumnos. Row-Level Security en Supabase. |
| RNF-08 | Encriptación en tránsito: HTTPS obligatorio en todos los endpoints. |
| RNF-09 | Invitaciones (WhatsApp / QR): el token expira en 48 hs y es de un solo uso; no puede reutilizarse para crear otra cuenta. |
| RNF-10 | API keys de LLM: centralizadas en n8n self-hosted; nunca expuestas al cliente web ni a la app Android. |

**Usabilidad**

| ID | Requisito |
|---|---|
| RNF-12 | Onboarding sin fricciones: un nuevo alumno completa el registro vía WhatsApp o QR en menos de 2 minutos sin ayuda externa. |
| RNF-13 | UX durante el entreno: registrar una serie (peso + reps) no requiere más de 3 taps desde la pantalla principal; usable con una sola mano. |
| RNF-14 | Tablero del entrenador: el PT se mueve entre alumnos en menos de 2 clics y ve sus métricas principales sin scroll. |
| RNF-15 | Soporte multiplataforma: ambos roles en ambos clientes; el alumno en la web con funcionalidad central y en la mobile con una parte por ahora (ver casos de uso). |
| RNF-16 | Idioma: producto en español. |

**Disponibilidad y resiliencia**

| ID | Requisito |
|---|---|
| RNF-17 | Uptime del backend: 99% de disponibilidad mensual; mantenimiento programado fuera de horas pico. |
| RNF-18 | Backups automáticos: backup diario de la base de datos en Supabase, retención de 30 días. |
| RNF-19 | Modo offline crítico: la app del alumno permite entrenar y registrar la sesión completa sin conexión; el asistente IA se deshabilita con aviso. |
| RNF-20 | Fallback de la IA: si n8n no está disponible, el flujo no se interrumpe: el PT arma rutinas a mano y el alumno entrena sin el chat. |

**Escalabilidad**

| ID | Requisito |
|---|---|
| RNF-21 | Arquitectura sin estado: el backend es stateless para escalar horizontalmente. |
| RNF-22 | Storage de media: videos y fotos en Supabase Storage / CDN, no en el servidor de la app. |
| RNF-23 | Costo de tokens del LLM: monitoreo mensual; modelos económicos para el chat y modelos más capaces para el armado de rutinas. |

**Legal y privacidad**

| ID | Requisito |
|---|---|
| RNF-24 | Consentimiento de datos de salud: al registrarse, el usuario acepta la política de privacidad y el tratamiento de datos de salud (peso, medidas, historial). |
| RNF-25 | Derecho al olvido: el alumno puede solicitar la eliminación de su cuenta y todos sus datos; eliminación real en 30 días. |
| RNF-26 | Datos compartidos con LLM: los datos enviados a n8n y al LLM no incluyen información personalmente identificable; el contexto se anonimiza antes de salir del backend. |

---

# 4. Planificación inicial

## 4.1 Backlog inicial priorizado

El backlog se prioriza por valor para el MVP y se organiza en cuatro fases incrementales. Las funcionalidades de prioridad baja (PT-10 sugerencias nutricionales y AL-12 solicitar turno) quedan como backlog secundario fuera del MVP.

| HU | Funcionalidad | Actor | Prioridad | Fase |
|---|---|---|---|---|
| HU-01 | Registro de personal trainer | PT | Alta | Fase 1 |
| HU-02 | Generación de invitación (WhatsApp / QR) | PT | Alta | Fase 1 |
| HU-03 | Onboarding del alumno vía link o QR | Alumno | Alta | Fase 1 |
| HU-04 | Panel de alumnos | PT | Alta | Fase 1 |
| HU-05 | Perfil físico del alumno | PT | Alta | Fase 1 |
| HU-06 | Armado y asignación de rutinas | PT | Alta | Fase 2 |
| HU-07 | Plantillas de planes reutilizables | PT | Alta | Fase 2 |
| HU-08 | Asistente IA para el armado de rutinas | PT | Alta | Fase 2 |
| HU-09 | Biblioteca de ejercicios | PT | Media | Fase 2 |
| HU-10 | Videos / GIFs de técnica | Alumno | Media | Fase 2 |
| HU-11 | Ver rutina del día | Alumno | Alta | Fase 3 |
| HU-12 | Registrar pesos y cargas en sesión | Alumno | Alta | Fase 3 |
| HU-13 | Timer de descanso | Alumno | Alta | Fase 3 |
| HU-14 | Asistente IA del alumno en sesión | Alumno | Alta | Fase 3 |
| HU-15 | Modo offline para sesiones | Alumno | Alta | Fase 3 |
| HU-16 | Historial de entrenamientos | Alumno | Alta | Fase 3 |
| HU-17 | Registro de medidas corporales | Alumno | Media | Fase 3 |
| HU-18 | Feedback post-entreno (RPE) | Alumno | Media | Fase 3 |
| HU-19 | Seguimiento de progreso del alumno | PT | Alta | Fase 3 |
| HU-20 | Notas y comentarios por sesión | PT | Media | Fase 3 |
| HU-21 | Alertas de inactividad y modificaciones de rutina | PT | Alta | Fase 4 |
| HU-22 | Gamificación: logros, rachas y desafíos | Alumno | Alta | Fase 4 |
| HU-23 | Agenda y disponibilidad horaria | PT | Media | Fase 4 |
| HU-24 | Mensajería interna | PT | Media | Fase 4 |

> **Orden sugerido:** Fase 1 (autenticación, invitaciones y gestión de alumnos) → Fase 2 (biblioteca, rutinas y asistente IA del entrenador) → Fase 3 (sesiones, registro de cargas, asistente IA del alumno y seguimiento) → Fase 4 (alertas, gamificación, agenda y mensajería).

## 4.2 Historias de usuario y criterios de aceptación

### Fase 1 — Autenticación, invitaciones y gestión de alumnos

**HU-01 — Registro de personal trainer** *(Alta · PT-01)*

*Como personal trainer, quiero crear mi cuenta con mis datos profesionales, para gestionar a mis alumnos desde la plataforma.*

- El PT puede registrarse con nombre, email, contraseña y especialidad.
- El sistema valida que el email no esté registrado previamente.
- La contraseña debe tener un mínimo de 8 caracteres.
- Puede subir una foto de perfil de forma opcional.
- Al confirmar, se crea la cuenta y se inicia sesión automáticamente con JWT.
- El registro es accesible tanto desde web como desde mobile.

**HU-02 — Generación de invitación (WhatsApp / QR)** *(Alta · PT-02)*

*Como personal trainer, quiero generar una invitación única para cada alumno por WhatsApp o QR, para incorporarlo a la plataforma sin fricción.*

- El PT genera la invitación cargando datos mínimos del alumno (nombre).
- El sistema genera un token único de un solo uso, válido por 48 horas.
- La invitación se comparte por WhatsApp (deep link [wa.me](http://wa.me)) o como código QR descargable.
- Un token ya usado o vencido no permite registrar otra cuenta.

**HU-03 — Onboarding del alumno vía link o QR** *(Alta · AL-01)*

*Como alumno, quiero registrarme desde el link de WhatsApp o escaneando el QR, para quedar vinculado a mi entrenador en pocos pasos.*

- Al abrir el link o escanear el QR, el alumno queda asociado automáticamente al PT que lo invitó.
- Los datos precargados por el PT se muestran y el alumno solo debe elegir su contraseña.
- El proceso completo se realiza en menos de 2 minutos sin ayuda externa.
- Puede completarse indistintamente desde web o mobile.
- Si el token está vencido, se muestra un mensaje claro y la opción de solicitar una nueva invitación.

**HU-04 — Panel de alumnos** *(Alta · PT-03)*

*Como personal trainer, quiero ver un panel con todos mis alumnos, para hacer un seguimiento rápido de su estado y actividad.*

- El panel muestra foto, nombre, objetivo, fecha de último entreno y alertas de inactividad.
- Permite pasar de un alumno a otro en menos de 2 clics.
- Diferencia visualmente a los alumnos activos de los inactivos.
- Disponible en web (vista completa) y mobile (vista compacta).

**HU-05 — Perfil físico del alumno** *(Alta · PT-04)*

*Como personal trainer, quiero registrar y ver los datos físicos del alumno, para adaptar el entrenamiento y medir su evolución.*

- Permite cargar peso, talla, % de grasa corporal y circunferencias; el IMC se calcula automáticamente.
- El PT puede actualizar los datos y consultar el histórico de evolución.
- Accesible desde web o mobile.

### Fase 2 — Rutinas, biblioteca y asistente IA del entrenador

**HU-06 — Armado y asignación de rutinas** *(Alta · PT-05)*

*Como personal trainer, quiero armar y asignar rutinas a mis alumnos, para entregarles un plan de entrenamiento estructurado.*

- El PT crea la rutina con nombre, objetivo, días de la semana y ejercicios con series, reps, descanso, tempo y notas.
- Puede partir de una plantilla (manual o generada por IA) o reutilizar la rutina de otro alumno.
- La rutina asignada queda visible para el alumno según los días definidos.
- Editable desde web (mejor experiencia de edición) y también desde mobile.

**HU-07 — Plantillas de planes reutilizables** *(Alta · PT-12)*

*Como personal trainer, quiero guardar rutinas como plantillas reutilizables, para asignarlas rápidamente a otros alumnos.*

- El PT puede guardar cualquier rutina como plantilla, clasificada por objetivo.
- Al asignar una plantilla a un alumno, puede personalizarla sin modificar la original.
- Las plantillas son privadas de cada PT.

**HU-08 — Asistente IA para el armado de rutinas** *(Alta · PT-14)*

*Como personal trainer, quiero que un asistente de IA me proponga una rutina inicial, para reducir el tiempo de armado de cada plan.*

- El PT indica objetivo, frecuencia, equipamiento, lesiones y nivel del alumno.
- La IA (n8n + LLM) devuelve una rutina completa y editable.
- El PT siempre revisa y edita antes de asignar; la rutina nunca se asigna de forma automática.
- Si la IA no responde a tiempo, se muestra un mensaje con opción de reintentar y el PT puede armar la rutina a mano (fallback RNF-20).

**HU-09 — Biblioteca de ejercicios** *(Media · PT-06)*

*Como personal trainer, quiero contar con una biblioteca de ejercicios con demostraciones, para construir rutinas más rápido y claras.*

- Incluye un catálogo global más una biblioteca personalizada por PT.
- Cada ejercicio tiene nombre, grupo muscular, equipamiento, descripción y video / GIF.
- El PT puede agregar, editar y filtrar ejercicios por músculo y equipamiento.

**HU-10 — Videos / GIFs de técnica** *(Media · AL-09)*

*Como alumno, quiero ver un video o GIF de cada ejercicio, para ejecutarlo con la técnica correcta.*

- Cada ejercicio de la rutina puede mostrar su demostración.
- El video es accesible desde la rutina del día y desde la biblioteca.
- Disponible en web y mobile.

### Fase 3 — Sesiones, registro de cargas, asistente IA del alumno y seguimiento

**HU-11 — Ver rutina del día** *(Alta · AL-02)*

*Como alumno, quiero ver qué rutina me toca hoy al abrir la app, para empezar a entrenar sin demoras.*

- La pantalla principal muestra la rutina del día según los días asignados.
- Si no hay rutina para hoy, muestra un mensaje y la próxima sesión programada.
- La pantalla carga en menos de 2 segundos en conexión 4G (RNF-02).

**HU-12 — Registrar pesos y cargas en sesión** *(Alta · AL-03)*

*Como alumno, quiero registrar el peso y las repeticiones de cada serie durante el entreno, para llevar un registro confiable de mis cargas.*

- Por cada serie, el alumno carga el peso real y las reps completadas.
- El sistema sugiere automáticamente el peso de la sesión anterior.
- Registrar una serie requiere como máximo 3 taps desde la pantalla principal (RNF-13).
- Si el alumno modifica algo de la rutina, el cambio queda registrado y se notifica al PT.

**HU-13 — Timer de descanso** *(Alta · AL-04)*

*Como alumno, quiero contar con un timer de descanso entre series, para respetar los tiempos pautados en la rutina.*

- Al completar una serie, inicia el timer con el descanso configurado para ese ejercicio.
- Notifica cuando termina y permite saltarlo (skip).
- Funciona en mobile aun cuando la pantalla se bloquee.

**HU-14 — Asistente IA del alumno en sesión** *(Alta · AL-05)*

*Como alumno, quiero consultar un asistente de IA durante el entreno, para resolver dudas de técnica, sustituciones o calentamiento.*

- Es un chat dentro de la sesión (n8n + LLM) con contexto de la rutina y el equipamiento disponible.
- Responde sustituciones de ejercicios, dudas de técnica, calentamiento y prevención de lesiones.
- El 95% de las respuestas llegan en menos de 10 segundos (RNF-04).
- Solo está disponible online; sin conexión se deshabilita con un aviso (RNF-19).

**HU-15 — Modo offline para sesiones** *(Alta · AL-10)*

*Como alumno, quiero entrenar y registrar mi sesión sin conexión, para no perder datos en gimnasios con mala señal.*

- La rutina del día se cachea localmente al menos 24 horas antes.
- El alumno puede registrar la sesión completa sin conexión.
- Al recuperar internet, los datos se sincronizan en menos de 5 segundos sin pérdida de información (RNF-03).
- El asistente IA se deshabilita con aviso mientras no haya conexión.

**HU-16 — Historial de entrenamientos** *(Alta · AL-06)*

*Como alumno, quiero ver mi historial de sesiones y mi progreso, para comprobar mi evolución a lo largo del tiempo.*

- Lista las sesiones pasadas con los pesos y reps por ejercicio.
- Muestra gráficos de progresión de cargas y de volumen total.
- Mejor visualización gráfica en web; resumen en mobile.

**HU-17 — Registro de medidas corporales** *(Media · AL-07)*

*Como alumno, quiero registrar mi peso y mis medidas periódicamente, para seguir mi evolución física.*

- El alumno registra su peso; si el PT lo habilita, también puede registrar medidas.
- El histórico se presenta en gráficos de evolución.

**HU-18 — Feedback post-entreno (RPE)** *(Media · AL-08)*

*Como alumno, quiero dejar un feedback al terminar la sesión, para que mi entrenador sepa cómo me sentí.*

- Al cerrar la sesión, el alumno indica el esfuerzo percibido (escala RPE 1 a 10) y una nota libre opcional.
- El feedback se muestra en el dashboard del PT.

**HU-19 — Seguimiento de progreso del alumno** *(Alta · PT-07)*

*Como personal trainer, quiero ver el progreso de cada alumno, para ajustar el plan con datos reales.*

- Muestra el historial de sesiones y gráficos de progresión por ejercicio, evolución de peso y medidas.
- Incluye las modificaciones de rutina y los comentarios por sesión.
- La mejor visualización gráfica está en la web.

**HU-20 — Notas y comentarios por sesión** *(Media · PT-08)*

*Como personal trainer, quiero comentar las sesiones de mis alumnos, para darles feedback personalizado.*

- El PT puede dejar comentarios en cada sesión completada del alumno.
- El alumno ve esos comentarios en su historial.
- Disponible desde web o mobile.

### Fase 4 — Funcionalidades avanzadas (alertas, gamificación, agenda y mensajería)

**HU-21 — Alertas de inactividad y modificaciones de rutina** *(Alta · PT-09)*

*Como personal trainer, quiero recibir alertas cuando un alumno está inactivo o modifica su rutina, para intervenir a tiempo.*

- Notifica si el alumno no registra entrenamientos durante N días.
- Notifica cuando un alumno modifica series, reps o peso, o sustituye un ejercicio.
- Las notificaciones llegan a la web (Web Push) y a la mobile (Firebase Cloud Messaging).

**HU-22 — Gamificación: logros, rachas y desafíos** *(Alta · AL-11)*

*Como alumno, quiero ganar logros, sostener rachas y completar desafíos, para mantenerme motivado y constante.*

- Las rachas se calculan a partir del historial de días entrenados consecutivos.
- Se desbloquean badges por hitos (primer PR, N semanas, N sesiones).
- El PT puede asignar desafíos personalizados.
- Visible para alumno y PT en ambas plataformas.

**HU-23 — Agenda y disponibilidad horaria** *(Media · PT-11)*

*Como personal trainer, quiero cargar mi disponibilidad horaria, para que los alumnos puedan solicitar turno.*

- El PT carga sus horarios disponibles en una vista de calendario semanal.
- Los alumnos pueden solicitar un turno desde la app.
- El PT acepta o rechaza cada solicitud.

**HU-24 — Mensajería interna** *(Media · PT-13)*

*Como personal trainer, quiero chatear con mis alumnos dentro de la app, para centralizar la comunicación.*

- Chat uno a uno entre PT y alumno, con soporte de texto e imágenes.
- El PT puede enviar un mensaje a múltiples alumnos (broadcast).
- Disponible en web y mobile.

---

# 5. Prototipo — Wireframes

Se elaboraron los wireframes de las pantallas principales cubriendo los dos roles (entrenador y alumno) en las dos plataformas (web y móvil Android), cubriendo lo que el diseño prevé para cada rol y plataforma (el asistente IA del alumno en la web queda pendiente de implementación). Las imágenes se entregan en cuatro archivos PDF adjuntos; aquí se incluye el índice de pantallas.

| Archivo adjunto | Rol | Plataforma | Pantallas |
|---|---|---|---|
| Wireframes — Alumno — Web | Alumno | Web | 5 |
| Wireframes — Alumno — Mobile | Alumno | Móvil (Android) | 7 |
| Wireframes — Entrenador — Web | Entrenador | Web | 9 |
| Wireframes — Entrenador — Mobile | Entrenador | Móvil (Android) | 5 |

**Alumno — Web (5):** Hoy / Rutina del día · Sesión activa · Mi Progreso · Asistente IA · Mi Perfil.

**Alumno — Mobile (7):** Onboarding por QR · Home / Rutina del día · Sesión activa · Timer de descanso · Chat IA en el entreno · Historial & Progreso · Perfil del Alumno.

**Entrenador — Web (9):** Dashboard PT · Panel de Alumnos · Perfil del Alumno · Crear Rutina · Generar QR de Invitación · Mi Perfil (entrenador) · Negocio & Tarifas · Disponibilidad & Integraciones · Plan & Facturación.

**Entrenador — Mobile (5):** Inicio / Dashboard · Alumnos · Perfil del Alumno · Mensajes · Generar QR.

---

# 6. Casos de uso

## 6.1 Actores

- **Personal Trainer** — actor primario del back-office. Se registra, invita alumnos, arma y asigna rutinas, monitorea el progreso, coordina la agenda y se apoya en el asistente IA para personalizar planes.
- **Alumno** — actor del lado de consumo. Se incorpora vía invitación, ejecuta sus sesiones, registra cargas y medidas, consulta su historial y utiliza el asistente IA para resolver dudas durante el entrenamiento.

## 6.2 Agrupación de los casos de uso

- **Autenticación:** registro de cada actor y el mecanismo de vinculación PT → Alumno.
- **Gestión de alumnos:** territorio exclusivo del PT — rutinas, seguimiento, agenda, comunicación e IA.
- **Entrenamiento:** territorio del Alumno — sesión, cargas, historial, medidas, feedback y gamificación.

## 6.3 Relaciones entre los casos de uso

**«include» — dependencias obligatorias**

- PT-03 Panel de alumnos incluye PT-04 Perfil físico.
- PT-05 Asignar rutinas incluye PT-06 Biblioteca de ejercicios.
- PT-08 Notas por sesión incluye PT-07 Seguimiento del progreso.
- PT-14 Asistente IA (PT) incluye PT-05 y PT-06.
- AL-02 Ver rutina incluye AL-09 GIFs / videos.
- AL-03 Registrar cargas incluye AL-06 Historial.
- AL-12 Coordinar agenda incluye PT-11 Calendario (cross-módulo).

**«extend» — comportamiento opcional**

- PT-12 Plantillas extiende PT-05 Asignar rutinas.
- PT-09 Alertas extiende PT-07 Seguimiento.
- AL-10 Modo offline extiende AL-02 Ver rutina.
- AL-11 Gamificación extiende AL-06 Historial.

**«generalization» — herencia de concepto**

- AL-05 Asistente IA (alumno) y PT-14 Asistente IA (PT) se generalizan en un mismo servicio de IA subyacente, con distintos contextos de uso.

> El detalle de cada caso de uso (flujo principal, alternativos y de error) está en la página **[[producto/casos-de-uso|Casos de uso]]** del tablero.

---

# 7. Anexos — Diagramas complementarios

Se adjuntan tres diagramas en archivos PDF independientes.

## 7.1 Diagrama de arquitectura

Representa la arquitectura técnica de FitTrainer como monolito modular: los dos clientes (web y móvil, para ambos roles) se comunican por HTTPS (REST + JWT) a través de un reverse proxy Nginx hacia el backend Node.js + Express, organizado en capas Presentación API (middlewares, validators, controllers) → Negocio (services) → Acceso a datos (repositories). La persistencia y autenticación se resuelven con Supabase (PostgreSQL con RLS, Auth y Storage), e integra los servicios externos: Email, WhatsApp y n8n conectado al LLM.

## 7.2 Diagrama de Gantt

Cronograma de desarrollo a lo largo de **14 semanas**, organizado según las cuatro fases del backlog. Detalla cada tarea (de F1.1 a F4.13) con su rol responsable, plataforma, pertenencia al MVP y la marca de las tareas que forman parte de la ruta crítica.

## 7.3 Camino crítico

Identifica la secuencia de tareas críticas que determina la duración mínima del proyecto (14 semanas). Para cada tarea indica su rama, capa, duración estimada, inicio y fin tempranos (ES/EF), dependencias y la justificación de por qué es crítica. Incluye el punto de convergencia (MERGE) en la pantalla de rutina del día, donde confluyen la rama del entrenador y la del alumno.

---

> 📎 **Adjuntos de la entrega (carpeta del trabajo):** TRABAJO FINAL 2 — FitTrainer.pdf (documento) · FitTrainer Diagrama de Arquitectura.png · FitTrainer Diagrama Gantt.pdf · FitTrainer Camino Crítico.pdf · Wireframes (Alumno Web/Mobile, Entrenador Web/Mobile).

> [!warning] Archivo no migrado: los adjuntos de la entrega (PDF del trabajo, PNG de arquitectura, Gantt, Camino Crítico, Wireframes) no están subidos como archivos en la página de Notion; solo se los nombra. Están en la carpeta del trabajo — ver Notion.
