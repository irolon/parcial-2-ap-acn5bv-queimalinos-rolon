# Cambio obligatorio de clave en el celular (GX1-M1) · diseño

Tarjeta del equipo: [GX1-M1] Celular: cambio obligatorio de clave ⚠️ prioritaria (https://trello.com/c/AOxkAYGR).
Backend y web: GX1, la #94, que ya está en develop. Spec: `2026-11-09-gx1-cuenta-contrasena-design.md`, decisiones 2 y 3 y la sección "Tarjetas para el celular", punto 1.

## Por qué

Cuando el PT blanquea la clave de un alumno:
- el backend revoca todas sus sesiones y sus push tokens, y deja `must_change_password = true`;
- al entrar con la clave temporal, **el backend responde `403 PASSWORD_CHANGE_REQUIRED` a todo**, salvo `PUT /auth/password` y `POST /auth/logout`.

Hoy el celular no mira esa marca: el alumno entra y todo falla. Pablo la marcó como prioritaria.

## Qué se decidió

**Igna, 14/11:**
- La pantalla es como la de la web: sin pestañas, con el texto "Tu entrenador/a te dio una clave temporal. Elegí una nueva para seguir." y un botón para cerrar sesión.
- Arrancar directo, sin más preguntas.

**Decisiones de Claude:**
- **La rama va apilada sobre la #114** (`feature/android-perfil-y-mas`), para reusar las reglas, el repositorio y la pantalla de Cambiar contraseña. Cuando entre la #114, la PR pasa a develop.
- **No hace falta Room.** La marca vive en la sesión cifrada (`AuthState` en DataStore), con default `false`, así que las sesiones guardadas de antes la leen como `false`.

## Cómo funciona

**1. Leer la marca**
- `POST /auth/login` → `user.must_change_password`, que entra en `UserDto` (default `false`).
- `POST /auth/refresh` → `must_change_password`. Si viene, actualiza la sesión guardada. Si no viene, porque es un backend viejo, no cambia nada.
- `AuthUser` suma `mustChangePassword: Boolean = false`, y se guarda en el `AuthState` cifrado.
- **El alta por invitación** (`POST /students`) nunca la trae: queda en `false`.
- **El PT** nunca la tiene, igual que en el backend.

**2. El 403 en cualquier llamada**
- Si una respuesta del cliente autenticado es **403 con `error.code = PASSWORD_CHANGE_REQUIRED`**, se marca `mustChangePassword = true` en la sesión guardada. Solo se marca si la sesión que hizo el pedido sigue siendo la actual (el mismo patrón de `sessionId` de `TokenAuthenticator`).
- **Por qué hace falta, si el login ya trae la marca:** una sesión anterior a la actualización de la app, o una que llegó por refresh sin el campo, igual termina en la pantalla correcta.
- Un 403 con otro código (rol equivocado) se trata como hoy.

**3. Pantalla "Elegí una contraseña nueva"**
- La raíz (`AppNavHost`), cuando el alumno tiene `mustChangePassword`, muestra esta pantalla **en lugar de** `RoleShell`: no hay pestañas, ni Hoy, ni notificaciones abiertas.
- **Texto:** "Tu entrenador/a te dio una clave temporal. Elegí una nueva para seguir."
- **Campos:** "Clave temporal" (va como `current_password`), "Contraseña nueva" y "Repetir contraseña nueva". Las reglas son las de Cambiar contraseña de la #114: al menos 8 caracteres, una mayúscula, un número y distinta de la actual. Los errores van igual, incluida la temporal incorrecta en su campo (400 `current_password`), el 429 y sin red.
- **Botón "Guardar"** y, debajo, **"Cerrar sesión"** con el flujo de logout de siempre.
- **Sin red:** el aviso "Necesitás conexión para guardar los cambios." (el mismo de Cambiar contraseña de la #114). No se encola.
- **Pantalla compacta:** scroll, como Cambiar contraseña.

**4. Al guardar**
- `PUT /auth/password` con la temporal, la nueva, el `refresh_token` actual y el `push_token` (el mismo `ProfileRepository.changePassword` de la #114). Se guarda el `token` nuevo y se pone `mustChangePassword = false` en la misma sesión.
- **La raíz pasa sola a las pestañas del alumno,** porque observa la sesión.
- **Después se reengancha lo que el bloqueo frenó:**
  - **Push:** el blanqueo borró los push tokens y el registro del login falló con 403. Se vuelve a registrar el token de este celular con lo que ya existe (`PushTokenRegistry`).
  - **Sincronización:** si quedaron sesiones pendientes, la subida se cortó con 403 (`StopReason.FORBIDDEN`, que no pierde nada: queda todo pendiente). Se vuelve a encolar con `SessionSync.enqueue`.

## Lo que no se hace

- Cambiar el backend o el contrato.
- La marca para el PT.
- Avisar de otra manera al alumno que el PT le blanqueó la clave.

## Lo que haría que salga mal aunque funcione

- **Perder sesiones de entrenamiento pendientes,** o marcarlas como rechazadas, por el 403 del bloqueo.
- **Que el alumno pueda ver o usar las pestañas** con la marca puesta.
- **Que un 403 de una sesión vieja,** de otra cuenta o de una que ya se cerró, bloquee a la cuenta actual.
- **Que después del cambio** queden sin push o sin subir las sesiones hasta reiniciar la app.
- **Que el PT,** o un 403 de rol equivocado, termine en esta pantalla.

## Restricciones

- **AGENTS.md:** 200 líneas por archivo, capa → módulo → archivo, y los cambios de cuenta solo con red. El módulo es `account` (la excepción documentada en la #114) para la pantalla y la lógica de la cuenta. La lectura de la marca vive en `data/auth/`.
- `gradlew checkFileLength assembleDebug testDebugUnitTest assembleDebugAndroidTest`.

## Pruebas

- **Unitarias:**
  - `UserDto` y `RefreshResponse` con y sin el campo;
  - el login guarda la marca;
  - el refresh la actualiza y no la toca si no viene;
  - un 403 `PASSWORD_CHANGE_REQUIRED` marca la sesión actual y no una vieja;
  - un 403 de otro código no marca nada;
  - el ViewModel de la pantalla: reglas, temporal incorrecta, sin red, y al guardar limpia la marca, registra el push y encola la sync;
  - `SyncPass` con 403 deja todo pendiente (el comportamiento de hoy, con test).
- **Instrumentada (si hay emulador):** la pantalla con el texto, los tres campos y "Cerrar sesión".
- **En el celular:**
  1. el PT blanquea la clave desde la web;
  2. el alumno entra con la temporal y ve la pantalla;
  3. la cambia y entra a Hoy;
  4. con sesiones pendientes de antes, se suben;
  5. le llega un push de prueba.
