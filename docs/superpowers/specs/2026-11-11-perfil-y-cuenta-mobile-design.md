# Perfil (alumno) y Más (entrenador) en el celular — diseño

## Por qué

Igna, probando en su Galaxy S10 el 11/11: las pestañas **Perfil** (alumno) y **Más** (entrenador) son una lista de
botones (`ui/placeholder/AccountMenuScreen`) sin ningún dato de la persona. Quiere que muestren el perfil con sus datos y
que se puedan modificar desde ahí.

El backend de la edición llegó con dos PRs de Pablo, ya mergeadas en develop: **#94** (GX1: `PUT /auth/password`) y **#95**
(GX2: perfil editable, apilada sobre la #94). Sus specs ya listan las tarjetas del celular. Esta tarjeta toma la 1, 2 y 4
de GX2 y la 2 de GX1.

## Qué se decidió (Igna, 11/11)

- **Diseño "tarjeta + menú"**, igual para los dos roles:
  - arriba, una tarjeta con la foto (o las iniciales), el nombre y los datos, más un botón **Editar perfil**;
  - debajo, los accesos agrupados por sección;
  - al final, **Cerrar sesión**.
- **Editar perfil** abre una pantalla aparte con el formulario y **Guardar**.
- **Se hace todo ahora.** La #94 y la #95 ya están en develop (13/11). La rama es `feature/android-perfil-y-mas`, apilada
  sobre la #113 (logros del alumno, Room v28): el PR apunta a esa rama y pasa a `develop` cuando se mergee la #113.

### Perfil del alumno

- **Tarjeta:** foto, nombre, email, teléfono ("Sin teléfono cargado" si no tiene: la tarjeta no lleva etiquetas, y "Sin cargar" solo no se entendía) y "Entrena con <nombre del PT>".
  - El nombre del PT sale del hilo del chat que ya está en Room. Si nunca abrió el chat, esa línea no se muestra.
- **Mi entrenamiento:** Mis turnos.
- **Cuenta:** Cambiar contraseña, Notificaciones, Estado del servidor.
- **Editar perfil:** foto (galería: cambiar o quitar), nombre y teléfono. El email se ve, pero no se puede cambiar.

### Más del entrenador

- **Tarjeta:** iniciales, nombre, título profesional (si lo cargó) y email.
  - Sin foto: la #95 no tiene foto del PT, queda para otro ticket.
- **Herramientas:** Plantillas, Biblioteca, Desafíos, Agenda.
- **Cuenta:** lo mismo que el alumno.
- **Editar perfil:** nombre y título profesional, con la ayuda "Lo ven tus alumnos".

### Cambiar contraseña (los dos roles)

- **Campos:** actual, nueva y repetir la nueva.
- **Reglas de la nueva** (las del registro y la #94): al menos 8 caracteres, una mayúscula y un número, y distinta de la
  actual. Se avisan antes de enviar.
- **Si la actual es incorrecta**, el backend responde `400` con el error en `current_password`, y se muestra debajo de
  ese campo.
- **Al guardar** vuelve al menú con el aviso "Contraseña actualizada".

## Contratos que usa (de la #94 y la #95)

- Alumno:
  - `GET /students/:id` (su propio id) → `name`, `email`, `phone`, `avatar_url`.
  - `PATCH /students/:id` con `{ name?, phone? }`. Otro campo → `403`.
  - `PUT /students/:id/avatar` (multipart, campo `image`) → `{ avatar_url }`.
  - `DELETE /students/:id/avatar` → `204`.
- Entrenador:
  - `GET /auth/me` → `name`, `email`, `professional_title`, `avatar_url`.
  - `PATCH /auth/me` con `{ name?, professional_title? }`.
- Los dos: `PUT /auth/password` con `{ current_password, new_password, refresh_token, push_token? }` →
  `{ token, expires_in, password_changed_at }`. El refresh actual sigue valiendo.
- Errores:
  - `413 IMAGE_TOO_LARGE` y `415 IMAGE_TYPE_INVALID` en la foto;
  - `400 VALIDATION_ERROR` con `details[].field`.
- Teléfono válido: 6 a 30 caracteres entre dígitos, espacios y `+ - ( )`, con al menos 6 dígitos. Vacío lo borra (`null`).
- Título: vacío lo borra (`null`); si no, 2 a 80 caracteres.

## Cómo se arma

- **Room es la fuente de verdad.**
  - Tabla nueva `my_profile`, una fila por usuario: `ownerId`, `role`, `name`, `email`, `phone`, `avatarUrl`,
    `professionalTitle`, `fetchedAt`.
  - La pantalla lee de Room. El repositorio refresca al abrir la pestaña si hay red, y guarda lo que devuelven el
    PATCH y la foto.
  - Room 28 → 29 con `AutoMigration(28, 29)`, que solo crea la tabla (`29.json`, test `MigrationV29Test`). La v26 es de
    la GX8, la v27 de la GX4 y la v28 de los logros (#113). Si otra versión entra antes, esta sube una y se regenera el
    JSON del schema, como en la cascada de las tarjetas anteriores.
- **Se borra al cerrar sesión**, con el resto de los datos del usuario (`UserDataCleaner`).
- **El nombre del saludo** ("Hola, Alumna") y el del menú vienen de la sesión. Al guardar un nombre nuevo se actualiza
  también la sesión guardada.
- **Foto:**
  - Se elige con el selector de fotos del sistema (`PickVisualMedia`, el mismo del chat).
  - Se achica a 512 px de lado mayor, en JPEG al 85 % (`PhotoCompressor` con otro máximo) y se sube.
  - Se muestra con Coil. Si la URL firmada venció (dura 1 h) o falla la carga, se ven las iniciales hasta el próximo
    refresco.
- **Notificaciones** abre los ajustes de notificaciones de la app en Android, con el mismo intent que ya usa la sesión
  activa. Las preferencias por tipo (#97) quedan para otra tarjeta.
- **Sin red:**
  - El perfil se ve con lo guardado.
  - Editar perfil y Cambiar contraseña muestran por qué no se puede guardar ("Necesitás conexión para guardar") y no
    se encolan. Son cambios de cuenta, como la mensajería (AGENTS.md): no se escriben offline.
- **Pantalla compacta:** la pantalla de perfil scrollea y los textos largos (email, título) van en una línea con
  puntos suspensivos.

## Fuera de alcance (otras tarjetas)

- **Cambio obligatorio de clave tras el blanqueo** (GX1, tarjeta 1 del celular). Pablo la marcó prioritaria: sin ella,
  un alumno blanqueado queda trabado en el celular. Es la próxima.
- Blanquear clave desde la ficha del PT y exportar CSV (GX1, 3 y 4).
- Título del PT en el chat del alumno y teléfono con WhatsApp en la ficha del PT (GX2, 3 y 5).
- Foto del PT. Preferencias de notificación por tipo (#97).

## Cómo se prueba

- **Unitarios:**
  - reglas de la contraseña nueva;
  - validación del teléfono y del título;
  - tamaño de la foto achicada;
  - repositorio del perfil (refresco a Room, PATCH guarda en Room y en la sesión, error 400 por campo, sin red);
  - ViewModels de perfil, edición y contraseña;
  - migración de Room (`MigrationTestHelper`, instrumentado).
- **Instrumentados de UI:**
  - la tarjeta con y sin teléfono o foto;
  - el formulario muestra el error del campo;
  - el menú en pantalla compacta (320 × 560 dp, letra 1,1) llega con scroll a Cerrar sesión.
- **En el S10 de Igna**, contra el backend local con la #95 corriendo:
  - el alumno cambia nombre, teléfono y foto, y la contraseña;
  - el PT cambia nombre y título.
