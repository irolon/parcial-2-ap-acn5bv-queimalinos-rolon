---
tags: [spec]
tarjeta: E11
---
# Spec — E11 · Mensajes del entrenador

- **Tarjeta:** [E11 del tablero del entrenador](https://trello.com/c/wMcMR7aw).
- **Fecha:** 2026-11-01.
- **Rama:** `feature/android-entrenador-mensajes`, apilada sobre `feature/android-entrenador-notificaciones` (E12, PR #67), con `origin/feature/messaging` (#47, aprobada y todavía sin mergear) mergeada. Cuando la #47 entre a develop, el diff se achica solo.
- **Diseño:** prototipo `EM_Mensajes` (`docs/design/prototype-src/ent-mobile.jsx`): cabecera con avatar y nombre, burbujas (alumno a la izquierda en gris; PT a la derecha en azul, con hora y ✓✓), separador de día y caja de texto redonda con botón de enviar. "EN LÍNEA" no aplica: no hay presencia.
- **API:** la de la #47 (`docs/arquitectura/contratos-api.md` § Mensajes): `GET /messages/conversations`, `GET /messages/:studentId` (paginado hacia atrás con `before`), `POST /messages/:studentId`, `POST /messages/:studentId/read`, `POST /messages/broadcast`. Sin push: se actualiza por polling, como la web (4 s con el chat abierto, 15 s para la lista y el globito).

> **Cómo quedó (01/11):**
> - **E2E en el emulador** con el backend local y Supabase dev, que ya tiene la tabla `messages` y el bucket:
>   1. El PT le escribió a `alumna.card8` desde el chat.
>   2. Como alumna, `GET /messages/unread-count` dio 1 y el historial trajo el mensaje (criterio de aceptación).
>   3. La alumna marcó leído y contestó por API: con el chat abierto, la respuesta apareció sola en unos 4 s y el mensaje del PT pasó a "✓✓".
>   4. Con el PT en el Inicio, otro mensaje de la alumna prendió el globito de Mensajes (1) en unos 15 s.
>   5. Difusión a 2 alumnos: "Enviado a 2 alumnos", con la etiqueta DIFUSIÓN en el chat.
>   6. El botón "Mensaje" de la ficha abre el chat, y Atrás vuelve a la ficha.
> - **Bug encontrado en el E2E:** el texto de la difusión perdía letras al escribir rápido ("Rerden qu el lunes…"). Las cajas de texto leían su valor del StateFlow combinado, que se actualiza de forma asíncrona. Ahora el borrador del chat y el texto de la difusión son `mutableStateOf` en el ViewModel (sincrónicos). Repetido el E2E, el texto llegó entero.
> - **Base:** `feature/messaging` (#47) mergeada en la rama. Conflictos de unión en `students.repository.js` (las funciones de adherencia de E1 más las de mensajería) y en dos docs de casos de uso (CU-27 y CU-11). Backend: 1124 tests en verde después de `npm ci` (la #47 suma `multer`).
> - **Ronda 1 de Codex:**
>   - Un chat guardado sin mensajes ahora cuenta como primera carga, así guarda el cursor de una página llena.
>   - Las fotos de páginas viejas se renuevan: cada mensaje guarda `fetchedAt` (cuándo se firmó su URL). Si alguna tiene más de 50 min, el refresco re-pide hasta 100 mensajes desde ella y actualiza los que ya estaban.
> - **Ronda 3 de Codex (02/11), firma best-effort de la #47:** si Storage falla, el backend manda `image_url: null`. `keepSigned` (en `TrainerMessagesRepository`) conserva la URL guardada con su `fetchedAt` viejo, así la foto se sigue viendo y la renovación la vuelve a pedir. Una de solo foto que nunca se firmó queda con `fetchedAt` 0 y se reintenta en el próximo refresco; mientras tanto, la burbuja dice "Foto no disponible". Tests: `TrainerMessagesRepositorySigningTest`. **Límite conocido (decisión de Igna, 02/11: no se toca el backend de mensajes):** un mensaje con texto y foto, de una página vieja que se cargó durante la caída, llega igual que uno de solo texto y su foto no se recupera. Quedó como sugerencia opcional a Pablo en `backend/README.md` (`has_image`).
> - **La hora** del emulador salió en UTC (00:03): el emulador no tiene la zona argentina. En un celular usa la zona del sistema.

## 1. Objetivo

La pestaña Mensajes del entrenador deja de ser un placeholder. Muestra sus conversaciones con los no leídos, un chat 1 a 1 con cada alumno y un envío de difusión a varios.

**Criterio de aceptación:** el entrenador le escribe a un alumno desde el celular y el alumno lo recibe.

## 2. Decisiones

- **Offline-first como el resto:** lista y chat se leen de Room (v21) y se refrescan desde la API. Enviar, marcar leído y difundir son solo online, como todas las escrituras del entrenador (E8-E14). Sin red, la caja de texto se deshabilita y se ve lo guardado.
- **Solo texto para enviar.** Las fotos que manda el alumno se ven, con Coil y la URL firmada. Mandar fotos desde el celular queda fuera de E11, porque suma selector, compresión y multipart; el botón "+" del prototipo no va.
- **Polling con la pantalla visible:**
  - con el chat abierto, cada 4 s;
  - globito de la pestaña Mensajes: cada 15 s, mientras la app está en primer plano. Su número sale de Room (la suma de `unread_count`), igual que la lista.
- **Leído:** el chat marca leído al abrirse y cada vez que el polling trae mensajes nuevos del alumno; en Room, el `unread_count` de esa conversación pasa a 0. Los mensajes propios muestran "✓✓" cuando `read_at` no es null.
- **Historial:** se guarda la página más nueva (50). "Ver anteriores" pide la siguiente con `next_before` tal cual. Si el refresco trae una página llena cuyo mensaje más viejo es más nuevo que el último guardado, se perdió el hilo del medio: se reemplaza el chat por esa página (y su cursor).
- **Difusión:** desde la lista, botón "Difusión". Abre una hoja con los alumnos activos (los de la lista de conversaciones), "Todos", casillas y el texto (1-2000). Manda un solo `POST /messages/broadcast` y avisa "Enviado a N alumnos". En el chat, los mensajes de una difusión llevan la etiqueta DIFUSIÓN.
- **Errores al enviar:**
  - 409 `STUDENT_INACTIVE`: "El alumno está dado de baja" y la caja queda deshabilitada;
  - 403: la conversación ya no es del PT y se vuelve a la lista;
  - red: el texto queda en la caja con "No se pudo enviar. Probá de nuevo".
- **Ficha del alumno:** botón "Mensaje" que abre el chat.
- **Concurrencia:** un Mutex por entrenador en el repositorio, como en E10/E14, para que un GET viejo no pise un mensaje recién enviado.

## 3. Pantallas

- **Mensajes (pestaña):**
  - título "Mensajes" y botón "Difusión";
  - una fila por alumno activo: iniciales, nombre, vista previa ("Vos: …" si lo mandó el PT, "📷 Foto" si fue solo una foto, "Sin mensajes todavía") y hora (HH:mm hoy, "ayer", dd/MM antes);
  - un globito con los no leídos;
  - pull para refrescar;
  - estados: cargando, error con reintento, sin alumnos ("Todavía no tenés alumnos activos"), sin conexión con lo guardado.
- **Chat:**
  - flecha atrás, iniciales y nombre;
  - burbujas agrupadas por día (HOY, AYER, fecha);
  - "Ver anteriores" arriba si hay más;
  - caja de texto con contador al acercarse a 2000 y botón de enviar (44 dp);
  - abre al final y baja solo cuando llega un mensaje y ya estaba abajo.
- **Hoja de difusión:** como la de asignar desafíos (E14): búsqueda con más de 8 alumnos, casillas, "Todos", texto y "Enviar a N".

## 4. Datos (Room v21, AutoMigration 20→21)

- `trainer_conversations` (trainerId, studentId, name, avatarUrl, lastBody, lastHasImage, lastSenderRole, lastAt, unreadCount, position)
- `trainer_conversations_sync` (trainerId, fetchedAt)
- `trainer_messages` (trainerId, id, studentId, senderRole, body, imageUrl, broadcastId, readAt, createdAt)
- `trainer_message_threads` (trainerId, studentId, counterpartName, nextBefore, fetchedAt)

Todo se borra al cerrar sesión (`UserDataCleaner`).

## 5. Pruebas

- **Unitarias:**
  - repositorio: refresh, hueco, más viejos, enviar con 409/403/red, leer, difusión y carrera GET-vs-POST;
  - textos: vista previa, hora y separadores;
  - ViewModels: lista, chat (polling, leído, enviar) y difusión.
- **Migración:** `MigrationV21Test` en el emulador.
- **E2E en el emulador con el backend local:**
  1. El PT abre Mensajes, entra al chat de `alumna.card8` y le escribe.
  2. Como alumna, `GET /messages/:id` por API muestra el mensaje (criterio de aceptación). La alumna contesta por API.
  3. Al PT le aparece en el chat y en el globito.
  4. Difusión a dos alumnos.
