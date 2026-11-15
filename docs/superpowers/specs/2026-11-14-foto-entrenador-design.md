# Foto de perfil del entrenador (deseable)

**Fecha:** 14/11/2026 · **Rama:** `feature/trainer-avatar` · **Base:** `develop`

## Objetivo

El PT sube, cambia y quita su foto desde Configuración (`/pt/cuenta`, "Tu perfil"), igual que el alumno en Mi perfil (GX2). La foto se ve en su sidebar y topbar, y sus alumnos la ven en "Tu entrenador/a" (Mi perfil) y en la cabecera de Mensajes.

## Punto de partida

La GX2 dejó todo el patrón armado para el alumno: bucket privado `avatars` (5 MB, JPEG/PNG/WebP), la columna guarda la **ruta** del bucket, cada respuesta la firma por lote (`signAvatars`, 1 h), `PUT`/`DELETE /students/:id/avatar`, achicado a 512 px en el navegador (`resizeToJpeg`), `Avatar` con `src` y `ProfilePhoto`. `trainers.avatar_url` ya existe (`schema/01-auth.sql`) y ya se firma en login, `GET`/`PATCH /auth/me` y la contraparte de Mensajes (`GET /messages/:studentId`, de donde sale "Tu entrenador/a"); solo faltaba escribirla.

## Decisiones

| # | Decisión |
|---|---|
| 1 | Rutas `PUT /auth/me/avatar` y `DELETE /auth/me/avatar`, **solo trainer** (`requireRole('trainer')`), al lado de `GET`/`PATCH /auth/me`. Sin `:id`: el PT es el del token, así que no hay forma de apuntar a otro (no entra en el barrido de aislamiento por parámetro; igual se suman las dos filas de rol equivocado: el alumno recibe 403). |
| 2 | Mismos límites y validaciones que la GX2: multipart con `image` (`parseImageUpload`, 5 MB → 413 `IMAGE_TOO_LARGE`), tipo real por firma (`detectImageType` → 415 `IMAGE_TYPE_INVALID`), sin archivo → 400 en `image`. Respuesta `{ data: { avatar_url } }` firmada, como la del alumno. |
| 3 | Ruta en el bucket: `trainers/<id>/<uuid>.<ext>`. Al reemplazar o quitar se borra la anterior en best-effort, **solo si es del propio PT** (`trainers/<id>/`). Si guardar la ruta falla, se borra la subida y sale el error original. |
| 4 | La subida, el deshacer y el borrado silencioso se sacan de `avatar.service.js` (alumno) a `avatar-storage.service.js`, que usan los dos services. El comportamiento del alumno no cambia (sus tests pasan igual). |
| 5 | **Sin migración.** El bucket `avatars` no tiene políticas por prefijo: es privado, sin acceso del navegador, y el backend sube, borra y firma con la `service_role`, que no pasa por RLS. La columna `trainers.avatar_url` ya existe. |
| 6 | La invitación pública (`GET /invitations/:token`) ya devolvía `trainer.avatar_url` crudo (siempre `null` hasta hoy). Ahora que puede tener ruta, sale **firmada** (o `null`), para que nunca salga una ruta del bucket. El token es el secreto; la foto la ve quien recibió la invitación. |
| 7 | Web: `TrainerProfilePhoto` en "Tu perfil" (mismo aspecto y textos que `ProfilePhoto`). `useTrainerAvatar` achica, sube, deja la URL en la caché de `/auth/me` y en el `user` del store (sidebar y topbar). |
| 8 | La URL firmada vence en 1 h y el `user` vive en localStorage: al restaurar la sesión de un PT se pide `GET /auth/me` (best-effort, como la ficha del alumno), así el sidebar no queda con un link vencido. Si igual falla la carga, `Avatar` vuelve a las iniciales. |
| 9 | La cabecera de la conversación (`ConversationHeader`) pasa a dibujar la foto del `counterpart` (el PT para el alumno, el alumno para el PT): el dato ya llegaba firmado. Las listas de conversaciones siguen con iniciales, como dejó la GX2. |
| 10 | Celular (Igna) fuera de esta PR: la tarjeta GX2-M2 ("mostrar las fotos de perfil") ya cubre cargar `avatar_url` con Coil; con esta PR, la del PT llega firmada en el `counterpart` de `GET /messages/:studentId` y en el login del PT. Subirla desde el celular sería `PUT /auth/me/avatar`, igual que el alumno. |

## Contrato

- `PUT /auth/me/avatar` (trainer, `multipart/form-data`, campo `image`) → `200 { data: { avatar_url } }` (URL firmada, 1 h). 400 sin archivo, 413 `IMAGE_TOO_LARGE`, 415 `IMAGE_TYPE_INVALID`, 403 si es alumno.
- `DELETE /auth/me/avatar` (trainer) → 204, idempotente. 403 si es alumno.
- `GET /invitations/:token`: `trainer.avatar_url` firmada o `null`.

## Cambios de datos

Ninguno. Se escribe la columna existente `trainers.avatar_url` y se usa el bucket existente `avatars` con el prefijo nuevo `trainers/`.

## Criterio de aceptación

- El PT sube una foto JPG/PNG/WebP desde Tu cuenta y la ve al instante en "Tu perfil", sidebar y topbar; la puede cambiar y quitar.
- Una foto de más de 5 MB o de otro tipo muestra el mismo error que en Mi perfil del alumno.
- El alumno ve la foto de su PT en "Tu entrenador/a" y en la cabecera de Mensajes.
- Un alumno que llama a `PUT`/`DELETE /auth/me/avatar` recibe 403.
- Nunca sale una ruta del bucket en una respuesta.
