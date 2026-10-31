---
title: ADR 0006 — Notificaciones: la tabla es la fuente de verdad y el push es un aviso (FCM v1)
aliases: [ADR 0006 — Notificaciones, Notificaciones tabla fuente de verdad, FCM HTTP v1]
creado: 2026-10-30
tags: [arquitectura, adr]
---

# ADR 0006 — Notificaciones: la tabla es la fuente de verdad y el push es un aviso (FCM v1)

- **Estado:** aceptado
- **Fecha:** 2026-10-30

## Contexto

La tarjeta 44 pide que el PT se entere cuando un alumno deja de entrenar, y
que alumno y PT reciban avisos de récords, logros, comentarios y rutinas
modificadas. Quedaban varias decisiones abiertas:

- El CU-10 (E1) decía que, si FCM no estaba disponible, "el registro queda
  pendiente y se reintenta". Eso obliga a una cola, estados y un reintentador.
- La tarjeta menciona una `FCM_SERVER_KEY`. Esa API (la "legacy" de FCM) la
  apagó Google en 2024: hoy solo existe FCM HTTP v1, que autentica con la
  cuenta de servicio de Firebase.
- El criterio de aceptación exige que, con el token de FCM inválido, la
  notificación igual quede registrada.
- La regla de inactividad del CU-10 hablaba de "días desde la última sesión"
  y de un "umbral configurado por el PT", que no existe en el modelo, y un
  alumno con rutina de 3 días por semana quedaría "inactivo" cada martes.

## Decisión

1. **La tabla `notifications` es la fuente de verdad.** Toda notificación se
   inserta primero; si el insert falla, la operación falla. La campanita de
   la web y la bandeja de la app leen de la tabla (`GET /notifications`),
   no dependen de que el push haya llegado.
2. **El push es best-effort y sin reintentos.** Después de guardar, se
   intenta enviar a todos los tokens del usuario (`push_tokens`). Si alguno
   sale, se marca `notifications.push_sent_at`. Si falla, se loguea y no se
   hace nada más: no hay cola ni estado "pendiente". Los disparadores
   (sesión cerrada, rutina modificada, comentario) van en `try/catch` y
   nunca rompen la operación que los origina. Esto reemplaza el E1 del CU-10.
3. **FCM HTTP v1 con cuenta de servicio, sin `firebase-admin`.** El backend
   firma un JWT RS256 con `jsonwebtoken` (ya es dependencia), lo cambia por
   un access token OAuth2 (scope `firebase.messaging`, cacheado hasta un
   minuto antes de que venza) y hace `fetch` a
   `https://fcm.googleapis.com/v1/projects/{project_id}/messages:send`. La
   credencial viene de `FCM_SERVICE_ACCOUNT_PATH` (local) o
   `FCM_SERVICE_ACCOUNT_JSON` en base64 (VPS). Sin credenciales, o con un JSON
   inválido, el push queda deshabilitado con un aviso en el log y las
   notificaciones se siguen guardando. No existe `FCM_SERVER_KEY`.
4. **Un token se borra solo cuando FCM lo señala a él:** error
   `UNREGISTERED`, o un 400 con violación sobre `message.token` (token
   inválido). Un 404 o 400 genérico (proyecto, API deshabilitada, payload),
   un 401, un timeout o un error de red **no** borran nada: de lo contrario
   una mala configuración vaciaría la tabla `push_tokens` de todos.
5. **Política de push por tipo y rol.** Todas las notificaciones se guardan
   para su destinatario; solo algunas además se envían al celular:

   | Tipo | Alumno | PT |
   |---|---|---|
   | `inactivity` | — | push |
   | `routine_modified` | — | push |
   | `pr` | push | solo base |
   | `achievement` | push | solo base |
   | `comment` | push | — |

   El PT no recibe push por cada récord o logro de sus alumnos (sería ruido
   con muchos alumnos), pero sí los ve en su listado. Los logros que
   desbloquea el job nocturno quedan solo en la base; con varios logros en
   una misma sesión, hay una fila por logro y un único push resumen.
6. **Inactividad contra los días asignados.** Un alumno está inactivo
   cuando acumula **3 o más días asignados sin entrenar** desde su última
   sesión cerrada (hoy no cuenta; sin sesiones, desde `students.created_at`).
   Se reutiliza la regla de [[adr/0005-racha-contra-dias-asignados|ADR 0005]]:
   días asignados = unión de los `days` de las rutinas activas; un alumno
   sin rutina activa se saltea (no hay días que perder). Se avisa **como máximo una vez cada
   7 días por alumno** (se busca una `inactivity` previa con el mismo
   `data.student_id`). El umbral es una constante (`INACTIVITY_MISSED_DAYS`),
   no configurable por PT. Corre en el job nocturno de las 03:00 ART, después
   del de gamificación.

## Alternativas

- **Cola de envíos con reintentos:** garantiza más entregas, pero suma una
  tabla de estados, un worker y casos de duplicados. Para avisos que además
  están en la bandeja no justifica la complejidad. Descartada.
- **`firebase-admin`:** resuelve la autenticación sola, pero es una
  dependencia grande para un único endpoint; con `jsonwebtoken` y `fetch`
  alcanza. Descartada.
- **Server key legacy:** apagada por Google. No es una opción.
- **Borrar el token ante cualquier 400/404:** más simple, pero un error de
  configuración (proyecto equivocado, API sin habilitar) borraría todos los
  tokens. Descartada.
- **Push al PT por cada récord y logro:** informa más, pero con varios
  alumnos satura. Quedan en el listado.
- **Inactividad por días corridos:** castiga al alumno que cumple una rutina
  de pocos días por semana (mismo argumento del ADR 0005).
- **Umbral configurable por PT:** no hay dónde guardarlo todavía; queda fuera
  de alcance.

## Consecuencias

- Un push perdido no se recupera: el usuario lo ve igual al abrir la app o la
  web. Es la contracara aceptada de no tener reintentos.
- Mientras no haya proyecto Firebase configurado, el backend funciona igual
  (notificaciones solo en la base). El push real al celular se verifica
  cuando la app Android integre FCM.
- Una notificación puede tener `push_sent_at` nulo por varias razones (sin
  credenciales, sin tokens, política "solo base" o error): el campo dice si
  algún dispositivo la recibió del lado de FCM, no el motivo.
- Un alumno nuevo sin sesiones puede generar el aviso a los 3 días asignados
  desde su alta.
- Cambiar la rutina activa cambia los días asignados "hacia atrás", igual que
  con la racha (ADR 0005).
- El `check` de `notifications.type` no incluye notificaciones de desafíos;
  los turnos (`appointment`) llegan con su propia tarjeta.
