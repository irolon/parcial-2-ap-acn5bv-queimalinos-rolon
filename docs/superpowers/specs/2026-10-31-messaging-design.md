---
tags: [spec, tarjeta-48]
---

# Mensajería interna PT ↔ alumno (backend + web) — diseño

Tarjeta de equipo **48** ([Trello](https://trello.com/c/moql7vUz)) · MIS TAREAS 19 · RF PT-13 · HU-24 · CU-11.

## 1. Objetivo y criterio de aceptación

Chat uno a uno entre el entrenador y cada alumno, con texto y fotos, y envío masivo del PT a varios alumnos.

**Criterio:** el PT le escribe a un alumno, el alumno responde con una foto y los dos ven la conversación completa. Un envío masivo a 5 alumnos llega a cada conversación individual.

## 2. Decisiones (grilling 31/10)

| # | Decisión |
|---|----------|
| Q1 | Se hace, acotada: texto, una foto por mensaje, envío masivo y leídos. Sin editar ni borrar mensajes, sin push. |
| Q2 | El alumno responde desde la **web** (ítem "Mensajes" nuevo en su barra). El chat en el celular queda para una tarjeta de mobile (usa este mismo backend). |
| Q3 | Una tabla `messages`; la conversación es el alumno (cada alumno tiene un solo PT, `students.trainer_id`). Sin tabla de conversaciones. |
| Q4 | Fotos por el backend: multipart (`multer`, en memoria), bucket **privado** de Supabase Storage con la service_role, máx. **5 MB**, tipo real validado por los primeros bytes (JPEG, PNG, WebP). Se sirven con URL firmada de 1 h. Respeta el ADR 0001 (el browser no toca Storage). |
| Q5 | Polling con React Query solo con la pestaña visible: conversación abierta cada **4 s**; lista y badge cada **15 s**. Historial por cursor `before`, de a **50**. |
| Q6 | `read_at` por mensaje; al abrir la conversación se marcan leídos los del otro. El último mensaje propio muestra ✓ (enviado) o ✓✓ (leído). Badge de no leídos en el ítem "Mensajes". |
| Q7 | Envío masivo: solo texto, a alumnos elegidos o "Todos"; una fila por alumno con el mismo `broadcast_id`; etiqueta "Envío masivo" en la burbuja; aviso fijo de que no es un chat grupal. |
| Q8 | Sin notificaciones (`notifications`) en esta tarjeta: el aviso es el badge por polling. |
| Q9 | Rama desde `develop`. El envío masivo va al final; si la #42 ya entró, reutiliza su `StudentMultiSelect`; si no, se arma el selector en el módulo de mensajes. |
| Q10 | Web PT: dos paneles (lista 280 px + conversación); en pantallas chicas, un panel por vez. Botón "Mensaje" en la ficha → `/pt/mensajes?alumno=<id>`. |
| Q11 | Web alumno: "Mensajes" después de "Historial"; muestra directo la conversación con su PT. |
| Q12–Q13 | Endpoints y envío: §4 y §5. |
| Q14 | Docs: CU-11 detallado en `casos-de-uso.md`, `modelo-de-datos.md`, `contratos-api.md`, `tarjetas.md` (fila 48), backend README y README raíz. |
| Q15 | Bucket `message-images` creado por la migración (la corre Pablo). No se borran fotos. |

## 3. Datos

Migración `backend/src/database/migrations/2026-10-31-messages.sql` (re-ejecutable) y el mismo contenido en `schema/06b-messages.sql`; la tabla se suma a `07-rls.sql` y al `expected` de `checks/schema-checks.sql`.

```sql
create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references students (id) on delete cascade,
  sender_role  varchar(10) not null check (sender_role in ('trainer', 'student')),
  body         text check (body is null or char_length(body) between 1 and 2000),
  image_path   text,
  broadcast_id uuid,
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  constraint messages_not_empty check (body is not null or image_path is not null)
);
create index if not exists idx_messages_student_created on messages (student_id, created_at desc);
create index if not exists idx_messages_unread on messages (student_id, sender_role) where read_at is null;
alter table messages enable row level security;  -- deny-all (ADR 0001)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-images', 'message-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
```

- El PT de la conversación es `students.trainer_id`; no se guarda en el mensaje.
- `image_path`: `<student_id>/<uuid>.<ext>` dentro del bucket. Nunca sale en la API.
- Orden: `created_at desc, id desc` (desempate estable).

## 4. API — `/api/messages`

Todas con `authenticate`. Acceso con `assertCanAccessStudent(user, studentId)` (PT: solo sus alumnos; alumno: solo él; ajeno o inexistente → 403).

**Mensaje (forma común):**
```json
{ "id": "uuid", "student_id": "uuid", "sender_role": "trainer|student", "body": "texto|null",
  "image_url": "https://…firmada…|null", "broadcast_id": "uuid|null", "read_at": "iso|null", "created_at": "iso" }
```

| Método y ruta | Rol | Qué hace |
|---|---|---|
| `GET /messages/conversations` | trainer | `{ data: [{ student: {id,name,avatar_url}, last_message: {body, has_image, sender_role, created_at} \| null, unread_count }] }`. Orden: con mensajes por `last_message.created_at` desc; después los sin mensajes por nombre. Solo alumnos activos. |
| `GET /messages/unread-count` | ambos | `{ data: { count } }`: PT, mensajes de alumnos (`sender_role='student'`) sin leer de todos sus alumnos; alumno, los del PT sin leer. |
| `GET /messages/:studentId?before=<iso>&limit=50` | ambos | `{ data: [mensajes en orden cronológico], meta: { next_before: iso\|null }, counterpart: {id,name,avatar_url} }`. `limit` 1–100 (50 por defecto). `next_before` = `created_at` del más viejo de la página si hay más. `counterpart`: para el PT, el alumno; para el alumno, su PT. |
| `POST /messages/:studentId` | ambos | `multipart/form-data` con `body` (opcional, se recorta, 1–2000) y/o `image` (opcional). 201 con el mensaje. `sender_role` = rol del usuario. |
| `POST /messages/:studentId/read` | ambos | Marca `read_at = now()` en los del otro rol sin leer. `{ data: { updated } }`. |
| `POST /messages/broadcast` | trainer | JSON `{ student_ids: [uuid, 1..200, sin repetidos], body: 1–2000 }`. Si algún id no es alumno activo del PT → 403 y no se envía nada. 201 `{ data: { broadcast_id, sent } }`. Inserta en un solo `insert`. |

**Errores nuevos (`Errors`):**
- `MESSAGE_EMPTY` (400): sin texto ni foto (o texto vacío tras recortar).
- `IMAGE_TOO_LARGE` (413): más de 5 MB (lo corta `multer` con `limits.fileSize`).
- `IMAGE_TYPE_INVALID` (415): los primeros bytes no son JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`) ni WebP (`RIFF....WEBP`). El `Content-Type` del cliente se ignora; la extensión y el `contentType` del upload salen del tipo detectado.
- Validación (400) para `body` > 2000, `limit` fuera de rango, `before` no ISO, `student_ids` inválidos.
- Un segundo archivo o un campo de archivo con otro nombre → 400.

**Fotos:** subida con `supabase.storage.from('message-images').upload(path, buffer, { contentType })`; si falla la inserción del mensaje después de subir, se intenta borrar el archivo (best-effort). Las URLs se firman con `createSignedUrls` (un solo pedido por página) y duran 3600 s.

**Capas:** `routes/messages/messages.routes.js`, `controllers/messages/`, `services/messages/` (mensajes, envío masivo, imágenes), `repositories/messages/` (tabla y storage separados), `models/messages/`, `validations/messages/`, middleware de upload en `shared/middlewares/upload.middleware.js` (envuelve los errores de `multer` en `Errors`). Archivos ≤ 200 líneas.

## 5. Web (`frontend/`)

**Cliente API:** `api/shared/client.js` acepta `FormData`: sin `Content-Type` ni `JSON.stringify` (el navegador pone el boundary).

**Rutas y navegación:**
- PT: el ítem `mensajes` deja de ser placeholder → `MessagesPage`. Lee `?alumno=<id>` para abrir esa conversación.
- Alumno: ítem nuevo "Mensajes" (ícono `MessageSquare`) después de "Historial" → `StudentMessagesPage`.
- Badge de no leídos en el ítem "Mensajes" de las dos barras (`useUnreadCount`, cada 15 s). Si es 0 no se muestra; de 10 en adelante, "9+".
- Ficha del alumno (PT): botón "Mensaje" (ghost, ícono `MessageSquare`) → `/pt/mensajes?alumno=<id>`.

**Pantalla del PT (`MessagesPage`):**
- Izquierda (280 px, fondo `ink1`): buscador por nombre; filas con avatar, nombre, vista previa del último mensaje ("📷 Foto" si solo hay foto; prefijo "Vos: " si es del PT), hora relativa corta ("14:05", "Ayer", "12 oct") y contador de no leídos (pill `accent`). Fila activa `ink3` con borde izquierdo `accent`. Botón "Envío masivo" arriba.
- Derecha: `Conversation`. Sin alumno elegido: estado vacío "Elegí un alumno para ver la conversación".
- Menos de 768 px: un panel por vez; la conversación tiene flecha "Volver".

**Pantalla del alumno (`StudentMessagesPage`):** solo `Conversation` con su PT.

**`Conversation` (compartido):**
- Encabezado: avatar, nombre del otro; el PT además ve "Ver ficha" (link a `/pt/alumnos/<id>`).
- Separadores de día: "Hoy", "Ayer", o "12 oct" (zona `America/Argentina/Buenos_Aires`).
- Burbujas: propias a la derecha, fondo `accent`, texto `accentInk`, radio 16 con la esquina inferior derecha de 4, máx. 70 %; ajenas a la izquierda, fondo `ink2`, borde `ink3`, esquina inferior izquierda de 4. Hora debajo (mono, `ink6`). En la última propia: "✓" o "✓✓" (leído) con `aria-label` "Enviado" / "Leído". Etiqueta "Envío masivo" (mono, `cool`) en burbujas con `broadcast_id` (el alumno también la ve).
- Fotos: miniatura de hasta 240 px de ancho, `alt` "Foto enviada por <nombre>"; al tocar, `Dialog` con la foto grande.
- "Ver anteriores" arriba cuando `next_before` no es null.
- Al abrir y cada vez que llegan mensajes nuevos del otro con la pestaña visible: `POST …/read` e invalidar el badge.
- Scroll: abajo de todo al abrir y al enviar; si llegan mensajes y el usuario está leyendo más arriba, no se mueve.
- Polling: `refetchInterval` 4 s, `refetchIntervalInBackground: false`.

**Envío (`MessageComposer`):**
- `Textarea` autoajustable (máx. 2000, contador desde 1800), botón 📎 (`input type=file accept="image/jpeg,image/png,image/webp"`), botón enviar (deshabilitado sin texto ni foto).
- Enter envía; Shift+Enter, salto de línea.
- Foto elegida: previsualización con botón "Quitar". Si pesa más de 5 MB se avisa antes de mandar ("La foto supera 5 MB"); igual el servidor valida.
- Optimista: la burbuja aparece con "Enviando…"; si falla, "No se envió · Reintentar" (y el mensaje del servidor para 413/415). Al confirmar se reemplaza por la del servidor.

**Envío masivo (`BroadcastDialog`, PT):**
- Título "Envío masivo". Aviso fijo: "Cada alumno lo recibe en su conversación individual. No es un chat grupal: no se ven entre ellos."
- Selector de alumnos activos con "Todos"; textarea (1–2000); botón "Enviar a N alumnos".
- Al terminar: toast "Enviado a N alumnos", se cierra e invalida la lista.

**Módulos:** `api/messages/`, `hooks/messages/` (`useConversations`, `useMessages`, `useSendMessage`, `useMarkRead`, `useUnreadCount`, `useBroadcast`), `components/messages/` (y `components/messages/conversation/` si pasa de 10 archivos), `pages/messages/`, `utils/messages/` (formatos de hora y vista previa, validación de foto). Archivos ≤ 200 líneas, carpetas ≤ 10 archivos.

## 6. Fuera de alcance

Editar o borrar mensajes, varias fotos por mensaje, fotos en el envío masivo, push o filas en `notifications`, chat en el celular, Supabase Realtime, "escribiendo…", búsqueda dentro de la conversación.

## 7. Pruebas

- Backend (Jest): validaciones; detección de tipo por bytes (JPEG/PNG/WebP válidos; PDF y texto con `Content-Type: image/png` → 415); 413; acceso (PT ajeno, alumno ajeno → 403); envío masivo con un id ajeno → 403 sin insertar; conversaciones ordenadas; unread-count por rol; paginación con `next_before`; read marca solo los del otro rol.
- Web (Vitest): cliente con `FormData`; formatos de hora y vista previa; composer (Enter / Shift+Enter, foto > 5 MB, quitar foto); burbujas (✓/✓✓, envío masivo); badge (oculto en 0, "9+").
- E2E en el navegador contra Supabase dev: el criterio de aceptación completo con el PT QA y dos alumnas, foto incluida, y un envío masivo a 5 alumnos (se crean alumnos QA si faltan). Capturas en `docs/superpowers/specs/assets/48/`.

## 8. Ajustes durante la implementación

- `unread-count` del PT cuenta solo los mensajes de alumnos activos.
- `POST /api/messages/:studentId` acepta también JSON con solo texto, además de `multipart/form-data`.
- La burbuja fallida muestra el motivo del error y ofrece "Reintentar" y "Descartar".
- El cliente avisa también cuando el tipo de foto es inválido, no solo cuando pesa más de 5 MB.
- El `image_url` se mantiene estable 45 min en el cliente (no cambia entre polls) y después se renueva.
- Envío masivo con selector propio y aviso inline: no hay toasts en la app.
- El botón "Mensaje" de la ficha aparece solo para alumnos activos.
- El cursor `before` se basa en `created_at` (microsegundos); un empate dentro de una misma conversación es prácticamente imposible, queda como limitación conocida.

## 9. Resultado del E2E (31/10, contra Supabase dev)

PT QA (`qa.card26…`) con 5 alumnos activos: Lucía, Martín y Nora QA, más Pedro y Sofía QA, creados con el flujo real de invitación.

- **Navegador, PT:** el botón "Mensaje" de la ficha de Lucía abre `/pt/mensajes?alumno=<id>` con su conversación seleccionada. El mensaje aparece con el separador "Hoy", la hora y ✓, y la fila de la lista pasa a "Vos: …" ([captura](assets/48/01-pt-escribe.jpg)).
- **API, alumna:** Lucía responde con texto y una foto JPG real (201, `sender_role: student`, sin `image_path`). Un PDF con `Content-Type: image/png` da 415, una foto de 5 MB + 1 byte da 413, y pedir el chat de otro alumno da 403.
- **API, PT:**
  - El badge del PT pasa de 1 a 0 al marcar leído (`updated: 1`). Lucía ve su foto como leída.
  - La URL firmada de la foto devuelve 200 `image/jpeg`, con un JPEG válido.
  - El envío masivo a los 5 da 201 `sent: 5`, y el último mensaje de cada una de las 5 conversaciones lleva el mismo `broadcast_id`. Lucía ve el masivo en su conversación y no puede leer conversaciones ajenas.
- **No verificado en el navegador:** la foto en la burbuja, el ✓✓, el diálogo de envío masivo, la vista de menos de 768 px y la página del alumno. El modo automático del agente no permite usar la contraseña de QA para volver a iniciar sesión. Lo cubren los tests de componentes. Conviene mirarlo a mano antes de la defensa.
