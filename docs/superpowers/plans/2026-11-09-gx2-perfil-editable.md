# GX2 · Perfil editable del alumno y título profesional del PT — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el alumno cambie su nombre, teléfono y foto desde Mi perfil (y nada más), que el PT cargue su título profesional y el alumno lo vea en "Tu entrenador/a", y que el PT vea el teléfono del alumno con link a WhatsApp.

**Architecture:** backend en capas (route → controller → service → repository → model): `PATCH /students/:id` con permisos por rol, `PUT/DELETE /students/:id/avatar` sobre un bucket **privado** `avatars` (en `avatar_url` se guarda la **ruta**), un `signAvatars(rows)` que firma todas las fotos de una respuesta en **una** llamada (`createSignedUrls`, `SIGNED_URL_SECONDS` = 1 h, como el chat) y `GET/PATCH /auth/me` para el PT. Web: `Avatar` con `src`, foto achicada en canvas antes de subirla, Mi perfil editable, "Tu perfil" en `/pt/cuenta`, título en `TrainerCard` y teléfono en la ficha del PT.

**Tech Stack:** Express + Supabase (service_role, Storage) + multer; Jest ESM (`jest.unstable_mockModule`). React + react-router + zustand + TanStack Query; Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-09-gx2-perfil-editable-design.md` (manda sobre este plan; CONTRIBUTING manda sobre los dos).

## Notas (spec vs. código real)

1. **Rama.** El spec sugiere `feature/editable-profile`; se trabaja en `feature/profile-editable-gx2` (worktree `C:\ft-gx2x`), apilada sobre `feature/account-settings-gx1` (GX1), que a su vez sale de la #89. La PR apunta a `feature/account-settings-gx1` hasta que GX1 entre a `develop`; antes de abrirla, `git merge origin/develop`.
2. **Nombre del helper de firma.** En `message-images.repository.js` la función se llama `signUrls(paths)` (la que llama a `createSignedUrls` de Supabase) y devuelve `Map<path, url>`; el best-effort vive en el service (`signBestEffort` de `messages.service.js`). Se copia el patrón: `avatars.repository.signPaths(paths) → Map` (tira error) y `signAvatars` atrapa el error, loguea y deja `null` (una caída de Storage no da 500 en la lista de alumnos).
3. **`pathFromUrl` del spec** (Pruebas) contradice la decisión 5 (se guarda la ruta, no una URL). Se reemplaza por `isStudentAvatarPath(path, studentId)` (¿la ruta es de este alumno en el bucket?), que es lo que necesita "borra la anterior si es del bucket".
4. **"Cada respuesta que devuelve avatares".** El spec nombra lista de alumnos, ficha, contraparte y `/auth/me`. En el código también devuelven `avatar_url`: el login (`user`), `PATCH /students/:id` (misma ficha), `GET /messages/conversations` (`student`) y los turnos de la agenda (`student` embebido en `APPOINTMENT_COLUMNS`). Sin firmar, esos campos llevarían una ruta de Storage donde el contrato promete una URL (Coil en el celular rompería). Se firman todos (Tasks 5, 8 y 9). Quedan afuera: `GET /invitations/:token` (público, sin sesión; embebe el avatar del **trainer**, que este ticket no escribe) y el alta `POST /students` (el alumno recién creado no tiene foto).
5. **El teléfono de la invitación no se lee.** `INVITATION_WITH_TRAINER` (`invitations.repository.js`) no selecciona `student_phone`: se suma para que el alta lo copie. Las invitaciones guardan el teléfono **solo con dígitos** (lo normaliza `invitations.validation.js`); el backfill y el alta copian solo si mide 6 a 30.
6. **Backfill "la invitación usada más reciente".** El `update … from invitations` del spec toma una fila cualquiera si hay varias; el SQL de la Task 1 usa `distinct on (student_email) … order by student_email, used_at desc`.
7. **Barrido de rutas** (`tests/unit/app/validation-coverage.test.js`). `PUT /students/:id/avatar` es multipart y no pasa por `validate(...)` del body: va a `WITHOUT_BODY` con su motivo. `PATCH /auth/me` sí valida. La lista de rutas con limitador no cambia.
8. **`utils/files/` no es un módulo válido** (Regla 2: el módulo es el recurso de la API). `resizeImage.js` va en `frontend/src/utils/students/` (la foto es de `/students/:id/avatar`). El resto de los archivos del spec se respeta.
9. **URL firmada guardada en el store.** `user` se persiste en localStorage y la URL vence en 1 h. Se firma en el login; Mi perfil sincroniza `user.name` / `user.avatar_url` con la ficha cada vez que carga; en el resto, al vencer, `Avatar` vuelve a las iniciales (`onError`). Sin endpoint ni caché extra (decisión 5).
10. **Vacío = borrar.** El spec dice "`null` o el formato". Para que el formulario pueda vaciar el campo, `phone: ''` y `professional_title: ''` (recortados) se toman como `null`. La web igual manda `null`.
11. **404 vs. 403.** Pruebas dice "alumno sobre otro → 404/403"; `assertCanAccessStudent` da **403** (no revela ids). Se mantiene el 403, igual que en GX1.
12. **`GET /auth/me` no existe todavía**; se crea, solo trainer (decisión 8), con `PATCH /auth/me`.
13. **Tests de GX1 que cambian:** "Para cambiar tus datos, hablá con tu entrenador" lo afirman `frontend/tests/components/students/profile/MyProfileCard.test.jsx` y `frontend/tests/pages/student/MyProfilePage/content.test.jsx`; se reemplaza por "Objetivo y nivel los define tu entrenador/a".
14. **Tamaño en el cliente.** El spec muestra "La foto supera 5 MB", pero la web achica a 512 px antes de subir (decisión 6): una foto de 8 MB del celular tiene que andar. El cliente chequea solo el **tipo**; el 413 del backend se sigue traduciendo a ese texto.
15. **WhatsApp sin código de país.** `whatsappHref` usa los dígitos tal cual (decisión 11); un número cargado sin `54` abre un chat equivocado. No se normaliza (fuera del spec); se avisa en la PR.
16. Conteos: `students.routes.js` 93, `MyProfilePage.jsx` 62, `useAuthStore.js` 133, `EditStudentDialog.jsx` 106, `MyProfileCard` usa avatar de 72 px (el spec pide 84). Ninguno pasa de 200 con lo que se suma.
17. Si entra la **#92**, sumar `PUT/DELETE /students/:id/avatar` y `GET/PATCH /auth/me` a su tabla de aislamiento.

## Global Constraints

- Ningún archivo de código pasa de **200 líneas** (tests y `.sql` incluidos); carpetas de hasta 10 archivos; los tests copian el árbol de `src`.
- Commits Conventional en español, **sin** `Co-Authored-By` ni "Generated with".
- El alumno, sobre sí mismo, edita **solo** `name`, `phone` y la foto; cualquier otro campo en el PATCH → `403 FORBIDDEN` "Solo podés cambiar tu nombre, teléfono y foto".
- Teléfono: `students.phone varchar(30)`, opcional; regex `^[0-9 +()-]{6,30}$` sobre el valor recortado.
- Título: `trainers.professional_title varchar(80)`, opcional, 2–80 recortado. Nombre: 2–100.
- Bucket `avatars`: `public = false`, `file_size_limit = 5242880`, `allowed_mime_types = {image/jpeg,image/png,image/webp}`. Ruta: `students/<id>/<uuid>.<ext>`. Firma: `SIGNED_URL_SECONDS` de `models/messages/message.model.js` (3600), **una** llamada a `createSignedUrls` por respuesta, sin caché.
- Errores de la foto: 400 `VALIDATION_ERROR` (campo `image`) sin archivo, 413 `IMAGE_TOO_LARGE`, 415 `IMAGE_TYPE_INVALID`, 403 otro alumno o trainer. Se reusan `Errors.imageTooLarge` / `imageTypeInvalid`; `errors.js` no cambia.
- Web: foto achicada a lado mayor **512 px**, JPEG calidad **0,85**; `accept="image/jpeg,image/png,image/webp"`.
- No tocar: `app.js`, `errors.js`, `StudentProfilePage.jsx` (#88), `ProfileActions.jsx` (#84), `overview.service.js` (#91), `triggers.service.js` (#76).
- Copys: "Cambiar foto", "Quitar", "La foto supera 5 MB", "Usá una foto JPG, PNG o WebP", "No pudimos subir la foto", "No pudimos quitar la foto", "Sin cargar", "Objetivo y nivel los define tu entrenador/a", "Editar datos", "Nombre y apellido", "Teléfono", "Tu perfil", "Título profesional", "Ej.: Lic. en Educación Física", "Lo ven tus alumnos en su perfil", "Guardar".

## Review Focus

1. **El alumno manda `{ name, active: false }` o `{ goal }`** → 403 **antes** de revocar tokens, guardar o cancelar turnos (hoy `update` revoca antes de guardar). Test en Task 4.
2. **Storage cae al firmar** → la lista de alumnos, la ficha, el login y la contraparte responden 200 con `avatar_url: null`, nunca 500. Test en Tasks 2 y 5.
3. **Falla guardar `avatar_url` después de subir** → se borra la subida y se propaga el error; **falla borrar la foto anterior** → la respuesta igual es 200. Test en Task 6.
4. **URL vencida (store de hace más de 1 h) o imagen rota** → `Avatar` vuelve a las iniciales; y si después llega un `src` nuevo (foto recién subida) vuelve a intentar con la imagen. Test en Task 12.
5. **Foto que el navegador no puede decodificar (HEIC renombrado, archivo corrupto)** → "Usá una foto JPG, PNG o WebP", sin pedido al backend y con el botón disponible otra vez. Test en Task 14.

---

## Backend

Comandos (desde `C:\ft-gx2x`):
- Tests: `cd backend && npx cross-env TZ=UTC node --experimental-vm-modules node_modules/jest/bin/jest.js <path>`
- Lint (incluye el chequeo de 200 líneas): `cd backend && npm run lint`

### Task 1: Migración, schema y columnas de los modelos

**Files:**
- Create: `backend/src/database/migrations/2026-11/2026-11-09-profile-editable.sql`
- Modify: `backend/src/database/schema/01-auth.sql` (trainers), `backend/src/database/schema/02-students.sql` (students), `backend/src/database/schema/06b-messages.sql` (bucket, junto al de `message-images`), `backend/src/models/students/student.model.js`, `backend/src/models/auth/trainer.model.js`
- Test: `backend/tests/unit/models/students/student.model.test.js`, `backend/tests/unit/models/auth/trainer.model.test.js`

**Interfaces:**
- Produces: `STUDENT_DETAIL_COLUMNS` incluye `phone`; `TRAINER_PUBLIC_COLUMNS` incluye `professional_title`; `STUDENT_SELF_EDITABLE = ['name', 'phone']` (exportada de `student.model.js`). `STUDENT_LIST_COLUMNS` no cambia.

- [ ] **Step 1: Tests que fallan** — `STUDENT_DETAIL_COLUMNS` contiene `phone`; `STUDENT_LIST_COLUMNS` no; `TRAINER_PUBLIC_COLUMNS` contiene `professional_title`; ninguna contiene `password_hash`; `STUDENT_SELF_EDITABLE` es exactamente `['name', 'phone']`.
- [ ] **Step 2: Correr** `…jest.js tests/unit/models/students/student.model.test.js tests/unit/models/auth/trainer.model.test.js` → FAIL.
- [ ] **Step 3: Migración** (encabezado como `2026-11-09-account-password.sql`: "GX2 · Perfil editable. Re-ejecutable. Correr en el SQL Editor de Supabase. También está en database/schema/"). El SQL exacto que corre Pablo:

```sql
-- Teléfono del alumno (lo edita él o su PT). Opcional.
alter table students
  add column if not exists phone varchar(30);

-- Backfill: el de su invitación usada más reciente (las invitaciones guardan solo dígitos).
update students s
set phone = i.student_phone
from (
  select distinct on (student_email) student_email, student_phone
  from invitations
  where used_at is not null
    and student_phone is not null
    and length(student_phone) between 6 and 30
  order by student_email, used_at desc
) i
where i.student_email = s.email
  and s.phone is null;

-- Título profesional del PT ("Lic. en Educación Física"). Opcional, no va en el registro.
alter table trainers
  add column if not exists professional_title varchar(80);

-- Bucket privado de fotos de perfil: el backend sube y firma las URLs con la service_role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

notify pgrst, 'reload schema';
```

  En el schema: `phone varchar(30)` en el `create table students` (comentario "GX2: lo edita el alumno o su PT; se copia de la invitación"), `professional_title varchar(80)` en `create table trainers` (comentario "GX2: lo ven sus alumnos"), y el `insert` del bucket `avatars` en `06b-messages.sql` debajo del de `message-images` (comentario "── Bucket privado de fotos de perfil ──"). El backfill y el `notify` van solo en la migración.
- [ ] **Step 4: Columnas en los modelos** y `STUDENT_SELF_EDITABLE`. Correr los dos tests → PASS; `npm run lint` → OK.
- [ ] **Step 5: Pasarle a Pablo** el SQL de arriba para el SQL Editor de Supabase dev, y la comprobación: `select phone from students limit 1; select professional_title from trainers limit 1; select id, public from storage.buckets where id = 'avatars';` → una fila con `public = false`. Las Tasks 6 en adelante necesitan el bucket para probar en serio; los tests unitarios no.
- [ ] **Step 6: Commit** `feat(db): students.phone, trainers.professional_title y bucket privado avatars (GX2)`

### Task 2: Modelo, repositorio y firma por lote de avatares

**Files:**
- Create: `backend/src/models/students/avatar.model.js`, `backend/src/repositories/students/avatars.repository.js`, `backend/src/services/students/avatar-urls.service.js`
- Test: `backend/tests/unit/models/students/avatar.model.test.js`, `backend/tests/unit/repositories/students/avatars.repository.test.js` (mock de `config/supabase.js` como `message-images.repository.test.js`), `backend/tests/unit/services/students/avatar-urls.service.test.js`

**Interfaces:**
- Consumes: `SIGNED_URL_SECONDS` de `models/messages/message.model.js`.
- Produces:
  - model: `AVATARS_BUCKET = 'avatars'`; `avatarPath(studentId, ext) => 'students/<id>/<uuid>.<ext>'` (`randomUUID`); `isStudentAvatarPath(path, studentId) => boolean` (`true` solo si `path` es string y empieza con `students/<studentId>/`).
  - repo: `upload(path, buffer, contentType) => Promise<void>`; `remove(path) => Promise<void>`; `signPaths(paths: string[]) => Promise<Map<path, url>>` (vacío → `new Map()` sin llamar a Storage; una sola `createSignedUrls(paths, SIGNED_URL_SECONDS)`; los que vienen con `error` no entran). Error de Storage → `Errors.internal`.
  - service: `signAvatars(rows, key = 'avatar_url') => Promise<rows>`: devuelve filas **nuevas** con `row[key]` reemplazado por la URL firmada, o `null` si no había ruta, no se pudo firmar o Storage falló (se loguea `console.error`, nunca tira). Rutas repetidas se piden una vez. Filas `null` pasan tal cual. Una sola llamada a `signPaths` por invocación.

- [ ] **Step 1: Tests que fallan:**
  - model: `avatarPath('s-1', 'jpg')` matchea `/^students\/s-1\/[0-9a-f-]{36}\.jpg$/`; `isStudentAvatarPath('students/s-1/a.jpg', 's-1') === true`; con `'students/s-2/a.jpg'`, `'https://x/y.jpg'`, `null` → `false`.
  - repo: `from('avatars')`; `upload` con `{ contentType }`; `remove(['p'])`; `signPaths([])` no llama `createSignedUrls`; `signPaths(['a','b'])` llama una vez con `(['a','b'], 3600)` y descarta el que trae `error`; error → 500.
  - service: tres filas (`'students/s-1/a.jpg'`, `null`, `'students/s-1/a.jpg'`) → `signPaths` una vez con `['students/s-1/a.jpg']` y las dos con la URL; `signPaths` rechaza → todas `null`, sin tirar (Review Focus 2); `key = 'avatar_url'` en una fila `{ id, name, avatar_url }` no toca otros campos; no muta la entrada.
- [ ] **Step 2: Correr** los tres → FAIL.
- [ ] **Step 3: Implementar** los tres archivos.
- [ ] **Step 4: Correr** → PASS; lint.
- [ ] **Step 5: Commit** `feat(students): bucket de avatares y firma de las fotos por lote`

### Task 3: Alta con teléfono (split de `students.repository.js`)

**Files:**
- Create: `backend/src/repositories/students/student-create.repository.js`, `backend/tests/unit/repositories/students/student-create.repository.test.js`
- Modify: `backend/src/repositories/students/students.repository.js` (sale `createStudent`, −30), `backend/src/repositories/invitations/invitations.repository.js` (`INVITATION_WITH_TRAINER` + `student_phone`, Nota 5), `backend/src/services/students/students.service.js` (`registerFromInvitation`), `backend/tests/helpers/students/students-service.setup.js` (mock del repo nuevo), `backend/tests/unit/services/students/students.service/register-from-invitation.test.js`
- Test: los dos de arriba.

**Interfaces:**
- Produces: `createStudent({ trainerId, name, email, goal, gymEquipment = null, injuries = null, level = null, phone = null, passwordHash })` en `student-create.repository.js` (misma lógica que hoy + `phone`, mismo `23505 → studentEmailExists`); `students.repository.js` ya no lo exporta. El setup exporta `mockStudentCreateRepo = { createStudent }`.

- [ ] **Step 1: Tests que fallan:**
  - repo: el `insert` lleva `phone: '5491122334455'`; sin `phone` → `phone: null`; `23505` → `STUDENT_EMAIL_EXISTS`.
  - service: invitación con `student_phone: '5491122334455'` → `createStudent` recibe `phone: '5491122334455'`; sin `student_phone` → `phone: null`; con `'123'` (menos de 6) → `phone: null`. Los casos existentes pasan a usar `mockStudentCreateRepo.createStudent`.
- [ ] **Step 2: Correr** `tests/unit/repositories/students tests/unit/services/students/students.service` → FAIL.
- [ ] **Step 3: Implementar.** Mover `createStudent` tal cual (con su comentario) y sumar `phone`; el service importa el repo nuevo como `studentCreateRepo`; `student_phone` en el select de la invitación.
- [ ] **Step 4: Correr** `tests/unit/repositories tests/unit/services/students tests/unit/services/invitations` → PASS; lint (`students.repository.js` ≈ 170).
- [ ] **Step 5: Commit** `refactor(students): createStudent a su propio repo y el alta copia el teléfono de la invitación`

### Task 4: Teléfono en la validación y `PATCH /students/:id` por rol

**Files:**
- Modify: `backend/src/validations/students/students.validation.js`, `backend/src/services/students/students.service.js` (`update`), `backend/src/routes/students/students.routes.js` (PATCH con `requireRole('trainer', 'student')`), `backend/tests/unit/validations/students/students.validation.test.js`, `backend/tests/unit/routes/students/students.routes.test.js`
- Move: `backend/tests/unit/services/students/students.service/update.test.js` → `…/students.service/update/trainer.test.js` (`git mv`, ajustar el import relativo del setup)
- Create: `backend/tests/unit/services/students/students.service/update/self.test.js`

**Interfaces:**
- Consumes: `STUDENT_SELF_EDITABLE` (Task 1), `assertCanAccessStudent`.
- Produces: `validateUpdateStudent` acepta `phone` (`null`, `''` → `null`, o string recortado que cumple `^[0-9 +()-]{6,30}$`; si no, detalle en `phone`: "phone debe tener entre 6 y 30 caracteres: números, espacios y + - ( )"); el mensaje de "al menos un campo" suma `phone`. `update(user, studentId, fields)`: `assertCanAccessStudent` primero; si `user.role === 'student'` y algún campo no está en `STUDENT_SELF_EDITABLE` → `Errors.forbidden('Solo podés cambiar tu nombre, teléfono y foto')`, **antes** de revocar/guardar/cancelar. El resto igual que hoy.

- [ ] **Step 1: Tests que fallan:**
  - validación: `'+54 9 11 2233-4455'` pasa recortado; `'  '`/`''` → `null`; `null` → `null`; `'12345'` (5) y `'abc123456'` → detalle en `phone`; 31 caracteres → detalle.
  - `self.test.js`: alumno `{ id: 'student-1', role: 'student' }` con `{ name: 'Ana Pérez', phone: '1122334455' }` → `updateStudent('student-1', { name, phone })` y devuelve la ficha; con `{ goal: 'strength' }` → 403 con ese mensaje y `updateStudent` no se llama; con `{ name: 'Ana', active: false }` → 403 y `revokeAllForUser`, `updateStudent` y `cancelFutureForStudent` **no** se llaman (Review Focus 1); sobre `'student-2'` → 403.
  - `trainer.test.js`: suma "PT con `phone`" → se guarda.
  - rutas: la cadena del PATCH `/:id` deja pasar `student` y `trainer` en el `requireRole`.
- [ ] **Step 2: Correr** `tests/unit/validations/students tests/unit/services/students tests/unit/routes/students` → FAIL.
- [ ] **Step 3: Implementar** (comentario del PATCH en la ruta: "Edición: trainer dueño (todo) o el propio alumno (nombre y teléfono); ownership y campos en el service").
- [ ] **Step 4: Correr** → PASS; lint.
- [ ] **Step 5: Commit** `feat(students): el alumno edita su nombre y teléfono por PATCH /students/:id`

### Task 5: Fotos firmadas en la lista, la ficha y el login

**Files:**
- Modify: `backend/src/services/students/students.service.js` (`list`, `buildDetail`), `backend/src/services/auth/auth.service.js` (`authenticateUser`), `backend/tests/helpers/students/students-service.setup.js` y `backend/tests/helpers/auth/auth-service.setup.js` (mock de `repositories/students/avatars.repository.js` con `signPaths: jest.fn(async () => new Map())`)
- Test: `backend/tests/unit/services/students/students.service/avatars.test.js`, `backend/tests/unit/services/auth/auth.service/avatar.test.js`

**Interfaces:**
- Consumes: `signAvatars` (Task 2).
- Produces: `list` devuelve `data` con `avatar_url` firmado (una llamada para toda la página); `buildDetail` (→ `GET` y `PATCH /students/:id`) firma la ficha; el login firma `user.avatar_url` (alumno y trainer).

- [ ] **Step 1: Tests que fallan:**
  - lista de 3 alumnos, dos con ruta → `signPaths` **una** vez con las dos rutas; los `avatar_url` salen como URL; el sin foto, `null`.
  - ficha con `avatar_url: 'students/student-1/a.jpg'` → `avatar_url` firmado; `signPaths` rechaza → `avatar_url: null` y 200 (Review Focus 2).
  - login de alumno con ruta → `user.avatar_url` es la URL firmada; con `signPaths` que rechaza, el login igual sale.
- [ ] **Step 2: Correr** `tests/unit/services/students tests/unit/services/auth` → FAIL (los existentes siguen verdes con el mock que devuelve `Map` vacío).
- [ ] **Step 3: Implementar** (`list`: `const signed = await signAvatars(data)` antes del `return`; `buildDetail`: firmar la fila antes de armar el objeto; login: `const [signed] = await signAvatars([user])`).
- [ ] **Step 4: Correr** → PASS; lint (`students.service.js` ≤ 200).
- [ ] **Step 5: Commit** `feat(students): avatar_url firmado en la lista, la ficha y el login`

### Task 6: `PUT` y `DELETE /students/:id/avatar`

**Files:**
- Create: `backend/src/services/students/avatar.service.js`, `backend/src/controllers/students/avatar.controller.js`, `backend/tests/helpers/students/avatar-service.setup.js`
- Modify: `backend/src/routes/students/students.routes.js`, `backend/tests/unit/routes/students/students.routes.test.js`, `backend/tests/unit/app/validation-coverage.test.js`
- Test: `backend/tests/unit/services/students/avatar.service.test.js`

**Interfaces:**
- Consumes: Task 2 (`avatarPath`, `isStudentAvatarPath`, `upload`, `remove`, `signAvatars`), `assertCanAccessStudent`, `updateStudent`, `detectImageType`, `parseImageUpload`.
- Produces:
  - `setAvatar(user, studentId, file) => { avatar_url }`: no es el propio alumno (`role !== 'student'` o `id` distinto) → `Errors.forbidden()`; sin `file` → `Errors.validation('Error de validación', [{ field: 'image', message: 'Elegí una foto' }])`; `detectImageType(file.buffer)` null → `Errors.imageTypeInvalid()` (sin tocar Storage); sube a `avatarPath(id, type.ext)` con `type.mime`; `updateStudent(id, { avatar_url: path })` — si falla, `remove(path)` best-effort y se re-tira el error original; después, si la anterior cumple `isStudentAvatarPath(prev, id)`, `remove(prev)` best-effort (error → `console.error`). Devuelve `avatar_url` firmada (o `null` si no se pudo firmar).
  - `removeAvatar(user, studentId) => void`: mismo chequeo de dueño; sin foto → no hace nada (idempotente); si hay, `updateStudent(id, { avatar_url: null })` y luego `remove(prev)` best-effort si es del bucket.
  - controller: `setAvatar` → `200 { data: { avatar_url } }` con `req.file`; `removeAvatar` → `204`.
  - rutas, antes de los `router.use('/:id…')`:
    - `router.put('/:id/avatar', authenticate, requireRole('student'), validate(validateStudentIdParam, 'params'), parseImageUpload, avatarController.setAvatar)`
    - `router.delete('/:id/avatar', authenticate, requireRole('student'), validate(validateStudentIdParam, 'params'), avatarController.removeAvatar)`

- [ ] **Step 1: Tests que fallan** (setup con mocks de `avatars.repository`, `students.repository` y `student-access.service`):
  - trainer → 403; otro alumno → 403; sin archivo → 400 en `image`; buffer `'hola'` → 415 `IMAGE_TYPE_INVALID` y `upload` no se llama.
  - PNG válido → `upload('students/s-1/<uuid>.png', buffer, 'image/png')`, `updateStudent('s-1', { avatar_url: <esa ruta> })`, `remove(<anterior>)` y devuelve la URL firmada.
  - anterior `null` o `'https://otro/x.jpg'` → `remove` no se llama.
  - `updateStudent` rechaza → `remove(<subida>)` y el error se propaga (Review Focus 3); `remove(<anterior>)` rechaza → igual devuelve `{ avatar_url }` (Review Focus 3).
  - `removeAvatar` sin foto → `updateStudent` no se llama; con foto → `updateStudent(..., { avatar_url: null })` y `remove(prev)`.
  - rutas: cadena de PUT (`parseImageUpload` después de validar el id, termina en `avatarController.setAvatar`) y de DELETE; `requireRole` rechaza `trainer`. En `validation-coverage.test.js`, sumar a `WITHOUT_BODY`: `'PUT /api/students/:id/avatar': 'multipart: solo el archivo image, validado por firma en el service'`.
- [ ] **Step 2: Correr** `tests/unit/services/students tests/unit/routes/students tests/unit/app` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr** → PASS; lint (`students.routes.js` ≈ 112).
- [ ] **Step 5: Commit** `feat(students): el alumno sube y quita su foto de perfil`

### Task 7: `GET` y `PATCH /auth/me` (título profesional)

**Files:**
- Create: `backend/src/validations/auth/profile.validation.js`, `backend/src/services/auth/profile.service.js`, `backend/src/controllers/auth/profile.controller.js`
- Modify: `backend/src/repositories/auth/auth.repository.js` (`updateTrainer`), `backend/src/routes/auth/auth.routes.js`, `backend/tests/unit/routes/auth/auth.routes.test.js`, `backend/tests/unit/repositories/auth/auth.repository.test.js`
- Test: `backend/tests/unit/validations/auth/profile.validation.test.js`, `backend/tests/unit/services/auth/profile.service.test.js`

**Interfaces:**
- Consumes: `findTrainerById`, `signAvatars`, `TRAINER_PUBLIC_COLUMNS` (con `professional_title`, Task 1).
- Produces:
  - `validateUpdateMe(body) => { name?, professional_title? }`: `name` recortado 2–100 ("name debe tener entre 2 y 100 caracteres"); `professional_title` `null`, `''` → `null`, o recortado 2–80 ("professional_title debe tener entre 2 y 80 caracteres"); sin ninguno → 400 "Mandá al menos un campo para actualizar" (campo `body`); otros campos se ignoran.
  - `updateTrainer(id, fields) => trainer` (`update … .eq('id', id).select(TRAINER_PUBLIC_COLUMNS).single()`).
  - `getMe(user)` / `updateMe(user, fields)` → `{ id, name, email, specialty, professional_title, avatar_url (firmada), password_changed_at, created_at }`; trainer inexistente → `Errors.notFound('Cuenta no encontrada')`.
  - controller: `getMe`, `updateMe` → `200 { data }`.
  - rutas: `router.get('/me', authenticate, requireRole('trainer'), profileController.getMe)` y `router.patch('/me', authenticate, requireRole('trainer'), validate(validateUpdateMe), profileController.updateMe)`.

- [ ] **Step 1: Tests que fallan:** validación con `'  Lic. en Ed. Física  '` → recortado; `'A'` y 81 caracteres → detalle en `professional_title`; `''` → `null`; `{}` → 400; `{ email: 'x' }` → 400 (se ignora). Service: `getMe` devuelve las 8 claves con `avatar_url` firmado; `updateMe` llama `updateTrainer('t-1', { professional_title: 'Lic.' })`. Repo: `updateTrainer` usa `TRAINER_PUBLIC_COLUMNS`. Rutas: `/me` GET y PATCH con `authenticate`, rechazan `student`, PATCH valida el body.
- [ ] **Step 2: Correr** `tests/unit/validations/auth tests/unit/services/auth tests/unit/repositories/auth tests/unit/routes/auth` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr** esos y `tests/unit/app` (el barrido encuentra `PATCH /api/auth/me` validado) → PASS; lint.
- [ ] **Step 5: Commit** `feat(auth): GET y PATCH /auth/me para el nombre y el título profesional del PT`

### Task 8: Contraparte con título y fotos firmadas en Mensajes

**Files:**
- Modify: `backend/src/models/messages/message.model.js` (`toTrainerPerson`), `backend/src/services/messages/messages.service.js` (`counterpartOf`), `backend/src/services/messages/conversations.service.js`, `backend/tests/helpers/messages/messages.setup.js` (mock de `avatars.repository` con `signPaths`), `backend/tests/unit/models/messages/message.model.test.js`
- Test: `backend/tests/unit/services/messages/messages.service/counterpart.test.js`, casos en `backend/tests/unit/services/messages/conversations.service.test.js`

**Interfaces:**
- Produces: `toTrainerPerson(row) => { ...toPublicPerson(row), professional_title: row.professional_title ?? null }`; `counterpartOf`: PT → `toPublicPerson(student)`, alumno → `toTrainerPerson(trainer)`; en los dos casos `avatar_url` firmado (`signAvatars([person])`). `listConversations` firma los `student.avatar_url` de toda la lista en una llamada.

- [ ] **Step 1: Tests que fallan:** alumno pide su historial con trainer `{ professional_title: 'Lic. en Ed. Física' }` → `counterpart.professional_title === 'Lic. en Ed. Física'`; el PT pide → el `counterpart` **no** tiene la clave `professional_title`; `avatar_url` con ruta → firmada; `signPaths` rechaza → historial 200 con `avatar_url: null`. Conversaciones: 3 alumnos con ruta → una llamada a `signPaths`, URLs en `student.avatar_url`.
- [ ] **Step 2: Correr** `tests/unit/models/messages tests/unit/services/messages tests/unit/routes/messages` → FAIL.
- [ ] **Step 3: Implementar** (`messages.service.js` ≤ 110).
- [ ] **Step 4: Correr** → PASS; lint.
- [ ] **Step 5: Commit** `feat(messages): el alumno ve el título de su PT y las fotos llegan firmadas`

### Task 9: Fotos firmadas en la agenda

**Files:**
- Modify: `backend/src/services/agenda/appointments.service.js` (lista y cambio de estado), `backend/src/services/agenda/appointment-create.service.js` (los dos `toAppointment`), sus setups/tests (mock de `avatars.repository`)
- Test: casos nuevos en `backend/tests/unit/services/agenda/appointments.service.test.js` y `appointment-create.service.test.js`

**Interfaces:**
- Consumes: `signAvatars`.
- Produces: helper local `signAppointments(list) => list` en `appointments.service.js` (exportado para `appointment-create`): firma `list.map((a) => a.student)` en una llamada y rearma `student` en cada turno.

- [ ] **Step 1: Tests que fallan:** la lista de turnos con dos alumnos con ruta → una llamada a `signPaths`, `student.avatar_url` firmado; turno sin alumno embebido (`avatar_url: null`) sigue igual; crear y cambiar estado devuelven el `student.avatar_url` firmado.
- [ ] **Step 2–4:** FAIL → implementar → `tests/unit/services/agenda` PASS; lint.
- [ ] **Step 5: Correr todo el backend:** `cd backend && npm test` → PASS; `npm run lint` → OK.
- [ ] **Step 6: Commit** `feat(agenda): avatar del alumno firmado en los turnos`

## Web

Comandos: `cd frontend && npx vitest run <path>` y `cd frontend && npm run lint`.

### Task 10: APIs y `updateUser` en el store

**Files:**
- Create: `frontend/src/api/account/profile.api.js`, `frontend/src/api/students/avatar.api.js`
- Modify: `frontend/src/hooks/auth/useAuthStore.js`
- Test: `frontend/tests/api/account/profile.api.test.js`, `frontend/tests/api/students/avatar.api.test.js`, `frontend/tests/hooks/auth/useAuthStore/update-user.test.js`

**Interfaces:**
- Produces:
  - `getMe() => request('/auth/me')` → `res.data`; `updateMe(body) => request('/auth/me', { method: 'PATCH', body })` → `res.data`.
  - `uploadAvatar(studentId, file) => string` (`FormData` con `image`, `PUT /students/:id/avatar`, devuelve `res.data.avatar_url`); `removeAvatar(studentId) => request(…, { method: 'DELETE' })`.
  - store `updateUser(fields)`: `set({ user: { ...get().user, ...fields } })`; sin `user`, no hace nada. Persiste (va en `partialize`).
- [ ] **Step 1: Tests que fallan:** método, path y body de cada función (el `body` de `uploadAvatar` es un `FormData` con `image`, sin `Content-Type` puesto a mano); `updateUser({ name: 'Ana P.' })` cambia solo `name` y queda en `localStorage` (`SESSION_STORAGE_KEY`); sin sesión → `user` sigue `null`.
- [ ] **Step 2–4:** FAIL → implementar → PASS; lint (`useAuthStore.js` ≈ 140).
- [ ] **Step 5: Commit** `feat(web): API de perfil y avatar, y updateUser en el store`

### Task 11: Teléfono y achicado de la foto

**Files:**
- Create: `frontend/src/utils/students/phone.js`, `frontend/src/utils/students/resizeImage.js` (Nota 8)
- Test: `frontend/tests/utils/students/phone.test.js`, `frontend/tests/utils/students/resizeImage.test.js`

**Interfaces:**
- Produces:
  - `PHONE_ERROR = 'Usá entre 6 y 30 caracteres: números, espacios y + - ( )'`; `validatePhone(value) => string|null` (vacío → `null`; mismo regex que el backend); `whatsappHref(phone) => string|null` (`https://wa.me/<solo dígitos>`; menos de 6 dígitos o vacío → `null`).
  - `AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp'`, `AVATAR_MAX_SIDE = 512`, `AVATAR_QUALITY = 0.85`.
  - `fitWithin(width, height, max = 512) => { width, height }`: escala el lado mayor a `max` conservando proporción y redondeando; nunca agranda.
  - `resizeToJpeg(file) => Promise<File>`: tipo fuera de `AVATAR_ACCEPT` → rechaza con `Error('IMAGE_TYPE_INVALID')`; decodifica con `createImageBitmap(file)` (falla → mismo error); canvas de `fitWithin(...)`, `toBlob('image/jpeg', 0.85)` → `new File([blob], 'avatar.jpg', { type: 'image/jpeg' })`.
- [ ] **Step 1: Tests que fallan:** `fitWithin(4000, 3000)` → `{ 512, 384 }`; `(3000, 4000)` → `{ 384, 512 }`; `(300, 200)` → igual; `(1000, 333)` → `{ 512, 170 }`. `validatePhone('+54 9 11 2233-4455')` → `null`; `'12345'` → `PHONE_ERROR`; `''` → `null`. `whatsappHref('+54 9 11 2233-4455')` → `'https://wa.me/5491122334455'`; `'(--)'` → `null`. `resizeToJpeg` con `type: 'image/heic'` rechaza con `IMAGE_TYPE_INVALID`; con `createImageBitmap` stubbeado que rechaza → mismo error.
- [ ] **Step 2–4:** FAIL → implementar → PASS; lint.
- [ ] **Step 5: Commit** `feat(web): teléfono con link a WhatsApp y achicado de la foto a 512 px`

### Task 12: `Avatar` con foto, en el sidebar y la topbar

**Files:**
- Modify: `frontend/src/components/shared/ui/Avatar.jsx`, `frontend/src/components/shared/layout/UserBlock.jsx`, `frontend/src/components/shared/layout/Topbar.jsx`
- Test: `frontend/tests/components/shared/ui/Avatar.test.jsx`, caso nuevo en `frontend/tests/components/shared/layout/UserBlock.test.jsx`

**Interfaces:**
- Produces: `Avatar({ ..., src })`: con `src` y sin error de carga dibuja `<img src={src} alt="" className="h-full w-full rounded-full object-cover">` en lugar de las iniciales (el contenedor conserva `role="img"` y `aria-label`); `onError` → iniciales; el error se olvida cuando cambia `src` (estado guardado junto al `src` que falló). `UserBlock` y `Topbar` pasan `src={user?.avatar_url}`.
- [ ] **Step 1: Tests que fallan:** con `src` se ve un `img` con ese `src` y no las iniciales; `fireEvent.error(img)` → iniciales (Review Focus 4); `rerender` con otro `src` → vuelve el `img`; sin `src` → iniciales como hoy; `UserBlock` con `user.avatar_url` muestra la foto.
- [ ] **Step 2–4:** FAIL → implementar → PASS (`tests/components/shared`, y `tests/components/shared/layout` sin regresiones); lint.
- [ ] **Step 5: Commit** `feat(web): Avatar muestra la foto y vuelve a las iniciales si no carga`

### Task 13: Hooks de la foto y del perfil del PT

**Files:**
- Create: `frontend/src/hooks/students/useAvatar.js`, `frontend/src/hooks/account/useTrainerProfile.js`
- Test: `frontend/tests/hooks/students/useAvatar.test.jsx`, `frontend/tests/hooks/account/useTrainerProfile.test.jsx`

**Interfaces:**
- Consumes: Tasks 10 y 11; `STUDENTS_KEY`.
- Produces:
  - `AVATAR_ERRORS = { IMAGE_TOO_LARGE: 'La foto supera 5 MB', IMAGE_TYPE_INVALID: 'Usá una foto JPG, PNG o WebP' }`; `avatarErrorMessage(error, fallback)`: el código (de `ApiError` o el `message` del `Error` de `resizeToJpeg`) → su texto; si no, `fallback`.
  - `useAvatar(studentId) => { upload(file) => Promise<void>, remove() => Promise<void>, uploading, removing }`: `upload` = `resizeToJpeg` → `uploadAvatar`; al éxito (los dos) `setQueryData([...STUDENTS_KEY, id], (s) => s && { ...s, avatar_url })`, `invalidateQueries(STUDENTS_KEY)` y `updateUser({ avatar_url })`. Los errores se tiran para que el componente elija el texto.
  - `ME_KEY = ['account', 'me']`; `useTrainerProfile() => { query, save(body) => Promise<void>, saving }`: `useQuery(ME_KEY, getMe)`; `save` → `updateMe`, `setQueryData(ME_KEY, data)` y `updateUser({ name: data.name, professional_title: data.professional_title })`.
- [ ] **Step 1: Tests que fallan** (`resizeToJpeg` mockeado con `vi.mock`): `upload` manda el archivo achicado, deja `avatar_url` nuevo en la caché de la ficha y en `user`; `remove` lo deja `null`; error 413 → `avatarErrorMessage` da "La foto supera 5 MB"; `Error('IMAGE_TYPE_INVALID')` → "Usá una foto JPG, PNG o WebP". `save` actualiza la caché y `user.name`.
- [ ] **Step 2–4:** FAIL → implementar → PASS; lint.
- [ ] **Step 5: Commit** `feat(web): hooks para la foto del alumno y el perfil del PT`

### Task 14: Mi perfil editable

**Files:**
- Create: `frontend/src/components/student/profile/ProfilePhoto.jsx`, `frontend/src/components/student/profile/EditContactDialog.jsx`
- Modify: `frontend/src/components/students/profile/MyProfileCard.jsx` (reescrito ~50), `frontend/src/pages/student/MyProfilePage.jsx` (sincroniza `user`, Nota 9), `frontend/tests/helpers/students/self.jsx` (handlers de `PATCH /students/s-1`, `PUT` y `DELETE /students/s-1/avatar`), `frontend/tests/components/students/profile/MyProfileCard.test.jsx` y `frontend/tests/pages/student/MyProfilePage/content.test.jsx` (Nota 13)
- Test: `frontend/tests/pages/student/MyProfilePage/edit.test.jsx`, `frontend/tests/pages/student/MyProfilePage/photo.test.jsx`

**Interfaces:**
- Consumes: Tasks 11–13; `useUpdateStudent`, `fieldErrorsFrom`, `Dialog`, `Input`, `Button`.
- Produces:
  - `ProfilePhoto({ student })`: `Avatar` de **84 px** con `src={student.avatar_url}`; botón ghost sm "Cambiar foto" que abre un `<input type="file" hidden accept={AVATAR_ACCEPT}>` (se limpia `value` después de elegir, así el mismo archivo se puede volver a elegir); "Quitar" solo si hay foto; el botón que corresponde en `loading` y los dos deshabilitados mientras hay una operación; error en `<p role="alert">` debajo (subir: `avatarErrorMessage(err, 'No pudimos subir la foto')`; quitar: "No pudimos quitar la foto"); se borra al reintentar.
  - `EditContactDialog({ student, onClose })`: título "Editar datos"; "Nombre y apellido" (`name`) y "Teléfono" (`phone`, `type="tel"`, `autoComplete="tel"`); valida en el cliente (nombre 2–100 con el texto de `studentForm`, `validatePhone`); manda solo lo que cambió (teléfono vacío → `null`; sin cambios → cierra sin pedido); errores con `fieldErrorsFrom(error, { fields: ['name', 'phone'], fallback: 'No pudimos guardar los cambios' })`; al éxito `updateUser({ name })` y `onClose()`. Footer Cancelar / Guardar como `EditStudentDialog`.
  - `MyProfileCard({ student })`: `ProfilePhoto`, nombre, email; `dl` con "Teléfono" (`student.phone ?? 'Sin cargar'`), "Objetivo", "Nivel"; nota "Objetivo y nivel los define tu entrenador/a"; botón ghost "Editar datos" que abre el diálogo.
  - `MyProfilePage`: con la ficha cargada, si `name` o `avatar_url` difieren de `user`, `updateUser({ name, avatar_url })` (`useEffect`).
- [ ] **Step 1: Tests que fallan:**
  - `edit.test.jsx`: "Editar datos" → cambiar nombre y teléfono → `PATCH /students/s-1` con `{ name: 'Ana Pérez', phone: '11 2233 4455' }`; el sidebar/`useAuthStore` muestra "Ana Pérez" sin recargar; backend 400 con `details: [{ field: 'phone', message: '…' }]` → mensaje junto a Teléfono; teléfono `'123'` → `PHONE_ERROR` sin pedido; borrar el teléfono → `{ phone: null }`; sin cambios → no hay PATCH. No hay ningún campo de objetivo ni nivel en el diálogo.
  - `photo.test.jsx` (`resizeToJpeg` mockeado): elegir archivo → `PUT /students/s-1/avatar` con `FormData`, la foto nueva se ve (`img` con la URL de la respuesta) y queda en `user.avatar_url`; 413 → "La foto supera 5 MB"; `resizeToJpeg` rechaza con `IMAGE_TYPE_INVALID` → "Usá una foto JPG, PNG o WebP", **sin** pedido y el botón habilitado (Review Focus 5); "Quitar" → `DELETE` y vuelven las iniciales; sin foto no hay "Quitar".
  - `content.test.jsx` / `MyProfileCard.test.jsx`: "Sin cargar" sin teléfono, el teléfono si hay, y la nota nueva.
- [ ] **Step 2: Correr** `tests/pages/student/MyProfilePage tests/components/students/profile` → FAIL.
- [ ] **Step 3: Implementar** (si `self.jsx` pasa de 200, separar los handlers nuevos en `tests/helpers/students/self-edit.js`).
- [ ] **Step 4: Correr** → PASS (incluye `account.test.jsx`, `states.test.jsx`, `trainer.test.jsx` sin regresiones); lint.
- [ ] **Step 5: Commit** `feat(web): el alumno edita su nombre, teléfono y foto en Mi perfil`

### Task 15: "Tu perfil" en la cuenta del PT

**Files:**
- Create: `frontend/src/components/account/TrainerProfileCard.jsx`
- Modify: `frontend/src/pages/account/TrainerAccountPage.jsx` (columna `flex flex-col gap-5`: `TrainerProfileCard` arriba, `AccountCard` abajo)
- Test: `frontend/tests/components/account/TrainerProfileCard.test.jsx`, caso en `frontend/tests/pages/account/TrainerAccountPage.test.jsx`

**Interfaces:**
- Consumes: `useTrainerProfile` (Task 13).
- Produces: `TrainerProfileCard()`: `Card` "Tu perfil"; cargando → `LoadingState`; error → `ErrorState` con reintento; campos "Nombre" y "Título profesional" (placeholder "Ej.: Lic. en Educación Física", ayuda "Lo ven tus alumnos en su perfil"); "Guardar" deshabilitado si nada cambió (comparando valores recortados); manda solo lo cambiado (título vacío → `null`); errores con `fieldErrorsFrom(..., { fields: ['name', 'professional_title'], fallback: 'No pudimos guardar los cambios' })`.
- [ ] **Step 1: Tests que fallan:** con `GET /auth/me` → `{ data: { name: 'Laura Gómez', professional_title: null, … } }` "Guardar" está deshabilitado; escribir "Lic. en Educación Física" lo habilita y manda `PATCH /auth/me` `{ professional_title: 'Lic. en Educación Física' }`; después queda deshabilitado otra vez; 400 en `professional_title` → mensaje junto al campo; cambiar el nombre actualiza `user.name` (sidebar). `TrainerAccountPage` muestra "Tu perfil" y la tarjeta Cuenta (los casos de GX1 siguen verdes; el stub suma `/auth/me`).
- [ ] **Step 2–4:** FAIL → implementar → PASS (`tests/components/account tests/pages/account`); lint.
- [ ] **Step 5: Commit** `feat(web): el PT carga su nombre y título profesional en Tu cuenta`

### Task 16: Título y foto en "Tu entrenador/a"

**Files:**
- Modify: `frontend/src/components/student/profile/TrainerCard.jsx`
- Test: `frontend/tests/components/student/profile/TrainerCard.test.jsx` (con `renderOwn` y `stubSelf` de `tests/helpers/students/self.jsx`)

**Interfaces:**
- Consumes: `counterpart.professional_title` y `counterpart.avatar_url` (Task 8).
- Produces: debajo del nombre, `<p className="font-mono text-[10px] uppercase text-ink6">{professional_title}</p>` solo si hay título; `Avatar` con `src={query.data.avatar_url}`.
- [ ] **Step 1: Tests que fallan:** counterpart con `professional_title: 'Lic. en Ed. Física'` → se ve ese texto; sin título → solo el nombre (ningún `p` vacío); con `avatar_url` → `img`.
- [ ] **Step 2–4:** FAIL → implementar → PASS (también `tests/pages/student/MyProfilePage/trainer.test.jsx`); lint.
- [ ] **Step 5: Commit** `feat(web): el alumno ve el título profesional de su entrenador/a`

### Task 17: Teléfono en la ficha del PT

**Files:**
- Modify: `frontend/src/components/students/profile/ProfileHeader.jsx`, `frontend/src/components/students/dialogs/EditStudentDialog.jsx`, `frontend/src/utils/students/studentForm.js`
- Test: `frontend/tests/components/students/profile/ProfileHeader.test.jsx`, casos en `frontend/tests/utils/students/studentForm.test.js` (o el test existente de ese util) y en el test de `EditStudentDialog` en `frontend/tests/components/students/dialogs/`

**Interfaces:**
- Consumes: `whatsappHref`, `validatePhone`, `PHONE_ERROR` (Task 11).
- Produces:
  - `ProfileHeader`: `Avatar` con `src={student.avatar_url}`; si hay `phone`, una línea con ícono `Phone` (lucide) y el número; si `whatsappHref(phone)` no es `null`, el número es un link a esa URL (`target="_blank" rel="noopener noreferrer"`, `aria-label="Escribir por WhatsApp a <phone>"`); sin teléfono, nada.
  - `studentForm`: `STUDENT_FIELDS` suma `'phone'`; `studentFormDefaults` suma `phone: student.phone ?? ''`; `buildStudentBody` manda `phone` si cambió (vacío → `null`); `validateStudentBody` usa `validatePhone`.
  - `EditStudentDialog`: `Input` "Teléfono" (`name="phone"`, `type="tel"`) después de Nombre.
- [ ] **Step 1: Tests que fallan:** `ProfileHeader` con `phone: '+54 9 11 2233-4455'` → link con `href="https://wa.me/5491122334455"`; con `'(--)'` → texto sin link; sin teléfono → ningún link; con `avatar_url` → `img`. `buildStudentBody` con teléfono cambiado → `{ phone }`, vaciado → `{ phone: null }`. El diálogo manda `PATCH` con `phone` y muestra el error del backend en el campo.
- [ ] **Step 2–4:** FAIL → implementar → PASS (`tests/components/students tests/utils/students tests/pages/students`); lint (`EditStudentDialog.jsx` ≈ 115).
- [ ] **Step 5: Correr todo el web:** `cd frontend && npx vitest run && npm run lint` → PASS.
- [ ] **Step 6: Commit** `feat(web): el PT ve y edita el teléfono del alumno, con link a WhatsApp`

## Docs y cierre

### Task 18: Contrato y modelo de datos

**Files:**
- Modify: `docs/arquitectura/contratos-api.md`, `docs/arquitectura/modelo-de-datos.md`

- [ ] **Step 1: Contrato** (formato de las secciones vecinas):
  - Auth: `POST /auth/login` (`user.phone` del alumno, `user.professional_title` del PT, `avatar_url` firmada); `GET /auth/me` y `PATCH /auth/me` nuevos (trainer; body `{ name?, professional_title? }`, respuesta de Datos del spec, 400/403).
  - Alumnos: nota general "`avatar_url` es una URL firmada que vence en 1 h (no guardarla más que la sesión); `null` sin foto o si no se pudo firmar"; `GET /students/:id` con `phone`; `PATCH /students/:id` trainer dueño **o** el propio alumno (`{ name?, phone? }`, otro campo → 403 "Solo podés cambiar tu nombre, teléfono y foto"); `PUT /students/:id/avatar` (multipart `image`, 200 `{ data: { avatar_url } }`, 400/403/413/415) y `DELETE /students/:id/avatar` (204, idempotente).
  - Mensajes: `counterpart.professional_title` (solo rol alumno) y avatares firmados en historial y conversaciones. Agenda: `student.avatar_url` firmado.
- [ ] **Step 2: Modelo:** `students.phone varchar(30)`, `trainers.professional_title varchar(80)`, `avatar_url` guarda la **ruta** en el bucket privado `avatars` (`students/<id>/<uuid>.<ext>`), y el bucket en la sección de Storage junto a `message-images`.
- [ ] **Step 3:** `git diff --stat` muestra solo esos 2 archivos.
- [ ] **Step 4: Commit** `docs(api): contrato y modelo del perfil editable (GX2)`

### Task 19: Verificación en el navegador y capturas

**Files:** capturas en `docs/superpowers/specs/assets/gx2/` (`01-mi-perfil-editable.jpg`, `02-editar-datos.jpg`, `03-foto-subida.jpg`, `04-pt-titulo.jpg`, `05-tu-entrenador-titulo.jpg`, `06-ficha-telefono.jpg`, `07-angosto-375.jpg`).

- [ ] **Step 1: Suites completas.** `cd backend && npm test && npm run lint`; `cd frontend && npx vitest run && npm run lint` → todo verde, ningún archivo > 200 líneas.
- [ ] **Step 2: Migración aplicada** (Task 1, Step 5, la corre Pablo). Levantar backend (`npm run dev`) y web contra Supabase dev; PT y alumno de QA.
- [ ] **Step 3: Alumno.** Mi perfil (01); "Editar datos" → nombre y teléfono (02) → el sidebar cambia al instante; `curl -X PATCH` con su access y `{ "goal": "strength" }` → `403` con el mensaje. "Cambiar foto" con una foto grande del celular → se ve en el perfil, el sidebar y la topbar (03); en la pestaña Network el `PUT` pesa decenas de KB (JPEG 512 px) y la `avatar_url` de las respuestas es una URL firmada (`/object/sign/avatars/…?token=`); abrir esa URL en una ventana privada anda y una ruta sin token da error. "Quitar" → vuelven las iniciales.
- [ ] **Step 4: PT.** `/pt/cuenta` → "Tu perfil", cargar "Lic. en Educación Física" (04); como alumno, "Tu entrenador/a" lo muestra en mono (05). Ficha del alumno: teléfono con link a WhatsApp que abre `wa.me/<dígitos>` (06); Editar alumno → cambiar el teléfono y verlo en la ficha.
- [ ] **Step 5: Angosto.** 375 px en Mi perfil y en "Editar datos" (07): sin scroll horizontal.
- [ ] **Step 6: Commit** `docs(web): capturas de la GX2`. Después, `git merge origin/develop` (o la rama de GX1, Nota 1), review de dos ejes y PR titulada `feat(students): perfil editable del alumno y título profesional del PT (GX2)`, con las 5 tarjetas para el celular de Igna del spec en el cuerpo y el aviso de la Nota 15.
