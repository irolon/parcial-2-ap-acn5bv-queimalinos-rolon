# GX1 · Cuenta: cambiar contraseña, blanqueo por el PT y exportar CSV — diseño

Ticket 1 de 9 del lote GX ("lo que quedó afuera de la Guía Web"). Una PR. Rama sugerida: `feature/account-password`.

## Contexto

Guía Web (`src/guia-web-hifi.jsx`), **A5 · Mi perfil**, funcionalidad 4, "Configuración de la cuenta": contraseña, notificaciones, modo sin conexión y exportación de datos. Referencia visual: tarjeta "Cuenta" de `AW_Perfil` en `src/alumno-web-2.jsx` (filas "Contraseña · Modificada hace 2 meses · Cambiar" y "Exportar mis datos · Historial completo en formato CSV · Descargar"). El PT no tiene pantalla de cuenta en el prototipo.

Hoy: `POST /auth/login|refresh|logout` (`routes/auth/auth.routes.js`, 22 líneas); claves con bcryptjs, 10 rondas (`shared/utils/password.js`); refresh tokens guardados como SHA-256 en `refresh_tokens`, sin rotación; `revokeAllForUser(userId, role)` ya existe (la usa la baja); el logout borra el push token del dueño. No hay forma de cambiar ni recuperar una clave, ni de exportar datos.

## Decisiones

| # | Decisión |
|---|---|
| 1 | Alumno y PT cambian su contraseña con la actual. Al cambiarla se revocan **los otros** refresh tokens (se conserva el de este dispositivo) y se borran sus push tokens salvo el de este dispositivo. |
| 2 | Blanqueo sin mail: el PT genera desde la ficha una **clave temporal** que se muestra una sola vez (la pasa por WhatsApp). Se revocan todos los refresh tokens y push tokens del alumno y queda `must_change_password = true`. |
| 3 | Con `must_change_password` el **backend** bloquea todo con `403 PASSWORD_CHANGE_REQUIRED` salvo `PUT /auth/password` y `POST /auth/logout`: el bloqueo no depende del cliente (el celular sin actualizar tampoco lo saltea). Viaja como claim del access token; login y refresh además lo informan en el cuerpo. |
| 4 | Un access token emitido antes del blanqueo sigue andando hasta vencer (`JWT_EXPIRES_IN`, 1 h), como en la baja. No se consulta la base en cada pedido. |
| 5 | `PUT /auth/password` devuelve un **access token nuevo** (sin el claim): el refresh actual sigue valiendo. |
| 6 | La clave nueva cumple las reglas del registro (≥ 8, una mayúscula, un número) y no puede ser igual a la actual. Clave actual incorrecta → `400 VALIDATION_ERROR` en `current_password` (no 401: el cliente web renovaría la sesión ante un 401). |
| 7 | Clave temporal: 10 caracteres de un alfabeto sin ambiguos (sin `0 O 1 l I`), con al menos una mayúscula y un número; `crypto.randomInt`. Solo se guarda el hash. |
| 8 | Exportar: `text/csv; charset=utf-8` con BOM, separador `;`, decimales con coma y fin de línea CRLF (abre con doble clic en Excel en español). Una fila por serie; una sesión sin series sale en una fila con las columnas de serie vacías. Celdas que empiezan con `= + - @` o tab llevan `'` adelante (inyección de fórmulas). |
| 9 | Columnas del alumno: Fecha; Hora; Duración (min); Rutina; Ejercicio; Ejercicio planificado (si sustituyó); Serie; Reps; Kg; Completada; Descanso (s); RPE; Notas; Comentario del PT. El PT suma adelante **Alumno; Email; Activo** e incluye a los dados de baja. Fecha y hora en hora argentina. |
| 10 | Rutas sin tocar `app.js` (#83 y #85 lo editan): la contraseña cuelga de `/auth`, el blanqueo y la exportación de `/students`. |
| 11 | `password_changed_at` en `trainers` y `students` para "Modificada hace…" (lo setean el cambio y el blanqueo). |
| 12 | Rate limit: `passwordChange` y `passwordReset` (30 por IP, cupo `auth`) y `export` (cupo `auth`). Sin variables de entorno nuevas. |

## Diseño

**Backend.**
- `authenticate` pasa a `buildAuthenticate({ allowPasswordChange })`: con el claim `must_change_password` y sin el permiso → `Errors.passwordChangeRequired()`. Exporta `authenticate` (bloquea) y `authenticateForPasswordChange` (permite).
- `issueTokens(user, role)` y `refresh` firman el claim si `user.must_change_password` (solo alumnos; el trainer nunca lo tiene). Login devuelve `user.must_change_password` y `user.password_changed_at`; refresh suma `must_change_password` (false para el PT).
- `services/auth/password.service.js`:
  - `changePassword(user, { current_password, new_password, refresh_token, push_token? })`: lee el hash por rol (`credentials.repository`), verifica la actual, rechaza la misma clave, guarda hash + `password_changed_at` + `must_change_password = false`, `revokeAllForUserExcept(id, role, hashToken(refresh_token))` y `deleteAllForUserExcept(user, push_token)`; devuelve `{ token, expires_in, password_changed_at }`. Si el `refresh_token` no es del usuario → 400 en `refresh_token`.
  - `resetStudentPassword(trainer, studentId)`: `assertCanAccessStudent`; alumno inactivo → `409 STUDENT_INACTIVE`; revoca **antes** de guardar la clave (mismo criterio que la baja); guarda hash + flag; borra push tokens; devuelve `{ temporary_password }`.
- Exportación: `models/export/sessions-csv.js` (puro: columnas, escape, BOM, números AR); `repositories/export/sessions-export.repository.js` (sesiones con `routine(name)`, `session_sets(…, exercise(name), original(name))` paginadas de a 500 con `.range`; alumnos del trainer con `id, name, email, active`); `services/export/sessions-export.service.js` (`forStudent(user, id)` con `assertCanAccessStudent`, `forTrainer(user)`), `controllers/export/export.controller.js` (headers `Content-Type` y `Content-Disposition: attachment; filename="…"`). Se arma en memoria (volúmenes actuales: miles de series); sin streaming.

**Web.**
- **Mi perfil (alumno)**: `AccountCard` en la columna derecha, debajo de las medidas, con las filas del prototipo: "Contraseña · Modificada hace N días|meses / Nunca la cambiaste · Cambiar" y "Exportar mis datos · Historial completo en formato CSV · Descargar". (GX3 suma la fila "Notificaciones".)
- **Configuración de cuenta (PT)**: página nueva `/pt/cuenta` ("Tu cuenta" · "CONTRASEÑA Y DATOS"), fuera del menú; se entra con un botón ícono `Settings` "Configuración" en `UserBlock`, junto a "Cerrar sesión" (para el alumno lleva a `/alumno/perfil`). Tiene el mismo `AccountCard` con "Exportar los datos de tus alumnos · Todas sus sesiones en CSV".
- `ChangePasswordDialog` (`Dialog`): Contraseña actual, Nueva, Repetir nueva, con las reglas en vivo; error de la actual en su campo; al guardar, toast/aviso "Listo. Cerramos tu sesión en los otros dispositivos." y el store guarda el token nuevo.
- **Cambio obligatorio**: `RequireRole` manda a `/cambiar-clave` si `user.must_change_password`; esa página (sin shell, como `/login`) usa `ChangePasswordForm` con la temporal como "actual" ("Tu entrenador/a te dio una clave temporal. Elegí una nueva para seguir.") y "Cerrar sesión". Al guardar va a la home del rol. Ningún pedido sale antes (todos darían 403).
- **Blanqueo (PT)**: dentro de `EditStudentDialog`, sección "Acceso a la app" con "Blanquear clave" → confirmación ("Se cierra su sesión en todos sus dispositivos") → la clave en mono grande con "Copiar" y el aviso "Se muestra una sola vez. Al entrar, tendrá que elegir una nueva." No se usa `ProfileActions` (#84) ni `StudentProfilePage` (#88).
- Descarga: `request` devuelve el texto cuando la respuesta es `text/csv`; `downloadText(text, filename, 'text/csv')` en `utils/download.js` con `Blob` + `URL.createObjectURL`.

## Datos

- `PUT /auth/password` (alumno o PT; permitido con `must_change_password`) — body `{ current_password, new_password, refresh_token, push_token? }` → `200 { token, expires_in, password_changed_at }`. Errores: 400 (reglas, actual incorrecta, igual a la actual), 401, 429.
- `POST /students/:id/password-reset` (trainer dueño) → `200 { temporary_password }`. 403, 404, 409 `STUDENT_INACTIVE`, 429.
- `GET /students/export` (trainer; va antes de `/:id`) y `GET /students/:id/export` (trainer dueño o el propio alumno) → `200 text/csv`, archivo `fittrainer-alumnos-AAAA-MM-DD.csv` / `fittrainer-mis-sesiones-AAAA-MM-DD.csv` (el PT, `fittrainer-<nombre>-AAAA-MM-DD.csv`).
- `POST /auth/login` y `POST /auth/refresh`: suman `must_change_password` (y login, `password_changed_at`). Cualquier otro endpoint: `403 PASSWORD_CHANGE_REQUIRED` con el claim.
- Migración `backend/src/database/migrations/2026-11-09-account-password.sql`: `students.must_change_password boolean not null default false`, `students.password_changed_at timestamptz`, `trainers.password_changed_at timestamptz`. Igual en `schema/01-auth.sql` y `02-students.sql`.
- Contrato: `docs/arquitectura/contratos-api.md` (Auth: los 2 cambios y `PUT /auth/password`; Alumnos: reset y export; error `PASSWORD_CHANGE_REQUIRED`); `modelo-de-datos.md` (columnas nuevas).

## Archivos que toca

- Backend, crea: `services/auth/password.service.js`, `repositories/auth/credentials.repository.js` (`findPasswordHash(id, role)`, `setPassword(id, role, { hash, mustChange })`), `validations/auth/password.validation.js` (`validateChangePassword`; reusa `checkPassword`, que pasa a exportarse), `models/export/sessions-csv.js`, `repositories/export/sessions-export.repository.js`, `services/export/sessions-export.service.js`, `controllers/export/export.controller.js`, la migración.
- Backend, modifica: `shared/middlewares/auth.middleware.js` (24, +18), `shared/utils/jwt.js` (46, +3), `shared/utils/password.js` (14, +18: `generateTemporaryPassword`), `shared/utils/errors.js` (104, +2, después de `accountDisabled`), `shared/middlewares/rate-limit.middleware.js` (82, +3), `services/auth/auth.service.js` (110, +6), `repositories/auth/auth.repository.js` (99, +14: `revokeAllForUserExcept`), `repositories/notifications/push-tokens.repository.js` (42, +12: `deleteAllForUserExcept`), `routes/auth/auth.routes.js` (22, +3), `controllers/auth/auth.controller.js` (26, +6), `validations/auth/auth.validation.js` (97, +1), `routes/students/students.routes.js` (67, +24), `controllers/students/students.controller.js` (43, +6), `models/students/student.model.js` (33, +1 columnas), `models/auth/trainer.model.js` (21, +1), `database/schema/01-auth.sql`, `02-students.sql`.
- Web, crea: `api/account/account.api.js` (`changePassword`, `resetStudentPassword`, `exportSessions(studentId?)`), `hooks/account/useChangePassword.js`, `useExportCsv.js`, `useResetStudentPassword.js`, `utils/account/passwordRules.js`, `utils/account/passwordAge.js`, `components/account/AccountCard.jsx`, `AccountRow.jsx`, `ChangePasswordDialog.jsx`, `ChangePasswordForm.jsx`, `components/students/dialogs/ResetPasswordSection.jsx`, `pages/account/TrainerAccountPage.jsx`, `pages/auth/ChangePasswordRequiredPage.jsx`.
- Web, modifica: `api/shared/client.js` (128, +2 en `readBody`), `hooks/auth/useAuthStore.js` (112, +12: `changePassword`), `routes/guards.jsx` (54, +3), `routes/routeTable.js` (90, +4: `TRAINER_ACCOUNT`, `CHANGE_PASSWORD_PATH`), `routes/router.jsx` (112, +4), `components/shared/layout/UserBlock.jsx` (23, +8), `components/students/dialogs/EditStudentDialog.jsx` (104, +2), `pages/student/MyProfilePage.jsx` (52 tras #89, +3), `utils/download.js` (15, +8).
- Tests: ver Pruebas. Docs: contrato y modelo.

**Chequeo contra PRs abiertas.** `routeTable.js`, `router.jsx` y `client.js` están en la **#84**; `client.js` y `useAuthStore.js` en la **#85** (solo el import de `isNetworkError`); `MyProfilePage.jsx` en la **#89**; `errors.js` en **#83** y **#85** (agregan al final: lo nuestro va después de `accountDisabled`); `contratos-api.md` en #83, #85, #90 y #91 (otras secciones); `modelo-de-datos.md` en #83. Secuencia: arrancar la rama **después de que entren #84, #85 y #89** (o mergear `develop` antes de abrir la PR); los cambios son líneas sueltas y no pisan los mismos hunks. No toca `ProfileActions.jsx` (#84), `StudentProfilePage.jsx` (#88), `app.js`/`env.js` (#83, #85) ni `triggers.service.js` (#76). Si entra la **#92**, sumar las 4 rutas a la tabla de `docs/proceso/auditoria-seguridad.md`. Si entra la **#76** (crea `auth.middleware.test.js`), sus casos pasan a la carpeta `auth.middleware/`.

## Pruebas

**Jest (backend)**
- `tests/unit/shared/middlewares/auth.middleware/must-change-password.test.js`: con claim → 403 `PASSWORD_CHANGE_REQUIRED`; `authenticateForPasswordChange` lo deja pasar; sin claim, igual que hoy.
- `tests/unit/services/auth/password.service/change.test.js`: actual incorrecta → 400 en `current_password`; igual a la actual → 400; ok → hash nuevo, flag en false, revoca los otros (no el actual), borra push tokens salvo el dado, token sin claim; refresh de otro usuario → 400.
- `…/password.service/reset.test.js`: PT ajeno → 404/403; inactivo → 409; revoca antes de guardar; flag en true; la temporal cumple el formato y solo se guarda el hash.
- `tests/unit/services/auth/auth.service/must-change.test.js`: login y refresh informan el flag y firman el claim.
- `tests/unit/shared/utils/password.test.js` (temporal: largo, alfabeto, mayúscula y número, 1000 muestras distintas).
- `tests/unit/models/export/sessions-csv.test.js`: BOM, `;`, comillas, saltos de línea, `=SUMA()` con `'`, `72,5`, sesión sin series.
- `tests/unit/services/export/sessions-export.service.test.js` (dueño, alumno propio, ajeno 404, paginado) y `tests/unit/routes/auth/auth.routes.test.js` / `students/students.routes.test.js` (limitadores y validaciones de las rutas nuevas).

**Vitest (web)**
- `utils/account/passwordRules.test.js`, `passwordAge.test.js`; `api/account/account.api.test.js` (CSV como texto).
- `components/account/ChangePasswordDialog.test.jsx`: reglas, repetir distinta, error de la actual en su campo, éxito guarda el token.
- `pages/auth/ChangePasswordRequiredPage.test.jsx` y `routes/guards/must-change.test.jsx`: con el flag, cualquier ruta del rol manda a `/cambiar-clave`; al guardar, a la home.
- `pages/student/MyProfilePage/account.test.jsx` (filas, descarga) y `pages/account/TrainerAccountPage.test.jsx`.
- `components/students/dialogs/ResetPasswordSection.test.jsx`: confirmar, ver la clave una vez, copiar, error.

**Navegador:** PT y alumno de QA. Capturas en `docs/superpowers/specs/assets/gx1/` (`01-perfil-cuenta.jpg`, `02-cambiar-clave.jpg`, `03-pt-cuenta.jpg`, `04-blanquear-clave.jpg`, `05-clave-temporal.jpg`, `06-cambio-obligatorio.jpg`, `07-csv-en-excel.jpg`, `08-angosto-375.jpg`). Comprobar en dos navegadores que el cambio cierra la sesión del otro al vencer su access.

## Criterio de aceptación

- Alumno y PT cambian su contraseña; la otra sesión no puede renovar; esta sigue sin volver a entrar.
- El PT blanquea la clave desde la ficha, la ve una sola vez; el alumno entra con ella y no puede hacer nada hasta elegir una nueva (web y API).
- El alumno descarga sus sesiones y el PT las de todos sus alumnos en un CSV que abre bien en Excel en español.
- Lint y tests en verde; ningún archivo pasa de 200 líneas; contrato y modelo actualizados.

## Estimación

**24 h**: migración y schema 0,5 h; middleware, jwt, cambio de clave y repos 3 h; blanqueo 1 h; exportación (modelo, repo, service, rutas) 3 h; tests backend 3,5 h; API, hooks y utils web 1 h; `AccountCard` y diálogo 2 h; cambio obligatorio (guard, página, store) 2 h; página de cuenta del PT y `UserBlock` 1,5 h; blanqueo en la ficha 1,5 h; tests web 3 h; docs 0,5 h; navegador y capturas 1,5 h.

## Fuera de alcance

- Recuperar la clave por mail o el blanqueo del PT (sin un admin, el PT que olvida la suya sigue sin salida).
- Exportar medidas, logros o turnos; exportar un alumno desde la ficha del PT (el endpoint ya lo permite).
- Streaming del CSV y límites de tamaño.
- Cortar al instante los access tokens vivos (lista de revocación).
- "Modo sin conexión" de la tarjeta del prototipo.

## Tarjetas para el celular (Igna)

1. **Cambio obligatorio de clave (prioridad: sin esto un alumno blanqueado queda trabado en el celular).** Leer `user.must_change_password` del login y `must_change_password` del refresh; ante `403 PASSWORD_CHANGE_REQUIRED` en cualquier llamada, ir a una pantalla "Elegí una contraseña nueva" que llama `PUT /auth/password` con la temporal como `current_password`, su `refresh_token` y su `push_token`; guardar el `token` nuevo.
2. **Cambiar contraseña** (alumno y PT) desde ajustes: `PUT /auth/password` con `push_token` del dispositivo, para no perder el push propio.
3. **Blanquear clave** en la ficha del alumno (PT): `POST /students/:id/password-reset`, mostrar la temporal una vez con copiar y compartir.
4. **Exportar CSV** (opcional): `GET /students/:id/export` (alumno) o `GET /students/export` (PT) y compartir el archivo con el intent del sistema.
