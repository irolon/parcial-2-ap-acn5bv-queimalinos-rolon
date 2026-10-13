# Spec — Esqueleto Android (Compose, Hilt, Retrofit, Room)

- **Tarjeta:** "3 · Esqueleto Android — Compose, Hilt, Retrofit y Room" (tablero personal de Igna) → tarjeta de equipo [S0] Esqueleto de la app Android (https://trello.com/c/LJGX3ICe)
- **Fecha:** 2026-10-13
- **Reglas que aplican:** `AGENTS.md` (sección Mobile)
- **Diseño:** Guía Mobile p.5 (mapa del sitio), p.7–9 (color, tipografía, componentes)

## 1. Objetivo

Crear la app Android de FitTrainer desde cero en `mobile/`, con la arquitectura, la inyección de dependencias, la red, la base local y la navegación por rol que van a usar todas las tarjetas mobile siguientes. La pantalla de ejemplo (`/health`) demuestra el patrón offline-first de punta a punta.

**Criterio de aceptación (de la tarjeta):** la app compila e instala con `./gradlew installDebug`, navega entre pantallas y una de ellas muestra datos del `/health` del backend traídos con Retrofit y cacheados en Room.

## 2. Decisiones ya tomadas

- Stack: Kotlin + Jetpack Compose + Hilt + Retrofit + Room + Navigation Compose. Una sola app con los dos roles (AGENTS.md prevalece sobre la Guía Mobile, que decía React Native y dos apps).
- Room es la única fuente de verdad: la UI lee siempre de Room; los repositorios refrescan Room desde la API.
- Ramificación por rol desde el arranque, con una sesión provisoria (opción A, §5).

## 3. Arquitectura: MVVM con repositorio y DAO

Arquitectura recomendada por Google para Android: MVVM en capas, flujo de datos unidireccional, offline-first.

```
┌──────────── CAPA UI ────────────┐
│ Screen (Compose)                │  dibuja el estado, emite eventos
│   ↑ UiState      ↓ eventos      │
│ ViewModel (StateFlow<UiState>)  │  arma el estado de la pantalla
└──────────────┬──────────────────┘
               │ observe() / refresh()
┌──────────── CAPA DATOS ─────────┐
│ Repository                      │  única puerta a los datos
│   ├─ Room (DAO)   ← la UI lee SIEMPRE de acá
│   └─ Retrofit (API) → escribe en Room
└─────────────────────────────────┘
        Hilt conecta todo (di/)
```

Equivalencias para quien viene del backend o de MVC:

| MVC | En esta app | Ejemplo |
|---|---|---|
| Model | Repository + DAO + Entity (Room) + API (Retrofit) | `HealthRepository`, `HealthDao`, `HealthSnapshotEntity`, `FitTrainerApi` |
| View | Pantalla Compose | `HealthScreen` |
| Controller | ViewModel (publica un estado; la vista se redibuja sola) | `HealthViewModel` |

```
Backend:  routes → controller → service → repository → Supabase
Mobile:   Screen → ViewModel  →           repository → DAO (Room) / API (Retrofit)
```

**Reglas:**
- La Screen no contiene lógica: recibe `UiState` y llama a funciones del ViewModel.
- El ViewModel solo conoce repositorios. Nunca importa Retrofit ni Room.
- Solo los repositorios tocan la red; lo que traen se guarda en Room y la UI se entera observando Room.

**Fuera de la arquitectura por ahora (YAGNI):**
- Capa de dominio (use cases). Se agrega cuando haya lógica compartida real (rachas, progresiones).
- Multi-módulo. Un solo módulo `app`.
- MVI con reducers.

## 4. Proyecto y configuración

- **Ubicación:** `mobile/` en la raíz del monorepo, proyecto Gradle con un único módulo `app`.
- **Paquete:** `com.fittrainer`; `applicationId` `com.fittrainer`.
- **SDKs:** `minSdk 26`, `compileSdk 36`, `targetSdk 36`.
- **Build:** Gradle Kotlin DSL, catálogo de versiones `gradle/libs.versions.toml`, KSP para Room y Hilt, Gradle wrapper commiteado. Compila con el JDK 21 de Android Studio.
- **`BuildConfig`:** `API_BASE_URL` (default `http://10.0.2.2:3001/api/`) y `API_TIMEOUT_SECONDS` (default `30`).
  - Se leen de `mobile/.env` si existe; si no, se usan los defaults.
  - `mobile/.env` va en `.gitignore`.
  - `mobile/.env.example` NO se crea en esta tarjeta: ya existe en el PR #3 (Docker) con esos mismos valores.
- **Red en claro:** `network_security_config.xml` permite HTTP en texto plano **solo para `10.0.2.2`**; el resto exige HTTPS.

### Paquetes

```
com.fittrainer/
├── FitTrainerApp.kt          @HiltAndroidApp
├── MainActivity.kt           @AndroidEntryPoint, setContent { FitTrainerTheme { AppNavHost() } }
├── data/
│   ├── api/                  FitTrainerApi (Retrofit), HealthResponse (DTO)
│   ├── db/                   FitTrainerDatabase, HealthDao, HealthSnapshotEntity
│   ├── repository/           HealthRepository
│   └── session/              Session, SessionRepository (+ implementación DataStore)
├── di/                       NetworkModule, DatabaseModule, SessionModule
├── navigation/               AppNavHost, StudentTabs, TrainerTabs, rutas
└── ui/
    ├── theme/                Color, Type, Shape, Spacing, FitTrainerTheme
    ├── login/                LoginScreen, LoginViewModel
    ├── health/               HealthScreen, HealthViewModel, HealthUiState
    └── placeholder/          PlaceholderScreen (pestañas sin implementar)
```

## 5. Sesión y navegación por rol

- `Session` = `LoggedOut | Student | Trainer`.
- `SessionRepository` expone `val session: Flow<Session>`, `suspend fun signInAs(role)` y `suspend fun signOut()`.
- **Implementación provisoria:** guarda el rol en Preferences DataStore. No hay JWT ni credenciales. La tarjeta de auth mobile la reemplaza (JWT en EncryptedSharedPreferences + `Authenticator` de OkHttp) sin cambiar la interfaz ni la navegación.
- `AppNavHost` observa la sesión:
  - `LoggedOut` → `LoginScreen`, con dos botones de desarrollo: "Entrar como alumno" y "Entrar como entrenador".
  - `Student` → `Scaffold` con barra inferior de 4 pestañas: **Hoy · Progreso · Mis rutinas · Perfil**.
  - `Trainer` → `Scaffold` con barra inferior de 4 pestañas: **Inicio · Alumnos · Mensajes · Más**.
- Las pestañas son `PlaceholderScreen` con su nombre real. Desde **Perfil** (alumno) y **Más** (entrenador) se accede a:
  - **"Estado del servidor"** → `HealthScreen` (segundo nivel; respeta el máximo de 2 niveles de la Guía Mobile p.5).
  - **"Cerrar sesión"** → vuelve a `LoginScreen`.

## 6. Pantalla de ejemplo: `/health` offline-first

```
HealthScreen ← HealthViewModel ← HealthRepository.observe()  ← Room (HealthDao)
                                  HealthRepository.refresh() → GET /health → upsert en Room
```

- **API:** `@GET("/health")`. La barra inicial resuelve contra el host e ignora el `/api` de la base, porque el backend expone health en `http://<host>:3001/health`. El resto de endpoints futuros serán relativos (sin barra) a `/api/`.
- **DTO:** `HealthResponse(status: String, timestamp: String, version: String)`, igual a la respuesta actual del backend.
- **Room:** tabla `health_snapshot`, una sola fila (`id = 0`), columnas `status`, `version`, `serverTimestamp`, `fetchedAt` (epoch ms del dispositivo).
- **`HealthRepository`:**
  - `fun observe(): Flow<HealthSnapshot?>`: lee de Room.
  - `suspend fun refresh(): Result<Unit>`: llama a la API y hace upsert en Room. Si falla (sin red, timeout, HTTP no 2xx), devuelve `Result.failure` **sin tocar el caché**.
- **`HealthUiState`:** `snapshot: HealthSnapshot?`, `isRefreshing: Boolean`, `error: String?`.
- **`HealthViewModel`:** combina `observe()` con el estado del refresh; refresca al crearse y con `retry()`.
- **Pantalla:**
  - Con datos: estado, versión, hora del servidor y "actualizado a las HH:mm".
  - Refresh fallido con caché: franja ámbar (`#FFB020`): "<motivo> — mostrando datos guardados de las HH:mm", donde el motivo es el mensaje del error real (sin conexión, error HTTP N u otro).
  - Sin caché y sin red: estado vacío con botón "Reintentar".
  - Mientras refresca: indicador de progreso, sin ocultar los datos.
- **Errores:** las excepciones de red se convierten en un mensaje para el usuario; nunca un crash.

## 7. Tema (tokens de la Guía Mobile)

Solo tokens; los componentes (botones, tarjetas, chips) se construyen en las tarjetas de pantallas.

- **Color:**
  - Marca `#2952D9`, azul texto `#5E7DE2`, presionado `#1B3AA8`.
  - Ink: fondo `#0B0D0C`, superficie `#111413`, tarjeta `#181C1B`, elevado `#232927`, borde `#2F3634`, ink5 `#485150`, texto secundario `#8C9593`.
  - Texto principal `#F5F2EC`.
  - Semánticos: verde `#4AE290`, coral `#FF5C3A`, cian `#36C6FF`, ámbar `#FFB020`.
- **Tipografía (p.8):**
  - Display XL 700 / −3px; Display L 700 / −1.5px; Título 600 / −0.5px; Subtítulo 600 — Space Grotesk.
  - Cuerpo 400; Cuerpo S 400 — Inter.
  - Etiqueta 500 — JetBrains Mono.
  - Mínimos: texto 11 sp, etiquetas mono 9 sp.
- **Forma:** radios 6 (chip), 12 (botón e input), 14 (tarjeta), 99 (pastilla).
- **Espaciado:** objeto `Spacing` con base 4 (4, 8, 12, 16, 24, 32, 40).
- **Fuentes empaquetadas** en `res/font` (licencia OFL, Google Fonts); sin fuentes descargables ni Google Play Services.
- Un único `FitTrainerTheme` oscuro, sobre un `darkColorScheme` de Material 3. No hay tema claro.
- Toque mínimo 44 dp en todo lo interactivo de esta tarjeta.

## 8. Tests y verificación

**Unitarios (JVM, `testDebugUnitTest`):**
- `HealthRepository`, con API y DAO falsos: el refresh exitoso guarda en el DAO; el refresh fallido devuelve failure y deja el caché intacto.
- `HealthViewModel`: estados de refrescando, con datos, error con caché y vacío sin caché; `retry()` vuelve a refrescar.
- `SessionRepository`: `signInAs` persiste el rol y `session` lo emite; `signOut` vuelve a `LoggedOut`.

**Instrumentado (emulador, `connectedDebugAndroidTest`):** `HealthDao` con Room en memoria: upsert y observe devuelven la fila; un segundo upsert la reemplaza (una sola fila).

**Verificación de punta a punta (la ejecuta Claude):**
1. `gradlew assembleDebug`, `testDebugUnitTest` y `connectedDebugAndroidTest` en verde.
2. Backend levantado (`npm run dev` o Docker) y `installDebug` en el AVD `Medium_Phone_API_36.0`.
3. Capturas con `adb exec-out screencap` de: login, pestañas del alumno, pestañas del entrenador, "Estado del servidor" con datos.
4. Backend apagado → "Reintentar": se ve la franja ámbar con los datos cacheados.

## 9. Fuera de alcance

- WorkManager y la cola de sincronización (tarjeta de modo offline).
- Login real, JWT, EncryptedSharedPreferences, `Authenticator` (tarjeta de auth mobile).
- Componentes de UI reutilizables y pantallas reales de cada pestaña.
- Logo e ícono de la app con el Manual de Marca (se usa el ícono por defecto).
- `mobile/.env.example` (llega con el PR #3).
- CI para Android.
