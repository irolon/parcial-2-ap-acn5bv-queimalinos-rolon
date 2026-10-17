# Spec — Auth en mobile + almacenamiento seguro del JWT

- **Tarjeta:** "5 · Auth en mobile + almacenamiento seguro del JWT" (tablero personal de Igna) → tarjeta de equipo https://trello.com/c/u1ip0fCJ
- **Fecha:** 2026-10-13
- **Depende de:** tarjeta 3, el esqueleto Android (PR #5). Esta rama sale de `feature/android-esqueleto`.
- **Reglas que aplican:** `AGENTS.md` (sección Mobile), con un cambio en el almacenamiento de la sesión (§2).
- **Diseño:** la Guía Mobile no tiene mockup de login. Se arma con los componentes de la p.9 y los tokens del tema de la tarjeta 3.

## 1. Objetivo

Reemplazar el login de desarrollo de la tarjeta 3 por el login real contra el backend:

- la sesión se guarda cifrada en el dispositivo;
- el access token se renueva solo cuando vence.

**Criterio de aceptación (de la tarjeta):** el alumno hace login, cierra la app por completo, la vuelve a abrir y sigue logueado. Con el access token vencido, la app lo renueva sola.

## 2. Decisiones tomadas

- **En mobile, por ahora, solo se inicia sesión.** No hay registro ni "olvidé mi contraseña". El entrenador da de alta a los alumnos desde la web.
- **Un único login para los dos roles.** El rol viene en la respuesta del backend, y la navegación por rol de la tarjeta 3 no cambia.
- **Almacenamiento:** DataStore cifrado con Tink (AEAD AES-256-GCM), con el keyset protegido por una clave maestra del Android Keystore.
  - No se usa EncryptedSharedPreferences, porque `androidx.security:security-crypto` está deprecada desde 2025.
  - Se actualiza la regla de `AGENTS.md`, que es local y no se commitea.
- **Se eliminan los botones de desarrollo** ("Entrar como alumno" / "Entrar como entrenador").
- **La renovación es reactiva:** se renueva al recibir un 401, con un `Authenticator` de OkHttp. No hay refresh proactivo.
- **La renovación se prueba con tests:** unitarios y de integración con `MockWebServer`. No se agrega UI para demostrarla.

## 3. Contrato del backend (ya existe, no se modifica)

| Endpoint | Body | Respuesta OK | Errores relevantes |
|---|---|---|---|
| `POST /api/auth/login` | `{email, password}` | 200 `{user: {id, name, email, …, role}, token, refresh_token, expires_in}` | 401 `INVALID_CREDENTIALS`, 400 `VALIDATION_ERROR` |
| `POST /api/auth/refresh` | `{refresh_token}` | 200 `{token, expires_in}` (el refresh token no rota) | 401 `UNAUTHORIZED` |
| `POST /api/auth/logout` | `{refresh_token}` + `Authorization: Bearer` | 204 | 401 |

- **Formato de error:** `{error: {code, message, details}}`.
- **`role`:** `"student"` o `"trainer"`.
- **Vencimientos por defecto:** access 1 h, refresh 30 días.

## 4. Arquitectura

Mantiene el MVVM offline-first de la tarjeta 3 (Screen → ViewModel → Repository).

```
LoginScreen ← LoginViewModel ← AuthRepository ─┬─ AuthApi (Retrofit)
                                               └─ TokenStore (DataStore + Tink)
AppNavHost  ← RootViewModel  ← SessionRepository ← TokenStore.state
OkHttp: AuthInterceptor (agrega Bearer) + TokenAuthenticator (401 → refresh → reintento)
```

### Capa de datos (`data/auth/`)

**`AuthState`** es el contenido cifrado, serializable con kotlinx.serialization:

```kotlin
data class AuthState(accessToken: String, refreshToken: String, user: AuthUser)
data class AuthUser(id: String, name: String, email: String, role: Role)
```

**`TokenStore`** es la única clase que toca el almacenamiento seguro.
- **Interfaz:**
  - `val state: Flow<AuthState?>`
  - `suspend fun current(): AuthState?`
  - `suspend fun save(state: AuthState)`
  - `suspend fun updateAccessToken(token: String)`
  - `suspend fun clear()`
- **Implementación:**
  - un DataStore tipado (`DataStore<AuthState?>`) con un `Serializer` que cifra y descifra el JSON completo con Tink;
  - archivo `auth.pb`, en el directorio de DataStore;
  - associated data `"fittrainer-auth"`.
- **Archivo ilegible.** Puede pasar porque el keyset se perdió o porque el archivo está corrupto. El serializer lo trata como sesión vacía (`null`) y la app vuelve al login. Nunca crashea.

**`AuthApi` (Retrofit)** tiene `login`, `refresh` y `logout`, con sus DTOs `@Serializable`.
- Los endpoints son relativos a la base `/api/`: `auth/login`, `auth/refresh`, `auth/logout`.
- `logout` recibe el Bearer como parámetro explícito.

**`AuthRepository`**
- **`suspend fun login(email, password): Result<AuthUser>`**
  - Si sale bien, guarda en `TokenStore`.
  - Si falla, devuelve `DataException(AuthError)` y no guarda nada. Los errores posibles son:
    - `InvalidCredentials`: 401 en login;
    - `Offline`: `IOException`;
    - `Http(code)`;
    - `Unknown`.
  - `CancellationException` se relanza.
- **`suspend fun logout()`**
  - Lee el estado y borra el `TokenStore` primero. Así, si no hay red, la sesión se cierra igual.
  - Después intenta `POST /auth/logout`, ignorando el resultado.

**`SessionRepository`** conserva la interfaz de la tarjeta 3, salvo que se elimina `signInAs(role)`.
- `session` se deriva de `TokenStore.state`:
  - `null` → `LoggedOut`;
  - `role == STUDENT` → `Session.Student(user)`;
  - `role == TRAINER` → `Session.Trainer(user)`.
- `signOut()` delega en `AuthRepository.logout()`.
- `Session.Student` y `Session.Trainer` pasan de `data object` a `data class` con el `AuthUser`.
- `DataStoreSessionRepository` y el DataStore `session` en texto plano se eliminan.

### Red (`di/NetworkModule`)

**`AuthInterceptor`**
- Agrega `Authorization: Bearer <accessToken>` si hay sesión.
- No lo agrega a `auth/login` ni a `auth/refresh`.
- `auth/logout` ya trae el header explícito, y en ese caso el interceptor no lo pisa.

**`TokenAuthenticator`** (OkHttp `Authenticator`, ante una respuesta 401):
1. Si la request ya es un reintento (`response.priorResponse != null`), devuelve `null`. Así no entra en bucle.
2. Si la request no llevaba Bearer, devuelve `null` (por ejemplo, el 401 del login).
3. Toma un `Mutex`. Si el access token guardado es distinto del que falló, otro hilo ya renovó: reintenta con el token guardado.
4. Si no, llama a `refresh` con el cliente sin authenticator:
   - **200:** `updateAccessToken`, y reintenta con el token nuevo.
   - **401/400:** `TokenStore.clear()` y devuelve `null`. La sesión se cierra y `AppNavHost` vuelve al login.
   - **Error de red u otro HTTP:** devuelve `null` sin borrar la sesión. La llamada original falla como error común.

**Dos clientes Retrofit/OkHttp.**
- El principal lleva los dos.
- El de refresh, con calificador `@Named("refresh")` o un `@Qualifier`, no tiene `Authenticator` ni `AuthInterceptor`.
- Así el refresh nunca dispara otra renovación.

**`HttpLoggingInterceptor`.** Sigue en BASIC y solo en debug, con `redactHeader("Authorization")`.

### UI (`ui/login/`)

**`LoginUiState`:** `email`, `password`, `isLoading`, `emailError: String?`, `error: String?`.

**`LoginViewModel`**
- `onEmailChange`, `onPasswordChange` y `submit()`.
- **`submit()`:**
  - Valida el email con el mismo regex del backend: `^[^\s@]+@[^\s@]+\.[^\s@]+$`, con trim.
  - Si el email es inválido, muestra "Email con formato inválido" en el campo y no llama a la API.
  - Si la contraseña está vacía, el botón está deshabilitado.
  - Si ya está cargando, ignora el envío.
  - Si sale bien, no navega: `AppNavHost` reacciona al cambio de sesión.
- **Mensajes de error:**
  - `InvalidCredentials` → "Email o contraseña incorrectos";
  - `Offline` → "Sin conexión con el servidor";
  - `Http`/`Unknown` → "No se pudo iniciar sesión".
- No importa Retrofit ni el `TokenStore`.

**`LoginScreen`**
- "FitTrainer" en `displayLarge` y "Iniciá sesión" en `TextSecondary`.
- **`OutlinedTextField` de email:** `KeyboardType.Email`, `ImeAction.Next`, error debajo del campo.
- **`OutlinedTextField` de contraseña:** `PasswordVisualTransformation`, ícono de ojo para mostrar u ocultar (con `contentDescription`), `ImeAction.Done` que envía.
- **Botón "Ingresar":** primario azul de marca, forma de 12 dp, alto mínimo 44 dp, con indicador de progreso mientras carga.
- El error general va debajo del botón, en coral.
- `imePadding()` y scroll vertical, para que el teclado no tape el botón.

### Arranque

- **Con `AuthState` guardado:** la app entra directo a las pestañas del rol, sin llamar al servidor. Funciona sin red.
- **Si el access token venció:** el primer 401 lo renueva sin que el usuario se entere.
- **Si el refresh token venció o fue revocado:** se vuelve al login.

## 5. Dependencias nuevas

- `com.google.crypto.tink:tink-android`, la versión estable más reciente al planificar.
- `androidx.datastore:datastore` (core tipado). `datastore-preferences` deja de usarse si ya no queda ningún uso.
- Para tests: `com.squareup.okhttp3:mockwebserver` 4.12.0, alineado con OkHttp.
- Se elimina `androidx.security:security-crypto`, si estuviera.

## 6. Tests y verificación

### Unitarios (JVM, `testDebugUnitTest`)

**`AuthRepository`**, con API y `TokenStore` falsos:
- Un login OK guarda los tokens y el usuario con el rol correcto.
- 401 → `InvalidCredentials`, sin guardar.
- `IOException` → `Offline`.
- 500 → `Http(500)`.
- `logout` borra el store aunque la API tire una excepción.

**`TokenAuthenticator`:**
- 401 → refresh → reintento con el nuevo Bearer, y el store queda actualizado.
- Refresh con 401 → el store queda vacío y devuelve `null`.
- Refresh por `IOException` → el store queda intacto y devuelve `null`.
- `priorResponse != null` → `null`, sin llamar al refresh.
- Si el token guardado ya cambió → reintenta con ese token, sin llamar al refresh.
- Request sin Bearer → `null`.

**`AuthInterceptor`:**
- Agrega el Bearer.
- No lo agrega en `auth/login` ni en `auth/refresh`.
- Sin sesión, no agrega header.

**Integración con `MockWebServer`**, armando la cadena real (OkHttp + Retrofit + interceptor + authenticator) con un `TokenStore` falso:
- Una llamada protegida recibe 401, se llama a `auth/refresh` (200) y se reintenta con el token nuevo hasta recibir 200.
- Se verifica el orden y los headers de las tres requests.
- Dos llamadas concurrentes que reciben 401 producen un solo refresh.

**`LoginViewModel`:**
- Un email inválido no llama al repositorio.
- Los estados de carga.
- Cada mensaje de error.
- Un doble envío produce una sola llamada.

**`SessionRepository`:**
- `null` → `LoggedOut`.
- Un estado con alumno → `Student(user)`.
- Un estado con entrenador → `Trainer(user)`.

### Instrumentados (emulador, `connectedDebugAndroidTest`)

`TokenStore` con Tink y el Keystore real:
- `save` y `current` devuelven lo guardado.
- `updateAccessToken` cambia solo el access token.
- `clear` deja el store en `null`.
- El archivo en disco no contiene el access token en texto plano.
- Un archivo corrupto se lee como `null`, sin crash.

### Verificación de punta a punta (la ejecuta Claude)

1. `gradlew assembleDebug`, `testDebugUnitTest` y `connectedDebugAndroidTest` en verde.
2. Backend levantado. Se crean los datos de prueba por API: registro de entrenador → invitación → `POST /students` con token y contraseña.
3. **Alumno:** login → pestañas de alumno. `adb shell am force-stop` → se reabre → sigue en las pestañas de alumno (criterio de la tarjeta).
4. **Entrenador:** login → pestañas de entrenador.
5. **Credenciales malas** → "Email o contraseña incorrectos". **Backend apagado** → "Sin conexión con el servidor".
6. **"Cerrar sesión"** → vuelve al login. Después, `POST /auth/refresh` con ese refresh token responde 401, o sea, quedó revocado.
7. Capturas de cada paso.

## 7. Fuera de alcance

- Registro, recuperación de contraseña y cambio de contraseña.
- Alta del alumno por QR (tarjeta 6).
- Login biométrico.
- Refresh proactivo antes de que venza el token.
- UI que muestre la renovación del token.
- Rotación del refresh token (es del backend).
