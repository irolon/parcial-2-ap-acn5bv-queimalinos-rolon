# GX2 · Perfil editable del alumno y título profesional del PT — diseño

Ticket 2 de 9 del lote GX ("lo que quedó afuera de la Guía Web"). Una PR. Rama sugerida: `feature/editable-profile`.

## Contexto

Guía Web (`src/guia-web-hifi.jsx`), **A5 · Mi perfil**, funcionalidad 1, "Datos personales editables" ("Nombre, contacto, objetivo y frecuencia comprometida"), y la nota técnica: "El alumno edita solo sus propios datos". Referencia visual: `AW_Perfil` en `src/alumno-web-2.jsx` (avatar de 84 px con "Cambiar foto"; "Mi entrenadora" con "LIC. EN ED. FÍSICA" en mono debajo del nombre).

Hoy: `MyProfileCard` es de solo lectura ("Para cambiar tus datos, hablá con tu entrenador"); `PATCH /students/:id` es solo del trainer; `students` no tiene teléfono (lo tiene `invitations.student_phone`, que no se copia al alta); `avatar_url` existe en `students` y `trainers` pero nadie lo escribe y `Avatar.jsx` solo dibuja iniciales; `trainers` tiene `specialty` (del registro) y no tiene título. Storage: bucket privado `message-images` con URLs firmadas, `parseImageUpload` (multer en memoria, 5 MB, campo `image`) y `detectImageType` (JPEG/PNG/WebP por firma).

## Decisiones

| # | Decisión |
|---|---|
| 1 | El alumno edita **solo** nombre, teléfono y foto. Objetivo, nivel, lesiones y equipamiento siguen siendo del PT. |
| 2 | Se **amplía** `PATCH /students/:id` con permisos por rol (no un endpoint aparte): el alumno, sobre sí mismo, solo `name` y `phone`; cualquier otro campo → `403 FORBIDDEN` ("Solo podés cambiar tu nombre, teléfono y foto"). El PT sigue con todo y suma `phone`. |
| 3 | Teléfono: columna nueva `students.phone varchar(30)`, opcional; 6 a 30 caracteres entre dígitos, espacios, `+ - ( )`. Se copia de la invitación al alta y se rellena para los alumnos existentes desde su invitación usada. |
| 4 | Foto: endpoint propio `PUT /students/:id/avatar` (multipart, `image`) y `DELETE /students/:id/avatar`, solo el propio alumno. |
| 5 | Bucket **privado** `avatars` con **URLs firmadas por lote**, como las fotos del chat (`createSignedUrls` en `message-images.repository.js`): Pablo pidió que no cualquiera con el link vea las fotos (09/11). En `avatar_url` se guarda la **ruta** (`students/<id>/<uuid>.<ext>`), no una URL. Cada respuesta que devuelve avatares (lista de alumnos, ficha, contraparte, `/auth/me`) los firma **en una sola llamada por respuesta** (`signAvatars(rows)`), con vencimiento de 24 h y una caché en memoria por ruta de 23 h (no se vuelve a firmar en cada pedido). Sin sesión no se ven; un link filtrado deja de andar al día siguiente. La foto anterior se borra en best-effort. |
| 6 | La web achica la foto antes de subirla: lado mayor 512 px, JPEG 0,85 (canvas). El backend igual valida firma y 5 MB. |
| 7 | Título profesional: columna nueva `trainers.professional_title varchar(80)`, opcional, **no** en el registro. No se reusa `specialty` (es el foco de trabajo, no el título). |
| 8 | El PT lo edita en su Configuración de cuenta (`/pt/cuenta`, de GX1), junto con su nombre, con `GET /auth/me` y `PATCH /auth/me` (solo trainer). |
| 9 | El alumno lo ve en "Tu entrenador/a" (`TrainerCard` de la **#89**): `counterpart.professional_title` en `GET /messages/:studentId`, solo cuando el que pide es el alumno. |
| 10 | `Avatar` suma `src`: con URL dibuja la foto y, si falla la carga, vuelve a las iniciales. En este ticket se pasa en Mi perfil, sidebar/topbar del usuario y cabecera de la ficha del PT; el resto de las listas sigue con iniciales. |
| 11 | La ficha del PT muestra el teléfono con link `https://wa.me/<dígitos>` (sirve para el blanqueo de GX1). |

## Diseño

**Mi perfil (alumno).** `MyProfileCard` se parte en:
- `ProfilePhoto`: `Avatar` de 84 px con `src`, "Cambiar foto" (input file oculto, `accept="image/jpeg,image/png,image/webp"`) y, si hay foto, "Quitar". Subiendo: el botón en `loading`. Error: texto `role="alert"` debajo ("La foto supera 5 MB" / "Usá una foto JPG, PNG o WebP" / "No pudimos subir la foto").
- Datos: nombre, email (no editable), teléfono ("Sin cargar"), objetivo y nivel; nota "Objetivo y nivel los define tu entrenador/a". Botón ghost "Editar datos" → `EditContactDialog` (Nombre y apellido, Teléfono; errores por campo con `fieldErrorsFrom`). Guardar invalida la ficha y actualiza `user.name` / `user.avatar_url` del store (sidebar y topbar).
- Sin "Guardar cambios" en la topbar del prototipo: cada acción guarda sola (consistente con el resto de la web).

**Configuración de cuenta del PT** (`TrainerAccountPage`, de GX1): tarjeta nueva arriba, `TrainerProfileCard` "Tu perfil": Nombre y Título profesional (placeholder "Ej.: Lic. en Educación Física"; ayuda "Lo ven tus alumnos en su perfil"), botón "Guardar" deshabilitado sin cambios. Carga con `GET /auth/me`; al guardar actualiza el store.

**TrainerCard (#89)**: debajo del nombre, el título en mono `text-[10px] uppercase text-ink6`; sin título no se muestra nada. El avatar con `src` del `counterpart`.

**Ficha del PT**: `ProfileHeader` suma el teléfono con ícono `Phone` y link a WhatsApp; sin teléfono, nada. `EditStudentDialog` suma el campo Teléfono.

**Backend.**
- `validateUpdateStudent` acepta `phone` (`null` o el formato de la decisión 3).
- `students.service.update(user, id, fields)`: hoy corta a todo lo que no sea trainer; pasa a: trainer como hoy; alumno → `assertCanAccessStudent` (solo sí mismo) y `STUDENT_SELF_EDITABLE = ['name', 'phone']`. La ruta pasa a `requireRole('trainer', 'student')`.
- `services/students/avatar.service.js`: `setAvatar(user, id, file)` (solo el propio alumno; sin archivo → 400; `detectImageType` o `IMAGE_TYPE_INVALID`; sube, guarda `avatar_url`, borra la anterior si es del bucket; si guardar falla, borra la subida) y `removeAvatar(user, id)`.
- `repositories/students/avatars.repository.js` (`upload`, `remove`, `signPaths(paths)` con `createSignedUrls`) con `AVATARS_BUCKET`, `AVATAR_URL_SECONDS = 86400` y la caché (`models/students/avatar.model.js`, puro: qué rutas faltan firmar y cuáles vencen). `services/students/avatar-urls.service.js`: `signAvatars(rows, key = 'avatar_url')` reemplaza la ruta por la URL firmada (o `null`) en todas las filas con una sola llamada.
- `students.repository.js` está en **200 líneas**: `createStudent` se muda a `repositories/students/student-create.repository.js` y suma `phone`; `registerFromInvitation` pasa `invitation.student_phone`.
- `services/auth/profile.service.js` (`getMe`, `updateMe`), `controllers/auth/profile.controller.js`, `validations/auth/profile.validation.js` (`name` 2–100, `professional_title` `null` o 2–80, recortado; al menos uno), `auth.repository.updateTrainer(id, fields)`.
- `messages.service.counterpartOf`: para el alumno, `toTrainerPerson(trainer)` (= `toPublicPerson` + `professional_title`).

## Datos

- `PATCH /students/:id` — ahora trainer dueño **o** el propio alumno. Body del alumno: `{ name?, phone? }`; otro campo → 403. Respuesta igual (ficha, ahora con `phone`).
- `PUT /students/:id/avatar` (alumno propio, `multipart/form-data`, campo `image`) → `200 { data: { avatar_url } }`. 400 sin archivo, 413 `IMAGE_TOO_LARGE`, 415 `IMAGE_TYPE_INVALID` (el que ya usa el chat), 403 otro alumno o trainer.
- `DELETE /students/:id/avatar` → 204 (idempotente).
- `GET /auth/me` y `PATCH /auth/me` (trainer) → `{ data: { id, name, email, specialty, professional_title, avatar_url, password_changed_at, created_at } }`.
- `GET /students/:id` y el login del alumno suman `phone`; los del PT, `professional_title`. `GET /messages/:studentId` (rol alumno): `counterpart.professional_title`.
- Migración `2026-11-09-profile-editable.sql`: `students.phone`, backfill (`update students s set phone = i.student_phone from invitations i where i.student_email = s.email and i.used_at is not null and s.phone is null`, la invitación usada más reciente), `trainers.professional_title`, bucket `avatars` (`public = false`, 5 MB, JPEG/PNG/WebP, `on conflict do nothing`). Igual en `schema/01-auth.sql`, `02-students.sql` y `06b-messages.sql` (donde ya vive el otro bucket).
- Contrato y modelo de datos actualizados.

## Archivos que toca

- Backend, crea: `services/students/avatar.service.js`, `repositories/students/avatars.repository.js`, `repositories/students/student-create.repository.js`, `models/students/avatar.model.js`, `controllers/students/avatar.controller.js`, `services/auth/profile.service.js`, `controllers/auth/profile.controller.js`, `validations/auth/profile.validation.js`, la migración.
- Backend, modifica: `repositories/students/students.repository.js` (200, −30), `services/students/students.service.js` (151, +8), `validations/students/students.validation.js` (102, +10), `routes/students/students.routes.js` (67 + GX1, +16), `models/students/student.model.js` (+1), `models/auth/trainer.model.js` (+1), `repositories/auth/auth.repository.js` (+12), `routes/auth/auth.routes.js` (+3), `models/messages/message.model.js` (52, +3), `services/messages/messages.service.js` (102, +1), `database/schema/01-auth.sql`, `02-students.sql`, `06b-messages.sql`.
- Web, crea: `api/account/profile.api.js` (`getMe`, `updateMe`), `api/students/avatar.api.js`, `hooks/account/useTrainerProfile.js`, `hooks/students/useAvatar.js`, `utils/files/resizeImage.js` (`fitWithin(w, h, max)` puro + `resizeToJpeg(file)`), `utils/students/phone.js` (`whatsappHref`, validación), `components/student/profile/ProfilePhoto.jsx`, `EditContactDialog.jsx`, `components/account/TrainerProfileCard.jsx`.
- Web, modifica: `components/shared/ui/Avatar.jsx` (37, +12), `components/students/profile/MyProfileCard.jsx` (34, reescrito ~50), `components/student/profile/TrainerCard.jsx` (#89, +4), `components/students/profile/ProfileHeader.jsx` (24, +10), `components/students/dialogs/EditStudentDialog.jsx` (104 + GX1, +8), `components/shared/layout/UserBlock.jsx` y `Topbar.jsx` (63, +1 `src`), `hooks/auth/useAuthStore.js` (+6: `updateUser`), `pages/account/TrainerAccountPage.jsx` (GX1, +2).
- Tests: ver Pruebas.

**Chequeo contra PRs abiertas.** Depende de la **#89** (`TrainerCard.jsx`, `MyProfilePage.jsx`, helpers `tests/helpers/students/self.jsx`) y de **GX1** (`TrainerAccountPage`, `UserBlock`, `EditStudentDialog`): se arranca cuando las dos estén en `develop`. `useAuthStore.js` está en la **#85** (solo el import). `contratos-api.md` y `modelo-de-datos.md`: #83, #85, #90, #91 (otras secciones). No toca `StudentProfilePage.jsx` (#88: el teléfono va en `ProfileHeader`), `ProfileActions.jsx` (#84), `app.js`, `errors.js` (reusa `imageTooLarge` / `imageTypeInvalid`), `overview.service.js` (#91: el split del repo mueve solo `createStudent`) ni `triggers.service.js` (#76). Si entra la **#92**, sumar las rutas nuevas a la tabla de aislamiento.

## Pruebas

**Jest (backend)**
- `tests/unit/services/students/students.service/update.test.js` → se parte en `update/trainer.test.js` y `update/self.test.js`: alumno cambia nombre y teléfono; alumno con `goal` → 403; alumno sobre otro → 404/403; PT con `phone`.
- `tests/unit/services/students/avatar.service.test.js`: firma inválida, sin archivo, otro usuario, trainer → 403, sube y borra la anterior, si falla el update borra la subida.
- `tests/unit/models/students/avatar.model.test.js` (`pathFromUrl` con URL ajena → null).
- `tests/unit/validations/students/students.validation.test.js` (teléfono) y `validations/auth/profile.validation.test.js`.
- `tests/unit/services/students/students.service/register-from-invitation.test.js`: copia `student_phone` (mock del repo nuevo).
- `tests/unit/services/auth/profile.service.test.js`; `tests/unit/services/messages/…` contraparte con `professional_title` solo para el alumno.
- Rutas: `students.routes.test.js` y `auth.routes.test.js` (roles, multipart).

**Vitest (web)**
- `utils/files/resizeImage.test.js` (`fitWithin`), `utils/students/phone.test.js`.
- `pages/student/MyProfilePage/edit.test.jsx`: editar nombre y teléfono, error por campo, el sidebar muestra el nombre nuevo; `…/photo.test.jsx`: sube (con `resizeToJpeg` mockeado), error 413, quitar.
- `components/shared/ui/Avatar.test.jsx`: con `src` muestra la imagen; `onError` → iniciales.
- `components/account/TrainerProfileCard.test.jsx`; `components/student/profile/TrainerCard.test.jsx` (título visible / ausente).
- `components/students/profile/ProfileHeader.test.jsx` (link a WhatsApp).

**Navegador:** alumno de QA cambia nombre, teléfono y foto; PT carga su título y lo ve el alumno. Capturas en `docs/superpowers/specs/assets/gx2/` (`01-mi-perfil-editable.jpg`, `02-editar-datos.jpg`, `03-foto-subida.jpg`, `04-pt-titulo.jpg`, `05-tu-entrenador-titulo.jpg`, `06-ficha-telefono.jpg`, `07-angosto-375.jpg`).

## Criterio de aceptación

- El alumno cambia nombre, teléfono y foto desde Mi perfil y lo ve en el sidebar al instante; no puede cambiar objetivo ni nivel (tampoco por API).
- El PT carga su título profesional en Configuración y el alumno lo ve en "Tu entrenador/a".
- El PT ve el teléfono del alumno en la ficha con link a WhatsApp.
- Lint y tests en verde; ningún archivo pasa de 200 líneas; contrato y modelo actualizados.

## Estimación

**22,5 h**: migración, bucket y backfill 1 h; PATCH por rol y teléfono 1,5 h; split del repo y teléfono al alta 1 h; foto (service, repo, rutas) 2,5 h; firma por lote y caché 1,5 h; `/auth/me` 1,5 h; contraparte 0,5 h; tests backend 3,5 h; `Avatar` con foto y resize 1,5 h; Mi perfil editable 2,5 h; perfil del PT y `TrainerCard` 1,5 h; ficha (teléfono) 0,5 h; tests web 2,5 h; docs 0,5 h; navegador y capturas 1 h.

## Fuera de alcance

- Foto del PT (`avatar_url` de `trainers`): mismo patrón, otro ticket.
- Fotos en las demás listas (alumnos, agenda, mensajes, dashboard).
- Recorte de la foto en el navegador; borrar fotos huérfanas del bucket.
- Cambiar el email.

## Tarjetas para el celular (Igna)

1. **Mi perfil editable (alumno):** `PATCH /students/:id` con `{ name, phone }` (403 si manda otro campo); `PUT /students/:id/avatar` multipart `image` (cámara o galería, achicada a 512 px) y `DELETE /students/:id/avatar`.
2. **Mostrar fotos:** `avatar_url` llega ya firmada (vence a las 24 h): cargarla con Coil donde hoy hay iniciales, empezando por el perfil y la cabecera. No guardarla en Room más que la sesión: al volver a pedir la lista llega firmada de nuevo.
3. **Título del entrenador:** mostrar `counterpart.professional_title` de `GET /messages/:studentId` en la tarjeta del entrenador del alumno.
4. **Configuración del PT:** `GET /auth/me` y `PATCH /auth/me` con `{ name, professional_title }`.
5. **Ficha del PT:** mostrar `phone` del alumno con acción "Abrir WhatsApp".
