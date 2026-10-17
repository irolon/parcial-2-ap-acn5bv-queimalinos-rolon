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
// Host de los links de invitación (FRONTEND_URL del backend). Sin dominio propio todavía: localhost en dev.
val joinLinkHost = env("JOIN_LINK_HOST", "localhost")

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
        manifestPlaceholders["joinLinkHost"] = joinLinkHost
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

// Ningún build pasa si un archivo supera las 200 líneas (tarea en el build.gradle.kts raíz).
tasks.named("preBuild") { dependsOn(":checkFileLength") }
tasks.named("check") { dependsOn(":checkFileLength") }

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

// Esquemas de Room versionados: base para las migraciones de la cola offline.
ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
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
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    // Modelo incluido en el APK: escanea offline desde la primera vez, sin descargar nada de Play Services.
    implementation(libs.mlkit.barcode.scanning)
    implementation(libs.kotlinx.serialization.json)

    implementation(libs.androidx.datastore)
    implementation(libs.tink.android)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.okhttp.mockwebserver)

    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.core)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.kotlinx.coroutines.test)
}
