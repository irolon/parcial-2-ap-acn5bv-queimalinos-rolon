---
tags: [plan]
tarjeta: 5
---
# Auth en mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** reemplazar el login de desarrollo por el login real contra el backend. La sesión se guarda cifrada (DataStore + Tink) y el access token se renueva solo con un `Authenticator` de OkHttp.

**Architecture:** MVVM offline-first, igual que la tarjeta 3.
- `TokenStore` (DataStore tipado, cifrado con Tink AEAD y clave maestra en el Android Keystore) es la fuente de verdad de la sesión.
- `AuthRepository` hace login y logout contra `AuthApi`.
- `SessionRepository` deriva la `Session` del `TokenStore`, y `AppNavHost` ramifica por rol.
- OkHttp tiene dos clientes:
  - el principal, con `AuthInterceptor` (Bearer) y `TokenAuthenticator` (401 → refresh → reintento);
  - uno "auth" sin nada, para `AuthApi`.

**Tech Stack:** Kotlin 2.2.10, Compose (Material 3), Hilt 2.57.1, Retrofit 2.11.0 + kotlinx.serialization 1.9.0, OkHttp 4.12.0, DataStore 1.1.7 (core), Tink Android 1.18.0, MockWebServer 4.12.0.

**Spec:** `docs/superpowers/specs/2026-10-13-auth-mobile-design.md`

## Global Constraints

- **Gradle:** se corre desde `mobile/` con el JDK de Android Studio: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew …` (Git Bash). El JDK del sistema (24) no sirve.
- **Paquete:** `com.fittrainer`, `minSdk 26`, `compileSdk`/`targetSdk 36`, Java/JVM 17.
- **Fronteras de capas:** ningún ViewModel ni Screen importa Retrofit, OkHttp, Room, DataStore ni Tink. Los ViewModels solo conocen repositorios.
- **Endpoints:** relativos a la base `…/api/`, sin barra inicial: `auth/login`, `auth/refresh`, `auth/logout`.
- **Formato de error del backend:** `{error: {code, message, details}}`.
- **Login:**
  - 401 = credenciales inválidas.
  - Respuesta: `{user: {id, name, email, role, …}, token, refresh_token, expires_in}`.
  - `role` es `"student"` o `"trainer"`.
- **Refresh:** body `{refresh_token}` → 200 `{token, expires_in}`. El refresh token no rota.
- **Logout:** `Authorization: Bearer` + body `{refresh_token}` → 204.
- **Textos de UI:**
  - "Email con formato inválido"
  - "Email o contraseña incorrectos"
  - "Sin conexión con el servidor"
  - "No se pudo iniciar sesión"
  - "Ingresar"
  - "Iniciá sesión"
- **Regex de email**, igual que el backend: `^[^\s@]+@[^\s@]+\.[^\s@]+$`, aplicado después de `trim()`.
- **Diseño:**
  - toque mínimo `Spacing.minTouchTarget` (44 dp);
  - botón e input con `RoundedCornerShape(FtRadius.control)` (12 dp);
  - colores de `FtColors` (`Brand`, `Coral`, `TextSecondary`…).
- **Sin firmas de IA** en commits. Los agentes no commitean: el paso "Commit" de cada tarea lo resuelve el controlador.
- **Tests en JVM:** nunca usan Tink ni Android. El `TokenStore` real solo se prueba instrumentado.

## Rulings sobre el spec (decididos al planificar)

- **Wrapper `AuthFile(auth: AuthState?)`.** El spec dice `DataStore<AuthState?>`; se usa un `DataStore<AuthFile>` con `AuthFile(auth: AuthState? = null)`. Un `Serializer` necesita un `defaultValue` no nulo, y el wrapper lo resuelve sin tipos nulos en DataStore. La interfaz pública de `TokenStore` es la misma del spec.
- **`DataError.InvalidCredentials`.** El spec habla de `AuthError`; se agrega `InvalidCredentials` al `DataError` existente, porque `DataException` ya envuelve un `DataError` y así hay un solo tipo de error de datos.
- **Botón de mostrar contraseña.** Se usa un `TextButton` "Mostrar" / "Ocultar" en vez del ícono del ojo. `Icons.Filled.Visibility` está solo en `material-icons-extended` (varios MB), y el texto es igual de accesible.
- **`AuthApi` completa sobre el cliente "auth".** `login`, `refresh` y `logout` usan el cliente sin interceptor ni authenticator. El interceptor igual excluye `auth/login` y `auth/refresh`, como pide el spec, por si se usaran desde el cliente principal.

## Review Focus

1. **Rol desconocido en el login.** El backend devuelve un `role` que no es `student` ni `trainer`: el login tiene que fallar con `Unknown` y no guardar nada (si no, la app quedaría con una sesión sin navegación). Test en la Tarea 2.
2. **Refresh con 400.** El backend responde 400 `VALIDATION_ERROR` al refresh (por ejemplo, un refresh token vacío o corrupto): se trata igual que un 401 y se borra la sesión, para no reintentar para siempre. Test en la Tarea 3.
3. **Email con espacios o mayúsculas.** El usuario escribe " Ana@Test.com ": se valida y se envía sin espacios, no da error de formato. Test en la Tarea 4.
4. **Error que queda pegado.** Después de un error, el usuario corrige el email o la contraseña: el mensaje de error desaparece. Test en la Tarea 4.
5. **Login con 400 o 500.** El backend responde 400 (validación) o 500 al login: se muestra "No se pudo iniciar sesión", sin crash ni texto técnico. Test en la Tarea 4.

---

### Task 1: TokenStore cifrado (DataStore + Tink)

**Files:**
- Modify: `mobile/gradle/libs.versions.toml`
- Modify: `mobile/app/build.gradle.kts`
- Create: `mobile/app/src/main/java/com/fittrainer/data/auth/AuthState.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/auth/EncryptedAuthSerializer.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/auth/TokenStore.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/auth/AuthCrypto.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/di/AuthModule.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/auth/EncryptedAuthSerializerTest.kt`
- Test: `mobile/app/src/androidTest/java/com/fittrainer/data/auth/DataStoreTokenStoreTest.kt`

**Interfaces:**
- Consumes: `com.fittrainer.data.session.Role` (enum `STUDENT`, `TRAINER`, ya existe).
- Produces:
  - `@Serializable data class AuthUser(val id: String, val name: String, val email: String, val role: Role)`
  - `@Serializable data class AuthState(val accessToken: String, val refreshToken: String, val user: AuthUser)`
  - `@Serializable data class AuthFile(val auth: AuthState? = null)`
  - `interface TokenStore { val state: Flow<AuthState?>; suspend fun current(): AuthState?; suspend fun save(state: AuthState); suspend fun updateAccessToken(token: String); suspend fun clear() }`
  - `class DataStoreTokenStore(dataStore: DataStore<AuthFile>) : TokenStore`
  - `class EncryptedAuthSerializer(aeadProvider: () -> Aead) : Serializer<AuthFile>`
  - `object AuthCrypto { fun aead(context: Context, keysetName: String = …, prefFile: String = …): Aead }`
  - Binding Hilt `TokenStore` (`@Singleton`) en `di/AuthModule`.

- [ ] **Step 1: Agregar dependencias**

En `mobile/gradle/libs.versions.toml`, en `[versions]` agregar:

```toml
tink = "1.18.0"
```

En `[libraries]` agregar:

```toml
androidx-datastore = { group = "androidx.datastore", name = "datastore", version.ref = "datastore" }
tink-android = { group = "com.google.crypto.tink", name = "tink-android", version.ref = "tink" }
```

En `mobile/app/build.gradle.kts`, debajo de `implementation(libs.androidx.datastore.preferences)`, agregar:

```kotlin
    implementation(libs.androidx.datastore)
    implementation(libs.tink.android)
```

(`datastore-preferences` se elimina en la Tarea 5, cuando deja de usarse.)

- [ ] **Step 2: Modelo de la sesión persistida**

Crear `mobile/app/src/main/java/com/fittrainer/data/auth/AuthState.kt`:

```kotlin
package com.fittrainer.data.auth

import com.fittrainer.data.session.Role
import kotlinx.serialization.Serializable

/** Usuario autenticado, tal como lo devuelve el login (sin datos sensibles). */
@Serializable
data class AuthUser(val id: String, val name: String, val email: String, val role: Role)

/** Sesión que se guarda cifrada en el dispositivo. */
@Serializable
data class AuthState(val accessToken: String, val refreshToken: String, val user: AuthUser) {
    // Los tokens nunca van a un log.
    override fun toString(): String = "AuthState(user=$user)"
}

/** Contenido del archivo cifrado. auth = null significa que no hay sesión. */
@Serializable
data class AuthFile(val auth: AuthState? = null)
```

- [ ] **Step 3: Test del serializer (falla)**

Crear `mobile/app/src/test/java/com/fittrainer/data/auth/EncryptedAuthSerializerTest.kt`. Usa un `Aead` falso, porque en JVM no hay Keystore:

```kotlin
package com.fittrainer.data.auth

import com.fittrainer.data.session.Role
import com.google.crypto.tink.Aead
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.security.GeneralSecurityException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

/** "Cifra" invirtiendo los bytes con un prefijo; decrypt falla si el prefijo no está. */
private class FakeAead : Aead {
    private val prefix = "ENC:".encodeToByteArray()
    override fun encrypt(plaintext: ByteArray, associatedData: ByteArray): ByteArray =
        prefix + plaintext.reversedArray()
    override fun decrypt(ciphertext: ByteArray, associatedData: ByteArray): ByteArray {
        if (ciphertext.size < prefix.size || !ciphertext.copyOfRange(0, prefix.size).contentEquals(prefix)) {
            throw GeneralSecurityException("decryption failed")
        }
        return ciphertext.copyOfRange(prefix.size, ciphertext.size).reversedArray()
    }
}

class EncryptedAuthSerializerTest {

    private val serializer = EncryptedAuthSerializer { FakeAead() }
    private val state = AuthState("access-1", "refresh-1", AuthUser("u1", "Ana", "ana@test.com", Role.STUDENT))

    private suspend fun write(file: AuthFile): ByteArray =
        ByteArrayOutputStream().also { serializer.writeTo(file, it) }.toByteArray()

    @Test fun `ida y vuelta conserva la sesion`() = runTest {
        val bytes = write(AuthFile(state))
        assertEquals(AuthFile(state), serializer.readFrom(ByteArrayInputStream(bytes)))
    }

    @Test fun `lo escrito no contiene el token en texto plano`() = runTest {
        val bytes = write(AuthFile(state))
        assertFalse(bytes.decodeToString().contains("access-1"))
    }

    @Test fun `archivo vacio es sesion vacia`() = runTest {
        assertNull(serializer.readFrom(ByteArrayInputStream(ByteArray(0))).auth)
    }

    @Test fun `archivo corrupto es sesion vacia sin excepcion`() = runTest {
        val garbage = "basura".encodeToByteArray()
        assertNull(serializer.readFrom(ByteArrayInputStream(garbage)).auth)
    }

    @Test fun `si no se puede crear el Aead la lectura es sesion vacia`() = runTest {
        val broken = EncryptedAuthSerializer { throw GeneralSecurityException("keystore roto") }
        assertNull(broken.readFrom(ByteArrayInputStream("x".encodeToByteArray())).auth)
    }
}
```

- [ ] **Step 4: Correr el test y verificar que falla**

Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.auth.EncryptedAuthSerializerTest"`
Expected: FAIL de compilación ("Unresolved reference: EncryptedAuthSerializer").

- [ ] **Step 5: Implementar el serializer**

Crear `mobile/app/src/main/java/com/fittrainer/data/auth/EncryptedAuthSerializer.kt`:

```kotlin
package com.fittrainer.data.auth

import androidx.datastore.core.Serializer
import com.google.crypto.tink.Aead
import java.io.InputStream
import java.io.OutputStream
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.serialization.json.Json

/**
 * Serializa la sesión a JSON y la cifra completa con Tink (AEAD).
 * Si el archivo no se puede descifrar (keyset perdido, archivo corrupto), se lee
 * como sesión vacía: la app vuelve al login en vez de crashear.
 */
class EncryptedAuthSerializer(aeadProvider: () -> Aead) : Serializer<AuthFile> {

    // Lazy: el Keystore se toca recién en la primera lectura/escritura, fuera del hilo principal.
    private val aead by lazy(aeadProvider)
    private val json = Json { ignoreUnknownKeys = true }

    override val defaultValue: AuthFile = AuthFile()

    override suspend fun readFrom(input: InputStream): AuthFile {
        val bytes = input.readBytes()
        if (bytes.isEmpty()) return defaultValue
        return try {
            val plain = aead.decrypt(bytes, ASSOCIATED_DATA)
            json.decodeFromString(AuthFile.serializer(), plain.decodeToString())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            defaultValue
        }
    }

    override suspend fun writeTo(t: AuthFile, output: OutputStream) {
        val plain = json.encodeToString(AuthFile.serializer(), t).encodeToByteArray()
        output.write(aead.encrypt(plain, ASSOCIATED_DATA))
    }

    private companion object {
        val ASSOCIATED_DATA = "fittrainer-auth".encodeToByteArray()
    }
}
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.auth.EncryptedAuthSerializerTest"`
Expected: PASS (5 tests).

- [ ] **Step 7: TokenStore y su implementación con DataStore**

Crear `mobile/app/src/main/java/com/fittrainer/data/auth/TokenStore.kt`:

```kotlin
package com.fittrainer.data.auth

import androidx.datastore.core.DataStore
import java.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/** Único punto de acceso a la sesión guardada. La implementación real la cifra. */
interface TokenStore {
    val state: Flow<AuthState?>
    suspend fun current(): AuthState?
    suspend fun save(state: AuthState)
    suspend fun updateAccessToken(token: String)
    suspend fun clear()
}

class DataStoreTokenStore(private val dataStore: DataStore<AuthFile>) : TokenStore {

    // Un error de disco al leer se trata como "sin sesión" (vuelve al login), nunca como crash.
    private val file: Flow<AuthFile> = dataStore.data.catch { e ->
        if (e is IOException) emit(AuthFile()) else throw e
    }

    override val state: Flow<AuthState?> = file.map { it.auth }

    override suspend fun current(): AuthState? = file.first().auth

    override suspend fun save(state: AuthState) {
        dataStore.updateData { AuthFile(state) }
    }

    override suspend fun updateAccessToken(token: String) {
        dataStore.updateData { it.copy(auth = it.auth?.copy(accessToken = token)) }
    }

    override suspend fun clear() {
        dataStore.updateData { AuthFile() }
    }
}
```

- [ ] **Step 8: Aead con Tink y el Android Keystore**

Crear `mobile/app/src/main/java/com/fittrainer/data/auth/AuthCrypto.kt`:

```kotlin
package com.fittrainer.data.auth

import android.content.Context
import com.google.crypto.tink.Aead
import com.google.crypto.tink.KeyTemplates
import com.google.crypto.tink.RegistryConfiguration
import com.google.crypto.tink.aead.AeadConfig
import com.google.crypto.tink.integration.android.AndroidKeysetManager

/**
 * AEAD AES-256-GCM de Tink. El keyset vive en SharedPreferences, cifrado con una clave
 * maestra del Android Keystore (no sale del hardware seguro).
 */
object AuthCrypto {
    private const val KEYSET_NAME = "auth_keyset"
    private const val PREF_FILE = "fittrainer_auth_keyset"
    private const val MASTER_KEY_URI = "android-keystore://fittrainer_auth_master_key"

    fun aead(context: Context, keysetName: String = KEYSET_NAME, prefFile: String = PREF_FILE): Aead {
        AeadConfig.register()
        return AndroidKeysetManager.Builder()
            .withSharedPref(context, keysetName, prefFile)
            .withKeyTemplate(KeyTemplates.get("AES256_GCM"))
            .withMasterKeyUri(MASTER_KEY_URI)
            .build()
            .keysetHandle
            .getPrimitive(RegistryConfiguration.get(), Aead::class.java)
    }
}
```

Si `RegistryConfiguration` no resuelve con Tink 1.18.0, usar `.getPrimitive(Aead::class.java)` (deprecado, pero equivalente) y anotarlo en el reporte.

- [ ] **Step 9: Binding de Hilt**

Crear `mobile/app/src/main/java/com/fittrainer/di/AuthModule.kt`:

```kotlin
package com.fittrainer.di

import android.content.Context
import androidx.datastore.core.DataStoreFactory
import androidx.datastore.dataStoreFile
import com.fittrainer.data.auth.AuthCrypto
import com.fittrainer.data.auth.DataStoreTokenStore
import com.fittrainer.data.auth.EncryptedAuthSerializer
import com.fittrainer.data.auth.TokenStore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AuthModule {

    @Provides
    @Singleton
    fun provideTokenStore(@ApplicationContext context: Context): TokenStore =
        DataStoreTokenStore(
            DataStoreFactory.create(
                serializer = EncryptedAuthSerializer { AuthCrypto.aead(context) },
                produceFile = { context.dataStoreFile("auth.pb") },
            )
        )
}
```

- [ ] **Step 10: Test instrumentado del TokenStore real (Tink + Keystore)**

Crear `mobile/app/src/androidTest/java/com/fittrainer/data/auth/DataStoreTokenStoreTest.kt`:

```kotlin
package com.fittrainer.data.auth

import android.content.Context
import androidx.datastore.core.DataStoreFactory
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fittrainer.data.session.Role
import java.io.File
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DataStoreTokenStoreTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private val state = AuthState("access-123", "refresh-456", AuthUser("u1", "Ana", "ana@test.com", Role.STUDENT))
    private lateinit var file: File
    private lateinit var scope: CoroutineScope

    @Before fun setUp() {
        file = File(context.cacheDir, "auth-test-${UUID.randomUUID()}.pb")
        scope = CoroutineScope(Dispatchers.IO + Job())
    }

    @After fun tearDown() {
        scope.cancel()
        file.delete()
    }

    private fun store() = DataStoreTokenStore(
        DataStoreFactory.create(
            serializer = EncryptedAuthSerializer { AuthCrypto.aead(context, "test_keyset", "test_keyset_prefs") },
            scope = scope,
            produceFile = { file },
        )
    )

    @Test fun sinDatosCurrentEsNull() = runTest {
        assertNull(store().current())
    }

    @Test fun saveYCurrentDevuelvenLoGuardado() = runTest {
        val store = store()
        store.save(state)
        assertEquals(state, store.current())
    }

    @Test fun updateAccessTokenCambiaSoloElAccess() = runTest {
        val store = store()
        store.save(state)
        store.updateAccessToken("access-nuevo")
        assertEquals(state.copy(accessToken = "access-nuevo"), store.current())
    }

    @Test fun clearDejaLaSesionVacia() = runTest {
        val store = store()
        store.save(state)
        store.clear()
        assertNull(store.current())
    }

    @Test fun elArchivoNoTieneElTokenEnTextoPlano() = runTest {
        store().save(state)
        val bytes = file.readBytes()
        assertTrue(bytes.isNotEmpty())
        assertFalse(bytes.decodeToString().contains("access-123"))
        assertFalse(bytes.decodeToString().contains("refresh-456"))
    }

    @Test fun archivoCorruptoSeLeeComoSinSesion() = runTest {
        file.writeBytes("no es un archivo cifrado".encodeToByteArray())
        assertNull(store().current())
    }
}
```

- [ ] **Step 11: Verificar**

Run (desde `mobile/`):
- `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug testDebugUnitTest`
- Con el AVD `Medium_Phone_API_36.0` encendido: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew connectedDebugAndroidTest`

Expected: BUILD SUCCESSFUL. Unitarios: los 16 previos más 5 nuevos. Instrumentados: los 3 previos más 6 nuevos.

- [ ] **Step 12: Commit** (lo resuelve el controlador)

```bash
git add mobile/gradle/libs.versions.toml mobile/app/build.gradle.kts mobile/app/src/main/java/com/fittrainer/data/auth mobile/app/src/main/java/com/fittrainer/di/AuthModule.kt mobile/app/src/test/java/com/fittrainer/data/auth mobile/app/src/androidTest/java/com/fittrainer/data/auth
git commit -m "feat(mobile): TokenStore cifrado con DataStore + Tink"
```

---

### Task 2: AuthApi y AuthRepository (login / logout)

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/api/AuthApi.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/data/repository/DataError.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/auth/AuthRepository.kt`
- Create: `mobile/app/src/test/java/com/fittrainer/data/FakeAuth.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/auth/AuthRepositoryTest.kt`

**Interfaces:**
- Consumes (Tarea 1): `AuthUser`, `AuthState`, `TokenStore`. También `Role`, `DataError` y `DataException`, que ya existen.
- Produces:
  - DTOs `LoginRequest(email, password)`, `LoginResponse(user: UserDto, token, refreshToken)`, `UserDto(id, name, email, role: String)`, `RefreshRequest(refreshToken)` y `RefreshResponse(token)`.
  - `interface AuthApi`:
    - `suspend fun login(@Body body: LoginRequest): LoginResponse`
    - `suspend fun refresh(@Body body: RefreshRequest): RefreshResponse`
    - `suspend fun logout(@Header("Authorization") bearer: String, @Body body: RefreshRequest): Response<Unit>`
  - `DataError.InvalidCredentials` (`data object`).
  - `class AuthRepository @Inject constructor(api: AuthApi, tokenStore: TokenStore)`, con `suspend fun login(email: String, password: String): Result<AuthUser>` y `suspend fun logout()`.
  - Fakes de test (en `test/…/data/FakeAuth.kt`), que reusan las tareas 3 a 5:
    - `FakeTokenStore`;
    - `FakeAuthApi`;
    - `fun authState(access: String = "access-1", refresh: String = "refresh-1", role: Role = Role.STUDENT): AuthState`;
    - `fun httpError(code: Int): HttpException`.

- [ ] **Step 1: DTOs y AuthApi**

Crear `mobile/app/src/main/java/com/fittrainer/data/api/AuthApi.kt`:

```kotlin
package com.fittrainer.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class UserDto(val id: String, val name: String, val email: String, val role: String)

@Serializable
data class LoginResponse(
    val user: UserDto,
    val token: String,
    @SerialName("refresh_token") val refreshToken: String,
)

@Serializable
data class RefreshRequest(@SerialName("refresh_token") val refreshToken: String)

@Serializable
data class RefreshResponse(val token: String)

/** Endpoints de sesión. Se sirve con el cliente HTTP "auth" (sin Bearer automático ni Authenticator). */
interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): RefreshResponse

    @POST("auth/logout")
    suspend fun logout(@Header("Authorization") bearer: String, @Body body: RefreshRequest): Response<Unit>
}
```

- [ ] **Step 2: `InvalidCredentials` en DataError**

En `mobile/app/src/main/java/com/fittrainer/data/repository/DataError.kt`, dentro de `sealed interface DataError`, agregar después de `data object Offline : DataError`:

```kotlin
    data object InvalidCredentials : DataError
```

(`HealthViewModel.toMessage` tiene una rama `else`, así que sigue compilando.)

- [ ] **Step 3: Fakes de test**

Crear `mobile/app/src/test/java/com/fittrainer/data/FakeAuth.kt`:

```kotlin
package com.fittrainer.data

import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.LoginRequest
import com.fittrainer.data.api.LoginResponse
import com.fittrainer.data.api.RefreshRequest
import com.fittrainer.data.api.RefreshResponse
import com.fittrainer.data.api.UserDto
import com.fittrainer.data.auth.AuthState
import com.fittrainer.data.auth.AuthUser
import com.fittrainer.data.auth.TokenStore
import com.fittrainer.data.session.Role
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import retrofit2.Response

fun authState(access: String = "access-1", refresh: String = "refresh-1", role: Role = Role.STUDENT) =
    AuthState(access, refresh, AuthUser("u1", "Ana", "ana@test.com", role))

fun httpError(code: Int) = HttpException(Response.error<Any>(code, "{}".toResponseBody(null)))

/** TokenStore en memoria. */
class FakeTokenStore(initial: AuthState? = null) : TokenStore {
    val flow = MutableStateFlow(initial)
    override val state: Flow<AuthState?> = flow
    override suspend fun current(): AuthState? = flow.value
    override suspend fun save(state: AuthState) { flow.value = state }
    override suspend fun updateAccessToken(token: String) { flow.value = flow.value?.copy(accessToken = token) }
    override suspend fun clear() { flow.value = null }
}

/** AuthApi falsa. Cada endpoint devuelve su respuesta o lanza su error; [loginGate] demora el login. */
class FakeAuthApi : AuthApi {
    var loginResponse = LoginResponse(UserDto("u1", "Ana", "ana@test.com", "student"), "access-1", "refresh-1")
    var loginError: Throwable? = null
    var loginGate: CompletableDeferred<Unit>? = null
    var refreshResponse = RefreshResponse("access-2")
    var refreshError: Throwable? = null
    var logoutError: Throwable? = null

    val loginCalls = mutableListOf<LoginRequest>()
    val refreshCalls = mutableListOf<RefreshRequest>()
    val logoutCalls = mutableListOf<Pair<String, RefreshRequest>>()

    override suspend fun login(body: LoginRequest): LoginResponse {
        loginCalls += body
        loginGate?.await()
        loginError?.let { throw it }
        return loginResponse
    }

    override suspend fun refresh(body: RefreshRequest): RefreshResponse {
        refreshCalls += body
        refreshError?.let { throw it }
        return refreshResponse
    }

    override suspend fun logout(bearer: String, body: RefreshRequest): Response<Unit> {
        logoutCalls += bearer to body
        logoutError?.let { throw it }
        return Response.success(204, Unit)
    }
}
```

- [ ] **Step 4: Tests del repositorio (fallan)**

Crear `mobile/app/src/test/java/com/fittrainer/data/auth/AuthRepositoryTest.kt`:

```kotlin
package com.fittrainer.data.auth

import com.fittrainer.data.FakeAuthApi
import com.fittrainer.data.FakeTokenStore
import com.fittrainer.data.api.LoginRequest
import com.fittrainer.data.api.UserDto
import com.fittrainer.data.authState
import com.fittrainer.data.httpError
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Role
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthRepositoryTest {

    private val api = FakeAuthApi()
    private val store = FakeTokenStore()
    private val repo = AuthRepository(api, store)

    private fun Result<*>.dataError() = (exceptionOrNull() as DataException).error

    @Test fun `login ok guarda tokens y usuario`() = runTest {
        val result = repo.login("ana@test.com", "Secreta123")

        assertEquals(AuthUser("u1", "Ana", "ana@test.com", Role.STUDENT), result.getOrNull())
        assertEquals(authState(), store.current())
        assertEquals(listOf(LoginRequest("ana@test.com", "Secreta123")), api.loginCalls)
    }

    @Test fun `login de entrenador guarda rol TRAINER`() = runTest {
        api.loginResponse = api.loginResponse.copy(user = UserDto("t1", "Pablo", "p@test.com", "trainer"))
        repo.login("p@test.com", "Secreta123")
        assertEquals(Role.TRAINER, store.current()?.user?.role)
    }

    @Test fun `401 es credenciales invalidas y no guarda nada`() = runTest {
        api.loginError = httpError(401)
        val result = repo.login("ana@test.com", "mala")
        assertEquals(DataError.InvalidCredentials, result.dataError())
        assertNull(store.current())
    }

    @Test fun `sin red es Offline`() = runTest {
        api.loginError = IOException("sin red")
        assertEquals(DataError.Offline, repo.login("ana@test.com", "x").dataError())
    }

    @Test fun `500 es Http 500`() = runTest {
        api.loginError = httpError(500)
        assertEquals(DataError.Http(500), repo.login("ana@test.com", "x").dataError())
    }

    // Review Focus 1: rol desconocido → Unknown, sin sesión a medias.
    @Test fun `rol desconocido es Unknown y no guarda nada`() = runTest {
        api.loginResponse = api.loginResponse.copy(user = UserDto("x", "X", "x@test.com", "admin"))
        val result = repo.login("x@test.com", "Secreta123")
        assertEquals(DataError.Unknown, result.dataError())
        assertNull(store.current())
    }

    @Test fun `logout borra la sesion y revoca con el refresh token`() = runTest {
        store.save(authState())
        repo.logout()
        assertNull(store.current())
        assertEquals("Bearer access-1", api.logoutCalls.single().first)
        assertEquals("refresh-1", api.logoutCalls.single().second.refreshToken)
    }

    @Test fun `logout borra la sesion aunque la API falle`() = runTest {
        store.save(authState())
        api.logoutError = IOException("sin red")
        repo.logout()
        assertNull(store.current())
    }

    @Test fun `logout sin sesion no llama a la API`() = runTest {
        repo.logout()
        assertTrue(api.logoutCalls.isEmpty())
    }
}
```

- [ ] **Step 5: Correr los tests y verificar que fallan**

Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.auth.AuthRepositoryTest"`
Expected: FAIL de compilación ("Unresolved reference: AuthRepository").

- [ ] **Step 6: Implementar AuthRepository**

Crear `mobile/app/src/main/java/com/fittrainer/data/auth/AuthRepository.kt`:

```kotlin
package com.fittrainer.data.auth

import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.LoginRequest
import com.fittrainer.data.api.RefreshRequest
import com.fittrainer.data.api.UserDto
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import com.fittrainer.data.session.Role
import java.io.IOException
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import retrofit2.HttpException

/** Login y logout contra el backend. La sesión resultante vive en [TokenStore]. */
class AuthRepository @Inject constructor(
    private val api: AuthApi,
    private val tokenStore: TokenStore,
) {
    suspend fun login(email: String, password: String): Result<AuthUser> = try {
        val response = api.login(LoginRequest(email, password))
        val user = response.user.toAuthUser()
        tokenStore.save(AuthState(response.token, response.refreshToken, user))
        Result.success(user)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toLoginError(), e))
    }

    /** Cierra la sesión local primero (funciona sin red) y después intenta revocar el refresh token. */
    suspend fun logout() {
        val state = tokenStore.current() ?: return
        tokenStore.clear()
        try {
            api.logout("Bearer ${state.accessToken}", RefreshRequest(state.refreshToken))
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Sin red o token vencido: la sesión local ya está cerrada.
        }
    }

    private fun UserDto.toAuthUser() = AuthUser(
        id = id,
        name = name,
        email = email,
        role = when (role) {
            "student" -> Role.STUDENT
            "trainer" -> Role.TRAINER
            else -> throw IllegalStateException("Rol desconocido: $role")
        },
    )

    private fun Exception.toLoginError(): DataError = when (this) {
        is IOException -> DataError.Offline
        is HttpException -> if (code() == 401) DataError.InvalidCredentials else DataError.Http(code())
        else -> DataError.Unknown
    }
}
```

- [ ] **Step 7: Correr los tests y verificar que pasan**

Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest`
Expected: PASS, con los 9 tests de `AuthRepositoryTest` y todos los anteriores en verde.

- [ ] **Step 8: Commit** (lo resuelve el controlador)

```bash
git add mobile/app/src/main/java/com/fittrainer/data/api/AuthApi.kt mobile/app/src/main/java/com/fittrainer/data/repository/DataError.kt mobile/app/src/main/java/com/fittrainer/data/auth/AuthRepository.kt mobile/app/src/test/java/com/fittrainer/data/FakeAuth.kt mobile/app/src/test/java/com/fittrainer/data/auth/AuthRepositoryTest.kt
git commit -m "feat(mobile): AuthApi y AuthRepository (login y logout)"
```

---

### Task 3: Bearer automático y renovación del token (OkHttp)

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/auth/AuthInterceptor.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/auth/TokenAuthenticator.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/di/NetworkModule.kt` (se reescribe completo)
- Modify: `mobile/gradle/libs.versions.toml`, `mobile/app/build.gradle.kts` (MockWebServer)
- Test: `mobile/app/src/test/java/com/fittrainer/data/auth/TokenAuthenticatorTest.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/auth/AuthNetworkIntegrationTest.kt`

**Interfaces:**
- Consumes:
  - de la Tarea 1: `TokenStore`, `AuthState`;
  - de la Tarea 2: `AuthApi`, `RefreshRequest`, y los fakes `FakeTokenStore`, `FakeAuthApi`, `authState()` y `httpError()`.
- Produces:
  - `class AuthInterceptor @Inject constructor(tokenStore: TokenStore) : Interceptor`
  - `class TokenAuthenticator @Inject constructor(tokenStore: TokenStore, authApi: AuthApi) : Authenticator`
  - Calificador `@AuthClient`, en `di/NetworkModule.kt`.
  - Bindings `@Singleton` de Hilt:
    - `OkHttpClient` principal y `@AuthClient OkHttpClient`;
    - `FitTrainerApi`, sobre el principal;
    - `AuthApi`, sobre `@AuthClient`.

- [ ] **Step 1: Dependencia de MockWebServer**

En `mobile/gradle/libs.versions.toml`, `[libraries]`:

```toml
okhttp-mockwebserver = { group = "com.squareup.okhttp3", name = "mockwebserver", version.ref = "okhttp" }
```

En `mobile/app/build.gradle.kts`, debajo de `testImplementation(libs.kotlinx.coroutines.test)`:

```kotlin
    testImplementation(libs.okhttp.mockwebserver)
```

- [ ] **Step 2: Tests unitarios del Authenticator (fallan)**

Crear `mobile/app/src/test/java/com/fittrainer/data/auth/TokenAuthenticatorTest.kt`:

```kotlin
package com.fittrainer.data.auth

import com.fittrainer.data.FakeAuthApi
import com.fittrainer.data.FakeTokenStore
import com.fittrainer.data.authState
import com.fittrainer.data.httpError
import java.io.IOException
import kotlinx.coroutines.runBlocking
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TokenAuthenticatorTest {

    private val api = FakeAuthApi()
    private val store = FakeTokenStore(authState())
    private val authenticator = TokenAuthenticator(store, api)

    private fun unauthorized(token: String?, prior: Response? = null): Response {
        val request = Request.Builder().url("http://localhost/api/students")
            .apply { token?.let { header("Authorization", "Bearer $it") } }
            .build()
        return Response.Builder().request(request).protocol(Protocol.HTTP_1_1)
            .code(401).message("Unauthorized").priorResponse(prior).build()
    }

    private fun current() = runBlocking { store.current() }

    @Test fun `401 renueva y reintenta con el token nuevo`() {
        val retry = authenticator.authenticate(null, unauthorized("access-1"))

        assertEquals("Bearer access-2", retry?.header("Authorization"))
        assertEquals("access-2", current()?.accessToken)
        assertEquals("refresh-1", api.refreshCalls.single().refreshToken)
    }

    @Test fun `refresh con 401 cierra la sesion`() {
        api.refreshError = httpError(401)
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertNull(current())
    }

    // Review Focus 2: refresh con 400 → misma salida que 401, sin reintentos infinitos.
    @Test fun `refresh con 400 cierra la sesion`() {
        api.refreshError = httpError(400)
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertNull(current())
    }

    @Test fun `refresh sin red no cierra la sesion`() {
        api.refreshError = IOException("sin red")
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertEquals(authState(), current())
    }

    @Test fun `refresh con 500 no cierra la sesion`() {
        api.refreshError = httpError(500)
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertEquals(authState(), current())
    }

    @Test fun `un reintento que vuelve a dar 401 no entra en bucle`() {
        val prior = unauthorized("access-1")
        assertNull(authenticator.authenticate(null, unauthorized("access-2", prior)))
        assertTrue(api.refreshCalls.isEmpty())
    }

    @Test fun `si otro hilo ya renovo reintenta sin pedir otro refresh`() {
        runBlocking { store.updateAccessToken("access-2") }
        val retry = authenticator.authenticate(null, unauthorized("access-1"))
        assertEquals("Bearer access-2", retry?.header("Authorization"))
        assertTrue(api.refreshCalls.isEmpty())
    }

    @Test fun `request sin Bearer no se renueva`() {
        assertNull(authenticator.authenticate(null, unauthorized(null)))
        assertTrue(api.refreshCalls.isEmpty())
    }

    @Test fun `sin sesion guardada no se renueva`() {
        runBlocking { store.clear() }
        assertNull(authenticator.authenticate(null, unauthorized("access-1")))
        assertTrue(api.refreshCalls.isEmpty())
    }
}
```

- [ ] **Step 3: Correr los tests y verificar que fallan**

Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.auth.TokenAuthenticatorTest"`
Expected: FAIL de compilación ("Unresolved reference: TokenAuthenticator").

- [ ] **Step 4: Implementar AuthInterceptor**

Crear `mobile/app/src/main/java/com/fittrainer/data/auth/AuthInterceptor.kt`:

```kotlin
package com.fittrainer.data.auth

import javax.inject.Inject
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/** Agrega `Authorization: Bearer <access>` a cada request si hay sesión. */
class AuthInterceptor @Inject constructor(
    private val tokenStore: TokenStore,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val path = request.url.encodedPath
        // No pisa un header explícito (logout) ni autentica los endpoints que emiten tokens.
        if (request.header(AUTHORIZATION) != null || UNAUTHENTICATED_PATHS.any { path.endsWith(it) }) {
            return chain.proceed(request)
        }
        val token = runBlocking { tokenStore.current() }?.accessToken
            ?: return chain.proceed(request)
        return chain.proceed(request.newBuilder().header(AUTHORIZATION, "Bearer $token").build())
    }

    companion object {
        const val AUTHORIZATION = "Authorization"
        private val UNAUTHENTICATED_PATHS = listOf("/auth/login", "/auth/refresh")
    }
}
```

- [ ] **Step 5: Implementar TokenAuthenticator**

Crear `mobile/app/src/main/java/com/fittrainer/data/auth/TokenAuthenticator.kt`:

```kotlin
package com.fittrainer.data.auth

import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.RefreshRequest
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.HttpException

/**
 * Ante un 401 renueva el access token con el refresh token y reintenta una vez.
 * Si el backend rechaza el refresh (401/400) la sesión se borra y la app vuelve al login;
 * si el refresh falla por red, la sesión queda y la llamada falla como cualquier error.
 */
class TokenAuthenticator @Inject constructor(
    private val tokenStore: TokenStore,
    private val authApi: AuthApi,
) : Authenticator {

    // Varias llamadas con 401 a la vez → un solo refresh.
    private val mutex = Mutex()

    override fun authenticate(route: Route?, response: Response): Request? {
        if (response.priorResponse != null) return null
        val failedToken = response.request.header(AuthInterceptor.AUTHORIZATION)
            ?.removePrefix("Bearer ")
            ?: return null

        return runBlocking {
            mutex.withLock {
                val current = tokenStore.current() ?: return@withLock null
                if (current.accessToken != failedToken) {
                    return@withLock response.request.withBearer(current.accessToken)
                }
                refresh(current)?.let { response.request.withBearer(it) }
            }
        }
    }

    /** Devuelve el access token nuevo, o null si no se pudo renovar. */
    private suspend fun refresh(current: AuthState): String? = try {
        val token = authApi.refresh(RefreshRequest(current.refreshToken)).token
        tokenStore.updateAccessToken(token)
        token
    } catch (e: CancellationException) {
        throw e
    } catch (e: HttpException) {
        if (e.code() == 401 || e.code() == 400) tokenStore.clear()
        null
    } catch (e: Exception) {
        null
    }

    private fun Request.withBearer(token: String): Request =
        newBuilder().header(AuthInterceptor.AUTHORIZATION, "Bearer $token").build()
}
```

- [ ] **Step 6: Correr los tests unitarios y verificar que pasan**

Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.auth.TokenAuthenticatorTest"`
Expected: PASS (9 tests).

- [ ] **Step 7: Test de integración con MockWebServer**

Crear `mobile/app/src/test/java/com/fittrainer/data/auth/AuthNetworkIntegrationTest.kt`. Arma la cadena real (OkHttp + Retrofit + interceptor + authenticator) contra un servidor HTTP falso:

```kotlin
package com.fittrainer.data.auth

import com.fittrainer.data.FakeTokenStore
import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.authState
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class AuthNetworkIntegrationTest {

    private val server = MockWebServer()
    private val store = FakeTokenStore(authState())
    private lateinit var client: OkHttpClient

    @Before fun setUp() {
        server.start()
        val authApi = Retrofit.Builder()
            .baseUrl(server.url("/api/"))
            .client(OkHttpClient())
            .addConverterFactory(Json { ignoreUnknownKeys = true }.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(AuthApi::class.java)
        client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(store))
            .authenticator(TokenAuthenticator(store, authApi))
            .build()
    }

    @After fun tearDown() = server.shutdown()

    private fun get(path: String): Int =
        client.newCall(Request.Builder().url(server.url(path)).build()).execute().use { it.code }

    @Test fun `agrega el Bearer a una llamada protegida`() {
        server.enqueue(MockResponse().setBody("ok"))
        get("/api/students")
        assertEquals("Bearer access-1", server.takeRequest().getHeader("Authorization"))
    }

    @Test fun `no agrega Bearer a login ni refresh`() {
        server.enqueue(MockResponse().setBody("{}"))
        server.enqueue(MockResponse().setBody("{}"))
        get("/api/auth/login")
        get("/api/auth/refresh")
        assertNull(server.takeRequest().getHeader("Authorization"))
        assertNull(server.takeRequest().getHeader("Authorization"))
    }

    @Test fun `sin sesion no agrega header`() {
        runBlocking { store.clear() }
        server.enqueue(MockResponse().setBody("ok"))
        get("/api/students")
        assertNull(server.takeRequest().getHeader("Authorization"))
    }

    @Test fun `no pisa un Authorization explicito`() {
        server.enqueue(MockResponse().setBody("ok"))
        client.newCall(
            Request.Builder().url(server.url("/api/x")).header("Authorization", "Bearer explicito").build()
        ).execute().close()
        assertEquals("Bearer explicito", server.takeRequest().getHeader("Authorization"))
    }

    @Test fun `401 dispara refresh y reintenta con el token nuevo`() {
        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setBody("""{"token":"access-2","expires_in":"1h"}"""))
        server.enqueue(MockResponse().setBody("ok"))

        assertEquals(200, get("/api/students"))

        val first = server.takeRequest()
        val refresh = server.takeRequest()
        val retry = server.takeRequest()
        assertEquals("Bearer access-1", first.getHeader("Authorization"))
        assertEquals("/api/auth/refresh", refresh.path)
        assertNull(refresh.getHeader("Authorization"))
        assertTrue(refresh.body.readUtf8().contains("\"refresh_token\":\"refresh-1\""))
        assertEquals("Bearer access-2", retry.getHeader("Authorization"))
        assertEquals("access-2", runBlocking { store.current() }?.accessToken)
    }

    @Test fun `dos 401 simultaneos producen un solo refresh`() {
        val refreshes = AtomicInteger()
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse = when {
                request.path == "/api/auth/refresh" -> {
                    refreshes.incrementAndGet()
                    // Demora: la segunda llamada recibe su 401 mientras el refresh está en curso.
                    MockResponse().setBody("""{"token":"access-2"}""").setBodyDelay(300, TimeUnit.MILLISECONDS)
                }
                request.getHeader("Authorization") == "Bearer access-2" -> MockResponse().setBody("ok")
                else -> MockResponse().setResponseCode(401)
            }
        }

        val codes = runBlocking {
            (1..2).map { async(Dispatchers.IO) { get("/api/students") } }.awaitAll()
        }

        assertEquals(listOf(200, 200), codes)
        assertEquals(1, refreshes.get())
    }
}
```

- [ ] **Step 8: Correr los tests de integración y verificar que pasan**

Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.auth.AuthNetworkIntegrationTest"`
Expected: PASS (6 tests).

- [ ] **Step 9: Reescribir NetworkModule con los dos clientes**

Reemplazar todo `mobile/app/src/main/java/com/fittrainer/di/NetworkModule.kt` por:

```kotlin
package com.fittrainer.di

import com.fittrainer.BuildConfig
import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.FitTrainerApi
import com.fittrainer.data.auth.AuthInterceptor
import com.fittrainer.data.auth.TokenAuthenticator
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import java.util.concurrent.TimeUnit
import javax.inject.Qualifier
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** Cliente sin Bearer automático ni Authenticator: lo usa AuthApi, así el refresh nunca dispara otro refresh. */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class AuthClient

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideJson(): Json = Json { ignoreUnknownKeys = true }

    @Provides
    @Singleton
    fun provideOkHttp(authInterceptor: AuthInterceptor, authenticator: TokenAuthenticator): OkHttpClient =
        client {
            addInterceptor(authInterceptor)
            authenticator(authenticator)
        }

    @Provides
    @Singleton
    @AuthClient
    fun provideAuthOkHttp(): OkHttpClient = client()

    @Provides
    @Singleton
    fun provideApi(client: OkHttpClient, json: Json): FitTrainerApi =
        retrofit(client, json).create(FitTrainerApi::class.java)

    @Provides
    @Singleton
    fun provideAuthApi(@AuthClient client: OkHttpClient, json: Json): AuthApi =
        retrofit(client, json).create(AuthApi::class.java)

    private fun client(configure: OkHttpClient.Builder.() -> Unit = {}): OkHttpClient = OkHttpClient.Builder()
        // Conexión corta: sin red falla rápido y el caché de Room se muestra enseguida.
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(BuildConfig.API_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(BuildConfig.API_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .apply(configure)
        .apply {
            // Último interceptor: ve el Bearer ya agregado, pero nunca lo imprime.
            if (BuildConfig.DEBUG) {
                addInterceptor(
                    HttpLoggingInterceptor()
                        .setLevel(HttpLoggingInterceptor.Level.BASIC)
                        .apply { redactHeader("Authorization") }
                )
            }
        }
        .build()

    private fun retrofit(client: OkHttpClient, json: Json): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
}
```

- [ ] **Step 10: Verificar build completo y tests**

Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL y todos los unitarios en verde. Hilt resuelve `TokenStore` (Tarea 1), `AuthApi`, `AuthInterceptor` y `TokenAuthenticator`.

- [ ] **Step 11: Commit** (lo resuelve el controlador)

```bash
git add mobile/gradle/libs.versions.toml mobile/app/build.gradle.kts mobile/app/src/main/java/com/fittrainer/data/auth/AuthInterceptor.kt mobile/app/src/main/java/com/fittrainer/data/auth/TokenAuthenticator.kt mobile/app/src/main/java/com/fittrainer/di/NetworkModule.kt mobile/app/src/test/java/com/fittrainer/data/auth/TokenAuthenticatorTest.kt mobile/app/src/test/java/com/fittrainer/data/auth/AuthNetworkIntegrationTest.kt
git commit -m "feat(mobile): Bearer automático y renovación del token con Authenticator"
```

---

### Task 4: Pantalla de login real

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/login/LoginUiState.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/login/LoginViewModel.kt` (se reescribe completo)
- Modify: `mobile/app/src/main/java/com/fittrainer/ui/login/LoginScreen.kt` (se reescribe completo)
- Test: `mobile/app/src/test/java/com/fittrainer/ui/login/LoginViewModelTest.kt`

**Interfaces:**
- Consumes:
  - de la Tarea 2: `AuthRepository.login(email, password): Result<AuthUser>`, `DataException`, `DataError.InvalidCredentials`/`Offline`/`Http`/`Unknown`, y los fakes `FakeAuthApi`, `FakeTokenStore` y `httpError()`;
  - existente: `MainDispatcherRule`.
- Produces:
  - `data class LoginUiState(val email: String = "", val password: String = "", val isLoading: Boolean = false, val emailError: String? = null, val error: String? = null)` con `val canSubmit: Boolean`.
  - `LoginViewModel`: `val uiState: StateFlow<LoginUiState>`, `fun onEmailChange(value: String)`, `fun onPasswordChange(value: String)` y `fun submit()`.
  - `@Composable fun LoginScreen(viewModel: LoginViewModel = hiltViewModel())`, con la misma firma que hoy, así `AppNavHost` no cambia.

- [ ] **Step 1: Estado de la pantalla**

Crear `mobile/app/src/main/java/com/fittrainer/ui/login/LoginUiState.kt`:

```kotlin
package com.fittrainer.ui.login

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val emailError: String? = null,
    val error: String? = null,
) {
    val canSubmit: Boolean get() = email.isNotBlank() && password.isNotEmpty() && !isLoading
}
```

- [ ] **Step 2: Tests del ViewModel (fallan)**

Crear `mobile/app/src/test/java/com/fittrainer/ui/login/LoginViewModelTest.kt`:

```kotlin
package com.fittrainer.ui.login

import com.fittrainer.MainDispatcherRule
import com.fittrainer.data.FakeAuthApi
import com.fittrainer.data.FakeTokenStore
import com.fittrainer.data.api.LoginRequest
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.httpError
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class LoginViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val api = FakeAuthApi()
    private val store = FakeTokenStore()
    private val vm = LoginViewModel(AuthRepository(api, store))

    private fun fill(email: String = "ana@test.com", password: String = "Secreta123") {
        vm.onEmailChange(email)
        vm.onPasswordChange(password)
    }

    @Test fun `login ok guarda la sesion y termina de cargar`() = runTest {
        fill()
        vm.submit()
        assertNotNull(store.current())
        assertFalse(vm.uiState.value.isLoading)
        assertNull(vm.uiState.value.error)
    }

    @Test fun `email invalido no llama a la API`() = runTest {
        fill(email = "ana@")
        vm.submit()
        assertEquals("Email con formato inválido", vm.uiState.value.emailError)
        assertTrue(api.loginCalls.isEmpty())
    }

    // Review Focus 3: espacios alrededor del email no son error de formato.
    @Test fun `email con espacios se recorta antes de validar y enviar`() = runTest {
        fill(email = "  ana@test.com  ")
        vm.submit()
        assertNull(vm.uiState.value.emailError)
        assertEquals(LoginRequest("ana@test.com", "Secreta123"), api.loginCalls.single())
    }

    @Test fun `contraseña vacia no permite enviar`() = runTest {
        fill(password = "")
        assertFalse(vm.uiState.value.canSubmit)
        vm.submit()
        assertTrue(api.loginCalls.isEmpty())
    }

    @Test fun `mientras carga isLoading es true y un segundo submit se ignora`() = runTest {
        api.loginGate = CompletableDeferred()
        fill()
        vm.submit()
        assertTrue(vm.uiState.value.isLoading)
        assertFalse(vm.uiState.value.canSubmit)

        vm.submit()
        api.loginGate?.complete(Unit)

        assertEquals(1, api.loginCalls.size)
        assertFalse(vm.uiState.value.isLoading)
    }

    @Test fun `401 muestra credenciales incorrectas`() = runTest {
        api.loginError = httpError(401)
        fill()
        vm.submit()
        assertEquals("Email o contraseña incorrectos", vm.uiState.value.error)
        assertFalse(vm.uiState.value.isLoading)
    }

    @Test fun `sin red muestra sin conexion`() = runTest {
        api.loginError = IOException("sin red")
        fill()
        vm.submit()
        assertEquals("Sin conexión con el servidor", vm.uiState.value.error)
    }

    // Review Focus 5: 400/500 → mensaje genérico, sin texto técnico.
    @Test fun `400 y 500 muestran el mensaje generico`() = runTest {
        fill()
        api.loginError = httpError(500)
        vm.submit()
        assertEquals("No se pudo iniciar sesión", vm.uiState.value.error)

        api.loginError = httpError(400)
        vm.submit()
        assertEquals("No se pudo iniciar sesión", vm.uiState.value.error)
    }

    // Review Focus 4: corregir un campo borra el error anterior.
    @Test fun `editar un campo limpia los errores`() = runTest {
        api.loginError = httpError(401)
        fill(email = "ana@")
        vm.submit()
        vm.onEmailChange("ana@test.com")
        assertNull(vm.uiState.value.emailError)

        vm.submit()
        assertNotNull(vm.uiState.value.error)
        vm.onPasswordChange("Otra1234")
        assertNull(vm.uiState.value.error)
    }
}
```

- [ ] **Step 3: Correr los tests y verificar que fallan**

Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.ui.login.LoginViewModelTest"`
Expected: FAIL de compilación (`LoginViewModel` todavía recibe `SessionRepository` y no tiene `uiState`).

- [ ] **Step 4: Reescribir LoginViewModel**

Reemplazar todo `mobile/app/src/main/java/com/fittrainer/ui/login/LoginViewModel.kt` por:

```kotlin
package com.fittrainer.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Al loguearse no navega: AppNavHost observa la sesión y cambia de pantalla solo. */
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun onEmailChange(value: String) {
        _uiState.update { it.copy(email = value, emailError = null, error = null) }
    }

    fun onPasswordChange(value: String) {
        _uiState.update { it.copy(password = value, error = null) }
    }

    fun submit() {
        val state = _uiState.value
        if (!state.canSubmit) return
        val email = state.email.trim()
        if (!EMAIL_REGEX.matches(email)) {
            _uiState.update { it.copy(emailError = "Email con formato inválido") }
            return
        }
        _uiState.update { it.copy(isLoading = true, error = null, emailError = null) }
        viewModelScope.launch {
            val result = authRepository.login(email, state.password)
            _uiState.update {
                it.copy(isLoading = false, error = result.exceptionOrNull()?.let(::toMessage))
            }
        }
    }

    private fun toMessage(error: Throwable): String = when ((error as? DataException)?.error) {
        DataError.InvalidCredentials -> "Email o contraseña incorrectos"
        DataError.Offline -> "Sin conexión con el servidor"
        else -> "No se pudo iniciar sesión"
    }

    private companion object {
        // Mismo criterio que el backend (validations/auth).
        val EMAIL_REGEX = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
    }
}
```

- [ ] **Step 5: Reescribir LoginScreen**

El `LoginScreen` actual llama a `viewModel.signInAs`, que ya no existe, así que los tests no compilan hasta reescribirlo.

Reemplazar todo `mobile/app/src/main/java/com/fittrainer/ui/login/LoginScreen.kt` por:

```kotlin
package com.fittrainer.ui.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.FtRadius
import com.fittrainer.ui.theme.Spacing

@Composable
fun LoginScreen(viewModel: LoginViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LoginContent(
        state = state,
        onEmailChange = viewModel::onEmailChange,
        onPasswordChange = viewModel::onPasswordChange,
        onSubmit = viewModel::submit,
    )
}

@Composable
fun LoginContent(
    state: LoginUiState,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    var showPassword by rememberSaveable { mutableStateOf(false) }
    val controlShape = RoundedCornerShape(FtRadius.control)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.lg, Alignment.CenterVertically),
    ) {
        Text("FitTrainer", style = MaterialTheme.typography.displayLarge)
        Text("Iniciá sesión", style = MaterialTheme.typography.bodyLarge, color = FtColors.TextSecondary)

        OutlinedTextField(
            value = state.email,
            onValueChange = onEmailChange,
            label = { Text("Email") },
            singleLine = true,
            isError = state.emailError != null,
            supportingText = if (state.emailError != null) {
                { Text(state.emailError) }
            } else {
                null
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            shape = controlShape,
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = state.password,
            onValueChange = onPasswordChange,
            label = { Text("Contraseña") },
            singleLine = true,
            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = {
                TextButton(
                    onClick = { showPassword = !showPassword },
                    modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
                ) { Text(if (showPassword) "Ocultar" else "Mostrar", color = FtColors.BrandText) }
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onSubmit() }),
            shape = controlShape,
            modifier = Modifier.fillMaxWidth(),
        )

        Button(
            onClick = onSubmit,
            enabled = state.canSubmit,
            shape = controlShape,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            } else {
                Text("Ingresar")
            }
        }

        state.error?.let {
            Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.Coral)
        }
    }
}
```

- [ ] **Step 6: Correr los tests y verificar que pasan**

Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL y todos los unitarios en verde, con los 9 de `LoginViewModelTest`.

- [ ] **Step 7: Commit** (lo resuelve el controlador)

```bash
git add mobile/app/src/main/java/com/fittrainer/ui/login mobile/app/src/test/java/com/fittrainer/ui/login
git commit -m "feat(mobile): pantalla de login real con validación y errores"
```

---

### Task 5: Sesión derivada del TokenStore (adiós login de desarrollo)

**Files:**
- Modify: `mobile/app/src/main/java/com/fittrainer/data/session/Session.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/data/session/SessionRepository.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/session/TokenSessionRepository.kt`
- Delete: `mobile/app/src/main/java/com/fittrainer/data/session/DataStoreSessionRepository.kt`
- Delete: `mobile/app/src/test/java/com/fittrainer/data/session/DataStoreSessionRepositoryTest.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/di/SessionModule.kt` (se reescribe completo)
- Modify: `mobile/app/src/main/java/com/fittrainer/navigation/AppNavHost.kt`
- Modify: `mobile/gradle/libs.versions.toml`, `mobile/app/build.gradle.kts` (sacar `datastore-preferences`)
- Test: `mobile/app/src/test/java/com/fittrainer/data/session/TokenSessionRepositoryTest.kt`

**Interfaces:**
- Consumes:
  - de la Tarea 1: `TokenStore`, `AuthUser`;
  - de la Tarea 2: `AuthRepository.logout()`, y los fakes `FakeTokenStore`, `FakeAuthApi` y `authState()`.
- Produces:
  - `sealed interface Session { data object LoggedOut; data class Student(val user: AuthUser); data class Trainer(val user: AuthUser) }`
  - `interface SessionRepository { val session: Flow<Session>; suspend fun signOut() }`
  - `class TokenSessionRepository @Inject constructor(tokenStore: TokenStore, authRepository: AuthRepository) : SessionRepository`

- [ ] **Step 1: Test de la sesión derivada (falla)**

Crear `mobile/app/src/test/java/com/fittrainer/data/session/TokenSessionRepositoryTest.kt`:

```kotlin
package com.fittrainer.data.session

import com.fittrainer.data.FakeAuthApi
import com.fittrainer.data.FakeTokenStore
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.authState
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class TokenSessionRepositoryTest {

    private val api = FakeAuthApi()
    private val store = FakeTokenStore()
    private val repo = TokenSessionRepository(store, AuthRepository(api, store))

    @Test fun `sin sesion guardada es LoggedOut`() = runTest {
        assertEquals(Session.LoggedOut, repo.session.first())
    }

    @Test fun `sesion de alumno es Student con su usuario`() = runTest {
        store.save(authState(role = Role.STUDENT))
        assertEquals(Session.Student(authState().user), repo.session.first())
    }

    @Test fun `sesion de entrenador es Trainer con su usuario`() = runTest {
        val trainer = authState(role = Role.TRAINER)
        store.save(trainer)
        assertEquals(Session.Trainer(trainer.user), repo.session.first())
    }

    @Test fun `signOut vuelve a LoggedOut y revoca en el backend`() = runTest {
        store.save(authState())
        repo.signOut()
        assertEquals(Session.LoggedOut, repo.session.first())
        assertEquals(1, api.logoutCalls.size)
    }
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.session.TokenSessionRepositoryTest"`
Expected: FAIL de compilación ("Unresolved reference: TokenSessionRepository").

- [ ] **Step 3: Session con el usuario**

Reemplazar todo `mobile/app/src/main/java/com/fittrainer/data/session/Session.kt` por:

```kotlin
package com.fittrainer.data.session

import com.fittrainer.data.auth.AuthUser

enum class Role { STUDENT, TRAINER }

/** Estado de sesión que decide qué navegación ve el usuario. */
sealed interface Session {
    data object LoggedOut : Session
    data class Student(val user: AuthUser) : Session
    data class Trainer(val user: AuthUser) : Session
}
```

- [ ] **Step 4: Interfaz sin `signInAs`**

Reemplazar todo `mobile/app/src/main/java/com/fittrainer/data/session/SessionRepository.kt` por:

```kotlin
package com.fittrainer.data.session

import kotlinx.coroutines.flow.Flow

/** Sesión del usuario. Se inicia con el login (AuthRepository) y se observa desde la navegación raíz. */
interface SessionRepository {
    val session: Flow<Session>
    suspend fun signOut()
}
```

- [ ] **Step 5: Implementación derivada del TokenStore**

Crear `mobile/app/src/main/java/com/fittrainer/data/session/TokenSessionRepository.kt`:

```kotlin
package com.fittrainer.data.session

import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.auth.TokenStore
import javax.inject.Inject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/** La sesión es lo que hay en el TokenStore cifrado: si hay tokens, el usuario está adentro. */
class TokenSessionRepository @Inject constructor(
    private val tokenStore: TokenStore,
    private val authRepository: AuthRepository,
) : SessionRepository {

    override val session: Flow<Session> = tokenStore.state.map { state ->
        when (state?.user?.role) {
            null -> Session.LoggedOut
            Role.STUDENT -> Session.Student(state.user)
            Role.TRAINER -> Session.Trainer(state.user)
        }
    }

    override suspend fun signOut() = authRepository.logout()
}
```

- [ ] **Step 6: SessionModule**

Reemplazar todo `mobile/app/src/main/java/com/fittrainer/di/SessionModule.kt` por:

```kotlin
package com.fittrainer.di

import com.fittrainer.data.session.SessionRepository
import com.fittrainer.data.session.TokenSessionRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class SessionModule {

    @Binds
    @Singleton
    abstract fun bindSessionRepository(impl: TokenSessionRepository): SessionRepository
}
```

- [ ] **Step 7: AppNavHost con `is`**

En `mobile/app/src/main/java/com/fittrainer/navigation/AppNavHost.kt`, reemplazar las dos ramas de rol:

```kotlin
        Session.Student -> RoleShell(tabs = StudentTabs, onSignOut = viewModel::signOut)
        Session.Trainer -> RoleShell(tabs = TrainerTabs, onSignOut = viewModel::signOut)
```

por:

```kotlin
        is Session.Student -> RoleShell(tabs = StudentTabs, onSignOut = viewModel::signOut)
        is Session.Trainer -> RoleShell(tabs = TrainerTabs, onSignOut = viewModel::signOut)
```

- [ ] **Step 8: Borrar la sesión de desarrollo y `datastore-preferences`**

```bash
git rm mobile/app/src/main/java/com/fittrainer/data/session/DataStoreSessionRepository.kt mobile/app/src/test/java/com/fittrainer/data/session/DataStoreSessionRepositoryTest.kt
```

- En `mobile/app/build.gradle.kts`, borrar la línea `implementation(libs.androidx.datastore.preferences)`.
- En `mobile/gradle/libs.versions.toml`, borrar la línea `androidx-datastore-preferences = …`.
- Verificar que no quedan usos con `grep -rn "datastore.preferences\|signInAs" mobile/app/src`. Expected: sin resultados.

Si no hay agentes de git, lo mismo se hace borrando los dos archivos a mano.

- [ ] **Step 9: Verificar**

Run: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL y todos los unitarios en verde, incluidos los 4 de `TokenSessionRepositoryTest`. Los 5 de `DataStoreSessionRepositoryTest` ya no existen.

- [ ] **Step 10: Commit** (lo resuelve el controlador)

```bash
git add -A mobile/
git commit -m "feat(mobile): sesión derivada del TokenStore; se elimina el login de desarrollo"
```

---

### Task 6: Verificación de punta a punta (la ejecuta el controlador, no un subagente)

Esta tarea no tiene código. Verifica el criterio de aceptación de la tarjeta en el emulador contra el backend real.

- [ ] **Step 1: Suite completa**

Desde `mobile/`, con el AVD `Medium_Phone_API_36.0` encendido, correr `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug testDebugUnitTest connectedDebugAndroidTest`.

Expected: todo en verde. `connectedDebugAndroidTest` desinstala la app; después correr `./gradlew installDebug`.

- [ ] **Step 2: Backend y datos de prueba**

En `backend/`, correr `npm run dev` en segundo plano (puerto 3001). Después, con curl:

```bash
API=http://localhost:3001/api
SUF=$(date +%s)
# 1) Entrenador
curl -s -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"name\":\"Profe E2E\",\"email\":\"profe.e2e.$SUF@test.com\",\"password\":\"Secreta123\"}"
# → guardar .token como TRAINER_TOKEN
# 2) Invitación
curl -s -X POST $API/invitations -H "Authorization: Bearer $TRAINER_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"student_name\":\"Alumna E2E\",\"student_email\":\"alumna.e2e.$SUF@test.com\",\"goal\":\"strength\",\"delivery_channel\":\"qr\"}"
# → guardar .data.token como INV_TOKEN
# 3) Alta del alumno
curl -s -X POST $API/students -H 'Content-Type: application/json' \
  -d "{\"token\":\"$INV_TOKEN\",\"password\":\"Secreta123\"}"
```

- [ ] **Step 3: Recorrido en el emulador**

Usar `scratchpad/e2e/ui.sh` (`shot NAME`, `tap "Texto"`). El texto se escribe con `adb shell input text`. Pasos:

1. Abrir la app → `10-login.png`. Se ve el login real, sin "MODO DESARROLLO".
2. Email malo ("ana@") → "Email con formato inválido" → `11-email-invalido.png`.
3. Credenciales del alumno con contraseña mala → "Email o contraseña incorrectos" → `12-credenciales.png`.
4. Credenciales correctas del alumno → pestañas Hoy · Progreso · Mis rutinas · Perfil → `13-alumno.png`.
5. `adb shell am force-stop com.fittrainer` y reabrir: sigue en las pestañas del alumno, sin pasar por el login → `14-alumno-reabierto.png`. **Este es el criterio de la tarjeta.**
6. Perfil → "Cerrar sesión" → login → `15-logout.png`. Verificar en el backend que el refresh token quedó revocado: hacer login por curl con la alumna, logout por curl con ese par, y `POST /auth/refresh` con ese refresh debe dar 401.
7. Login con el entrenador → Inicio · Alumnos · Mensajes · Más → `16-entrenador.png`.
8. Apagar el backend e intentar loguear → "Sin conexión con el servidor" (en unos 10 s) → `17-offline.png`.

- [ ] **Step 4: Cierre**

- Parar el backend (matar todo el árbol de nodemon con `taskkill //PID <pid> //T //F`) y el emulador.
- Actualizar en `AGENTS.md` (local, no se commitea) la regla de sesión: "el JWT va cifrado con DataStore + Tink (clave en el Android Keystore)" en lugar de EncryptedSharedPreferences.

---

## Relacionado

- [[tarjetas|Índice de tarjetas]]
- [[superpowers/specs/2026-10-13-auth-mobile-design|Spec]]
