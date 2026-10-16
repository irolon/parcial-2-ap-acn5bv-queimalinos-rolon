# Onboarding por QR en mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que un alumno invitado cree su cuenta desde el celular. Abre la invitación (escanea el QR, toca el link o lo pega), ve los datos precargados, elige contraseña y queda logueado como alumno de su entrenador.

**Architecture:** el MVVM de las tarjetas 3 y 5.
- `InvitationLink.parse` saca el token de cualquier texto. Es la única puerta de entrada.
- `InvitationRepository.get` trae los datos precargados.
- `AuthRepository.registerFromInvitation` crea la cuenta y guarda la sesión en el `TokenStore`. `AppNavHost` reacciona solo y muestra las pestañas de alumno.
- Sin sesión, la navegación pasa a tener un `NavHost` propio: `login` → `join` → `confirm/{token}`.
- El deep link entra por `MainActivity` → `PendingInvitation` → `RootViewModel`.

**Tech Stack:** Kotlin 2.2.10, Compose (Material 3, BOM 2025.08.00), Hilt 2.57.1, Navigation Compose 2.9.3, Retrofit 2.11.0 + kotlinx.serialization 1.9.0, OkHttp 4.12.0, CameraX 1.4.2, ML Kit Barcode Scanning 17.3.0 (modelo incluido en el APK), MockWebServer 4.12.0.

**Spec:** `docs/superpowers/specs/2026-10-15-onboarding-qr-design.md`

## Global Constraints

- **Gradle:** se corre desde `mobile/` con el JDK de Android Studio: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew …` (Git Bash). El JDK del sistema (24) no sirve.
- **Paquete:** `com.fittrainer`, `minSdk 26`, `compileSdk`/`targetSdk 36`, Java/JVM 17.
- **Fronteras de capas:** ningún ViewModel ni Screen importa Retrofit, OkHttp, Room, DataStore ni Tink. Los ViewModels solo conocen repositorios. La cámara y ML Kit viven solo en `ui/join/QrScanner.kt`.
- **Endpoints:** relativos a `…/api/`, sin barra inicial: `invitations/{token}` y `students`. Los dos son públicos y van por el cliente `@AuthClient`.
- **Formato de error del backend:** `{error: {code, message, details}}`. Códigos: `INVITATION_NOT_FOUND` (404), `INVITATION_EXPIRED` (410), `INVITATION_ALREADY_USED` (410), `STUDENT_EMAIL_EXISTS` (409).
- **`goal`** → etiqueta:
  - `tonify` → "Tonificar";
  - `weight_loss` → "Bajar de peso";
  - `hypertrophy` → "Ganar masa muscular";
  - `strength` → "Ganar fuerza";
  - cualquier otro valor se muestra tal cual.
- **Contraseña:** 8 caracteres o más, sin `trim` (el backend tampoco lo hace).
- **Textos de UI** (copiados del spec):
  - "Este código no es una invitación de FitTrainer"
  - "Esta invitación no existe. Pedile a tu entrenador que te mande una nueva."
  - "Esta invitación venció, pedile una nueva a tu profe"
  - "Esta invitación ya fue usada. Si ya creaste tu cuenta, iniciá sesión."
  - "Ya hay una cuenta con ese email. Iniciá sesión."
  - "Sin conexión con el servidor"
  - "No se pudo completar el alta"
  - "Mínimo 8 caracteres"
  - "Tengo una invitación"
  - "Entrar a FitTrainer"
  - "Necesitamos la cámara para escanear el código de tu entrenador"
  - "Ya hay una sesión iniciada en este celular. Cerrá sesión para usar la invitación."
- **Diseño:** tema oscuro de `ui/theme` (`FtColors`, `FtRadius`, `Spacing`, `MaterialTheme.typography`). Toque mínimo `Spacing.minTouchTarget` (44 dp). Etiquetas de datos en `labelSmall` (JetBrains Mono).
- **Git:** los agentes no commitean. El paso "Commit" de cada tarea lo resuelve Igna. Sin firmas de IA.
- **Rama:** `feature/android-onboarding-qr`, que sale de `feature/android-auth`.

## Review Focus

1. **`expires_at` llega de Supabase como `2026-10-17T12:00:00.123456+00:00`** (offset `+00:00` y microsegundos, no `Z`). Tiene que parsear. El test va en la Task 2.
2. **El analizador de la cámara reporta el mismo QR muchas veces por segundo.** Tiene que navegar una sola vez. El test va en la Task 4 (`JoinViewModel`).
3. **Llega un deep link con una sesión iniciada.** No navega, muestra el aviso y el token se descarta al cerrarlo. El test va en la Task 6 (`RootViewModel`).
4. **Un 410/404 con body que no es JSON** (un proxy, HTML) → `Http(code)`, sin crash. El test va en la Task 2.
5. **Contraseña de exactamente 8 caracteres, o con espacios al principio o al final.** Con 8 se envía; con 7 no. Se envía tal cual, sin `trim`. El test va en la Task 3.

---

## Mapa de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `data/invitation/InvitationLink.kt` (nuevo) | Extraer el token (UUID) de un texto | 1 |
| `data/api/ApiErrors.kt` (nuevo) | `HttpException.errorCode()`: lee `error.code` del body | 2 |
| `data/api/InvitationApi.kt` (nuevo) | `GET invitations/{token}` + DTOs | 2 |
| `data/api/AuthApi.kt` | Suma `POST students` + DTOs | 2 |
| `data/repository/DataError.kt` | 4 errores nuevos | 2 |
| `data/invitation/Invitation.kt` (nuevo) | Modelo de dominio + `toInvitationError()` | 2 |
| `data/invitation/InvitationRepository.kt` (nuevo) | `get(token)` | 2 |
| `data/auth/AuthRepository.kt` | `registerFromInvitation` | 2 |
| `di/NetworkModule.kt` | Provee `InvitationApi` (cliente `@AuthClient`) | 2 |
| `ui/join/InvitationMessages.kt` (nuevo) | Error → mensaje, y `goal` → etiqueta | 3 |
| `ui/join/ConfirmInvitationViewModel.kt` + `ConfirmInvitationUiState.kt` (nuevos) | Lógica de la confirmación | 3 |
| `ui/join/ConfirmInvitationScreen.kt` (nuevo) | UI de la p.11 | 5 |
| `ui/join/JoinViewModel.kt` (nuevo) | Pegar link y resultado del escáner | 4 |
| `ui/join/QrScanner.kt` (nuevo) | CameraX + ML Kit | 4 |
| `ui/join/JoinScreen.kt` (nuevo) | Permiso de cámara, visor y pegar link | 4 |
| `navigation/PendingInvitation.kt` (nuevo) | Token del deep link pendiente | 6 |
| `navigation/LoggedOutNavHost.kt` (nuevo) | `login` → `join` → `confirm/{token}` | 6 |
| `navigation/AppNavHost.kt`, `RootViewModel.kt` | Usar el NavHost sin sesión y el aviso con sesión | 6 |
| `MainActivity.kt`, `AndroidManifest.xml`, `app/build.gradle.kts` | Deep link y permiso de cámara | 4, 6 |
| `res/xml/network_security_config.xml`, `mobile/.env.example` (nuevo) | Pruebas con el celular por USB | 7 |

Las rutas de código son relativas a `mobile/app/src/main/java/com/fittrainer/`; las de tests, a `mobile/app/src/test/java/com/fittrainer/`.

---

### Task 1: `InvitationLink.parse`

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/invitation/InvitationLink.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/invitation/InvitationLinkTest.kt`

**Interfaces:**
- Produces: `object InvitationLink { fun parse(raw: String): String? }`. Devuelve el token en minúsculas, o `null`.

- [ ] **Step 1: Write the failing test**

```kotlin
package com.fittrainer.data.invitation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class InvitationLinkTest {

    private val token = "3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f"

    @Test fun `url del backend`() {
        assertEquals(token, InvitationLink.parse("http://localhost:5173/join?token=$token"))
    }

    @Test fun `https con otros parametros y espacios alrededor`() {
        assertEquals(token, InvitationLink.parse("  https://fittrainer.app/join?utm=wa&token=$token&x=1 \n"))
    }

    @Test fun `uuid solo`() {
        assertEquals(token, InvitationLink.parse(token))
    }

    @Test fun `uuid en mayusculas se normaliza`() {
        assertEquals(token, InvitationLink.parse(token.uppercase()))
    }

    @Test fun `url sin token`() {
        assertNull(InvitationLink.parse("http://localhost:5173/join"))
    }

    @Test fun `token que no es uuid`() {
        assertNull(InvitationLink.parse("http://localhost:5173/join?token=abc123"))
    }

    @Test fun `texto vacio`() {
        assertNull(InvitationLink.parse("   "))
    }

    @Test fun `link de otra app`() {
        assertNull(InvitationLink.parse("https://wa.me/5491112345678?text=hola"))
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.invitation.InvitationLinkTest"`
Expected: FAIL, con "Unresolved reference: InvitationLink".

- [ ] **Step 3: Write minimal implementation**

```kotlin
package com.fittrainer.data.invitation

/**
 * Saca el token de una invitación de lo que llegue: el QR, el link pegado a mano o el deep link.
 * Acepta cualquier URL con el parámetro `token` o el UUID solo. El backend genera el token con
 * crypto.randomUUID(): cualquier otra cosa no es una invitación y no vale la pena llamar a la API.
 */
object InvitationLink {
    private val UUID_REGEX =
        Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", RegexOption.IGNORE_CASE)
    private val TOKEN_PARAM = Regex("[?&]token=([^&#]+)")

    fun parse(raw: String): String? {
        val text = raw.trim()
        val candidate = if (UUID_REGEX.matches(text)) text else TOKEN_PARAM.find(text)?.groupValues?.get(1)
        return candidate?.takeIf { UUID_REGEX.matches(it) }?.lowercase()
    }
}
```

Se usa una regex y no `android.net.Uri` para que los tests corran en la JVM, sin Robolectric.

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.invitation.InvitationLinkTest"`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src/main/java/com/fittrainer/data/invitation/InvitationLink.kt mobile/app/src/test/java/com/fittrainer/data/invitation/InvitationLinkTest.kt
git commit -m "feat(mobile): extractor del token de invitación"
```

---

### Task 2: Capa de datos de la invitación y el alta

**Files:**
- Create: `data/api/ApiErrors.kt`, `data/api/InvitationApi.kt`, `data/invitation/Invitation.kt`, `data/invitation/InvitationRepository.kt`
- Modify: `data/api/AuthApi.kt`, `data/repository/DataError.kt`, `data/auth/AuthRepository.kt`, `di/NetworkModule.kt`
- Modify (tests): `data/FakeAuth.kt` (`FakeAuthApi` implementa el método nuevo; helper `httpError` con body)
- Create (tests): `data/FakeInvitation.kt`, `data/invitation/InvitationRepositoryTest.kt`, `data/invitation/InvitationNetworkIntegrationTest.kt`
- Modify (tests): `data/auth/AuthRepositoryTest.kt`

**Interfaces:**
- Consumes: `TokenStore`, `AuthState`, `AuthUser`, `Role`, `DataException` (existentes).
- Produces:
  - `DataError.InvitationNotFound`, `DataError.InvitationExpired`, `DataError.InvitationUsed` y `DataError.StudentEmailExists` (todos `data object`).
  - `data class Invitation(val trainerName: String, val studentName: String, val studentEmail: String, val goal: String, val expiresAt: java.time.Instant)`.
  - `class InvitationRepository @Inject constructor(api: InvitationApi) { suspend fun get(token: String): Result<Invitation> }`.
  - `suspend fun AuthRepository.registerFromInvitation(token: String, password: String): Result<AuthUser>`.
  - `interface InvitationApi { suspend fun get(token: String): InvitationDto }`.
  - `AuthApi.registerStudent(body: RegisterStudentRequest): RegisterStudentResponse`.

- [ ] **Step 1: Errores nuevos y helper para leer el código de error**

`data/repository/DataError.kt`. Se agregan las 4 variantes; el resto del archivo queda igual:

```kotlin
sealed interface DataError {
    data object Offline : DataError
    data object InvalidCredentials : DataError
    data class Http(val code: Int) : DataError
    data object Unknown : DataError
    data object InvitationNotFound : DataError
    data object InvitationExpired : DataError
    data object InvitationUsed : DataError
    data object StudentEmailExists : DataError
}
```

Hoy ningún `when` sobre `DataError` es exhaustivo (todos tienen `else`), así que no se rompe nada.

`data/api/ApiErrors.kt`:

```kotlin
package com.fittrainer.data.api

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException

@Serializable
private data class ErrorEnvelope(val error: ErrorBody? = null)

@Serializable
private data class ErrorBody(val code: String? = null)

private val errorJson = Json { ignoreUnknownKeys = true }

/** `error.code` del body de un error del backend, o null si el body no se puede leer. Consume el body. */
fun HttpException.errorCode(): String? = try {
    response()?.errorBody()?.string()?.let { errorJson.decodeFromString<ErrorEnvelope>(it).error?.code }
} catch (e: Exception) {
    null
}
```

- [ ] **Step 2: DTOs y APIs**

`data/api/InvitationApi.kt`:

```kotlin
package com.fittrainer.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.Path

@Serializable
data class InvitationTrainerDto(val id: String, val name: String)

@Serializable
data class InvitationDto(
    val trainer: InvitationTrainerDto,
    @SerialName("student_name") val studentName: String,
    @SerialName("student_email") val studentEmail: String,
    val goal: String,
    @SerialName("expires_at") val expiresAt: String,
)

/** Invitaciones (público). Se sirve con el cliente HTTP "auth": no hay sesión todavía. */
interface InvitationApi {
    @GET("invitations/{token}")
    suspend fun get(@Path("token") token: String): InvitationDto
}
```

En `data/api/AuthApi.kt` se agregan los DTOs y el método. Lo existente no cambia:

```kotlin
@Serializable
data class RegisterStudentRequest(val token: String, val password: String)

@Serializable
data class StudentDto(val id: String, val name: String, val email: String)

@Serializable
data class RegisterStudentResponse(
    val student: StudentDto,
    val token: String,
    @SerialName("refresh_token") val refreshToken: String,
)
```

Dentro de `interface AuthApi`:

```kotlin
    /** Alta del alumno con el token de su invitación. Devuelve la sesión, igual que el login. */
    @POST("students")
    suspend fun registerStudent(@Body body: RegisterStudentRequest): RegisterStudentResponse
```

En `di/NetworkModule.kt`, junto a `provideAuthApi` (con el import de `com.fittrainer.data.api.InvitationApi`):

```kotlin
    // Pública: va por el cliente sin Bearer, como AuthApi.
    @Provides
    @Singleton
    fun provideInvitationApi(@AuthClient client: OkHttpClient, json: Json): InvitationApi =
        retrofit(client, json).create(InvitationApi::class.java)
```

- [ ] **Step 3: Fakes de test**

En `data/FakeAuth.kt`:
- reemplazar `httpError` por una versión con body opcional, compatible con los usos actuales;
- sumar al `FakeAuthApi` el alta.

```kotlin
fun httpError(code: Int, body: String = "{}") = HttpException(Response.error<Any>(code, body.toResponseBody(null)))

/** Body de error del backend con [code]. */
fun apiError(status: Int, code: String) = httpError(status, """{"error":{"code":"$code","message":"x"}}""")
```

Dentro de `class FakeAuthApi`:

```kotlin
    var registerResponse = RegisterStudentResponse(StudentDto("s1", "Tomás Rivera", "tomas@test.com"), "access-s", "refresh-s")
    var registerError: Throwable? = null
    val registerCalls = mutableListOf<RegisterStudentRequest>()

    override suspend fun registerStudent(body: RegisterStudentRequest): RegisterStudentResponse {
        registerCalls += body
        registerError?.let { throw it }
        return registerResponse
    }
```

Con los imports `com.fittrainer.data.api.RegisterStudentRequest`, `RegisterStudentResponse` y `StudentDto`.

Crear `data/FakeInvitation.kt`:

```kotlin
package com.fittrainer.data

import com.fittrainer.data.api.InvitationApi
import com.fittrainer.data.api.InvitationDto
import com.fittrainer.data.api.InvitationTrainerDto

const val TOKEN = "3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f"

fun invitationDto(expiresAt: String = "2026-10-17T12:00:00.123456+00:00") = InvitationDto(
    trainer = InvitationTrainerDto("t1", "Laura"),
    studentName = "Tomás Rivera",
    studentEmail = "tomas@test.com",
    goal = "hypertrophy",
    expiresAt = expiresAt,
)

class FakeInvitationApi : InvitationApi {
    var response = invitationDto()
    var error: Throwable? = null
    val calls = mutableListOf<String>()

    override suspend fun get(token: String): InvitationDto {
        calls += token
        error?.let { throw it }
        return response
    }
}
```

- [ ] **Step 4: Write the failing tests**

`data/invitation/InvitationRepositoryTest.kt`:

```kotlin
package com.fittrainer.data.invitation

import com.fittrainer.data.FakeInvitationApi
import com.fittrainer.data.TOKEN
import com.fittrainer.data.apiError
import com.fittrainer.data.httpError
import com.fittrainer.data.invitationDto
import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import java.io.IOException
import java.time.Instant
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class InvitationRepositoryTest {

    private val api = FakeInvitationApi()
    private val repo = InvitationRepository(api)

    private fun Result<*>.dataError() = (exceptionOrNull() as DataException).error

    // Review Focus 1: formato real de Supabase (offset +00:00 y microsegundos).
    @Test fun `200 mapea la invitacion con la fecha de Supabase`() = runTest {
        val result = repo.get(TOKEN)
        assertEquals(
            Invitation("Laura", "Tomás Rivera", "tomas@test.com", "hypertrophy", Instant.parse("2026-10-17T12:00:00.123456Z")),
            result.getOrNull(),
        )
        assertEquals(listOf(TOKEN), api.calls)
    }

    @Test fun `fecha con Z tambien parsea`() = runTest {
        api.response = invitationDto(expiresAt = "2026-10-17T12:00:00Z")
        assertEquals(Instant.parse("2026-10-17T12:00:00Z"), repo.get(TOKEN).getOrNull()?.expiresAt)
    }

    @Test fun `404 es InvitationNotFound`() = runTest {
        api.error = apiError(404, "INVITATION_NOT_FOUND")
        assertEquals(DataError.InvitationNotFound, repo.get(TOKEN).dataError())
    }

    @Test fun `410 vencida es InvitationExpired`() = runTest {
        api.error = apiError(410, "INVITATION_EXPIRED")
        assertEquals(DataError.InvitationExpired, repo.get(TOKEN).dataError())
    }

    @Test fun `410 usada es InvitationUsed`() = runTest {
        api.error = apiError(410, "INVITATION_ALREADY_USED")
        assertEquals(DataError.InvitationUsed, repo.get(TOKEN).dataError())
    }

    // Review Focus 4: body que no es JSON.
    @Test fun `410 con body ilegible es Http 410`() = runTest {
        api.error = httpError(410, "<html>Gone</html>")
        assertEquals(DataError.Http(410), repo.get(TOKEN).dataError())
    }

    @Test fun `sin red es Offline`() = runTest {
        api.error = IOException("sin red")
        assertEquals(DataError.Offline, repo.get(TOKEN).dataError())
    }

    @Test fun `fecha invalida es Unknown`() = runTest {
        api.response = invitationDto(expiresAt = "mañana")
        assertEquals(DataError.Unknown, repo.get(TOKEN).dataError())
    }
}
```

Agregar a `data/auth/AuthRepositoryTest.kt` (con los imports `com.fittrainer.data.TOKEN`, `com.fittrainer.data.apiError` y `com.fittrainer.data.api.RegisterStudentRequest`):

```kotlin
    @Test fun `alta ok guarda sesion de alumno con los dos tokens`() = runTest {
        val result = repo.registerFromInvitation(TOKEN, "Secreta123")

        val expected = AuthUser("s1", "Tomás Rivera", "tomas@test.com", Role.STUDENT)
        assertEquals(expected, result.getOrNull())
        val saved = store.current()!!
        assertEquals("access-s", saved.accessToken)
        assertEquals("refresh-s", saved.refreshToken)
        assertEquals(expected, saved.user)
        assertEquals(listOf(RegisterStudentRequest(TOKEN, "Secreta123")), api.registerCalls)
    }

    @Test fun `alta con email existente es StudentEmailExists y no guarda`() = runTest {
        api.registerError = apiError(409, "STUDENT_EMAIL_EXISTS")
        assertEquals(DataError.StudentEmailExists, repo.registerFromInvitation(TOKEN, "Secreta123").dataError())
        assertNull(store.current())
    }

    @Test fun `alta con invitacion usada es InvitationUsed`() = runTest {
        api.registerError = apiError(410, "INVITATION_ALREADY_USED")
        assertEquals(DataError.InvitationUsed, repo.registerFromInvitation(TOKEN, "Secreta123").dataError())
    }

    @Test fun `alta sin red es Offline`() = runTest {
        api.registerError = IOException("sin red")
        assertEquals(DataError.Offline, repo.registerFromInvitation(TOKEN, "Secreta123").dataError())
    }

    @Test fun `alta ok pero falla el guardado es Unknown`() = runTest {
        store.saveError = IOException("disco lleno")
        assertEquals(DataError.Unknown, repo.registerFromInvitation(TOKEN, "Secreta123").dataError())
    }
```

`data/invitation/InvitationNetworkIntegrationTest.kt`:

```kotlin
package com.fittrainer.data.invitation

import com.fittrainer.data.FakeTokenStore
import com.fittrainer.data.TOKEN
import com.fittrainer.data.api.AuthApi
import com.fittrainer.data.api.InvitationApi
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.fixedClock
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** Endpoints públicos por la cadena real de Retrofit, como en NetworkModule (cliente sin Bearer). */
class InvitationNetworkIntegrationTest {

    private val server = MockWebServer()
    private lateinit var retrofit: Retrofit

    @Before fun setUp() {
        server.start()
        retrofit = Retrofit.Builder()
            .baseUrl(server.url("/api/"))
            .client(OkHttpClient())
            .addConverterFactory(Json { ignoreUnknownKeys = true }.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    @After fun tearDown() = server.shutdown()

    @Test fun `GET invitations parsea la respuesta real del backend`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """{"trainer":{"id":"t1","name":"Laura","specialty":null,"avatar_url":null},
                   "student_name":"Tomás Rivera","student_email":"tomas@test.com","goal":"hypertrophy",
                   "expires_at":"2026-10-17T12:00:00.123456+00:00"}""",
            ),
        )
        val result = InvitationRepository(retrofit.create(InvitationApi::class.java)).get(TOKEN)

        assertEquals("Laura", result.getOrThrow().trainerName)
        val request = server.takeRequest()
        assertEquals("/api/invitations/$TOKEN", request.path)
        assertNull(request.getHeader("Authorization"))
    }

    @Test fun `POST students manda token y password y guarda la sesion`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(201).setBody(
                """{"student":{"id":"s1","trainer_id":"t1","name":"Tomás Rivera","email":"tomas@test.com","goal":"hypertrophy"},
                   "token":"access-s","refresh_token":"refresh-s"}""",
            ),
        )
        val store = FakeTokenStore()
        val repo = AuthRepository(retrofit.create(AuthApi::class.java), store, fixedClock())

        assertTrue(repo.registerFromInvitation(TOKEN, "Secreta123").isSuccess)

        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/students", request.path)
        assertEquals("""{"token":"$TOKEN","password":"Secreta123"}""", request.body.readUtf8())
        assertNull(request.getHeader("Authorization"))
        assertEquals("access-s", store.current()?.accessToken)
    }
}
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.data.invitation.*" --tests "com.fittrainer.data.auth.AuthRepositoryTest"`
Expected: FAIL de compilación (`InvitationRepository`, `Invitation` y `registerFromInvitation` no existen).

- [ ] **Step 6: Implementación**

`data/invitation/Invitation.kt`:

```kotlin
package com.fittrainer.data.invitation

import com.fittrainer.data.api.errorCode
import com.fittrainer.data.repository.DataError
import java.io.IOException
import java.time.Instant
import retrofit2.HttpException

/** Datos que el entrenador cargó en la invitación. Se muestran sin editar. */
data class Invitation(
    val trainerName: String,
    val studentName: String,
    val studentEmail: String,
    val goal: String,
    val expiresAt: Instant,
)

/** Errores de los endpoints de invitación y alta: se distinguen por `error.code`, no solo por el status. */
internal fun Exception.toInvitationError(): DataError = when (this) {
    is IOException -> DataError.Offline
    is HttpException -> when (errorCode()) {
        "INVITATION_NOT_FOUND" -> DataError.InvitationNotFound
        "INVITATION_EXPIRED" -> DataError.InvitationExpired
        "INVITATION_ALREADY_USED" -> DataError.InvitationUsed
        "STUDENT_EMAIL_EXISTS" -> DataError.StudentEmailExists
        else -> DataError.Http(code())
    }
    else -> DataError.Unknown
}
```

`data/invitation/InvitationRepository.kt`:

```kotlin
package com.fittrainer.data.invitation

import com.fittrainer.data.api.InvitationApi
import com.fittrainer.data.repository.DataException
import java.time.OffsetDateTime
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException

/**
 * Lee una invitación por su token. Es online a propósito (como el login): no se guarda en Room
 * porque solo sirve para el alta, que también necesita red.
 */
class InvitationRepository @Inject constructor(
    private val api: InvitationApi,
) {
    suspend fun get(token: String): Result<Invitation> = try {
        val dto = api.get(token)
        Result.success(
            Invitation(
                trainerName = dto.trainer.name,
                studentName = dto.studentName,
                studentEmail = dto.studentEmail,
                goal = dto.goal,
                // Supabase manda "+00:00" y microsegundos: OffsetDateTime acepta eso y también "Z".
                expiresAt = OffsetDateTime.parse(dto.expiresAt).toInstant(),
            ),
        )
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(e.toInvitationError(), e))
    }
}
```

En `data/auth/AuthRepository.kt` se extrae el guardado del login a `saveSession` y se agrega el alta. `login` queda así:

```kotlin
    suspend fun login(email: String, password: String): Result<AuthUser> {
        val (response, user) = try {
            val response = api.login(LoginRequest(email, password))
            response to response.user.toAuthUser()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            return Result.failure(DataException(e.toLoginError(), e))
        }
        return saveSession(response.token, response.refreshToken, user)
    }

    /** Alta del alumno con el token de su invitación: si sale bien, queda logueado como en el login. */
    suspend fun registerFromInvitation(token: String, password: String): Result<AuthUser> {
        val response = try {
            api.registerStudent(RegisterStudentRequest(token, password))
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            return Result.failure(DataException(e.toInvitationError(), e))
        }
        val student = response.student
        return saveSession(response.token, response.refreshToken, AuthUser(student.id, student.name, student.email, Role.STUDENT))
    }

    // El servidor ya respondió: una falla al guardar es del almacenamiento, no de la red.
    private suspend fun saveSession(accessToken: String, refreshToken: String, user: AuthUser): Result<AuthUser> = try {
        tokenStore.save(AuthState(accessToken, refreshToken, user, UUID.randomUUID().toString(), clock.millis()))
        Result.success(user)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(DataException(DataError.Unknown, e))
    }
```

Imports nuevos en `AuthRepository.kt`: `com.fittrainer.data.api.RegisterStudentRequest` y `com.fittrainer.data.invitation.toInvitationError`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest`
Expected: PASS. Incluye los tests anteriores: `login` sigue igual después de extraer `saveSession`.

- [ ] **Step 8: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src
git commit -m "feat(mobile): repositorio de invitaciones y alta del alumno"
```

---

### Task 3: `ConfirmInvitationViewModel`

**Files:**
- Create: `ui/join/InvitationMessages.kt`, `ui/join/ConfirmInvitationUiState.kt`, `ui/join/ConfirmInvitationViewModel.kt`
- Test: `ui/join/ConfirmInvitationViewModelTest.kt`, `ui/join/InvitationMessagesTest.kt`

**Interfaces:**
- Consumes: `InvitationRepository.get`, `AuthRepository.registerFromInvitation`, `Invitation`, los `DataError` de la Task 2.
- Produces:
  - `const val TOKEN_ARG = "token"` (nombre del argumento de navegación).
  - `data class InvitationMessage(val text: String, val canRetry: Boolean, val offerLogin: Boolean)`.
  - `fun invitationMessage(error: Throwable?): InvitationMessage`.
  - `fun goalLabel(goal: String): String`.
  - `sealed interface ConfirmInvitationUiState { Loading; Error(message: InvitationMessage); Ready(invitation, password, isSubmitting, submitError: InvitationMessage?) }`, con `Ready.canSubmit`.
  - `class ConfirmInvitationViewModel(savedStateHandle, invitations, auth)`, con `uiState`, `onPasswordChange(String)`, `submit()` y `retry()`.

- [ ] **Step 1: Write the failing tests**

`ui/join/InvitationMessagesTest.kt`:

```kotlin
package com.fittrainer.ui.join

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException
import org.junit.Assert.assertEquals
import org.junit.Test

class InvitationMessagesTest {

    private fun msg(error: DataError) = invitationMessage(DataException(error))

    @Test fun `cada error tiene su mensaje y sus acciones`() {
        assertEquals(
            InvitationMessage("Esta invitación no existe. Pedile a tu entrenador que te mande una nueva.", canRetry = false, offerLogin = false),
            msg(DataError.InvitationNotFound),
        )
        assertEquals(
            InvitationMessage("Esta invitación venció, pedile una nueva a tu profe", canRetry = false, offerLogin = false),
            msg(DataError.InvitationExpired),
        )
        assertEquals(
            InvitationMessage("Esta invitación ya fue usada. Si ya creaste tu cuenta, iniciá sesión.", canRetry = false, offerLogin = true),
            msg(DataError.InvitationUsed),
        )
        assertEquals(
            InvitationMessage("Ya hay una cuenta con ese email. Iniciá sesión.", canRetry = false, offerLogin = true),
            msg(DataError.StudentEmailExists),
        )
        assertEquals(InvitationMessage("Sin conexión con el servidor", canRetry = true, offerLogin = false), msg(DataError.Offline))
        assertEquals(InvitationMessage("No se pudo completar el alta", canRetry = true, offerLogin = false), msg(DataError.Http(500)))
        assertEquals(InvitationMessage("No se pudo completar el alta", canRetry = true, offerLogin = false), invitationMessage(null))
    }

    @Test fun `etiquetas de objetivo`() {
        assertEquals("Tonificar", goalLabel("tonify"))
        assertEquals("Bajar de peso", goalLabel("weight_loss"))
        assertEquals("Ganar masa muscular", goalLabel("hypertrophy"))
        assertEquals("Ganar fuerza", goalLabel("strength"))
        assertEquals("yoga", goalLabel("yoga"))
    }
}
```

`ui/join/ConfirmInvitationViewModelTest.kt`:

```kotlin
package com.fittrainer.ui.join

import androidx.lifecycle.SavedStateHandle
import com.fittrainer.MainDispatcherRule
import com.fittrainer.data.FakeAuthApi
import com.fittrainer.data.FakeInvitationApi
import com.fittrainer.data.FakeTokenStore
import com.fittrainer.data.TOKEN
import com.fittrainer.data.apiError
import com.fittrainer.data.api.RegisterStudentRequest
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.fixedClock
import com.fittrainer.data.invitation.InvitationRepository
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ConfirmInvitationViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val invitationApi = FakeInvitationApi()
    private val authApi = FakeAuthApi()
    private val store = FakeTokenStore()

    private fun vm() = ConfirmInvitationViewModel(
        SavedStateHandle(mapOf(TOKEN_ARG to TOKEN)),
        InvitationRepository(invitationApi),
        AuthRepository(authApi, store, fixedClock()),
    )

    private fun ConfirmInvitationViewModel.ready() = uiState.value as ConfirmInvitationUiState.Ready

    @Test fun `carga la invitacion del token`() = runTest {
        val vm = vm()
        assertEquals("Laura", vm.ready().invitation.trainerName)
        assertEquals(listOf(TOKEN), invitationApi.calls)
    }

    @Test fun `invitacion vencida muestra el error sin reintento`() = runTest {
        invitationApi.error = apiError(410, "INVITATION_EXPIRED")
        val state = vm().uiState.value as ConfirmInvitationUiState.Error
        assertEquals("Esta invitación venció, pedile una nueva a tu profe", state.message.text)
        assertFalse(state.message.canRetry)
    }

    @Test fun `sin red y reintentar vuelve a cargar`() = runTest {
        invitationApi.error = IOException("sin red")
        val vm = vm()
        assertTrue((vm.uiState.value as ConfirmInvitationUiState.Error).message.canRetry)
        invitationApi.error = null
        vm.retry()
        assertEquals("Laura", vm.ready().invitation.trainerName)
    }

    // Review Focus 5: el límite es 8 y la contraseña va tal cual.
    @Test fun `con 7 caracteres no envia`() = runTest {
        val vm = vm()
        vm.onPasswordChange("1234567")
        assertFalse(vm.ready().canSubmit)
        vm.submit()
        assertTrue(authApi.registerCalls.isEmpty())
    }

    @Test fun `con 8 caracteres envia la contraseña sin trim`() = runTest {
        val vm = vm()
        vm.onPasswordChange(" 1234567")
        vm.submit()
        assertEquals(listOf(RegisterStudentRequest(TOKEN, " 1234567")), authApi.registerCalls)
        assertNotNull(store.current())
    }

    @Test fun `doble envio hace una sola llamada`() = runTest {
        val gate = CompletableDeferred<Unit>()
        val vm = ConfirmInvitationViewModel(
            SavedStateHandle(mapOf(TOKEN_ARG to TOKEN)),
            InvitationRepository(invitationApi),
            AuthRepository(GatedAuthApi(authApi, gate), store, fixedClock()),
        )
        vm.onPasswordChange("Secreta123")
        vm.submit()
        vm.submit()
        assertTrue(vm.ready().isSubmitting)
        gate.complete(Unit)
        assertEquals(1, authApi.registerCalls.size)
    }

    @Test fun `error al enviar conserva la contraseña y ofrece login`() = runTest {
        authApi.registerError = apiError(409, "STUDENT_EMAIL_EXISTS")
        val vm = vm()
        vm.onPasswordChange("Secreta123")
        vm.submit()
        val state = vm.ready()
        assertEquals("Secreta123", state.password)
        assertFalse(state.isSubmitting)
        assertEquals("Ya hay una cuenta con ese email. Iniciá sesión.", state.submitError?.text)
        assertTrue(state.submitError!!.offerLogin)
    }

    @Test fun `editar la contraseña borra el error de envio`() = runTest {
        authApi.registerError = IOException("sin red")
        val vm = vm()
        vm.onPasswordChange("Secreta123")
        vm.submit()
        vm.onPasswordChange("Secreta1234")
        assertEquals(null, vm.ready().submitError)
    }
}

/** Demora el alta hasta que se complete [gate]; el resto delega en [delegate]. */
private class GatedAuthApi(
    private val delegate: FakeAuthApi,
    private val gate: CompletableDeferred<Unit>,
) : com.fittrainer.data.api.AuthApi by delegate {
    override suspend fun registerStudent(body: RegisterStudentRequest) = gate.await().let { delegate.registerStudent(body) }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.join.*"`
Expected: FAIL de compilación (`ConfirmInvitationViewModel`, `invitationMessage` y `goalLabel` no existen).

- [ ] **Step 3: Implementación**

`ui/join/InvitationMessages.kt`:

```kotlin
package com.fittrainer.ui.join

import com.fittrainer.data.repository.DataError
import com.fittrainer.data.repository.DataException

/** Qué se le dice al alumno y qué puede hacer: reintentar (falla pasajera) o ir al login. */
data class InvitationMessage(val text: String, val canRetry: Boolean, val offerLogin: Boolean)

fun invitationMessage(error: Throwable?): InvitationMessage = when ((error as? DataException)?.error) {
    DataError.InvitationNotFound ->
        InvitationMessage("Esta invitación no existe. Pedile a tu entrenador que te mande una nueva.", false, false)
    DataError.InvitationExpired ->
        InvitationMessage("Esta invitación venció, pedile una nueva a tu profe", false, false)
    DataError.InvitationUsed ->
        InvitationMessage("Esta invitación ya fue usada. Si ya creaste tu cuenta, iniciá sesión.", false, true)
    DataError.StudentEmailExists ->
        InvitationMessage("Ya hay una cuenta con ese email. Iniciá sesión.", false, true)
    DataError.Offline -> InvitationMessage("Sin conexión con el servidor", true, false)
    else -> InvitationMessage("No se pudo completar el alta", true, false)
}

/** Etiquetas de los objetivos del backend (models/invitations GOALS). */
fun goalLabel(goal: String): String = when (goal) {
    "tonify" -> "Tonificar"
    "weight_loss" -> "Bajar de peso"
    "hypertrophy" -> "Ganar masa muscular"
    "strength" -> "Ganar fuerza"
    else -> goal
}
```

`ui/join/ConfirmInvitationUiState.kt`:

```kotlin
package com.fittrainer.ui.join

import com.fittrainer.data.invitation.Invitation

const val MIN_PASSWORD_LENGTH = 8

sealed interface ConfirmInvitationUiState {
    data object Loading : ConfirmInvitationUiState

    /** No se pudo cargar la invitación: reemplaza toda la pantalla. */
    data class Error(val message: InvitationMessage) : ConfirmInvitationUiState

    data class Ready(
        val invitation: Invitation,
        val password: String = "",
        val isSubmitting: Boolean = false,
        /** Error del alta: va debajo del botón y no borra la contraseña. */
        val submitError: InvitationMessage? = null,
    ) : ConfirmInvitationUiState {
        val canSubmit: Boolean get() = password.length >= MIN_PASSWORD_LENGTH && !isSubmitting
    }
}
```

`ui/join/ConfirmInvitationViewModel.kt`:

```kotlin
package com.fittrainer.ui.join

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.auth.AuthRepository
import com.fittrainer.data.invitation.InvitationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Nombre del argumento de la ruta confirm/{token}. */
const val TOKEN_ARG = "token"

/** Al darse de alta no navega: AppNavHost ve la sesión nueva y muestra las pestañas de alumno. */
@HiltViewModel
class ConfirmInvitationViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val invitations: InvitationRepository,
    private val auth: AuthRepository,
) : ViewModel() {

    private val token: String = checkNotNull(savedStateHandle[TOKEN_ARG])

    private val _uiState = MutableStateFlow<ConfirmInvitationUiState>(ConfirmInvitationUiState.Loading)
    val uiState: StateFlow<ConfirmInvitationUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun retry() {
        if (_uiState.value is ConfirmInvitationUiState.Error) load()
    }

    fun onPasswordChange(value: String) {
        _uiState.update { (it as? ConfirmInvitationUiState.Ready)?.copy(password = value, submitError = null) ?: it }
    }

    fun submit() {
        val state = _uiState.value as? ConfirmInvitationUiState.Ready ?: return
        if (!state.canSubmit) return
        _uiState.value = state.copy(isSubmitting = true, submitError = null)
        viewModelScope.launch {
            val result = auth.registerFromInvitation(token, state.password)
            if (result.isFailure) {
                val message = invitationMessage(result.exceptionOrNull())
                _uiState.update {
                    (it as? ConfirmInvitationUiState.Ready)?.copy(isSubmitting = false, submitError = message) ?: it
                }
            }
        }
    }

    private fun load() {
        _uiState.value = ConfirmInvitationUiState.Loading
        viewModelScope.launch {
            _uiState.value = invitations.get(token).fold(
                onSuccess = { ConfirmInvitationUiState.Ready(it) },
                onFailure = { ConfirmInvitationUiState.Error(invitationMessage(it)) },
            )
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.join.*"`
Expected: PASS.

- [ ] **Step 5: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src
git commit -m "feat(mobile): lógica de confirmación de la invitación"
```

---

### Task 4: Escáner, permiso de cámara y pegar link

**Files:**
- Modify: `mobile/gradle/libs.versions.toml`, `mobile/app/build.gradle.kts`, `mobile/app/src/main/AndroidManifest.xml`
- Create: `ui/join/JoinUiState.kt`, `ui/join/JoinViewModel.kt`, `ui/join/QrScanner.kt`, `ui/join/JoinScreen.kt`
- Test: `ui/join/JoinViewModelTest.kt`

**Interfaces:**
- Consumes: `InvitationLink.parse` (Task 1).
- Produces:
  - `class JoinViewModel`, con `uiState: StateFlow<JoinUiState>`, `onLinkChange(String)`, `submitLink()`, `onQrScanned(String)` y `onNavigated()`.
  - `data class JoinUiState(link, linkError, scanError, token: String?)`.
  - `@Composable fun JoinScreen(onBack: () -> Unit, onToken: (String) -> Unit, viewModel: JoinViewModel = hiltViewModel())`.

- [ ] **Step 1: Write the failing test**

`ui/join/JoinViewModelTest.kt`:

```kotlin
package com.fittrainer.ui.join

import com.fittrainer.data.TOKEN
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class JoinViewModelTest {

    private val vm = JoinViewModel()
    private val link = "http://localhost:5173/join?token=$TOKEN"

    @Test fun `pegar un link valido deja el token para navegar`() {
        vm.onLinkChange(link)
        vm.submitLink()
        assertEquals(TOKEN, vm.uiState.value.token)
        assertNull(vm.uiState.value.linkError)
    }

    @Test fun `pegar un link invalido muestra el error y no navega`() {
        vm.onLinkChange("hola")
        vm.submitLink()
        assertEquals("Este código no es una invitación de FitTrainer", vm.uiState.value.linkError)
        assertNull(vm.uiState.value.token)
    }

    @Test fun `editar el link borra el error`() {
        vm.onLinkChange("hola")
        vm.submitLink()
        vm.onLinkChange("hola2")
        assertNull(vm.uiState.value.linkError)
    }

    @Test fun `qr invalido muestra el aviso y sigue escaneando`() {
        vm.onQrScanned("https://otra-app.com")
        assertEquals("Este código no es una invitación de FitTrainer", vm.uiState.value.scanError)
        assertNull(vm.uiState.value.token)
        vm.onQrScanned(link)
        assertEquals(TOKEN, vm.uiState.value.token)
        assertNull(vm.uiState.value.scanError)
    }

    // Review Focus 2: el analizador repite el mismo QR muchas veces por segundo.
    @Test fun `lecturas repetidas no reemplazan el token pendiente`() {
        val other = "11111111-2222-4333-8444-555555555555"
        vm.onQrScanned(link)
        vm.onQrScanned(link)
        vm.onQrScanned(other)
        assertEquals(TOKEN, vm.uiState.value.token)
    }

    @Test fun `despues de navegar se puede volver a escanear`() {
        vm.onQrScanned(link)
        vm.onNavigated()
        assertNull(vm.uiState.value.token)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.join.JoinViewModelTest"`
Expected: FAIL de compilación (`JoinViewModel` no existe).

- [ ] **Step 3: ViewModel**

`ui/join/JoinUiState.kt`:

```kotlin
package com.fittrainer.ui.join

data class JoinUiState(
    val link: String = "",
    val linkError: String? = null,
    /** Último QR leído que no era una invitación; el escáner sigue andando. */
    val scanError: String? = null,
    /** Token listo para ir a confirmar. La pantalla navega y llama a onNavigated(). */
    val token: String? = null,
)
```

`ui/join/JoinViewModel.kt`:

```kotlin
package com.fittrainer.ui.join

import androidx.lifecycle.ViewModel
import com.fittrainer.data.invitation.InvitationLink
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

const val NOT_AN_INVITATION = "Este código no es una invitación de FitTrainer"

@HiltViewModel
class JoinViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(JoinUiState())
    val uiState: StateFlow<JoinUiState> = _uiState.asStateFlow()

    fun onLinkChange(value: String) {
        _uiState.update { it.copy(link = value, linkError = null) }
    }

    fun submitLink() {
        val token = InvitationLink.parse(_uiState.value.link)
        _uiState.update { if (token == null) it.copy(linkError = NOT_AN_INVITATION) else it.copy(token = token) }
    }

    /** Lo llama el analizador de la cámara con cada QR que lee (puede ser varias veces por segundo). */
    fun onQrScanned(raw: String) {
        _uiState.update { state ->
            if (state.token != null) return@update state // ya hay una navegación en curso
            val token = InvitationLink.parse(raw)
            if (token == null) state.copy(scanError = NOT_AN_INVITATION) else state.copy(token = token, scanError = null)
        }
    }

    fun onNavigated() {
        _uiState.update { it.copy(token = null) }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.ui.join.JoinViewModelTest"`
Expected: PASS.

- [ ] **Step 5: Dependencias y permiso**

En `mobile/gradle/libs.versions.toml`, dentro de `[versions]`:

```toml
camerax = "1.4.2"
mlkitBarcode = "17.3.0"
```

Dentro de `[libraries]`:

```toml
androidx-camera-camera2 = { group = "androidx.camera", name = "camera-camera2", version.ref = "camerax" }
androidx-camera-lifecycle = { group = "androidx.camera", name = "camera-lifecycle", version.ref = "camerax" }
androidx-camera-view = { group = "androidx.camera", name = "camera-view", version.ref = "camerax" }
mlkit-barcode-scanning = { group = "com.google.mlkit", name = "barcode-scanning", version.ref = "mlkitBarcode" }
```

En `mobile/app/build.gradle.kts`, en `dependencies`, después de Retrofit/OkHttp:

```kotlin
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    // Modelo incluido en el APK: escanea offline desde la primera vez, sin descargar nada de Play Services.
    implementation(libs.mlkit.barcode.scanning)
```

Antes de fijarlas, verificar en Maven/Google Maven que 1.4.2 y 17.3.0 sigan siendo las estables más recientes compatibles con `compileSdk 36` y AGP 8.12. Si hay una estable más nueva, se usa esa.

En `AndroidManifest.xml`, debajo del permiso de INTERNET:

```xml
    <uses-permission android:name="android.permission.CAMERA" />
    <!-- Sin cámara igual se puede pegar el link: no la exige para instalar. -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
```

- [ ] **Step 6: Escáner (CameraX + ML Kit)**

`ui/join/QrScanner.kt`:

```kotlin
package com.fittrainer.ui.join

import androidx.annotation.OptIn
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

/**
 * Visor de la cámara trasera que reporta el texto de cada QR que lee. Puede llamar a [onQrScanned]
 * muchas veces seguidas: quien lo usa decide cuándo navegar. Si la cámara no se puede abrir (no hay
 * cámara trasera, la usa otra app), llama a [onCameraError]. Requiere el permiso CAMERA concedido.
 */
@Composable
fun QrScanner(onQrScanned: (String) -> Unit, onCameraError: () -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentOnScanned by rememberUpdatedState(onQrScanned)
    val currentOnError by rememberUpdatedState(onCameraError)
    val previewView = remember { PreviewView(context) }

    DisposableEffect(lifecycleOwner) {
        val executor = Executors.newSingleThreadExecutor()
        val scanner = BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build(),
        )
        val providerFuture = ProcessCameraProvider.getInstance(context)
        var disposed = false
        providerFuture.addListener({
            if (disposed) return@addListener
            try {
                val provider = providerFuture.get()
                val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                analysis.setAnalyzer(executor) { proxy -> analyze(scanner, proxy) { currentOnScanned(it) } }
                provider.unbindAll()
                provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
            } catch (e: Exception) {
                currentOnError()
            }
        }, ContextCompat.getMainExecutor(context))

        onDispose {
            disposed = true
            if (providerFuture.isDone) runCatching { providerFuture.get().unbindAll() }
            scanner.close()
            executor.shutdown()
        }
    }

    AndroidView(factory = { previewView }, modifier = modifier)
}

// Los listeners de ML Kit corren en el hilo principal: onValue llega en main.
@OptIn(ExperimentalGetImage::class)
private fun analyze(scanner: BarcodeScanner, proxy: ImageProxy, onValue: (String) -> Unit) {
    val media = proxy.image ?: run {
        proxy.close()
        return
    }
    scanner.process(InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees))
        .addOnSuccessListener { codes -> codes.firstNotNullOfOrNull { it.rawValue }?.let(onValue) }
        .addOnCompleteListener { proxy.close() }
}
```

- [ ] **Step 7: Pantalla**

`ui/join/JoinScreen.kt`:

```kotlin
package com.fittrainer.ui.join

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.FtRadius
import com.fittrainer.ui.theme.Spacing

private enum class CameraAccess { NotAsked, Granted, Denied, PermanentlyDenied }

@Composable
fun JoinScreen(onBack: () -> Unit, onToken: (String) -> Unit, viewModel: JoinViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var access by remember { mutableStateOf(if (context.hasCameraPermission()) CameraAccess.Granted else CameraAccess.NotAsked) }
    var cameraFailed by rememberSaveable { mutableStateOf(false) }

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        access = when {
            granted -> CameraAccess.Granted
            // Después de un rechazo, si Android ya no muestra el diálogo, solo queda Ajustes.
            context.findActivity()?.shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) == true -> CameraAccess.Denied
            else -> CameraAccess.PermanentlyDenied
        }
    }

    // Vuelve de Ajustes con el permiso concedido.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        if (context.hasCameraPermission()) access = CameraAccess.Granted
    }

    LaunchedEffect(state.token) {
        state.token?.let {
            viewModel.onNavigated()
            onToken(it)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.lg),
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
        }
        Text("Escaneá el código de tu entrenador", style = MaterialTheme.typography.displayMedium)

        when {
            access == CameraAccess.Granted && !cameraFailed -> {
                QrScanner(
                    onQrScanned = viewModel::onQrScanned,
                    onCameraError = { cameraFailed = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(FtRadius.card))
                        .border(2.dp, FtColors.Brand, RoundedCornerShape(FtRadius.card)),
                )
                state.scanError?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = FtColors.Amber) }
            }
            cameraFailed -> Text(
                "No se pudo abrir la cámara. Pegá el link de la invitación.",
                style = MaterialTheme.typography.bodyLarge,
                color = FtColors.TextSecondary,
            )
            access == CameraAccess.NotAsked -> {
                Text(
                    "Necesitamos la cámara para escanear el código de tu entrenador",
                    style = MaterialTheme.typography.bodyLarge,
                    color = FtColors.TextSecondary,
                )
                Button(
                    onClick = { launcher.launch(Manifest.permission.CAMERA) },
                    shape = RoundedCornerShape(FtRadius.control),
                    modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                ) { Text("Permitir cámara") }
            }
            else -> {
                Text(
                    "Sin la cámara no podemos escanear, pero podés pegar el link que te mandó tu entrenador.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = FtColors.TextSecondary,
                )
                if (access == CameraAccess.PermanentlyDenied) {
                    OutlinedButton(
                        onClick = { context.startActivity(appSettingsIntent(context)) },
                        shape = RoundedCornerShape(FtRadius.control),
                        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                    ) { Text("Abrir ajustes") }
                } else {
                    OutlinedButton(
                        onClick = { launcher.launch(Manifest.permission.CAMERA) },
                        shape = RoundedCornerShape(FtRadius.control),
                        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
                    ) { Text("Permitir cámara") }
                }
            }
        }

        PasteLink(
            link = state.link,
            error = state.linkError,
            onLinkChange = viewModel::onLinkChange,
            onSubmit = viewModel::submitLink,
        )
    }
}

@Composable
private fun PasteLink(link: String, error: String?, onLinkChange: (String) -> Unit, onSubmit: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Text("O PEGÁ EL LINK DE LA INVITACIÓN", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        OutlinedTextField(
            value = link,
            onValueChange = onLinkChange,
            singleLine = true,
            isError = error != null,
            supportingText = if (error != null) {
                { Text(error) }
            } else {
                null
            },
            placeholder = { Text("https://…/join?token=…") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Go),
            keyboardActions = KeyboardActions(onGo = { onSubmit() }),
            shape = RoundedCornerShape(FtRadius.control),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedButton(
            onClick = onSubmit,
            enabled = link.isNotBlank(),
            shape = RoundedCornerShape(FtRadius.control),
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Continuar") }
    }
}

private fun Context.hasCameraPermission() =
    ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED

private fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

private fun appSettingsIntent(context: Context) =
    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
```

Si `Icons.AutoMirrored.Filled.ArrowBack` no estuviera en `material-icons-core` de este BOM, usar `Icons.Filled.ArrowBack` (mismo paquete `androidx.compose.material.icons.filled`). No hay que sumar `material-icons-extended`.

- [ ] **Step 8: Compila**

Run: `./gradlew assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL. `JoinScreen` todavía no está en ninguna ruta; se conecta en la Task 6.

- [ ] **Step 9: Commit** (lo resuelve Igna)

```bash
git add mobile/gradle/libs.versions.toml mobile/app/build.gradle.kts mobile/app/src
git commit -m "feat(mobile): escáner de QR con CameraX + ML Kit y pegado del link"
```

---

### Task 5: `ConfirmInvitationScreen`

**Files:**
- Create: `ui/join/ConfirmInvitationScreen.kt`

**Interfaces:**
- Consumes: `ConfirmInvitationViewModel`, `ConfirmInvitationUiState`, `InvitationMessage`, `goalLabel`, `MIN_PASSWORD_LENGTH` (Task 3).
- Produces: `@Composable fun ConfirmInvitationScreen(onClose: () -> Unit, viewModel: ConfirmInvitationViewModel = hiltViewModel())`. `onClose` vuelve a Login; la usan la X y el botón "Iniciar sesión" de los errores.

- [ ] **Step 1: Pantalla**

```kotlin
package com.fittrainer.ui.join

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.invitation.Invitation
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.FtRadius
import com.fittrainer.ui.theme.Spacing
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val EXPIRES_FORMAT = DateTimeFormatter.ofPattern("dd/MM HH:mm")

@Composable
fun ConfirmInvitationScreen(onClose: () -> Unit, viewModel: ConfirmInvitationViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.lg),
    ) {
        IconButton(onClick = onClose) { Icon(Icons.Filled.Close, contentDescription = "Cerrar") }
        when (val s = state) {
            ConfirmInvitationUiState.Loading -> Box(Modifier.fillMaxWidth().padding(Spacing.xxl), Alignment.Center) {
                CircularProgressIndicator()
            }
            is ConfirmInvitationUiState.Error -> MessageBlock(s.message, onRetry = viewModel::retry, onLogin = onClose)
            is ConfirmInvitationUiState.Ready -> ReadyContent(
                state = s,
                onPasswordChange = viewModel::onPasswordChange,
                onSubmit = viewModel::submit,
                onLogin = onClose,
            )
        }
    }
}

@Composable
private fun ReadyContent(
    state: ConfirmInvitationUiState.Ready,
    onPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onLogin: () -> Unit,
) {
    val invitation = state.invitation
    var showPassword by rememberSaveable { mutableStateOf(false) }

    Text(
        "INVITACIÓN · ${invitation.trainerName.uppercase()}",
        style = MaterialTheme.typography.labelSmall,
        color = FtColors.TextPrimary,
        modifier = Modifier
            .background(FtColors.Brand, RoundedCornerShape(FtRadius.chip))
            .padding(horizontal = Spacing.sm, vertical = Spacing.xs),
    )
    Text(
        buildAnnotatedString {
            append("Todo listo,\n")
            withStyle(SpanStyle(color = FtColors.BrandText)) { append(invitation.studentName.substringBefore(' ') + ".") }
        },
        style = MaterialTheme.typography.displayLarge,
    )
    Text(
        "${invitation.trainerName} ya cargó tu perfil. Confirmá los datos y elegí contraseña.",
        style = MaterialTheme.typography.bodyLarge,
        color = FtColors.TextSecondary,
    )

    PrefilledCard(invitation)

    Text("ELEGÍ UNA CONTRASEÑA", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
    OutlinedTextField(
        value = state.password,
        onValueChange = onPasswordChange,
        enabled = !state.isSubmitting,
        singleLine = true,
        supportingText = { Text("Mínimo $MIN_PASSWORD_LENGTH caracteres") },
        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
        trailingIcon = {
            TextButton(
                onClick = { showPassword = !showPassword },
                modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
            ) { Text(if (showPassword) "Ocultar" else "Mostrar", color = FtColors.BrandText) }
        },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
        keyboardActions = KeyboardActions(onDone = { onSubmit() }),
        shape = RoundedCornerShape(FtRadius.control),
        modifier = Modifier.fillMaxWidth(),
    )

    Button(
        onClick = onSubmit,
        enabled = state.canSubmit,
        shape = RoundedCornerShape(FtRadius.control),
        modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
    ) {
        if (state.isSubmitting) {
            CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
        } else {
            Text("→ Entrar a FitTrainer")
        }
    }

    state.submitError?.let { MessageBlock(it, onRetry = onSubmit, onLogin = onLogin) }
}

@Composable
private fun PrefilledCard(invitation: Invitation) {
    val expires = invitation.expiresAt.atZone(ZoneId.systemDefault()).format(EXPIRES_FORMAT)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(FtColors.Card, RoundedCornerShape(FtRadius.card))
            .border(1.dp, FtColors.Border, RoundedCornerShape(FtRadius.card))
            .padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text("PRECARGADO", style = MaterialTheme.typography.labelSmall, color = FtColors.TextSecondary)
        DataRow("Nombre", invitation.studentName)
        HorizontalDivider(color = FtColors.Border)
        DataRow("Email", invitation.studentEmail)
        HorizontalDivider(color = FtColors.Border)
        DataRow("Objetivo", goalLabel(invitation.goal))
        HorizontalDivider(color = FtColors.Border)
        DataRow("Vence", expires)
    }
}

@Composable
private fun DataRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextPrimary)
    }
}

/** Mensaje de error con la acción que corresponde: reintentar o ir al login. */
@Composable
private fun MessageBlock(message: InvitationMessage, onRetry: () -> Unit, onLogin: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Text(message.text, style = MaterialTheme.typography.bodyMedium, color = FtColors.Coral)
        if (message.canRetry) {
            OutlinedButton(
                onClick = onRetry,
                shape = RoundedCornerShape(FtRadius.control),
                modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
            ) { Text("Reintentar") }
        }
        if (message.offerLogin) {
            OutlinedButton(
                onClick = onLogin,
                shape = RoundedCornerShape(FtRadius.control),
                modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
            ) { Text("Iniciar sesión") }
        }
    }
}
```

- [ ] **Step 2: Compila**

Run: `./gradlew assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit** (lo resuelve Igna)

```bash
git add mobile/app/src
git commit -m "feat(mobile): pantalla de confirmación de la invitación"
```

---

### Task 6: Navegación sin sesión, botón en Login y deep link

**Files:**
- Create: `navigation/PendingInvitation.kt`, `navigation/LoggedOutNavHost.kt`
- Modify: `navigation/AppNavHost.kt`, `navigation/RootViewModel.kt`, `ui/login/LoginScreen.kt`, `MainActivity.kt`, `AndroidManifest.xml`, `app/build.gradle.kts`
- Test: `navigation/RootViewModelTest.kt`

**Interfaces:**
- Consumes: `JoinScreen` (Task 4), `ConfirmInvitationScreen` y `TOKEN_ARG` (Tasks 3 y 5), `InvitationLink.parse` (Task 1).
- Produces:
  - `@Singleton class PendingInvitation { val token: StateFlow<String?>; fun offer(token: String); fun consume() }`.
  - `RootViewModel(sessionRepository, pendingInvitation)`, con `pendingInvitation: StateFlow<String?>`, `invitationWhileLoggedIn: StateFlow<Boolean>` y `dismissPendingInvitation()`.
  - `LoginScreen(…, onJoin: () -> Unit = {})`.

- [ ] **Step 1: Write the failing tests**

En `navigation/RootViewModelTest.kt`, cambiar la construcción y agregar los tests:

```kotlin
    private val pending = PendingInvitation()
    private val vm by lazy { RootViewModel(repo, pending) }

    // Review Focus 3: deep link con sesión iniciada.
    @Test fun `deep link con sesion muestra el aviso`() {
        pending.offer(TOKEN)
        assertEquals(true, vm.invitationWhileLoggedIn.value)
    }

    @Test fun `cerrar el aviso descarta el token`() {
        pending.offer(TOKEN)
        vm.dismissPendingInvitation()
        assertEquals(false, vm.invitationWhileLoggedIn.value)
        assertNull(pending.token.value)
    }

    @Test fun `deep link sin sesion no muestra aviso y queda para la navegacion`() {
        repo.session.value = Session.LoggedOut
        pending.offer(TOKEN)
        assertEquals(false, vm.invitationWhileLoggedIn.value)
        assertEquals(TOKEN, vm.pendingInvitation.value)
    }
```

Con el import `com.fittrainer.data.TOKEN`. Para que `vm.invitationWhileLoggedIn` tenga valor, `stateIn` usa `SharingStarted.Eagerly`, como `signOutWarning`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.navigation.RootViewModelTest"`
Expected: FAIL de compilación (`PendingInvitation` no existe).

- [ ] **Step 3: `PendingInvitation` y `RootViewModel`**

`navigation/PendingInvitation.kt`:

```kotlin
package com.fittrainer.navigation

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Token que llegó por deep link y todavía no se usó. Lo escribe MainActivity y lo consume la
 * navegación: sin sesión abre la confirmación; con sesión se muestra un aviso y se descarta.
 */
@Singleton
class PendingInvitation @Inject constructor() {
    private val _token = MutableStateFlow<String?>(null)
    val token: StateFlow<String?> = _token.asStateFlow()

    fun offer(token: String) {
        _token.value = token
    }

    fun consume() {
        _token.value = null
    }
}
```

En `navigation/RootViewModel.kt`, el constructor suma `PendingInvitation` y se agrega lo siguiente. El resto queda igual:

```kotlin
class RootViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val pending: PendingInvitation,
) : ViewModel() {
    // … session, lastSignOut, signOutWarning, init sin cambios …

    /** Token de un deep link pendiente; sin sesión lo consume LoggedOutNavHost. */
    val pendingInvitation: StateFlow<String?> = pending.token

    /** Llegó una invitación con una sesión iniciada: no se cierra sola, se avisa. */
    val invitationWhileLoggedIn: StateFlow<Boolean> = combine(pending.token, session) { token, session ->
        token != null && (session is Session.Student || session is Session.Trainer)
    }.stateIn(viewModelScope, SharingStarted.Eagerly, false)

    fun consumePendingInvitation() = pending.consume()

    fun dismissPendingInvitation() = pending.consume()
    // … signOut, dismissSignOutWarning, companion sin cambios …
}
```

Importante: `invitationWhileLoggedIn` se declara **después** de `session`, porque la usa.

- [ ] **Step 4: Run tests to verify they pass**

Run: `./gradlew testDebugUnitTest --tests "com.fittrainer.navigation.RootViewModelTest"`
Expected: PASS, incluidos los tests anteriores.

- [ ] **Step 5: NavHost sin sesión y botón en Login**

`navigation/LoggedOutNavHost.kt`:

```kotlin
package com.fittrainer.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.fittrainer.ui.join.ConfirmInvitationScreen
import com.fittrainer.ui.join.JoinScreen
import com.fittrainer.ui.join.TOKEN_ARG
import com.fittrainer.ui.login.LoginScreen

private const val LOGIN = "login"
private const val JOIN = "join"
private const val CONFIRM = "confirm/{$TOKEN_ARG}"
private fun confirmRoute(token: String) = "confirm/$token"

/** Navegación sin sesión: login, escanear o pegar la invitación, y confirmarla. */
@Composable
fun LoggedOutNavHost(
    warning: String?,
    onDismissWarning: () -> Unit,
    pendingToken: String?,
    onPendingConsumed: () -> Unit,
) {
    val nav = rememberNavController()

    // Deep link: va directo a confirmar, con Login debajo para que "atrás" y la X vuelvan ahí.
    LaunchedEffect(pendingToken) {
        val token = pendingToken ?: return@LaunchedEffect
        nav.navigate(confirmRoute(token)) { popUpTo(LOGIN) }
        onPendingConsumed()
    }

    NavHost(navController = nav, startDestination = LOGIN) {
        composable(LOGIN) {
            LoginScreen(warning = warning, onDismissWarning = onDismissWarning, onJoin = { nav.navigate(JOIN) })
        }
        composable(JOIN) {
            JoinScreen(onBack = { nav.popBackStack() }, onToken = { nav.navigate(confirmRoute(it)) })
        }
        composable(CONFIRM, arguments = listOf(navArgument(TOKEN_ARG) { type = NavType.StringType })) {
            ConfirmInvitationScreen(onClose = { nav.popBackStack(LOGIN, inclusive = false) })
        }
    }
}
```

En `ui/login/LoginScreen.kt`:
- se agrega `onJoin: () -> Unit = {}` como último parámetro de `LoginScreen` y de `LoginContent`;
- se pasa de una a la otra;
- en `LoginContent`, después del bloque `state.error?.let { … }`, se agrega:

```kotlin
        OutlinedButton(
            onClick = onJoin,
            enabled = !state.isLoading,
            shape = controlShape,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Tengo una invitación") }
```

Con el import `androidx.compose.material3.OutlinedButton`.

En `navigation/AppNavHost.kt`, la rama `Session.LoggedOut` y el aviso quedan así:

```kotlin
@Composable
fun AppNavHost(viewModel: RootViewModel = hiltViewModel()) {
    val session by viewModel.session.collectAsStateWithLifecycle()
    val signOutWarning by viewModel.signOutWarning.collectAsStateWithLifecycle()
    val pendingToken by viewModel.pendingInvitation.collectAsStateWithLifecycle()
    val invitationWhileLoggedIn by viewModel.invitationWhileLoggedIn.collectAsStateWithLifecycle()
    when (session) {
        null -> Box(Modifier.fillMaxSize()) // leyendo la sesión guardada
        Session.LoggedOut -> LoggedOutNavHost(
            warning = signOutWarning,
            onDismissWarning = viewModel::dismissSignOutWarning,
            pendingToken = pendingToken,
            onPendingConsumed = viewModel::consumePendingInvitation,
        )
        is Session.Student -> RoleShell(tabs = StudentTabs, onSignOut = viewModel::signOut)
        is Session.Trainer -> RoleShell(tabs = TrainerTabs, onSignOut = viewModel::signOut)
    }
    if (invitationWhileLoggedIn) {
        AlertDialog(
            onDismissRequest = viewModel::dismissPendingInvitation,
            text = { Text("Ya hay una sesión iniciada en este celular. Cerrá sesión para usar la invitación.") },
            confirmButton = { TextButton(onClick = viewModel::dismissPendingInvitation) { Text("Entendido") } },
        )
    }
}
```

Con los imports `androidx.compose.material3.AlertDialog`, `Text` y `TextButton`. Se quita el import de `LoginScreen`, que ya no se usa ahí.

- [ ] **Step 6: Deep link**

En `mobile/app/build.gradle.kts`:
- junto a `apiTimeoutSeconds`:

```kotlin
// Host de los links de invitación (FRONTEND_URL del backend). Sin dominio propio todavía: localhost en dev.
val joinLinkHost = env("JOIN_LINK_HOST", "localhost")
```

- en `defaultConfig`, después de los `buildConfigField`:

```kotlin
        manifestPlaceholders["joinLinkHost"] = joinLinkHost
```

En `AndroidManifest.xml`, la `<activity>` pasa a ser:

```xml
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <!-- Link de invitación (WhatsApp, mail). Sin autoVerify: no hay dominio propio todavía,
                 Android ofrece abrirlo con la app. El puerto no se filtra: cualquiera matchea. -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="http" />
                <data android:scheme="https" />
                <data android:host="${joinLinkHost}" />
                <data android:pathPrefix="/join" />
            </intent-filter>
        </activity>
```

En `MainActivity.kt`:

```kotlin
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var pendingInvitation: PendingInvitation

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Al recrear (rotación) el intent es el mismo: no volver a ofrecer un token ya consumido.
        if (savedInstanceState == null) handleInvitationLink(intent)
        // … enableEdgeToEdge y setContent sin cambios …
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleInvitationLink(intent)
    }

    private fun handleInvitationLink(intent: Intent?) {
        if (intent?.action != Intent.ACTION_VIEW) return
        intent.dataString?.let(InvitationLink::parse)?.let(pendingInvitation::offer)
    }
}
```

Con los imports `android.content.Intent`, `com.fittrainer.data.invitation.InvitationLink`, `com.fittrainer.navigation.PendingInvitation` y `javax.inject.Inject`. Un link con un token inválido abre la app en Login sin más.

- [ ] **Step 7: Verificar**

Run: `./gradlew assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL y todos los tests en verde.

- [ ] **Step 8: Commit** (lo resuelve Igna)

```bash
git add mobile/app
git commit -m "feat(mobile): navegación de alta por invitación y deep link"
```

---

### Task 7: Configuración para el celular por USB y verificación de punta a punta

**Files:**
- Modify: `mobile/app/src/main/res/xml/network_security_config.xml`
- Create: `mobile/.env.example`
- Modify (local, no se commitea): `AGENTS.md`

- [ ] **Step 1: HTTP en claro hacia `localhost`**

`network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- HTTP en claro SOLO contra la PC de desarrollo: 10.0.2.2 desde el emulador y localhost desde un
     celular por USB con `adb reverse tcp:3001 tcp:3001`. Todo lo demás exige HTTPS. -->
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">10.0.2.2</domain>
        <domain includeSubdomains="false">localhost</domain>
    </domain-config>
</network-security-config>
```

- [ ] **Step 2: `mobile/.env.example`**

```dotenv
# Copiar a mobile/.env (no se sube). Si falta, se usan los defaults del emulador.

# Emulador: la PC es 10.0.2.2.
API_BASE_URL=http://10.0.2.2:3001/api
# Celular físico por USB: correr `adb reverse tcp:3001 tcp:3001` y usar
# API_BASE_URL=http://localhost:3001/api

API_TIMEOUT_SECONDS=30

# Host de los links de invitación que abre la app (el de FRONTEND_URL del backend, sin puerto).
JOIN_LINK_HOST=localhost
```

- [ ] **Step 3: Regla local**

En la sección Mobile de `AGENTS.md`, la línea de la API pasa a ser:

```markdown
- **API desde el emulador:** `http://10.0.2.2:3001/api`, nunca `localhost`. Desde un celular por USB,
  `adb reverse tcp:3001 tcp:3001` y `http://localhost:3001/api`. La configuración entra por
  `BuildConfig` (ver `mobile/.env.example`).
```

- [ ] **Step 4: Build final**

Run (desde `mobile/`): `./gradlew assembleDebug testDebugUnitTest`
Expected: BUILD SUCCESSFUL, todo en verde.

- [ ] **Step 5: Punta a punta en el celular de Igna** (con Igna; Claude prepara y lee con `adb`)

1. **Preparar:**
   - `mobile/.env` con `API_BASE_URL=http://localhost:3001/api`;
   - backend levantado (`npm run dev` en `backend/`);
   - celular conectado (`adb devices`);
   - `adb reverse tcp:3001 tcp:3001`;
   - `./gradlew installDebug`.
2. **Invitación:** login del entrenador de prueba (ver la memoria "usuarios de prueba E2E") → `POST /api/invitations` con `delivery_channel` que incluya QR → guardar el `qr_base64` como PNG en el scratchpad y abrirlo en la pantalla de la PC.
3. **Criterio de la tarjeta:** Login → "Tengo una invitación" → "Permitir cámara" → escanear → los datos coinciden con la invitación → contraseña → "Entrar a FitTrainer" → pestañas de alumno. `GET /api/students` del entrenador lo lista.
4. **Login con esa cuenta:** cerrar sesión → login con el email y la contraseña nuevos → pestañas de alumno.
5. **Invitación usada:** cerrar sesión → escanear el mismo QR → "Esta invitación ya fue usada…" con el botón "Iniciar sesión".
6. **Vencida:** otra invitación → en Supabase dev, `update invitations set expires_at = now() - interval '1 hour' where token = '<token>'` → escanear → "Esta invitación venció…".
7. **Permiso rechazado:** `adb shell pm revoke com.fittrainer android.permission.CAMERA` → "Tengo una invitación" → rechazar → pegar el `join_url` de una invitación nueva → confirmar.
8. **Deep link:** `adb shell am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "<join_url>"`. Primero sin aprobar el host (esperado: abre el navegador); después de `adb shell pm set-app-links-user-selection --user cur --package com.fittrainer true localhost` (esperado: abre la app en confirmar), una vez con la app cerrada y otra con la app abierta en Login → confirmar. Con una sesión iniciada → el aviso, y "Entendido" lo cierra.
9. **Sin red:** en la confirmación, apagar el backend → "Entrar a FitTrainer" → "Sin conexión con el servidor" → levantar el backend → "Reintentar" → entra.
10. **Capturas:** `adb exec-out screencap -p > <scratchpad>/paso-N.png` en los pasos 3, 5, 6, 7, 8 y 9.

Si un paso falla, se para y se diagnostica con superpowers:systematic-debugging antes de tocar código.

- [ ] **Step 6: Commit** (lo resuelve Igna)

```bash
git add mobile/.env.example mobile/app/src/main/res/xml/network_security_config.xml
git commit -m "chore(mobile): config para probar en celular físico por USB"
```

---

## Cobertura del spec

| Spec | Tarea |
|---|---|
| §2 extractor único (URL con `token` o UUID) | 1 |
| §2 deep link `http(s)` con `JOIN_LINK_HOST`, sin `autoVerify` | 6 |
| §2 alta online, sin Room; errores con "Reintentar" | 2, 3, 5 |
| §2 permiso de cámara con contexto, y pegar link | 4 |
| §2 ML Kit con el modelo incluido | 4 |
| §2 celular por USB + `localhost` en claro + `AGENTS.md` | 7 |
| §3 contrato y códigos de error | 2 |
| §4 `InvitationApi`, `InvitationRepository`, `registerFromInvitation`, `DataError` | 2 |
| §4 `PendingInvitation`, `singleTop`, aviso con sesión | 6 |
| §4 NavHost sin sesión `login → join → confirm/{token}` | 6 |
| §4 escáner: tres estados del permiso, una sola navegación, aviso de QR inválido | 4 |
| §4 confirmación: estados, mensajes, ≥ 8 caracteres, doble envío | 3, 5 |
| §4 botón "Tengo una invitación" | 6 |
| §4 manifest: CAMERA, `uses-feature` no requerido | 4 |
| §5 dependencias | 4 |
| §6 tests unitarios e integración | 1, 2, 3, 4, 6 |
| §6 punta a punta | 7 |
