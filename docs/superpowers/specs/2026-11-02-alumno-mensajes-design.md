---
tags: [spec]
tarjeta: 18
---
# Spec — 18 · Chat PT–alumno en mobile (lado del alumno)

- **Tarjeta:** [18 del tablero de Igna](https://trello.com/c/OIVlFTLR) (equipo: https://trello.com/c/YHWsGsJz). P2, ~14 h.
- **Fecha:** 2026-11-02.
- **Rama:** `feature/android-mensajes-alumno`, apilada sobre `feature/android-entrenador-mensajes` (E11, PR #68). Reusa la red, Room y los componentes del chat del entrenador.
- **Backend:** el de la tarjeta 48 (#47, ya en develop). No se toca.

> **Cómo quedó (02/11):**
> - **E2E en el emulador** con el backend local (`alumna.card8` ↔ `profe.card8`): el PT le escribió por API, la pestaña Mensajes mostró el globito (3) y, al abrirla, el chat con el PT y los no leídos se marcaron leídos. La alumna contestó con texto y con una foto de la cámara del emulador con epígrafe: pidió el permiso de cámara, mostró la miniatura con ✕ y la mandó. Como PT, por API: la foto llegó firmada (JPEG de 23 KB); al marcarla leída, la alumna vio "✓✓" en el próximo refresco. Capturas en `assets/18/`.
> - **Bug encontrado por el test instrumentado:** con `inJustDecodeBounds`, `decodeStream` devuelve siempre null, y el compresor lo tomaba como error. `PhotoCompressorTest` (3 casos: 4000×3000 → 1600×1200, EXIF girado y una uri que no es foto) pasa en el emulador.
> - **Ronda 1 de Codex:**
>   - Un envío solo limpia la foto que mandó: si en el medio se eligió otra, queda.
>   - Marcar leído también marca en Room los mensajes del otro lado (`markIncomingRead`, hasta el más nuevo guardado al pedirlo), incluidas las páginas viejas. Así el globito baja y no se repite el pedido. Le sirve también al PT de E11.
>   - El compresor resuelve las ocho orientaciones EXIF, con los reflejos, como androidx ExifInterface.
>   - El borrador (texto y foto) vive en `SavedStateHandle`.
>   - Tests: `StudentChatDraftTest`, `TrainerMessagesRepositoryReadTest` y `PhotoCompressorTest` 4/4, con una imagen asimétrica.
> - **Con 5 pestañas** "Mis rutinas" se partía en dos líneas: la pestaña pasa a llamarse "Rutinas" (la pantalla sigue diciendo "Mis rutinas").
> - **`RoleShell` estaba en 200 líneas:** el contenido de cada pestaña pasó a `navigation/RoleTabContent.kt`.
> - **No se probó:** la galería en el E2E (está cubierta en el ViewModel, que recibe la uri igual que con la cámara) y un celular físico.
> - **En Supabase dev quedaron** mensajes de prueba entre `profe.card8` y `alumna.card8`, uno con la foto y uno con el texto roto por la consola de Windows (`curl` sin UTF-8).

## 1. Objetivo

El alumno tiene, en el celular, la misma conversación con su entrenador que ya tiene en la web: lee, contesta con texto y manda una foto de la cámara o de la galería.

**Criterio de aceptación (tarjeta):** "el alumno recibe un push de mensaje nuevo, lo toca, se abre la conversación y responde con una foto de la cámara. El PT lo ve en la web."

**Qué parte del criterio se cumple:** abrir la conversación, responder con una foto de la cámara y que el PT la vea en la web. **El push no:** el backend no genera notificaciones de mensajes (contrato: "se actualiza por polling, no hay tiempo real"), y la decisión de Igna del 02/11 es no tocar el backend de mensajes de Pablo. El aviso de mensaje nuevo es el globito de la pestaña, que se actualiza por polling. El push queda como pedido a Pablo en `backend/README.md` y como pendiente de la tarjeta.

## 2. Decisiones (de Claude, con el OK de Igna de "arrancá con lo que te parezca")

1. **Pestaña "Mensajes"** en el alumno, entre Mis rutinas y Perfil: Hoy · Progreso · Mis rutinas · Mensajes · Perfil. El alumno tiene una sola conversación (con su PT), así que la pestaña **es** el chat, sin lista.
2. **Globito de no leídos** en la pestaña: los mensajes del PT sin leer que hay en Room. Con la app en primer plano, el chat se refresca cada 15 s (como la web y como el globito del PT). Al abrir la pestaña se marcan leídos.
3. **Offline-first como el resto, con escritura solo online.** El chat se lee de Room y se refresca desde la API (cada 4 s con la pantalla visible). Enviar es solo con red: la API no acepta un id del cliente, así que un envío encolado y reintentado se duplicaría. Sin red, la caja dice "Sin conexión: conectate para escribir", como en E11.
4. **Fotos.** Un botón de adjuntar al lado de la caja abre una hoja con **Sacar foto** (cámara del sistema, `TakePicture` con un `FileProvider` en la caché) y **Elegir de la galería** (`PickVisualMedia`, sin pedir permisos).
   - La foto se ve como miniatura arriba de la caja, con una ✕ para sacarla. El texto de la caja va como epígrafe (opcional).
   - Antes de subirla se achica a 1600 px del lado más largo y se re-codifica en JPEG 85, respetando la orientación EXIF. Así queda muy por debajo de los 5 MB del backend y sube rápido con datos.
   - Se manda por `multipart/form-data` (`image` y, si hay, `body`). Errores: 413/415 → "La foto no se pudo mandar (tiene que ser JPG, PNG o WebP de hasta 5 MB)".
5. **Reuso de E11.** El chat del alumno usa la misma capa que el del PT: `TrainerMessagesApi` (los endpoints de historial, envío y leído son los mismos para los dos roles), `TrainerMessagesRepository` para el hilo y los mismos componentes (burbuja, caja, filas por día).
   - En el caché, el dueño del chat del alumno es el propio alumno: la columna `trainerId` de `trainer_messages` y `trainer_message_threads` es "el dueño del caché". **Deuda de nombres:** renombrar esas tablas a `messages`/`message_threads` con `ownerId` queda fuera de esta tarjeta (cambiaría la v21 de la #68, que está en revisión).
   - `MessageBubble` recibe `mine` (antes era siempre `fromTrainer`): para el alumno, sus mensajes van a la derecha en azul y los del PT a la izquierda. El "✓✓" es para los propios ya leídos por el otro.
   - La foto también queda disponible para el PT en el repositorio (`sendPhoto`), pero su pantalla no cambia: mandar fotos desde el celular del PT no es parte de esta tarjeta.
6. **Errores del alumno.** 403 → la conversación no es suya (no debería pasar): "No pudimos abrir la conversación". 409 `STUDENT_INACTIVE` → "Tu cuenta está dada de baja", con la caja deshabilitada.
7. **Room:** no cambia el esquema (sigue la v21 de la #68).

## 3. Fuera de alcance

- ~~Push de mensajes y su tap a la conversación (necesita backend).~~ Hecho del lado del celular el 02/11 (ver abajo); el push lo genera la #70 de Pablo.
- Fotos desde el celular del PT, varias fotos por mensaje, borrar o editar mensajes.
- El renombre de las tablas de mensajes (ver 2.5).

## 4. Pruebas

- **Unitarias:** repositorio (enviar foto con y sin texto, 413/415), ViewModel del chat del alumno (polling, leído al llegar, sin red, foto adjunta y sacada, epígrafe), globito (no leídos de Room y polling), compresión (tamaño y orientación con una imagen generada en el test).
- **Instrumentada:** ninguna nueva de Room (no cambia el esquema).
- **E2E en el emulador** con el backend local: alumna `alumna.card8` lee el mensaje del PT, contesta con texto y con una foto de la cámara del emulador; `profe.card8` la ve en la web (o por API).

## Tap del push de mensaje (02/11, sobre la #70)

La #70 (backend, de Pablo) manda un push por mensaje nuevo, sin fila en `notifications`, con `data: { type: "message", student_id }`. En el celular:

- `destinationOf("message")` da `NotificationDestination.Conversation(student_id)`. Si no viene el alumno, cae a la lista de avisos, igual que los demás tipos rotos.
- El resolver lo manda a la pestaña Mensajes si es el alumno (y solo si `student_id` es él: un push viejo de otra cuenta se descarta) y al chat de ese alumno si es el entrenador. No hay aviso para marcar como leído; el chat marca leído al abrirse.
- Pasos de navegación: el alumno va a su pestaña Mensajes (si ya está ahí, nada); el entrenador pasa por Mensajes y apila el chat, así Atrás vuelve a la lista de conversaciones.
- Al llegar el push, `PushRefresher` refresca el chat en Room (y al entrenador también la lista de conversaciones, que lleva los globitos), no la lista de avisos.
- Los mensajes de una misma conversación comparten la notificación (tag `message:<student_id>`): queda el último y no se apilan diez.
- Si el entrenador ya tiene abierto el chat de ese alumno (desde Mensajes o desde la ficha), no se navega: recrearlo perdería el borrador. El alumno vuelve a su pestaña Mensajes como la dejó (`restoreState`, igual que la barra), con su borrador.
- **Solo en primer plano:** la #70 manda `notification` + `data`. Con la app en segundo plano, FCM no llama a `onMessageReceived`: Android muestra el aviso solo, con su título y cuerpo, así que ni el refresco ni el tag corren y cada mensaje queda como un aviso aparte. El tap sí funciona igual, porque los `data` llegan como extras del intent. Al abrir la app, el chat y los globitos se refrescan por polling. Para que Android los agrupe también en segundo plano, el backend tendría que mandar `android.notification.tag`; quedó como pedido en `backend/README.md`. Un push solo `data` cambiaría el contrato de todos los tipos y no se pidió.
- Fuera de alcance: no mostrar el push si esa conversación ya está abierta en pantalla.

Probado con tests (13 nuevos, 1424 en total) y en el emulador simulando el tap (el intent con los mismos extras del push): la alumna cae en su chat; el entrenador, desde Inicio, desde Más, con la app cerrada y recién logueado, cae en el chat de la alumna y Atrás vuelve a Mensajes y a Inicio. Contra FCM real queda para cuando entre la #70.
