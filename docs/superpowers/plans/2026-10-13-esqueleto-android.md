# Esqueleto Android — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear la app Android de FitTrainer en `mobile/` (Kotlin + Compose + Hilt + Retrofit + Room) con navegación por rol, tema de marca y una pantalla `/health` offline-first.

**Architecture:** MVVM con flujo unidireccional: Screen (Compose) ← ViewModel (`StateFlow<UiState>`) ← Repository, que lee siempre de Room y sincroniza desde Retrofit. Hilt conecta las capas. Un solo módulo `app`, paquetes `data/`, `di/`, `navigation/`, `ui/`.

**Tech Stack:** Kotlin 2.2.10, AGP 8.12.3, Gradle 8.14.3, Compose BOM 2025.08.00 (Material 3), Hilt 2.57.1, Room 2.7.2, Retrofit 2.11.0 + kotlinx.serialization, OkHttp 4.12.0, Navigation Compose 2.9.3, DataStore 1.1.7, JUnit 4, kotlinx-coroutines-test.

**Spec:** `docs/superpowers/specs/2026-10-13-esqueleto-android-design.md`

## Global Constraints

- Paquete y `applicationId`: `com.fittrainer`. `minSdk 26`, `compileSdk 36`, `targetSdk 36`.
- Un solo módulo `app` en `mobile/`. Paquetes: `data/`, `di/`, `navigation/`, `ui/` (AGENTS.md).
- La UI lee siempre de Room; un ViewModel o una Screen que importa Retrofit o Room es un error.
- `API_BASE_URL` default `http://10.0.2.2:3001/api/`, `API_TIMEOUT_SECONDS` default `30`, leídos de `mobile/.env` si existe. Nunca `localhost`.
- HTTP en claro permitido **solo** para `10.0.2.2`.
- Tema oscuro único; colores, tipografía, radios y espaciado exactamente los del spec §7. Toque mínimo 44 dp.
- Pestañas alumno: **Hoy · Progreso · Mis rutinas · Perfil**. Pestañas entrenador: **Inicio · Alumnos · Mensajes · Más**.
- Textos de UI en español rioplatense (vos).
- **Toda tarea Gradle se corre con el JDK de Android Studio:** prefijo `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"` desde Git Bash, en `mobile/`.
- Si una versión del catálogo no resuelve, usar el patch más cercano disponible de la misma línea menor y anotarlo en el reporte; nunca cambiar de línea mayor.
- Los agentes no commitean ni pushean: los pasos "Commit" los ejecuta Igna (o el controller con su permiso explícito).

## Review Focus

1. **`API_BASE_URL` en `.env` sin barra final** (el `.env.example` del PR #3 trae `http://10.0.2.2:3001/api`): Retrofit lanza "baseUrl must end in /" al arrancar. Se normaliza en Gradle (Task 1, paso 3) y se verifica en el `BuildConfig` generado (Task 1, paso 7).
2. **El backend responde algo que no es el JSON esperado** (HTML de un proxy, `500` con otro body): la app no debe crashear; el repositorio devuelve failure y el caché queda. Test en Task 4 (`refresh con body inválido no toca el cache`).
3. **Tocar "Reintentar" varias veces seguidas:** no se deben lanzar refreshes en paralelo. Test en Task 5 (`retry mientras refresca no lanza otro refresh`).
4. **Cerrar la app y volver a abrirla:** el rol elegido persiste (DataStore) y el último `/health` sigue visible sin red (Room). Tests en Task 3 (persistencia entre instancias) y verificación manual en Task 7.
5. **Primer arranque sin backend:** sin caché y sin red, la pantalla muestra estado vacío con "Reintentar" en vez de quedar cargando para siempre. Test en Task 5 (`sin cache y sin red`).

---

## Task 1: Proyecto Gradle, configuración y app mínima que compila

**Files:**
- Create: `mobile/settings.gradle.kts`, `mobile/build.gradle.kts`, `mobile/gradle.properties`, `mobile/gradle/libs.versions.toml`, `mobile/.gitignore`, `mobile/local.properties` (no se commitea)
- Create (generados): `mobile/gradlew`, `mobile/gradlew.bat`, `mobile/gradle/wrapper/gradle-wrapper.jar`, `mobile/gradle/wrapper/gradle-wrapper.properties`
- Create: `mobile/app/build.gradle.kts`, `mobile/app/proguard-rules.pro`
- Create: `mobile/app/src/main/AndroidManifest.xml`, `mobile/app/src/main/res/xml/network_security_config.xml`, `mobile/app/src/main/res/values/themes.xml`, `mobile/app/src/main/res/values/strings.xml`
- Create: `mobile/app/src/main/java/com/fittrainer/FitTrainerApp.kt`, `mobile/app/src/main/java/com/fittrainer/MainActivity.kt`

**Interfaces:**
- Produces: `BuildConfig.API_BASE_URL: String` (siempre termina en `/`), `BuildConfig.API_TIMEOUT_SECONDS: Long`, `BuildConfig.DEBUG`. `@HiltAndroidApp class FitTrainerApp`, `@AndroidEntryPoint class MainActivity`. Catálogo `libs.*` con todos los alias usados en las tareas siguientes.

- [ ] **Step 1: `settings.gradle.kts`, `gradle.properties`, `.gitignore`, `local.properties`**

`mobile/settings.gradle.kts`:
```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "FitTrainer"
include(":app")
```

`mobile/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official
```

`mobile/.gitignore`:
```gitignore
.gradle/
.kotlin/
build/
local.properties
.env
.idea/
*.iml
captures/
.externalNativeBuild/
.cxx/
```

`mobile/local.properties` (no se commitea; ruta del SDK de Igna):
```properties
sdk.dir=C\:\\Users\\igna_\\AppData\\Local\\Android\\Sdk
```

- [ ] **Step 2: catálogo de versiones `mobile/gradle/libs.versions.toml`**

```toml
[versions]
agp = "8.12.3"
kotlin = "2.2.10"
ksp = "2.2.10-2.0.2"
hilt = "2.57.1"
composeBom = "2025.08.00"
coreKtx = "1.17.0"
activityCompose = "1.10.1"
lifecycle = "2.9.2"
navigation = "2.9.3"
hiltNavigationCompose = "1.2.0"
room = "2.7.2"
retrofit = "2.11.0"
okhttp = "4.12.0"
serialization = "1.9.0"
datastore = "1.1.7"
coroutines = "1.10.2"
junit = "4.13.2"
androidxTestExt = "1.3.0"
androidxTestRunner = "1.7.0"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-lifecycle-runtime-compose = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose", version.ref = "lifecycle" }
androidx-lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycle" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigation" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-compose-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-compose-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-compose-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-compose-material-icons-core = { group = "androidx.compose.material", name = "material-icons-core" }
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
androidx-hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version.ref = "hiltNavigationCompose" }
room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
retrofit-kotlinx-serialization = { group = "com.squareup.retrofit2", name = "converter-kotlinx-serialization", version.ref = "retrofit" }
okhttp = { group = "com.squareup.okhttp3", name = "okhttp", version.ref = "okhttp" }
okhttp-logging = { group = "com.squareup.okhttp3", name = "logging-interceptor", version.ref = "okhttp" }
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "serialization" }
androidx-datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
kotlinx-coroutines-test = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test", version.ref = "coroutines" }
junit = { group = "junit", name = "junit", version.ref = "junit" }
androidx-test-ext-junit = { group = "androidx.test.ext", name = "junit", version.ref = "androidxTestExt" }
androidx-test-runner = { group = "androidx.test", name = "runner", version.ref = "androidxTestRunner" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
```

- [ ] **Step 3: build scripts**

`mobile/build.gradle.kts`:
```kotlin
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
}
```

`mobile/app/build.gradle.kts`:
```kotlin
import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

// Config de mobile/.env (ver mobile/.env.example). Si no existe, defaults del emulador.
val dotenv = Properties().apply {
    val file = rootProject.file(".env")
    if (file.exists()) file.inputStream().use { load(it) }
}

fun env(key: String, default: String): String =
    dotenv.getProperty(key)?.trim()?.takeIf { it.isNotEmpty() } ?: default

// Retrofit exige que la base termine en "/"; el .env.example la trae sin barra.
val apiBaseUrl = env("API_BASE_URL", "http://10.0.2.2:3001/api").trimEnd('/') + "/"
val apiTimeoutSeconds = env("API_TIMEOUT_SECONDS", "30").toLong()

android {
    namespace = "com.fittrainer"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.fittrainer"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
        buildConfigField("long", "API_TIMEOUT_SECONDS", "${apiTimeoutSeconds}L")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.core)
    debugImplementation(libs.androidx.compose.ui.tooling)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.androidx.hilt.navigation.compose)

    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)

    implementation(libs.androidx.datastore.preferences)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)

    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.kotlinx.coroutines.test)
}
```

`mobile/app/proguard-rules.pro`:
```
# Sin minify en este sprint. Reglas de kotlinx.serialization/Retrofit cuando se active R8.
```

- [ ] **Step 4: manifest y recursos**

`mobile/app/src/main/AndroidManifest.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:name=".FitTrainerApp"
        android:allowBackup="false"
        android:label="@string/app_name"
        android:networkSecurityConfig="@xml/network_security_config"
        android:supportsRtl="true"
        android:theme="@style/Theme.FitTrainer">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

`mobile/app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- HTTP en claro SOLO contra el host del emulador (10.0.2.2). Todo lo demás exige HTTPS. -->
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">10.0.2.2</domain>
    </domain-config>
</network-security-config>
```

`mobile/app/src/main/res/values/themes.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Tema de ventana: solo el fondo oscuro mientras arranca Compose. -->
    <style name="Theme.FitTrainer" parent="android:Theme.Material.NoActionBar">
        <item name="android:windowBackground">#FF0B0D0C</item>
    </style>
</resources>
```

`mobile/app/src/main/res/values/strings.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">FitTrainer</string>
</resources>
```

- [ ] **Step 5: Application y Activity mínimas**

`mobile/app/src/main/java/com/fittrainer/FitTrainerApp.kt`:
```kotlin
package com.fittrainer

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class FitTrainerApp : Application()
```

`mobile/app/src/main/java/com/fittrainer/MainActivity.kt` (versión provisoria; la Task 6 la completa):
```kotlin
package com.fittrainer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.Text
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { Text("FitTrainer") }
    }
}
```

- [ ] **Step 6: generar el Gradle wrapper con el Gradle 8.14.3 en caché**

```bash
cd mobile
GRADLE_BIN=$(ls -d /c/Users/igna_/.gradle/wrapper/dists/gradle-8.14.3-bin/*/gradle-8.14.3/bin | head -1)
JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" "$GRADLE_BIN/gradle" wrapper --gradle-version 8.14.3 --distribution-type bin
```
Expected: `BUILD SUCCESSFUL`; existen `gradlew`, `gradlew.bat` y `gradle/wrapper/`.

- [ ] **Step 7: compilar y verificar el `BuildConfig` (Review Focus 1)**

```bash
cd mobile
JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug
grep -E "API_BASE_URL|API_TIMEOUT_SECONDS" app/build/generated/source/buildConfig/debug/com/fittrainer/BuildConfig.java
```
Expected: `BUILD SUCCESSFUL`, `API_BASE_URL = "http://10.0.2.2:3001/api/"`, `API_TIMEOUT_SECONDS = 30L`.

Luego crear un `mobile/.env` temporal con `API_BASE_URL=http://10.0.2.2:3001/api` (sin barra), correr de nuevo `./gradlew assembleDebug` y el `grep`: debe seguir terminando en `/api/`. Borrar el `.env` temporal.

- [ ] **Step 8: Commit (Igna)**

```bash
git add mobile/
git commit -m "feat(mobile): proyecto Android base (Gradle, Hilt, BuildConfig, red en claro solo 10.0.2.2)"
```

---

## Task 2: Tema de marca (tokens + fuentes)

**Files:**
- Create: `mobile/app/src/main/res/font/` (9 TTF), `mobile/FONTS-LICENSE.md`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/theme/Color.kt`, `Type.kt`, `Shape.kt`, `Spacing.kt`, `Theme.kt`

**Interfaces:**
- Produces: `@Composable fun FitTrainerTheme(content: @Composable () -> Unit)`; `object FtColors` (constantes `Color`); `object Spacing` (`xs`…`xxxl`, `minTouchTarget = 44.dp`); `object FtRadius` (`chip`, `control`, `card`, `pill`). Las pantallas usan `MaterialTheme.typography.*`, `MaterialTheme.colorScheme.*` y `FtColors.Amber` para la franja offline.

- [ ] **Step 1: descargar las fuentes (Fontsource, OFL)**

```bash
cd mobile/app/src/main/res && mkdir -p font && cd font
base=https://cdn.jsdelivr.net/fontsource/fonts
for w in 500 600 700; do curl -fsSL -o space_grotesk_$w.ttf "$base/space-grotesk@latest/latin-$w-normal.ttf"; done
for w in 400 500 600; do curl -fsSL -o inter_$w.ttf "$base/inter@latest/latin-$w-normal.ttf"; done
for w in 400 500 600; do curl -fsSL -o jetbrains_mono_$w.ttf "$base/jetbrains-mono@latest/latin-$w-normal.ttf"; done
ls -la && head -c 4 inter_400.ttf | od -An -tx1
```
Expected: 9 archivos de decenas de KB; los primeros bytes `00 01 00 00` (TrueType). Si alguna descarga falla, reportar BLOCKED con la URL (no inventar fuentes).

`mobile/FONTS-LICENSE.md`:
```markdown
# Fuentes

`app/src/main/res/font/` contiene Space Grotesk, Inter y JetBrains Mono (subset latin),
descargadas de Fontsource. Las tres se distribuyen bajo la SIL Open Font License 1.1:
https://openfontlicense.org
```

- [ ] **Step 2: `Color.kt`**

```kotlin
package com.fittrainer.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color

/** Tokens de color de la Guía Mobile (p.7). Un color semántico por significado. */
object FtColors {
    val Brand = Color(0xFF2952D9)
    val BrandText = Color(0xFF5E7DE2)
    val BrandPressed = Color(0xFF1B3AA8)

    val Background = Color(0xFF0B0D0C)
    val Surface = Color(0xFF111413)
    val Card = Color(0xFF181C1B)
    val Elevated = Color(0xFF232927)
    val Border = Color(0xFF2F3634)
    val Ink5 = Color(0xFF485150)
    val TextSecondary = Color(0xFF8C9593)
    val TextPrimary = Color(0xFFF5F2EC)

    val Green = Color(0xFF4AE290)
    val Coral = Color(0xFFFF5C3A)
    val Cyan = Color(0xFF36C6FF)
    val Amber = Color(0xFFFFB020)
}

internal val FtColorScheme = darkColorScheme(
    primary = FtColors.Brand,
    onPrimary = FtColors.TextPrimary,
    primaryContainer = FtColors.BrandPressed,
    onPrimaryContainer = FtColors.TextPrimary,
    secondary = FtColors.BrandText,
    onSecondary = FtColors.Background,
    background = FtColors.Background,
    onBackground = FtColors.TextPrimary,
    surface = FtColors.Surface,
    onSurface = FtColors.TextPrimary,
    surfaceVariant = FtColors.Card,
    onSurfaceVariant = FtColors.TextSecondary,
    surfaceContainer = FtColors.Card,
    surfaceContainerHigh = FtColors.Elevated,
    outline = FtColors.Border,
    outlineVariant = FtColors.Ink5,
    error = FtColors.Coral,
    onError = FtColors.Background,
)
```

- [ ] **Step 3: `Type.kt`**

```kotlin
package com.fittrainer.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.fittrainer.R

val SpaceGrotesk = FontFamily(
    Font(R.font.space_grotesk_500, FontWeight.Medium),
    Font(R.font.space_grotesk_600, FontWeight.SemiBold),
    Font(R.font.space_grotesk_700, FontWeight.Bold),
)

val Inter = FontFamily(
    Font(R.font.inter_400, FontWeight.Normal),
    Font(R.font.inter_500, FontWeight.Medium),
    Font(R.font.inter_600, FontWeight.SemiBold),
)

val JetBrainsMono = FontFamily(
    Font(R.font.jetbrains_mono_400, FontWeight.Normal),
    Font(R.font.jetbrains_mono_500, FontWeight.Medium),
    Font(R.font.jetbrains_mono_600, FontWeight.SemiBold),
)

/**
 * Escala de la Guía Mobile (p.8): Space Grotesk para jerarquía, Inter para lectura,
 * JetBrains Mono para datos. Mínimos: texto 11 sp, etiquetas mono 9 sp.
 */
internal val FtTypography = Typography(
    // Display XL · 700 / -3px
    displayLarge = TextStyle(fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 40.sp, lineHeight = 44.sp, letterSpacing = (-3).sp),
    // Display L · 700 / -1.5px
    displayMedium = TextStyle(fontFamily = SpaceGrotesk, fontWeight = FontWeight.Bold, fontSize = 28.sp, lineHeight = 32.sp, letterSpacing = (-1.5).sp),
    // Título · 600 / -0.5px
    titleLarge = TextStyle(fontFamily = SpaceGrotesk, fontWeight = FontWeight.SemiBold, fontSize = 22.sp, lineHeight = 28.sp, letterSpacing = (-0.5).sp),
    // Subtítulo · 600
    titleMedium = TextStyle(fontFamily = SpaceGrotesk, fontWeight = FontWeight.SemiBold, fontSize = 18.sp, lineHeight = 24.sp),
    // Cuerpo · Inter 400
    bodyLarge = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp),
    // Cuerpo S · Inter 400
    bodyMedium = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Normal, fontSize = 12.sp, lineHeight = 16.sp),
    // Botones
    labelLarge = TextStyle(fontFamily = Inter, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, lineHeight = 20.sp),
    // Etiqueta · Mono 500
    labelMedium = TextStyle(fontFamily = JetBrainsMono, fontWeight = FontWeight.Medium, fontSize = 12.sp, lineHeight = 16.sp, letterSpacing = 1.sp),
    labelSmall = TextStyle(fontFamily = JetBrainsMono, fontWeight = FontWeight.Medium, fontSize = 10.sp, lineHeight = 14.sp, letterSpacing = 1.sp),
)
```

- [ ] **Step 4: `Shape.kt` y `Spacing.kt`**

`Shape.kt`:
```kotlin
package com.fittrainer.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/** Radios de la Guía Mobile (p.9). */
object FtRadius {
    val chip = 6.dp
    val control = 12.dp // botón e input
    val card = 14.dp
    val pill = 99.dp
}

internal val FtShapes = Shapes(
    extraSmall = RoundedCornerShape(FtRadius.chip),
    small = RoundedCornerShape(FtRadius.control),
    medium = RoundedCornerShape(FtRadius.card),
    large = RoundedCornerShape(FtRadius.card),
    extraLarge = RoundedCornerShape(FtRadius.pill),
)
```

`Spacing.kt`:
```kotlin
package com.fittrainer.ui.theme

import androidx.compose.ui.unit.dp

/** Escala de espaciado base 4 (Guía Mobile p.9). */
object Spacing {
    val xs = 4.dp
    val sm = 8.dp
    val md = 12.dp
    val lg = 16.dp
    val xl = 24.dp
    val xxl = 32.dp
    val xxxl = 40.dp

    /** Altura mínima de cualquier elemento tocable. */
    val minTouchTarget = 44.dp
}
```

- [ ] **Step 5: `Theme.kt` y usarlo en `MainActivity`**

`Theme.kt`:
```kotlin
package com.fittrainer.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable

/** Tema único de la app: oscuro (no existe versión clara). */
@Composable
fun FitTrainerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = FtColorScheme,
        typography = FtTypography,
        shapes = FtShapes,
        content = content,
    )
}
```

En `MainActivity.kt`, reemplazar `setContent { Text("FitTrainer") }` por:
```kotlin
        setContent {
            FitTrainerTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    Text("FitTrainer", style = MaterialTheme.typography.displayLarge)
                }
            }
        }
```
con los imports `androidx.compose.foundation.layout.fillMaxSize`, `androidx.compose.material3.MaterialTheme`, `androidx.compose.material3.Surface`, `androidx.compose.ui.Modifier`, `com.fittrainer.ui.theme.FitTrainerTheme`.

- [ ] **Step 6: compilar**

```bash
cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug
```
Expected: `BUILD SUCCESSFUL` (las 9 fuentes resuelven como `R.font.*`).

- [ ] **Step 7: Commit (Igna)**

```bash
git add mobile/
git commit -m "feat(mobile): tema de marca (colores, tipografía, radios, espaciado, fuentes OFL)"
```

---

## Task 3: Sesión provisoria con DataStore

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/session/Session.kt`, `SessionRepository.kt`, `DataStoreSessionRepository.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/di/SessionModule.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/session/DataStoreSessionRepositoryTest.kt`

**Interfaces:**
- Produces:
  - `enum class Role { STUDENT, TRAINER }`
  - `sealed interface Session { data object LoggedOut; data object Student; data object Trainer }`
  - `interface SessionRepository { val session: Flow<Session>; suspend fun signInAs(role: Role); suspend fun signOut() }`
  - Hilt provee `SessionRepository` como singleton.

- [ ] **Step 1: modelos e interfaz**

`Session.kt`:
```kotlin
package com.fittrainer.data.session

enum class Role { STUDENT, TRAINER }

/** Estado de sesión que decide qué navegación ve el usuario. */
sealed interface Session {
    data object LoggedOut : Session
    data object Student : Session
    data object Trainer : Session
}
```

`SessionRepository.kt`:
```kotlin
package com.fittrainer.data.session

import kotlinx.coroutines.flow.Flow

/**
 * Sesión del usuario. La implementación actual es PROVISORIA (solo guarda el rol):
 * la tarjeta de auth mobile la reemplaza por JWT en EncryptedSharedPreferences
 * sin cambiar esta interfaz.
 */
interface SessionRepository {
    val session: Flow<Session>
    suspend fun signInAs(role: Role)
    suspend fun signOut()
}
```

- [ ] **Step 2: escribir el test que falla**

`DataStoreSessionRepositoryTest.kt`:
```kotlin
package com.fittrainer.data.session

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import java.io.File
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class DataStoreSessionRepositoryTest {

    @get:Rule val tmp = TemporaryFolder()

    private val scopes = mutableListOf<TestScope>()

    @After fun tearDown() = scopes.forEach { it.cancel() }

    private fun dataStore(): DataStore<Preferences> {
        val scope = TestScope(UnconfinedTestDispatcher() + Job()).also { scopes += it }
        return PreferenceDataStoreFactory.create(scope = scope) {
            File(tmp.root, "session.preferences_pb")
        }
    }

    @Test fun `arranca sin sesion`() = runTest {
        val repo = DataStoreSessionRepository(dataStore())
        assertEquals(Session.LoggedOut, repo.session.first())
    }

    @Test fun `signInAs alumno emite Student`() = runTest {
        val repo = DataStoreSessionRepository(dataStore())
        repo.signInAs(Role.STUDENT)
        assertEquals(Session.Student, repo.session.first())
    }

    @Test fun `signInAs entrenador emite Trainer`() = runTest {
        val repo = DataStoreSessionRepository(dataStore())
        repo.signInAs(Role.TRAINER)
        assertEquals(Session.Trainer, repo.session.first())
    }

    @Test fun `signOut vuelve a LoggedOut`() = runTest {
        val repo = DataStoreSessionRepository(dataStore())
        repo.signInAs(Role.TRAINER)
        repo.signOut()
        assertEquals(Session.LoggedOut, repo.session.first())
    }

    // Review Focus 4: el rol sobrevive a cerrar y reabrir la app (otra instancia sobre el mismo archivo).
    @Test fun `el rol persiste entre instancias`() = runTest {
        DataStoreSessionRepository(dataStore()).signInAs(Role.STUDENT)
        scopes.forEach { it.cancel() } // "cierra la app": libera el archivo
        val reopened = DataStoreSessionRepository(dataStore())
        assertEquals(Session.Student, reopened.session.first())
    }
}
```

- [ ] **Step 3: correr y ver que falla**

```bash
cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.session.*"
```
Expected: FAIL de compilación, `Unresolved reference 'DataStoreSessionRepository'`.

- [ ] **Step 4: implementación**

`DataStoreSessionRepository.kt`:
```kotlin
package com.fittrainer.data.session

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/** Sesión provisoria: persiste solo el rol elegido en la pantalla de login de desarrollo. */
class DataStoreSessionRepository(
    private val dataStore: DataStore<Preferences>,
) : SessionRepository {

    private val roleKey = stringPreferencesKey("role")

    override val session: Flow<Session> = dataStore.data.map { prefs ->
        when (prefs[roleKey]) {
            Role.STUDENT.name -> Session.Student
            Role.TRAINER.name -> Session.Trainer
            else -> Session.LoggedOut
        }
    }

    override suspend fun signInAs(role: Role) {
        dataStore.edit { it[roleKey] = role.name }
    }

    override suspend fun signOut() {
        dataStore.edit { it.remove(roleKey) }
    }
}
```

`mobile/app/src/main/java/com/fittrainer/di/SessionModule.kt`:
```kotlin
package com.fittrainer.di

import android.content.Context
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.preferencesDataStoreFile
import com.fittrainer.data.session.DataStoreSessionRepository
import com.fittrainer.data.session.SessionRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object SessionModule {

    @Provides
    @Singleton
    fun provideSessionRepository(@ApplicationContext context: Context): SessionRepository =
        DataStoreSessionRepository(
            PreferenceDataStoreFactory.create { context.preferencesDataStoreFile("session") }
        )
}
```

- [ ] **Step 5: correr y ver que pasa**

```bash
cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.session.*"
```
Expected: `BUILD SUCCESSFUL`, 5 tests passing.

- [ ] **Step 6: Commit (Igna)**

```bash
git add mobile/
git commit -m "feat(mobile): sesión provisoria por rol con DataStore"
```

---

## Task 4: Capa de datos del `/health` (Retrofit + Room + repositorio)

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/data/api/FitTrainerApi.kt`, `HealthResponse.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/db/HealthSnapshotEntity.kt`, `HealthDao.kt`, `FitTrainerDatabase.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/data/repository/HealthSnapshot.kt`, `HealthRepository.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/di/NetworkModule.kt`, `DatabaseModule.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/data/repository/HealthRepositoryTest.kt`, `mobile/app/src/test/java/com/fittrainer/data/FakeHealth.kt`
- Test (instrumentado): `mobile/app/src/androidTest/java/com/fittrainer/data/db/HealthDaoTest.kt`

**Interfaces:**
- Produces:
  - `data class HealthSnapshot(val status: String, val version: String, val serverTimestamp: String, val fetchedAt: Long)`
  - `class HealthRepository @Inject constructor(api: FitTrainerApi, dao: HealthDao, clock: java.time.Clock)` con `fun observe(): Flow<HealthSnapshot?>` y `suspend fun refresh(): Result<Unit>`
  - `interface FitTrainerApi { @GET("/health") suspend fun health(): HealthResponse }`
  - `interface HealthDao { fun observe(): Flow<HealthSnapshotEntity?>; suspend fun upsert(entity: HealthSnapshotEntity) }`
  - Fakes de test: `FakeHealthApi`, `FakeHealthDao` en `com.fittrainer.data` (source set `test`), reusados por la Task 5.

- [ ] **Step 1: DTO, API, entidad, DAO, base y modelo**

`data/api/HealthResponse.kt`:
```kotlin
package com.fittrainer.data.api

import kotlinx.serialization.Serializable

/** Respuesta de GET /health del backend: {"status":"ok","timestamp":"...","version":"0.1.0"}. */
@Serializable
data class HealthResponse(
    val status: String,
    val timestamp: String,
    val version: String,
)
```

`data/api/FitTrainerApi.kt`:
```kotlin
package com.fittrainer.data.api

import retrofit2.http.GET

/**
 * API REST del backend. Los endpoints futuros van SIN barra inicial (relativos a /api/).
 * /health es la excepción: el backend lo expone fuera de /api, por eso la barra inicial.
 */
interface FitTrainerApi {
    @GET("/health")
    suspend fun health(): HealthResponse
}
```

`data/db/HealthSnapshotEntity.kt`:
```kotlin
package com.fittrainer.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Último /health conocido. Una sola fila (id = 0). */
@Entity(tableName = "health_snapshot")
data class HealthSnapshotEntity(
    @PrimaryKey val id: Int = 0,
    val status: String,
    val version: String,
    val serverTimestamp: String,
    val fetchedAt: Long,
)
```

`data/db/HealthDao.kt`:
```kotlin
package com.fittrainer.data.db

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface HealthDao {
    @Query("SELECT * FROM health_snapshot WHERE id = 0")
    fun observe(): Flow<HealthSnapshotEntity?>

    @Upsert
    suspend fun upsert(entity: HealthSnapshotEntity)
}
```

`data/db/FitTrainerDatabase.kt`:
```kotlin
package com.fittrainer.data.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [HealthSnapshotEntity::class], version = 1, exportSchema = false)
abstract class FitTrainerDatabase : RoomDatabase() {
    abstract fun healthDao(): HealthDao
}
```

`data/repository/HealthSnapshot.kt`:
```kotlin
package com.fittrainer.data.repository

/** Estado del servidor tal como lo ve la UI. fetchedAt = epoch ms del dispositivo. */
data class HealthSnapshot(
    val status: String,
    val version: String,
    val serverTimestamp: String,
    val fetchedAt: Long,
)
```

- [ ] **Step 2: fakes de test**

`mobile/app/src/test/java/com/fittrainer/data/FakeHealth.kt`:
```kotlin
package com.fittrainer.data

import com.fittrainer.data.api.FitTrainerApi
import com.fittrainer.data.api.HealthResponse
import com.fittrainer.data.db.HealthDao
import com.fittrainer.data.db.HealthSnapshotEntity
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

/** API falsa: devuelve [response] o lanza [error]. Si [gate] no es null, espera a que se complete. */
class FakeHealthApi(
    var response: HealthResponse = HealthResponse("ok", "2026-10-13T12:00:00.000Z", "0.1.0"),
    var error: Throwable? = null,
) : FitTrainerApi {
    var calls = 0
    var gate: CompletableDeferred<Unit>? = null

    override suspend fun health(): HealthResponse {
        calls++
        gate?.await()
        error?.let { throw it }
        return response
    }
}

/** DAO falso en memoria con la misma semántica de una sola fila. */
class FakeHealthDao(initial: HealthSnapshotEntity? = null) : HealthDao {
    val state = MutableStateFlow(initial)
    override fun observe(): Flow<HealthSnapshotEntity?> = state
    override suspend fun upsert(entity: HealthSnapshotEntity) {
        state.value = entity
    }
}
```

- [ ] **Step 3: test del repositorio que falla**

`mobile/app/src/test/java/com/fittrainer/data/repository/HealthRepositoryTest.kt`:
```kotlin
package com.fittrainer.data.repository

import com.fittrainer.data.FakeHealthApi
import com.fittrainer.data.FakeHealthDao
import com.fittrainer.data.db.HealthSnapshotEntity
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.SerializationException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HealthRepositoryTest {

    private val clock = Clock.fixed(Instant.ofEpochMilli(1_000L), ZoneOffset.UTC)
    private val cached = HealthSnapshotEntity(
        status = "ok", version = "0.0.9", serverTimestamp = "2026-10-12T10:00:00.000Z", fetchedAt = 500L,
    )

    @Test fun `observe devuelve null sin cache`() = runTest {
        val repo = HealthRepository(FakeHealthApi(), FakeHealthDao(), clock)
        assertNull(repo.observe().first())
    }

    @Test fun `refresh exitoso guarda en Room con la hora del dispositivo`() = runTest {
        val dao = FakeHealthDao()
        val repo = HealthRepository(FakeHealthApi(), dao, clock)

        val result = repo.refresh()

        assertTrue(result.isSuccess)
        assertEquals(
            HealthSnapshot("ok", "0.1.0", "2026-10-13T12:00:00.000Z", fetchedAt = 1_000L),
            repo.observe().first(),
        )
    }

    @Test fun `refresh sin red devuelve failure y no toca el cache`() = runTest {
        val dao = FakeHealthDao(cached)
        val repo = HealthRepository(FakeHealthApi(error = IOException("sin red")), dao, clock)

        val result = repo.refresh()

        assertTrue(result.exceptionOrNull() is IOException)
        assertEquals(cached, dao.state.value)
    }

    // Review Focus 2: body que no es el JSON esperado → failure, sin crash, cache intacto.
    @Test fun `refresh con body invalido no toca el cache`() = runTest {
        val dao = FakeHealthDao(cached)
        val repo = HealthRepository(FakeHealthApi(error = SerializationException("html")), dao, clock)

        val result = repo.refresh()

        assertTrue(result.isFailure)
        assertEquals(cached, dao.state.value)
    }
}
```

- [ ] **Step 4: correr y ver que falla**

```bash
cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.repository.*"
```
Expected: FAIL de compilación, `Unresolved reference 'HealthRepository'`.

- [ ] **Step 5: implementar el repositorio**

`data/repository/HealthRepository.kt`:
```kotlin
package com.fittrainer.data.repository

import com.fittrainer.data.api.FitTrainerApi
import com.fittrainer.data.db.HealthDao
import com.fittrainer.data.db.HealthSnapshotEntity
import java.time.Clock
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Patrón offline-first: la UI observa Room; refresh() trae de la API y escribe en Room.
 * Si la API falla, el caché queda como estaba.
 */
class HealthRepository @Inject constructor(
    private val api: FitTrainerApi,
    private val dao: HealthDao,
    private val clock: Clock,
) {
    fun observe(): Flow<HealthSnapshot?> = dao.observe().map { entity ->
        entity?.let { HealthSnapshot(it.status, it.version, it.serverTimestamp, it.fetchedAt) }
    }

    suspend fun refresh(): Result<Unit> = try {
        val response = api.health()
        dao.upsert(
            HealthSnapshotEntity(
                status = response.status,
                version = response.version,
                serverTimestamp = response.timestamp,
                fetchedAt = clock.millis(),
            )
        )
        Result.success(Unit)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

- [ ] **Step 6: correr y ver que pasa**

```bash
cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.data.repository.*"
```
Expected: 4 tests passing.

- [ ] **Step 7: módulos de Hilt**

`di/NetworkModule.kt`:
```kotlin
package com.fittrainer.di

import com.fittrainer.BuildConfig
import com.fittrainer.data.api.FitTrainerApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideJson(): Json = Json { ignoreUnknownKeys = true }

    @Provides
    @Singleton
    fun provideOkHttp(): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(BuildConfig.API_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(BuildConfig.API_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(BuildConfig.API_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .apply {
            if (BuildConfig.DEBUG) {
                addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC))
            }
        }
        .build()

    @Provides
    @Singleton
    fun provideApi(client: OkHttpClient, json: Json): FitTrainerApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(FitTrainerApi::class.java)
}
```

`di/DatabaseModule.kt`:
```kotlin
package com.fittrainer.di

import android.content.Context
import androidx.room.Room
import com.fittrainer.data.db.FitTrainerDatabase
import com.fittrainer.data.db.HealthDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.time.Clock
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): FitTrainerDatabase =
        Room.databaseBuilder(context, FitTrainerDatabase::class.java, "fittrainer.db").build()

    @Provides
    fun provideHealthDao(db: FitTrainerDatabase): HealthDao = db.healthDao()

    @Provides
    @Singleton
    fun provideClock(): Clock = Clock.systemDefaultZone()
}
```

- [ ] **Step 8: test instrumentado del DAO**

`mobile/app/src/androidTest/java/com/fittrainer/data/db/HealthDaoTest.kt`:
```kotlin
package com.fittrainer.data.db

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HealthDaoTest {

    private lateinit var db: FitTrainerDatabase
    private lateinit var dao: HealthDao

    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(), FitTrainerDatabase::class.java,
        ).build()
        dao = db.healthDao()
    }

    @After fun tearDown() = db.close()

    @Test fun observeSinDatosDevuelveNull() = runTest {
        assertNull(dao.observe().first())
    }

    @Test fun upsertGuardaYObserveLaDevuelve() = runTest {
        val snapshot = HealthSnapshotEntity(status = "ok", version = "0.1.0", serverTimestamp = "t1", fetchedAt = 1L)
        dao.upsert(snapshot)
        assertEquals(snapshot, dao.observe().first())
    }

    @Test fun segundoUpsertReemplazaLaUnicaFila() = runTest {
        dao.upsert(HealthSnapshotEntity(status = "ok", version = "0.1.0", serverTimestamp = "t1", fetchedAt = 1L))
        val newer = HealthSnapshotEntity(status = "ok", version = "0.2.0", serverTimestamp = "t2", fetchedAt = 2L)
        dao.upsert(newer)
        assertEquals(newer, dao.observe().first())
    }
}
```

(El test instrumentado se corre en la Task 7, con el emulador levantado.)

- [ ] **Step 9: compilar todo**

```bash
cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug assembleDebugAndroidTest testDebugUnitTest
```
Expected: `BUILD SUCCESSFUL`; 9 tests unitarios passing (5 de sesión + 4 de repositorio).

- [ ] **Step 10: Commit (Igna)**

```bash
git add mobile/
git commit -m "feat(mobile): /health offline-first (Retrofit + Room + repositorio)"
```

---

## Task 5: `HealthViewModel` y `HealthScreen`

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/ui/health/HealthUiState.kt`, `HealthViewModel.kt`, `HealthScreen.kt`
- Test: `mobile/app/src/test/java/com/fittrainer/ui/health/HealthViewModelTest.kt`, `mobile/app/src/test/java/com/fittrainer/MainDispatcherRule.kt`

**Interfaces:**
- Consumes: `HealthRepository(api, dao, clock)`, `observe()`, `refresh()`; fakes `FakeHealthApi`, `FakeHealthDao` (Task 4).
- Produces:
  - `data class HealthUiState(val snapshot: HealthSnapshot? = null, val isRefreshing: Boolean = false, val error: String? = null)`
  - `@HiltViewModel class HealthViewModel @Inject constructor(repository: HealthRepository)` con `val uiState: StateFlow<HealthUiState>` y `fun retry()`
  - `@Composable fun HealthScreen(onBack: () -> Unit, viewModel: HealthViewModel = hiltViewModel())`

- [ ] **Step 1: regla de dispatcher y test que falla**

`mobile/app/src/test/java/com/fittrainer/MainDispatcherRule.kt`:
```kotlin
package com.fittrainer

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.TestDispatcher
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.rules.TestWatcher
import org.junit.runner.Description

/** Reemplaza Dispatchers.Main (viewModelScope) por un dispatcher de test. */
class MainDispatcherRule(
    val dispatcher: TestDispatcher = UnconfinedTestDispatcher(),
) : TestWatcher() {
    override fun starting(description: Description) = Dispatchers.setMain(dispatcher)
    override fun finished(description: Description) = Dispatchers.resetMain()
}
```

`mobile/app/src/test/java/com/fittrainer/ui/health/HealthViewModelTest.kt`:
```kotlin
package com.fittrainer.ui.health

import com.fittrainer.MainDispatcherRule
import com.fittrainer.data.FakeHealthApi
import com.fittrainer.data.FakeHealthDao
import com.fittrainer.data.db.HealthSnapshotEntity
import com.fittrainer.data.repository.HealthRepository
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class HealthViewModelTest {

    @get:Rule val mainRule = MainDispatcherRule()

    private val clock = Clock.fixed(Instant.ofEpochMilli(1_000L), ZoneOffset.UTC)
    private val cached = HealthSnapshotEntity(
        status = "ok", version = "0.0.9", serverTimestamp = "2026-10-12T10:00:00.000Z", fetchedAt = 500L,
    )

    private fun viewModel(api: FakeHealthApi, dao: FakeHealthDao) =
        HealthViewModel(HealthRepository(api, dao, clock))

    @Test fun `al abrir refresca y muestra los datos`() = runTest {
        val vm = viewModel(FakeHealthApi(), FakeHealthDao())
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

        val state = vm.uiState.value
        assertEquals("0.1.0", state.snapshot?.version)
        assertFalse(state.isRefreshing)
        assertNull(state.error)
    }

    // Review Focus 5: primer arranque sin backend → vacío con error, no "cargando" para siempre.
    @Test fun `sin cache y sin red muestra error y snapshot null`() = runTest {
        val vm = viewModel(FakeHealthApi(error = IOException("sin red")), FakeHealthDao())
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

        val state = vm.uiState.value
        assertNull(state.snapshot)
        assertFalse(state.isRefreshing)
        assertEquals("Sin conexión con el servidor", state.error)
    }

    @Test fun `con cache y sin red conserva los datos y muestra el error`() = runTest {
        val vm = viewModel(FakeHealthApi(error = IOException("sin red")), FakeHealthDao(cached))
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

        val state = vm.uiState.value
        assertEquals("0.0.9", state.snapshot?.version)
        assertNotNull(state.error)
    }

    @Test fun `retry despues de un error exitoso limpia el error`() = runTest {
        val api = FakeHealthApi(error = IOException("sin red"))
        val vm = viewModel(api, FakeHealthDao())
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

        api.error = null
        vm.retry()

        val state = vm.uiState.value
        assertNull(state.error)
        assertEquals("0.1.0", state.snapshot?.version)
    }

    // Review Focus 3: tocar "Reintentar" varias veces no lanza refreshes en paralelo.
    @Test fun `retry mientras refresca no lanza otro refresh`() = runTest {
        val api = FakeHealthApi().apply { gate = CompletableDeferred() }
        val vm = viewModel(api, FakeHealthDao())
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { vm.uiState.collect {} }

        assertTrue(vm.uiState.value.isRefreshing)
        vm.retry()
        vm.retry()
        api.gate!!.complete(Unit)

        assertEquals(1, api.calls)
        assertFalse(vm.uiState.value.isRefreshing)
    }
}
```

- [ ] **Step 2: correr y ver que falla**

```bash
cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.ui.health.*"
```
Expected: FAIL de compilación, `Unresolved reference 'HealthViewModel'`.

- [ ] **Step 3: estado y ViewModel**

`ui/health/HealthUiState.kt`:
```kotlin
package com.fittrainer.ui.health

import com.fittrainer.data.repository.HealthSnapshot

/** snapshot = lo que hay en Room (puede ser viejo); error = último refresh fallido. */
data class HealthUiState(
    val snapshot: HealthSnapshot? = null,
    val isRefreshing: Boolean = false,
    val error: String? = null,
)
```

`ui/health/HealthViewModel.kt`:
```kotlin
package com.fittrainer.ui.health

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.repository.HealthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.io.IOException
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import retrofit2.HttpException

@HiltViewModel
class HealthViewModel @Inject constructor(
    private val repository: HealthRepository,
) : ViewModel() {

    private val refresh = MutableStateFlow(RefreshState())

    val uiState: StateFlow<HealthUiState> =
        combine(repository.observe(), refresh) { snapshot, r ->
            HealthUiState(snapshot = snapshot, isRefreshing = r.isRefreshing, error = r.error)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HealthUiState(isRefreshing = true))

    init {
        retry()
    }

    /** Vuelve a pedir /health. Si ya hay un refresh en curso, no hace nada. */
    fun retry() {
        if (refresh.value.isRefreshing) return
        refresh.value = RefreshState(isRefreshing = true)
        viewModelScope.launch {
            val result = repository.refresh()
            refresh.value = RefreshState(error = result.exceptionOrNull()?.let(::toMessage))
        }
    }

    private fun toMessage(error: Throwable): String = when (error) {
        is IOException -> "Sin conexión con el servidor"
        is HttpException -> "El servidor respondió con error ${error.code()}"
        else -> "No se pudo actualizar el estado del servidor"
    }

    private data class RefreshState(val isRefreshing: Boolean = false, val error: String? = null)
}
```

- [ ] **Step 4: correr y ver que pasa**

```bash
cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew testDebugUnitTest --tests "com.fittrainer.ui.health.*"
```
Expected: 5 tests passing.

- [ ] **Step 5: la pantalla**

`ui/health/HealthScreen.kt`:
```kotlin
package com.fittrainer.ui.health

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.repository.HealthSnapshot
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val hourFormat = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.systemDefault())

private fun formatHour(epochMillis: Long): String = hourFormat.format(Instant.ofEpochMilli(epochMillis))

@Composable
fun HealthScreen(onBack: () -> Unit, viewModel: HealthViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    HealthContent(state = state, onRetry = viewModel::retry, onBack = onBack)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HealthContent(state: HealthUiState, onRetry: () -> Unit, onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Estado del servidor") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
            )
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (state.isRefreshing) LinearProgressIndicator(Modifier.fillMaxWidth())

            val snapshot = state.snapshot
            if (snapshot != null && state.error != null) OfflineBanner(snapshot.fetchedAt)

            when {
                snapshot != null -> SnapshotDetails(snapshot, onRetry, state.isRefreshing)
                !state.isRefreshing -> EmptyState(state.error, onRetry)
            }
        }
    }
}

@Composable
private fun OfflineBanner(fetchedAt: Long) {
    Text(
        text = "Sin conexión — mostrando datos de las ${formatHour(fetchedAt)}",
        style = MaterialTheme.typography.bodyMedium,
        color = FtColors.Background,
        modifier = Modifier
            .fillMaxWidth()
            .background(FtColors.Amber)
            .padding(horizontal = Spacing.lg, vertical = Spacing.md),
    )
}

@Composable
private fun SnapshotDetails(snapshot: HealthSnapshot, onRetry: () -> Unit, isRefreshing: Boolean) {
    Column(
        modifier = Modifier.padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Text("ESTADO", style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
        Text(
            snapshot.status.uppercase(),
            style = MaterialTheme.typography.displayLarge,
            color = if (snapshot.status == "ok") FtColors.Green else FtColors.Coral,
        )
        Text("Versión ${snapshot.version}", style = MaterialTheme.typography.bodyLarge)
        Text("Hora del servidor: ${snapshot.serverTimestamp}", style = MaterialTheme.typography.bodyMedium)
        Text(
            "Actualizado a las ${formatHour(snapshot.fetchedAt)}",
            style = MaterialTheme.typography.bodyMedium,
            color = FtColors.TextSecondary,
        )
        OutlinedButton(
            onClick = onRetry,
            enabled = !isRefreshing,
            modifier = Modifier.heightIn(min = Spacing.minTouchTarget),
        ) { Text("Actualizar") }
    }
}

@Composable
private fun EmptyState(error: String?, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize().padding(Spacing.lg), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            Text("Sin datos del servidor", style = MaterialTheme.typography.titleLarge)
            if (error != null) Text(error, style = MaterialTheme.typography.bodyMedium, color = FtColors.TextSecondary)
            Button(onClick = onRetry, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) { Text("Reintentar") }
        }
    }
}
```

- [ ] **Step 6: compilar y correr todos los unit tests**

```bash
cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug testDebugUnitTest
```
Expected: `BUILD SUCCESSFUL`; 14 tests passing.

- [ ] **Step 7: Commit (Igna)**

```bash
git add mobile/
git commit -m "feat(mobile): pantalla Estado del servidor con caché offline"
```

---

## Task 6: Login de desarrollo y navegación por rol

**Files:**
- Create: `mobile/app/src/main/java/com/fittrainer/navigation/AppNavHost.kt`, `RootViewModel.kt`, `RoleTabs.kt`, `RoleShell.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/login/LoginScreen.kt`, `LoginViewModel.kt`
- Create: `mobile/app/src/main/java/com/fittrainer/ui/placeholder/PlaceholderScreen.kt`, `AccountMenuScreen.kt`
- Modify: `mobile/app/src/main/java/com/fittrainer/MainActivity.kt`

**Interfaces:**
- Consumes: `SessionRepository` (`session`, `signInAs(Role)`, `signOut()`), `Session`, `Role` (Task 3); `HealthScreen(onBack)` (Task 5); `FitTrainerTheme`, `Spacing`, `FtColors` (Task 2).
- Produces: `@Composable fun AppNavHost()` usado por `MainActivity`.

- [ ] **Step 1: ViewModels**

`navigation/RootViewModel.kt`:
```kotlin
package com.fittrainer.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.session.Session
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Decide la navegación raíz según la sesión. null = todavía leyendo DataStore. */
@HiltViewModel
class RootViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
) : ViewModel() {

    val session: StateFlow<Session?> =
        sessionRepository.session.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    fun signOut() {
        viewModelScope.launch { sessionRepository.signOut() }
    }
}
```

`ui/login/LoginViewModel.kt`:
```kotlin
package com.fittrainer.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fittrainer.data.session.Role
import com.fittrainer.data.session.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.launch

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
) : ViewModel() {
    fun signInAs(role: Role) {
        viewModelScope.launch { sessionRepository.signInAs(role) }
    }
}
```

- [ ] **Step 2: pantallas simples**

`ui/login/LoginScreen.kt`:
```kotlin
package com.fittrainer.ui.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.fittrainer.data.session.Role
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Login PROVISORIO de desarrollo: elegís el rol. La tarjeta de auth lo reemplaza. */
@Composable
fun LoginScreen(viewModel: LoginViewModel = hiltViewModel()) {
    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.lg, androidx.compose.ui.Alignment.CenterVertically),
    ) {
        Text("FitTrainer", style = MaterialTheme.typography.displayLarge)
        Text("MODO DESARROLLO", style = MaterialTheme.typography.labelMedium, color = FtColors.Amber)
        Text(
            "Elegí con qué rol entrar. El login real llega en la tarjeta de auth.",
            style = MaterialTheme.typography.bodyMedium,
            color = FtColors.TextSecondary,
        )
        Button(
            onClick = { viewModel.signInAs(Role.STUDENT) },
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Entrar como alumno") }
        OutlinedButton(
            onClick = { viewModel.signInAs(Role.TRAINER) },
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Entrar como entrenador") }
    }
}
```

`ui/placeholder/PlaceholderScreen.kt`:
```kotlin
package com.fittrainer.ui.placeholder

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Pestaña todavía sin implementar. */
@Composable
fun PlaceholderScreen(title: String) {
    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Text(title, style = MaterialTheme.typography.displayMedium)
        Text("PRÓXIMAMENTE", style = MaterialTheme.typography.labelMedium, color = FtColors.TextSecondary)
    }
}
```

`ui/placeholder/AccountMenuScreen.kt`:
```kotlin
package com.fittrainer.ui.placeholder

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fittrainer.ui.theme.FtColors
import com.fittrainer.ui.theme.Spacing

/** Pestaña Perfil (alumno) / Más (entrenador): por ahora, estado del servidor y cerrar sesión. */
@Composable
fun AccountMenuScreen(title: String, onServerStatus: () -> Unit, onSignOut: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Text(title, style = MaterialTheme.typography.displayMedium)
        OutlinedButton(
            onClick = onServerStatus,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Estado del servidor") }
        TextButton(
            onClick = onSignOut,
            modifier = Modifier.fillMaxWidth().heightIn(min = Spacing.minTouchTarget),
        ) { Text("Cerrar sesión", color = FtColors.Coral) }
    }
}
```

- [ ] **Step 3: pestañas y shell por rol**

`navigation/RoleTabs.kt`:
```kotlin
package com.fittrainer.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Star
import androidx.compose.ui.graphics.vector.ImageVector

/** Una pestaña de la barra inferior. isAccountMenu = la que lleva a Estado del servidor y Cerrar sesión. */
data class Tab(val route: String, val label: String, val icon: ImageVector, val isAccountMenu: Boolean = false)

const val HEALTH_ROUTE = "health"

/** Guía Mobile p.5 — app del alumno. */
val StudentTabs = listOf(
    Tab("student/today", "Hoy", Icons.Filled.DateRange),
    Tab("student/progress", "Progreso", Icons.Filled.Star),
    Tab("student/routines", "Mis rutinas", Icons.AutoMirrored.Filled.List),
    Tab("student/profile", "Perfil", Icons.Filled.Person, isAccountMenu = true),
)

/** Guía Mobile p.5 — app del entrenador. */
val TrainerTabs = listOf(
    Tab("trainer/home", "Inicio", Icons.Filled.Home),
    Tab("trainer/students", "Alumnos", Icons.Filled.Face),
    Tab("trainer/messages", "Mensajes", Icons.Filled.Email),
    Tab("trainer/more", "Más", Icons.Filled.Menu, isAccountMenu = true),
)
```

`navigation/RoleShell.kt`:
```kotlin
package com.fittrainer.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.fittrainer.ui.health.HealthScreen
import com.fittrainer.ui.placeholder.AccountMenuScreen
import com.fittrainer.ui.placeholder.PlaceholderScreen

/** Scaffold con las 4 pestañas fijas de un rol. Máximo 2 niveles: pestaña → Estado del servidor. */
@Composable
fun RoleShell(tabs: List<Tab>, onSignOut: () -> Unit) {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = currentRoute == tab.route,
                        onClick = {
                            navController.navigate(tab.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = tabs.first().route,
            modifier = Modifier.padding(padding),
        ) {
            tabs.forEach { tab ->
                composable(tab.route) {
                    if (tab.isAccountMenu) {
                        AccountMenuScreen(
                            title = tab.label,
                            onServerStatus = { navController.navigate(HEALTH_ROUTE) },
                            onSignOut = onSignOut,
                        )
                    } else {
                        PlaceholderScreen(tab.label)
                    }
                }
            }
            composable(HEALTH_ROUTE) {
                HealthScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
```

- [ ] **Step 4: navegación raíz y `MainActivity`**

`navigation/AppNavHost.kt`:
```kotlin
package com.fittrainer.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fittrainer.data.session.Session
import com.fittrainer.ui.login.LoginScreen

/** Ramifica por rol desde la raíz: cada rol tiene su propia barra de pestañas. */
@Composable
fun AppNavHost(viewModel: RootViewModel = hiltViewModel()) {
    val session by viewModel.session.collectAsStateWithLifecycle()
    when (session) {
        null -> Box(Modifier.fillMaxSize()) // leyendo la sesión guardada
        Session.LoggedOut -> LoginScreen()
        Session.Student -> RoleShell(tabs = StudentTabs, onSignOut = viewModel::signOut)
        Session.Trainer -> RoleShell(tabs = TrainerTabs, onSignOut = viewModel::signOut)
    }
}
```

`MainActivity.kt` completo:
```kotlin
package com.fittrainer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.fittrainer.navigation.AppNavHost
import com.fittrainer.ui.theme.FitTrainerTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            FitTrainerTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    AppNavHost()
                }
            }
        }
    }
}
```

- [ ] **Step 5: compilar y correr los unit tests**

```bash
cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug testDebugUnitTest
```
Expected: `BUILD SUCCESSFUL`; 14 tests passing; sin warnings nuevos de Kotlin en los archivos de esta tarea.

- [ ] **Step 6: Commit (Igna)**

```bash
git add mobile/
git commit -m "feat(mobile): login de desarrollo y navegación por rol con 4 pestañas"
```

---

## Task 7: Verificación de punta a punta en el emulador

**Files:** ninguno (salvo capturas en el scratchpad, que no se commitean).

- [ ] **Step 1: levantar el emulador y el backend**

```bash
SDK=/c/Users/igna_/AppData/Local/Android/Sdk
"$SDK/emulator/emulator.exe" -avd Medium_Phone_API_36.0 -no-snapshot-save &   # en background
"$SDK/platform-tools/adb.exe" wait-for-device
until [ "$("$SDK/platform-tools/adb.exe" shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 5; done
cd backend && npm run dev &   # en background; verificar con: curl http://localhost:3001/health
```

- [ ] **Step 2: tests instrumentados**

```bash
cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew connectedDebugAndroidTest
```
Expected: `BUILD SUCCESSFUL`, 3 tests de `HealthDaoTest` passing.

- [ ] **Step 3: instalar y abrir**

```bash
cd mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew installDebug
"$SDK/platform-tools/adb.exe" shell am start -n com.fittrainer/.MainActivity
```

- [ ] **Step 4: recorrer la app y capturar**

Para tocar botones: `adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml` y usar los `bounds` del nodo con el texto buscado en `adb shell input tap X Y`. Capturas con `adb exec-out screencap -p > <scratchpad>/NN-nombre.png`.

Recorrido y capturas esperadas:
1. `01-login.png`: "FitTrainer", "MODO DESARROLLO", botones "Entrar como alumno" / "Entrar como entrenador".
2. Tocar "Entrar como alumno" → `02-alumno.png`: barra con Hoy · Progreso · Mis rutinas · Perfil.
3. Perfil → "Estado del servidor" → `03-health-ok.png`: "OK" en verde, "Versión 0.1.0", "Actualizado a las HH:mm".
4. Volver, "Cerrar sesión" → login. Tocar "Entrar como entrenador" → `04-entrenador.png`: Inicio · Alumnos · Mensajes · Más.
5. **Persistencia (Review Focus 4):** `adb shell am force-stop com.fittrainer` y volver a abrir → sigue en la app del entrenador, sin pasar por login.
6. **Offline:** detener el backend. Más → "Estado del servidor" → `05-health-offline.png`: franja ámbar "Sin conexión — mostrando datos de las HH:mm" y los datos anteriores.

- [ ] **Step 5: reporte**

Anotar en el reporte: resultado de cada paso, rutas de las capturas, versiones de dependencias que se hayan tenido que ajustar. Apagar el backend y el emulador si los levantó la tarea.
