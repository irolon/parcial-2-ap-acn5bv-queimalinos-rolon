---
title: Casos de uso
aliases: [Casos de uso]
notion: https://app.notion.com/p/33c5ffbef7b581c7bd0df16a11c3e781
notion_editado: 2026-06-20
migrado: 2026-10-17
tags: [producto]
---

# Casos de uso

Describen las interacciones entre los actores y el sistema para lograr un objetivo específico. Cada caso de uso incluye flujo principal, flujos alternativos y flujos de error.

**Actores del sistema:**

- 🔵 **Personal Trainer (PT)** — puede acceder desde la app web o desde la mobile
- 🟢 **Alumno** — puede acceder desde la app web o desde la mobile (Android nativo)
- 🟣 **Sistema** — procesos automáticos (cron jobs, notificaciones, detección de logros)
- 🟡 **Asistente IA** — actor automatizado vía n8n (tanto para PT como para alumno)

> **Sobre las plataformas en los casos de uso:** cuando se menciona "la app" sin distinguir, se refiere indistintamente a la web o la mobile (ambas soportan a ambos roles). En los casos donde el flujo tiene un dispositivo típico asociado (ej: registro de sesión en el gym), se aclara la plataforma esperada. Las diferencias del alumno entre la web y la mobile están en la tabla de abajo.

---

## Qué hace el alumno en cada plataforma

El alumno puede entrar desde la web o desde la mobile con la misma cuenta, pero **no hacen lo mismo**: la mobile es la experiencia completa (es la que se usa en el gym) y la web cubre lo central. Lo que no llega a la web queda dicho acá.

| Función | Web | Mobile |
|---|---|---|
| Hoy: rutina del día, plan y semana (CU-13) | Sí | Sí |
| Mis rutinas (solo lectura) | Sí | Sí |
| Ejecutar una sesión (CU-05 / CU-14) | **Simplificada:** un ejercicio por vez, descanso con cuenta regresiva y borrar series antes de subir. Se guarda en el navegador y se sube entera al terminar; necesita red para subir | Completa, con modo offline y sincronización |
| Feedback post-entreno, RPE y nota (CU-16) | Sí | Sí |
| Reemplazar un ejercicio y sesión libre | No | Sí |
| Historial de sesiones, con el comentario del entrenador en solo lectura (CU-17) | Sí | Sí |
| Mi progreso: racha, logros con su avance y desafíos activos (CU-17, CU-20) | Sí (no puede sumarse a un desafío) | Sí |
| Mi perfil: datos en solo lectura y medidas con gráfico e historial (CU-18) | Sí (el alumno borra solo las medidas que cargó él) | Sí |
| Notificaciones push | No | Sí |
| Pedir turno al entrenador (CU-19) | No | Sí (tarjeta de Igna) |
| Asistente IA (CU-06 / CU-15) | **Pendiente** (tarjetas de IA pospuestas) | **Pendiente** |

---


## CU-01 — Generar invitación para un alumno (WhatsApp o QR)

**Actor:** Personal Trainer

| Campo | Detalle |
|---|---|
| Precondiciones | El PT está autenticado en la app (web o mobile) |
| Postcondiciones | Se crea un registro en `invitations` con token único, datos del alumno, canal de envío y fecha de expiración (48hs). Se genera la URL de WhatsApp y/o el QR según corresponda. |

**Flujo principal**

1. El PT accede a la sección "Nuevo alumno" desde web o mobile.
2. Completa el formulario con datos mínimos: nombre, email, objetivo, opcionalmente teléfono y nivel.
3. Elige el canal de envío: WhatsApp, QR o ambos.
4. El sistema genera un token único (UUID) y lo guarda en `invitations` con `expires_at = now + 48hs`.
5. El sistema arma la URL `fittrainer.app/join?token=xxx`.
6. Si eligió WhatsApp: el sistema arma un deep link `wa.me/<phone>?text=<mensaje>` con la URL de invitación.
7. Si eligió QR: el sistema renderiza el QR a partir de la URL.
8. El PT comparte el link por WhatsApp directamente o descarga/muestra el QR para que el alumno lo escanee.

**Flujos alternativos**

- **3a:** El PT no tiene teléfono del alumno → fuerza canal QR.
- **4a:** El PT ya tiene un alumno registrado con ese email → el sistema muestra un aviso y ofrece reenviarle el acceso o desactivar la cuenta anterior.

**Flujos de error**

- **E1:** Error al generar el token → el sistema muestra un mensaje de error y permite reintentar.

---

## CU-02 — Registrarse desde una invitación

**Actor:** Alumno

| Campo | Detalle |
|---|---|
| Precondiciones | El alumno tiene el link recibido por WhatsApp o el QR generado por su PT. El token no fue usado ni expiró. |
| Postcondiciones | Se crea el registro del alumno en `students` vinculado al trainer. El token queda marcado como usado (`used_at = now`). El alumno queda autenticado en el cliente desde el que abrió la invitación (web o mobile). |

**Flujo principal**

1. El alumno hace tap en el link de WhatsApp o escanea el QR con la cámara.
2. Según cómo lo abra, se le ofrece la app mobile (si está instalada o desde Play Store) o se abre la versión web. El alumno puede elegir cuál usar.
3. La app llama al backend con el token de la invitación.
4. El backend valida que el token existe, no fue usado y no expiró.
5. La app muestra los datos precargados (nombre, objetivo) y pide al alumno que elija una contraseña.
6. El alumno confirma → el sistema crea su cuenta en `students` y autentica la sesión.
7. El alumno es redirigido a la pantalla principal (rutina del día si ya tiene asignada, pantalla de bienvenida si no).

**Flujos alternativos**

- **2a:** El alumno completa el registro desde la web y luego se descarga la mobile → al loguearse en mobile recupera la misma cuenta vinculada al PT.
- **4a:** El token expiró (más de 48hs) → la app muestra "Esta invitación venció, pedile una nueva a tu profe".
- **4b:** El token ya fue usado → la app muestra "Esta invitación ya fue utilizada".

**Flujos de error**

- **E1:** Sin conexión a internet al abrir el link → la app avisa y pide conectarse para continuar.

---

## CU-03 — Generar plantilla de rutina con asistente IA

**Actor:** Personal Trainer + Asistente IA

| Campo | Detalle |
|---|---|
| Precondiciones | El PT está autenticado (web o mobile). Conoce los parámetros del alumno (objetivo, frecuencia, equipamiento, lesiones, nivel). |
| Postcondiciones | Se crea un registro en `ai_routine_generations` con la propuesta generada. Si el PT decide guardarla como plantilla, se crea un registro en `routine_templates` con `generated_by_ai = true`. |

**Flujo principal**

1. El PT entra a la sección "Generar rutina con IA" (desde web o mobile, aunque la web ofrece mejor experiencia para el editor posterior).
2. Completa el formulario: objetivo, frecuencia semanal, duración por sesión, equipamiento disponible, lesiones, nivel, preferencias.
3. El PT envía la solicitud → el cliente llama al backend `POST /trainer-ai/generate-routine`.
4. El backend hace POST al webhook n8n `trainer-ia` con los parámetros y el catálogo de ejercicios disponibles.
5. n8n arma el prompt, llama al LLM y recibe la propuesta estructurada.
6. La respuesta vuelve al backend, que la guarda en `ai_routine_generations` y la devuelve al cliente.
7. El PT visualiza la propuesta: ejercicios por día, series, reps, descansos, notas y rationale.
8. El PT puede aceptar tal cual, editar antes de asignar, o pedir refinamiento (CU-03a).
9. Si el PT está conforme, asigna la rutina al alumno y/o la guarda como plantilla.

**Flujos alternativos**

- **3a — Refinamiento:** El PT pide ajustes ("más volumen en piernas", "sustituir sentadilla por prensa"). El sistema llama a `POST /trainer-ai/refine` con la `generation_id` y la instrucción nueva.
- **2a — Adaptación de plantilla existente:** El PT elige una plantilla previa como base (`base_template_id`) y la IA la adapta al perfil del nuevo alumno.

**Flujos de error**

- **E1:** n8n no responde en menos de 30s → el sistema muestra "El asistente no está disponible ahora, intentá más tarde o armá la rutina a mano".
- **E2:** Rate limit excedido en plan gratuito → el sistema muestra el mensaje correspondiente y propone upgrade.

---

## CU-04 — Asignar rutina a un alumno (manual o desde plantilla)

**Actor:** Personal Trainer

| Campo | Detalle |
|---|---|
| Precondiciones | El PT está autenticado (web o mobile). El alumno existe y está activo. |
| Postcondiciones | Se crea un registro en `routines` vinculado al alumno. Los ejercicios quedan en `routine_exercises`. El alumno ve la rutina al próximo acceso desde cualquiera de sus dispositivos. |

**Flujo principal**

1. El PT accede al perfil del alumno y selecciona "Nueva rutina" (la web ofrece editor más cómodo, pero también disponible en mobile).
2. Elige el origen: armar desde cero, partir de una plantilla existente, o generar con IA (CU-03).
3. Completa nombre, objetivo y días de la semana.
4. Agrega/edita ejercicios desde la biblioteca con sus parámetros (series, reps, descanso, tempo, peso sugerido, notas).
5. Ordena los ejercicios.
6. Guarda la rutina → el sistema persiste en `routines` y `routine_exercises`.
7. La rutina queda activa (`active = true`).

**Flujos alternativos**

- **2a:** Usa plantilla → el sistema precarga los ejercicios y el PT los personaliza.
- **2b:** Genera con IA → ver CU-03.
- **4a:** El ejercicio no existe en la biblioteca → el PT lo crea desde el mismo flujo.

**Flujos de error**

- **E1:** Se intenta guardar sin al menos 1 ejercicio → el sistema bloquea y muestra validación.

---

## CU-05 — Ejecutar una sesión de entrenamiento

**Actor:** Alumno

| Campo | Detalle |
|---|---|
| Precondiciones | El alumno está autenticado. Tiene al menos una rutina activa asignada. La mobile es la plataforma esperada por el contexto (gym); desde la web se puede hacer una versión simplificada (ver "Qué hace el alumno en cada plataforma"). |
| Postcondiciones | Se crea un registro en `sessions`. Cada serie ejecutada queda guardada en `session_sets`. Si hubo modificaciones, `sessions.has_modifications = true` y el PT recibe notificación. |

**Flujo principal**

1. El alumno abre la app (típicamente la mobile en el gym) → ve la rutina del día.
2. Toca "Iniciar sesión" → el sistema crea un registro en `sessions` con `started_at = now`.
3. Por cada ejercicio, el alumno ve las series pendientes con el peso sugerido y el del último entrenamiento.
4. Al completar una serie: ingresa el peso real y las reps → el sistema guarda en `session_sets`.
5. La app inicia el timer de descanso automáticamente.
6. Al terminar todos los ejercicios, el alumno toca "Finalizar sesión".
7. La app pide el RPE (1-10) y una nota opcional; el alumno puede saltearlo con un toque.
8. El sistema actualiza `sessions` con `finished_at = now` y, si el alumno lo cargó, rpe y notes. El feedback viaja en el `POST` de la sesión si todavía no subió, o en un `PATCH /sessions/:id` si ya estaba subida.
9. Sistema dispara la evaluación de logros y challenges (CU-08).

**Flujos alternativos**

- **1a:** El alumno entrena otra rutina (no la del día) desde Mis rutinas → abre su detalle y toca "Empezar"; sigue en el paso 3. Si ya tiene una sesión abierta de otra rutina, primero tiene que terminarla.
- **4a:** El alumno saltea una serie → la marca como omitida (`completed = false`).
- **4b:** El alumno reemplaza un ejercicio (máquina ocupada o no disponible) → abre el chat IA o lo selecciona manualmente. Se registra `substituted_exercise_id` y `has_modifications = true`.
- **6a:** El alumno abandona la sesión sin finalizar → queda guardada parcialmente, puede retomar más tarde desde cualquier dispositivo.
- **W1 (web):** la sesión vive en el navegador (`localStorage`) y se sube entera al terminar, con el mismo contrato de la mobile. Si queda una a medias, Hoy ofrece "Continuar" o "Descartar"; no incluye 4b (reemplazar ejercicio).

**Flujos de error**

- **E1:** Sin conexión (escenario típico de la mobile en el gym) → los datos se guardan localmente (modo offline) y se sincronizan al recuperar red. El asistente IA queda deshabilitado con aviso.
- **E2 (web):** si falla la subida, las series siguen guardadas en el navegador y la pantalla ofrece Reintentar (reintentar no duplica). Si el error es permanente, ofrece "Descartar entrenamiento". No hay sincronización en segundo plano: con la sesión terminada pero sin guardar, Hoy ofrece "Terminar de guardar".

---

## CU-06 — Consultar asistente IA del alumno (en sesión)

**Actor:** Alumno + Asistente IA

| Campo | Detalle |
|---|---|
| Precondiciones | El alumno tiene una sesión activa y conexión a internet. **Pendiente en ambas plataformas** (tarjetas de IA pospuestas); el menú del alumno en la web no lo muestra. |
| Postcondiciones | El mensaje queda guardado en `chat_messages`. El alumno recibe respuesta con sugerencias o información. |

**Flujo principal**

1. Desde la pantalla del ejercicio, el alumno abre el chat IA.
2. Escribe su consulta. Ejemplos:
   - "El jalón polea está ocupado, ¿cómo lo reemplazo?"
   - "¿Cómo es la técnica correcta para el peso muerto?"
   - "¿Qué calentamiento hago si hoy toca pecho?"
3. La app envía el mensaje al backend con el contexto: ejercicio actual, músculo objetivo, equipamiento disponible.
4. El backend hace POST al webhook n8n `student-ia`.
5. n8n arma el prompt con todo el contexto y llama al LLM.
6. El LLM devuelve respuesta con (cuando aplica) 2-3 alternativas concretas.
7. La respuesta se muestra en el chat y se guarda en `chat_messages`.
8. Si fueron sugerencias de reemplazo, el alumno puede seleccionar una y aplicarla a la sesión.

**Flujos alternativos**

- **8a:** El alumno aplica un reemplazo → ver CU-05 flujo alternativo 4b.

**Flujos de error**

- **E1:** n8n no responde en menos de 10s → la app muestra "El asistente no está disponible ahora" y permite seguir sin él.
- **E2:** Sin conexión → la app muestra "El asistente IA requiere conexión" y deshabilita el chat hasta recuperar señal.

---

## CU-07 — Ver progreso de un alumno

**Actor:** Personal Trainer

| Campo | Detalle |
|---|---|
| Precondiciones | El PT está autenticado (web o mobile). El alumno tiene al menos una sesión completada. |
| Postcondiciones | El PT visualiza historial, progresión de cargas, evolución de medidas, modificaciones de rutina, logros y challenges. La web ofrece la mejor experiencia gráfica; la mobile permite consulta rápida en movimiento. |

**Flujo principal**

1. El PT accede al perfil del alumno desde su cliente preferido.
2. Selecciona la pestaña "Progreso".
3. El sistema carga: historial de sesiones (fecha, duración, RPE), gráficos de progresión por ejercicio, evolución de peso y medidas, logros desbloqueados, challenges en curso.
4. El PT puede filtrar por ejercicio para ver la curva de progresión a lo largo del tiempo.
5. El PT puede ver qué sesiones tuvieron modificaciones (`has_modifications = true`) y cuáles fueron.
6. El PT puede dejar un comentario en cualquier sesión pasada.

**Flujos alternativos**

- **3a:** El alumno no tiene sesiones aún → el sistema muestra estado vacío con mensaje orientativo.

---

## CU-08 — Detectar logros y actualizar challenges (sistema)

**Actor:** Sistema (trigger post-sesión + cron diario)

| Campo | Detalle |
|---|---|
| Precondiciones | El alumno acaba de finalizar una sesión, o el cron diario está corriendo. |
| Postcondiciones | Se crean los registros correspondientes en `student_achievements` y se actualiza `current_progress` en `student_challenges`. Se envían notificaciones al alumno y al PT (en sus respectivos clientes activos). |

**Flujo principal — trigger post-sesión**

1. Al finalizar una sesión, el sistema evalúa los logros:
   - ¿Es un PR (Personal Record) en algún ejercicio? → desbloqueá `FIRST_PR` o `NEW_PR`.
   - ¿Cumplió N días asignados seguidos (ver [[adr/0005-racha-contra-dias-asignados|ADR 0005]])? → desbloqueá `STREAK_7_DAYS`, `STREAK_30_DAYS`, etc.
   - ¿Completó X sesiones totales? → desbloqueá `MILESTONE_10`, `MILESTONE_50`, etc.
2. Para cada logro nuevo, crea un registro en `student_achievements` con `unlocked_at = now`.
3. Actualiza `current_progress` en los challenges activos del alumno.
4. Si un challenge llegó al `goal_value`, lo marca como `completed` y desbloquea su `reward_achievement_id` si lo tuviera.
5. Crea notificaciones en `notifications` ([[adr/0006-notificaciones-tabla-fuente-de-verdad-fcm-v1|ADR 0006]]):
   - **Récord (`pr`):** una por sesión, para el alumno y para el PT.
   - **Logro (`achievement`):** una por logro, para el alumno y para el PT.
   - Todas quedan guardadas; el **push** (FCM) va solo al alumno. El PT ve los récords y logros de sus alumnos en su listado, sin push. Con varios logros en la misma sesión, el alumno recibe un único push resumen.
   - Los logros que desbloquea el cron diario quedan solo en la base (una fila por logro para el alumno y para el PT), sin push.
   - Las series que se suben tarde a una sesión ya cerrada también disparan estos avisos (el de récords, una sola vez por sesión).

**Flujo cron diario**

1. Para cada challenge `active`, el cron verifica si `ends_at < now`.
2. Si terminó sin alcanzar la meta, lo marca como `failed`.
3. Notifica al alumno y al PT.

**Flujos de error**

- **E1:** Error al evaluar criterios complejos → log y reintento al final del día.
- **E2:** Falla el aviso (notificación o push) → se loguea y no afecta el cierre de la sesión ni la evaluación de logros.

---

## CU-10 — Enviar alerta de alumno inactivo o con modificaciones

**Actor:** Sistema (cron job nocturno)

| Campo | Detalle |
|---|---|
| Precondiciones | El job nocturno está activo. |
| Postcondiciones | El PT recibe notificaciones por inactividad de alumnos y por modificaciones recientes en rutinas, en cualquiera de sus clientes activos. |

**Flujo principal — inactividad**

1. El cron nocturno revisa todos los alumnos activos.
2. Para cada alumno calcula cuántos **días asignados** se saltó desde su última sesión cerrada (misma regla de días asignados que la racha, [[adr/0005-racha-contra-dias-asignados|ADR 0005]]): la unión de los días de sus rutinas activas. Un alumno sin rutina activa se saltea (no se le avisa al PT). Hoy no cuenta. Si nunca entrenó, se cuenta desde que se dio de alta (`created_at`).
3. Si se saltó **3 o más** días asignados y no se le avisó al PT por ese alumno en los últimos **7 días** (contados por fecha de Buenos Aires: el aviso se puede repetir recién 7 días después de la fecha del anterior), crea una notificación de tipo `inactivity` para el PT (`data`: `student_id`, `missed_days`, `days_since`). El umbral es fijo, no lo configura el PT.
4. Envía push al PT vía FCM a todos los dispositivos que tenga registrados (`push_tokens`). La web (Web Push) usa la misma tabla cuando se integre.

**Flujo principal — modificaciones**

1. Cuando una sesión pasa a tener modificaciones (`has_modifications = true`), se genera una notificación inmediata para el PT (tipo `routine_modified`, una sola vez por sesión) con el detalle de qué ejercicio sustituyó el alumno y por cuál, y se le envía push.

**Flujos de error**

- **E1:** FCM o Web Push no disponibles (o sin credenciales, o el token es inválido) → la notificación **igual queda guardada** en `notifications`: es la fuente de verdad y el PT la ve en su listado. El push es best-effort y **no se reintenta**. Si FCM indica que un token ya no es válido, se borra de `push_tokens`.

---

## CU-25 — Crear y asignar desafío (web)

**Actor:** Personal Trainer

> **Numeración:** este caso de uso se numera CU-25 para coincidir con el [[arquitectura/diagrama-casos-de-uso|diagrama de casos de uso]] (donde CU-09 es "Comentar sesión del alumno"). Antes figuraba acá como CU-09.

| Campo | Detalle |
|---|---|
| Precondiciones | El PT está autenticado en la web. |
| Postcondiciones | Si crea un desafío, se guarda en `challenges` (propio del PT). Si asigna una plantilla o un desafío propio a alumnos, se crean registros en `student_challenges`. |

**Flujo principal**

1. El PT entra a "Desafíos" del menú. La página tiene dos secciones: "Plantillas" (los 4 desafíos globales que vienen con la app: "12 sesiones en 30 días", "Racha de 2 semanas", "10 toneladas en 4 semanas" y "8 sesiones en 4 semanas") y "Mis desafíos" (los que creó él).
2. En "Plantillas" elige una y toca "Asignar". Las plantillas se asignan directamente, sin copiarse ni modificarse.
3. El PT elige alumnos con un buscador (hasta 50 por vez) y confirma con "Asignar". El sistema crea los `student_challenges` con `started_at = now` y `ends_at = now + duration_days`.
4. El PT sigue el progreso del desafío en la card "Logros y racha" de la ficha de cada alumno. El alumno ve su desafío activo y su avance en "Mi progreso" de la web (tarjeta 50); la vista en la mobile está pendiente.

**Flujos alternativos**

- **1a:** El PT borra un desafío propio → solo se permite si no tiene asignaciones. Las plantillas globales no se pueden borrar.
- **2a:** El PT crea un desafío nuevo desde cero: nombre, tipo de meta (sesiones, racha, volumen o peso corporal), valor meta (entero en sesiones y racha; en kg admite decimales, con coma), duración en días y descripción opcional. El premio "Desafío cumplido" es opcional (viene activado por defecto) y el alumno lo recibe **solo la primera vez** que completa un desafío; los siguientes no lo repiten. Al crearlo se abre "Asignar" (paso 3).
- **2b:** Al crear, el PT elige "Ahora no" → el desafío queda en "Mis desafíos", disponible para asignar más tarde.
- **3a:** Algún alumno elegido ya tiene ese desafío activo → aparece marcado "Ya lo tiene", no se le vuelve a asignar y al confirmar un aviso lista a los alumnos salteados.

**Flujos de error**

- **E1:** Se intenta asignar a más de 50 alumnos por vez → el backend rechaza el pedido (400) y no asigna a nadie. Si entre los elegidos hay alumnos que no son del PT (o están inactivos), el backend los saltea (`not_your_student`), asigna al resto y los lista en el aviso.
