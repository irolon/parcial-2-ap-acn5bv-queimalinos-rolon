# Mensajería interna (tarjeta 48) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chat 1 a 1 PT ↔ alumno con texto y fotos, leídos, envío masivo del PT, en backend y web (PT y alumno).

**Architecture:** Tabla `messages` (conversación = alumno) + bucket privado `message-images` manejado solo por el backend (service_role, multer en memoria, tipo validado por bytes). Web con polling de React Query y una `Conversation` compartida por las páginas del PT y del alumno.

**Tech Stack:** Express ESM + supabase-js + multer 2.4.0 + Jest ESM (`npm test`); React 19 + TanStack Query 5 + Tailwind 4 + Vitest.

**Spec:** `docs/superpowers/specs/2026-10-31-messaging-design.md`

## Global Constraints

- CONTRIBUTING: archivos de código ≤ 200 líneas (`npm run lint` en backend corre `check-file-length`), carpetas ≤ 10 archivos, capa → módulo → archivo, tests espejo de `src`.
- Backend: tests con `npm test` (nunca `npx jest`). Web: `npm test` y `npm run lint` en `frontend/`.
- La web vive en `frontend/`.
- Commits en español, estilo `feat(messages): …`, **sin** trailers de IA (ni Co-Authored-By ni "Generated with").
- Textos de UI en español rioplatense (voseo), los de la spec literal.
- `multer` fijado en `2.4.0` (exacto). No agregar otras dependencias.
- Sin acceso del browser a Storage (ADR 0001). `image_path` nunca sale en la API.
- Límites: body 1–2000 caracteres (tras `trim`), foto ≤ 5 MB (5242880 bytes), `limit` 1–100 (50 por defecto), broadcast 1–200 ids sin repetidos, URL firmada 3600 s, polling 4 s (conversación) y 15 s (lista y badge).
- No aplicar SQL contra Supabase: la migración la corre Pablo.

## Review Focus

1. Un archivo con `Content-Type: image/png` que en realidad es PDF/texto → 415, y nada sube a Storage.
2. Un PT que pide o escribe en la conversación de un alumno ajeno (o un alumno en la de otro) → 403, sin revelar si existe.
3. Envío masivo con un id ajeno entre varios propios → 403 y cero filas insertadas.
4. Polling + optimista: el mensaje enviado no aparece duplicado cuando el refetch trae la versión del servidor.
5. Leídos: abrir la conversación marca solo los del otro rol; el badge baja sin esperar 15 s.

---

### Task 1: Migración, schema y checks

**Files:**
- Create: `backend/src/database/migrations/2026-10-31-messages.sql`, `backend/src/database/schema/06b-messages.sql`
- Modify: `backend/src/database/schema/07-rls.sql`, `backend/src/database/checks/schema-checks.sql`, `backend/src/database/schema/README.md` (si lista los archivos)

- [ ] Escribir la migración con el SQL de la spec §3 (tabla, constraints, dos índices, RLS, bucket con `on conflict do nothing`), cabecera "Tarjeta 48 · Mensajería interna. Re-ejecutable. Correr en el SQL Editor de Supabase", como las migraciones vecinas.
- [ ] `06b-messages.sql`: lo mismo (formato de los otros archivos de schema).
- [ ] `07-rls.sql`: `alter table messages enable row level security;` junto a las demás. `schema-checks.sql`: `('messages')` en `expected`.
- [ ] Commit `feat(messages): tabla messages y bucket message-images (tarjeta 48)`.

### Task 2: Backend — modelo, validaciones, errores y subida de fotos

**Files:**
- Create: `backend/src/models/messages/message.model.js`, `backend/src/validations/messages/messages.validation.js`, `backend/src/shared/middlewares/upload.middleware.js`, `backend/src/shared/utils/image-type.js`
- Modify: `backend/src/shared/utils/errors.js`, `backend/package.json` (`"multer": "2.4.0"`)
- Test: `backend/tests/unit/models/messages/…`, `tests/unit/validations/messages/messages.validation.test.js`, `tests/unit/shared/…/upload.middleware.test.js`, `tests/unit/shared/…/image-type.test.js` (seguir la ubicación real de los tests de `shared`)

**Interfaces (Produces):**
- `message.model.js`: `MESSAGES_TABLE = 'messages'`, `MESSAGE_COLUMNS` (string de select), `MESSAGE_IMAGES_BUCKET = 'message-images'`, `MAX_BODY = 2000`, `MAX_IMAGE_BYTES = 5242880`, `DEFAULT_LIMIT = 50`, `MAX_LIMIT = 100`, `MAX_BROADCAST = 200`, `SIGNED_URL_SECONDS = 3600`, `toMessage(row, imageUrl)` → forma pública de la spec §4 (sin `image_path`).
- `image-type.js`: `detectImageType(buffer)` → `{ mime: 'image/jpeg'|'image/png'|'image/webp', ext: 'jpg'|'png'|'webp' } | null` (firmas de la spec §4).
- `errors.js`: `Errors.messageEmpty()` (400 `MESSAGE_EMPTY`, "Escribí un mensaje o adjuntá una foto"), `Errors.imageTooLarge()` (413 `IMAGE_TOO_LARGE`, "La foto supera 5 MB"), `Errors.imageTypeInvalid()` (415 `IMAGE_TYPE_INVALID`, "La foto tiene que ser JPG, PNG o WebP").
- `upload.middleware.js`: `uploadImage` = middleware que corre `multer({ storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }).single('image')` y traduce `LIMIT_FILE_SIZE` → `imageTooLarge`, `LIMIT_UNEXPECTED_FILE`/`LIMIT_FILE_COUNT` → `Errors.validation`.
- Validaciones (lanzan `Errors.validation`, devuelven saneado): `validateHistoryQuery({before, limit})` → `{ before: string|null, limit: number }`; `validateSendBody({body})` → `{ body: string|null }` (trim; vacío → null; > 2000 → error); `validateBroadcast({student_ids, body})` → `{ studentIds: string[], body: string }` (uuid, 1–200, sin repetidos, body obligatorio); `validateStudentIdParam({studentId})` (uuid).

- [ ] Tests primero (incluye: PNG real 8 bytes, JPEG `FF D8 FF E0`, WebP `RIFF????WEBP`, PDF `%PDF` → null, buffer corto → null; body de 2001 → 400; broadcast con repetidos → 400; `limit=0` y `101` → 400; `before` no ISO → 400).
- [ ] Implementar; `npm i multer@2.4.0 --save-exact`.
- [ ] `npm test` y `npm run lint` verdes. Commit.

### Task 3: Backend — repositorios, servicios, controlador y rutas

**Files:**
- Create: `backend/src/repositories/messages/messages.repository.js`, `backend/src/repositories/messages/message-images.repository.js`, `backend/src/services/messages/messages.service.js`, `backend/src/services/messages/broadcast.service.js`, `backend/src/services/messages/conversations.service.js`, `backend/src/controllers/messages/messages.controller.js`, `backend/src/routes/messages/messages.routes.js`
- Modify: `backend/src/app.js` (`app.use('/api/messages', messagesRoutes)`), repositorio de students si hace falta una consulta de alumnos activos del PT / del trainer por id (agregar función, no duplicar)
- Test: espejo en `backend/tests/unit/{repositories,services,controllers,routes}/messages/` + helpers en `tests/helpers/messages/`

**Interfaces:**
- Consumes: Task 2 entera; `assertCanAccessStudent(user, studentId)` de `services/students/student-access.service.js`; `unwrap` de `shared/utils/supabase-query.js`.
- `message-images.repository.js`: `uploadImage(path, buffer, contentType)`, `removeImage(path)`, `signUrls(paths)` → `Map<path, url>` (un `createSignedUrls`, paths vacíos → Map vacío).
- `messages.repository.js`: `insertMessage(row)`, `insertMany(rows)`, `findPage(studentId, { before, limit })` (`created_at desc, id desc`, pide `limit + 1` para saber si hay más), `markRead(studentId, senderRole)` → cantidad, `countUnread({ studentIds, senderRole })`, `findLastByStudents(studentIds)` → último mensaje por alumno, `countUnreadByStudents(studentIds, senderRole)` → Map.
- `messages.service.js`: `history(user, studentId, query)` → `{ data, meta: { next_before }, counterpart }`; `send(user, studentId, { body, file })` (valida vacío → `messageEmpty`; con file: `detectImageType` → si null `imageTypeInvalid`, sube a `<studentId>/<randomUUID>.<ext>`, inserta, si la inserción falla borra la imagen y relanza); `markRead(user, studentId)` → `{ updated }` (marca los del rol opuesto); `unreadCount(user)` → `{ count }`.
- `conversations.service.js`: `listConversations(trainerId)` (orden de la spec §4; solo alumnos activos).
- `broadcast.service.js`: `broadcast(trainerId, { studentIds, body })` → `{ broadcast_id, sent }` (todos activos y del PT o `Errors.forbidden()` sin insertar; un `insertMany`).
- Rutas (todas con `authenticate`): `GET /conversations` (trainer), `GET /unread-count`, `POST /broadcast` (trainer, JSON), `GET /:studentId`, `POST /:studentId` (`uploadImage` antes de validar el body), `POST /:studentId/read`. `/conversations`, `/unread-count` y `/broadcast` se declaran antes de `/:studentId`.

- [ ] Tests primero con los casos de Review Focus 1–3 y los de la spec §7 (backend).
- [ ] Implementar. `npm test` y `npm run lint` verdes. Commit.

### Task 4: Docs del backend

**Files:** `docs/arquitectura/contratos-api.md` ("## Módulo: Mensajes", con cada endpoint, ejemplos y errores, en el formato del archivo), `docs/arquitectura/modelo-de-datos.md` (tabla `messages` + bucket; aclarar que `chat_messages` es del asistente IA), `backend/README.md` (fila por endpoint y nota de la migración).

- [ ] Escribir; que los nombres coincidan exactamente con el código de Task 3. Commit.

### Task 5: Web — cliente, API, hooks y utilidades

**Files:**
- Modify: `frontend/src/api/shared/client.js` (rama `body instanceof FormData`)
- Create: `frontend/src/api/messages/messages.api.js`, `frontend/src/hooks/messages/{useConversations,useMessages,useSendMessage,useMarkRead,useUnreadCount,useBroadcast}.js` (agrupar en menos archivos si queda natural), `frontend/src/utils/messages/{messageTime,messagePreview,imageFile}.js`
- Test: espejo en `frontend/src/…/__tests__` o donde estén los tests vecinos

**Interfaces (Produces):**
- API: `getConversations()`, `getUnreadCount()`, `getMessages(studentId, { before })`, `sendMessage(studentId, { body, file })` (arma `FormData`), `markRead(studentId)`, `broadcast({ studentIds, body })`.
- Keys: `MESSAGES_KEY = ['messages']`, `conversationsKey`, `unreadKey`, `messagesKey(studentId)`.
- `useMessages(studentId)`: `useInfiniteQuery` (página inicial sin `before`, `getNextPageParam` = `meta.next_before`), `refetchInterval: 4000`, `refetchIntervalInBackground: false`; devuelve mensajes aplanados en orden cronológico + `counterpart`.
- `useConversations()` y `useUnreadCount()`: `refetchInterval: 15000`, sin background.
- `useSendMessage(studentId)`: optimista con id temporal `tmp-…` y estado `sending|failed`; `retry(tmp)`; al confirmar reemplaza el temporal por el del servidor (sin duplicar con el refetch: dedupe por id).
- `useMarkRead(studentId)`: al éxito invalida `unreadKey` y `conversationsKey`.
- Utils: `dayLabel(iso, now)` → "Hoy" | "Ayer" | "12 oct"; `timeLabel(iso)` → "14:05"; `listTimeLabel(iso, now)` → "14:05" | "Ayer" | "12 oct"; `previewText(last_message, isTrainer)` → "Vos: …" | "📷 Foto" | texto (recortado a 60); `checkImageFile(file)` → `null` | "La foto supera 5 MB" | "La foto tiene que ser JPG, PNG o WebP"; `badgeText(n)` → `null` (0) | "1".."9" | "9+". Zona `America/Argentina/Buenos_Aires` (reusar `utils/dates.js` si sirve).

- [ ] Tests primero (cliente con FormData sin `Content-Type`; utils con bordes de día en Buenos Aires; dedupe optimista).
- [ ] Implementar. `npm test` y `npm run lint` verdes. Commit.

### Task 6: Web — conversación, composer, página del alumno y badge

**Files:**
- Create: `frontend/src/components/messages/…` (`Conversation`, `ConversationHeader`, `MessageList`, `MessageBubble`, `DaySeparator`, `MessageComposer`, `ImagePreview`, `ImageDialog`; subcarpeta si pasa de 10), `frontend/src/pages/messages/StudentMessagesPage.jsx`
- Modify: `frontend/src/routes/routeTable.js` (ítem alumno "Mensajes" después de "Historial", `MessageSquare`), `frontend/src/routes/router.jsx`, sidebars / `NavItem` para el badge (`useUnreadCount` + `badgeText`)

**Interfaces:** Consumes Task 5. `Conversation({ studentId, viewerRole })`.

- [ ] Tests primero (Enter envía / Shift+Enter no; foto > 5 MB muestra error y no envía; "Quitar"; ✓ y ✓✓ con `aria-label`; etiqueta "Envío masivo"; "Ver anteriores" solo con más páginas; badge oculto en 0 y "9+").
- [ ] Implementar con la spec §5 (colores por tokens, scroll, marcar leído al abrir y al llegar mensajes del otro con pestaña visible).
- [ ] `npm test` y `npm run lint`. Commit.

### Task 7: Web — página del PT, ficha y envío masivo

**Files:**
- Create: `frontend/src/pages/messages/MessagesPage.jsx`, `frontend/src/components/messages/list/{ConversationList,ConversationRow}.jsx`, `frontend/src/components/messages/BroadcastDialog.jsx` (+ selector: reutilizar `StudentMultiSelect` si ya está en `develop`; si no, uno propio en `components/messages/`)
- Modify: `router.jsx` (`mensajes: <MessagesPage/>`), ficha del alumno (botón "Mensaje" → `/pt/mensajes?alumno=<id>`)

**Interfaces:** Consumes Tasks 5–6.

- [ ] Tests primero (orden y búsqueda de la lista; `?alumno=` abre esa conversación; < 768 px un panel por vez con "Volver"; broadcast: aviso fijo, "Todos", botón "Enviar a N alumnos" deshabilitado sin texto o sin alumnos, toast "Enviado a N alumnos").
- [ ] Implementar. `npm test` y `npm run lint`. Commit.

### Task 8: Docs de producto y cierre

**Files:** `docs/producto/casos-de-uso.md` (sección "CU-11 — Enviar mensaje al alumno (web)" con actores, precondiciones, flujo principal, alternativos y RF PT-13, al final del archivo), `docs/arquitectura/diagrama-casos-de-uso.md` (CU-11 apunta al detalle; alumno responde), `docs/tarjetas.md` (fila 48 con spec, plan y docs), `README.md` raíz (Backend: mensajería; Web: mensajes PT y alumno; sacar "mensajería" de Pendiente).

- [ ] Escribir. Commit.
