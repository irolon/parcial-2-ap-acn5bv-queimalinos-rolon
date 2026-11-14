# Cambio obligatorio de clave en el celular (GX1-M1) · plan

**Spec:** `docs/superpowers/specs/2026-11-14-cambio-obligatorio-clave-mobile-design.md`

**Rama:** `feature/android-cambio-obligatorio-clave`, apilada sobre `feature/android-perfil-y-mas` (la #114). Room no cambia: queda en v29.

## Restricciones

- Ningún archivo de código pasa de 200 líneas, y el orden es capa → módulo → archivo, con los tests en espejo.
- Las pruebas son TDD: primero el test en rojo y después el código.
- Verificación final: `gradlew checkFileLength assembleDebug testDebugUnitTest assembleDebugAndroidTest`.

## Tareas

### 1. La marca en la sesión (`data/auth/`, `data/api/AuthApi.kt`)

- `UserDto`: `@SerialName("must_change_password") val mustChangePassword: Boolean = false`.
- `RefreshResponse`: `@SerialName("must_change_password") val mustChangePassword: Boolean? = null`.
- `AuthUser`: `val mustChangePassword: Boolean = false`. Lo sigue leyendo el `AuthState` cifrado guardado antes del cambio. Sumar un test de deserialización de un JSON viejo sin el campo.
- **Login:** `AuthRepository.login` guarda la marca del `UserDto`. El alta por invitación queda en `false`.
- **Refresh:** en `TokenAuthenticator` (o donde se procesa `RefreshResponse`), si `mustChangePassword != null`, actualizar el `user` de la sesión, solo si la sesión sigue siendo la misma (`sessionId`).
- **`TokenStore`:** `setMustChangePassword(sessionId: String, value: Boolean)`, que escribe solo si `sessionId` sigue siendo el actual. Lo implementan `DataStoreTokenStore` y `FakeTokenStore`.
- **Tests:** DTOs con y sin el campo, el login con la marca, el refresh que la actualiza o la deja, y `setMustChangePassword` con un `sessionId` viejo que no escribe.

### 2. El 403 `PASSWORD_CHANGE_REQUIRED` (`data/auth/`)

- Un interceptor de OkHttp en el cliente autenticado, que es el mismo que usan `AuthInterceptor` y `TokenAuthenticator`:
  - si la respuesta es 403, lee el body con `peekBody` y, si `error.code == "PASSWORD_CHANGE_REQUIRED"`, llama a `setMustChangePassword(sessionId del pedido, true)`;
  - la respuesta sigue igual hacia quien la pidió;
  - el `sessionId` del pedido sale del tag o del header que ya usa `AuthInterceptor` (`SessionTag` / `RequiredUser`);
  - registrarlo en `di/` donde se arma ese cliente.
- **Tests (con MockWebServer o un `Interceptor.Chain` falso, como los tests que ya hay de `AuthInterceptor`):**
  - un 403 con ese código marca;
  - un 403 `FORBIDDEN` no marca;
  - un 403 de una sesión que ya no es la actual no marca;
  - el body sigue legible para quien hizo el pedido.

### 3. Sincronización con el 403

- Agregar un test en `SyncPass` (`syncpass/`): una subida que recibe 403 `PASSWORD_CHANGE_REQUIRED` deja todas las sesiones y series en PENDING, sin FAILED ni REJECTED, y la pasada termina.
- Si `SessionUploader` mapea 403 a `FORBIDDEN`, el comportamiento ya es el correcto: no se cambia código, solo se suma el test.

### 4. Pantalla "Elegí una contraseña nueva" (`ui/account/forced/`)

- `ForcedPasswordScreen` y `ForcedPasswordViewModel` reusan las reglas, los errores y `ProfileRepository.changePassword` de la #114 (`ui/account/password/`, `data/account/`). Si conviene, se extrae a un componente común el formulario de los tres campos, sin duplicar código.
- **Textos** (en un `*Texts.kt` si el módulo lo usa):
  - título: "Elegí una contraseña nueva";
  - texto: "Tu entrenador/a te dio una clave temporal. Elegí una nueva para seguir.";
  - campos: "Clave temporal", "Contraseña nueva" y "Repetir contraseña nueva";
  - botones: "Guardar" y "Cerrar sesión".
- **Al guardar bien:**
  1. `setMustChangePassword(sessionId, false)`, después de guardar el token nuevo;
  2. volver a registrar el push token (`PushTokenRegistry`, con lo que ya usa después del login);
  3. `SessionSync.enqueue(newWork = false)`, o la forma que ya use la app para pedir una pasada.

  Los fallos del push o de la sync no frenan la salida de la pantalla.
- **"Cerrar sesión"** usa el mismo `onSignOut` de `RoleShell`.
- **Tests del ViewModel:**
  - las reglas y la temporal incorrecta en su campo;
  - sin red;
  - el 429;
  - al guardar: la marca en `false`, el push registrado y la sync encolada;
  - con el push que falla, igual sale.

### 5. La raíz (`navigation/AppNavHost.kt`, `RootViewModel`)

- Con `Session.Student` y `user.mustChangePassword`, `AppNavHost` muestra `ForcedPasswordScreen(onSignOut = viewModel::signOut)` en lugar de `RoleShell`. El PT no pasa nunca por acá.
- Si para esto `Session.Student` necesita exponer el `AuthUser` con la marca, que el mapeo de `SessionRepository` la pase.
- **Tests:**
  - el estado de la raíz con la marca y sin ella;
  - al limpiar la marca, se pasa a `RoleShell`.

### 6. Cierre

- Verificación final completa.
- Instrumentado `ForcedPasswordContentTest` (texto, tres campos y "Cerrar sesión"), que compile.
