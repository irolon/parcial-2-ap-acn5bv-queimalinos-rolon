---
tags: [plan]
---
# Límite de 200 líneas y orden (tanda mobile) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la app Android no tenga ningún `.kt` ni `.kts` de más de 200 líneas físicas, que todo esté ordenado capa → módulo → archivo (con las utilidades de test en `testing/`), y que el build falle si un archivo se pasa.

**Architecture:** Se mueve código sin cambiar comportamiento.
- `TokenStore.kt` se reparte en el subpaquete `data/auth/tokenstore/`.
- Los composables secundarios de las dos pantallas de `ui/join/` pasan a `ui/join/components/`.
- Los fakes van a `testing/fakes/` (los de auth, divididos en `testing/fakes/auth/`).
- Los dos tests largos se dividen en carpetas con el nombre de la unidad.
- Una tarea de Gradle, `checkFileLength`, cuenta líneas y se engancha a `preBuild` y a `check`.

**Tech Stack:** Kotlin, Jetpack Compose, Hilt, JUnit4, kotlinx-coroutines-test, Gradle Kotlin DSL (AGP).

**Spec:** `docs/superpowers/specs/2026-10-17-orden-y-limite-200-design.md` (§1, §2 Mobile, §4 Mobile, §5 Mobile). El spec está commiteado en `feature/students-body-metrics`; en esta rama se lee con `git show feature/students-body-metrics:docs/superpowers/specs/2026-10-17-orden-y-limite-200-design.md`.

## Global Constraints

- **Límite:** 200 líneas **físicas** por `.kt` y `.kts`, tests incluidos.
- **Orden:**
  - un archivo dividido va en una carpeta con el nombre de lo dividido;
  - una carpeta con más de 10 archivos se subdivide;
  - los tests copian el árbol de `main`;
  - las utilidades de test van en `test/java/com/fittrainer/testing/` y `testing/fakes/`;
  - **el paquete tiene que coincidir con la carpeta.**
- **Sin cambios de comportamiento.** Los movimientos son literales. Los únicos cambios permitidos son:
  - de `private` a `internal` o `protected`, cuando una parte movida se usa desde otro archivo;
  - `package` e `import`.
- **La cantidad de tests tiene que ser exactamente la misma.** Se cuentan los `@Test` en `src/test` y `src/androidTest` antes de empezar y al final, y se comparan.
- **Gradle** se corre desde `mobile/` con el JDK de Android Studio: `cd /c/Users/igna_/desktop/parcial_2_admin/mobile && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew <tareas>`. El JDK del sistema no sirve.
- **Sin git que escriba.** Commitea Igna, sin firmas de IA.

## Review Focus

1. **Un test que deja de correr al dividirse** (una clase sin `@Test`, un `@Test` que no se copió, o un archivo fuera de `src/test`): el conteo de `@Test` y el total de `testDebugUnitTest` tienen que coincidir antes y después.
2. **Un import que apunta al paquete viejo** y compila por casualidad, o no compila. `compileDebugAndroidTestKotlin` tiene que pasar, porque `androidTest` no se compila con `testDebugUnitTest`.
3. **Una función que pasó de miembro privado a top-level y cambió de significado:** que no use estado de la instancia (`visible` y `allSessionsClosedAt` no lo usan).
4. **Una propiedad que se oculta sin querer** en las clases que heredan de `DataStoreTokenStoreTestBase`, cuando el test declara un `val store` local.
5. **Un `checkFileLength` que no muerde:** un `.kt` temporal de 201 líneas tiene que hacer fallar `assembleDebug`.

---

### Task 1: Mover y dividir las utilidades de test

**Files:**
- Move: `test/java/com/fittrainer/MainDispatcherRule.kt` → `test/java/com/fittrainer/testing/MainDispatcherRule.kt` (paquete `com.fittrainer.testing`)
- Move: `test/java/com/fittrainer/data/FakeHealth.kt` y `FakeInvitation.kt` → `test/java/com/fittrainer/testing/fakes/` (paquete `com.fittrainer.testing.fakes`)
- Split: `test/java/com/fittrainer/data/FakeAuth.kt` (203) → `test/java/com/fittrainer/testing/fakes/auth/` (paquete `com.fittrainer.testing.fakes.auth`)
- Modify: los imports de los 12 tests que los usan (lista abajo)

Todas las rutas son relativas a `mobile/app/src/`.

**Interfaces:**
- Produces:
  - `com.fittrainer.testing.MainDispatcherRule`
  - `com.fittrainer.testing.fakes.{FakeHealthApi, FakeHealthDao, FakeInvitationApi, TOKEN, invitationDto}`
  - `com.fittrainer.testing.fakes.auth.{authState, CREATED_AT, httpError, apiError, fixedClock, MutableClock, FakeTokenStore, FakeDataStore, FakeSessionTombstones, FakeAuthApi}`

- [ ] **Step 1: Línea de base.**
  1. `grep -rc "@Test" mobile/app/src/test mobile/app/src/androidTest | awk -F: '{s+=$2} END {print s}'`: se anota el número.
  2. `./gradlew testDebugUnitTest`: tiene que dar verde, y se anota el total de tests (está en `app/build/reports/tests/testDebugUnitTest/index.html` o en el resumen de la consola).

- [ ] **Step 2: Mover `MainDispatcherRule`, `FakeHealth` y `FakeInvitation`.** Se mueven los archivos y solo cambia la línea `package`.

- [ ] **Step 3: Dividir `FakeAuth.kt`,** copiando por rangos de líneas del original. Cada archivo lleva su `package com.fittrainer.testing.fakes.auth` y solo los imports que usa:

| Archivo nuevo | Líneas del original | Imports |
|---|---|---|
| `AuthFixtures.kt` | `authState` (35-41), `CREATED_AT` (43-44), `httpError` (56), `apiError` (58-59) | `AuthState`, `AuthUser`, `Role`, `HttpException`, `Response`, `toResponseBody` |
| `TestClock.kt` | `fixedClock` (46), `MutableClock` (48-54) | `Clock`, `Instant`, `ZoneId`, `ZoneOffset` |
| `FakeTokenStore.kt` | 61-89 | `TokenStore` (**importarlo del paquete en que esté en ese momento**: en la Task 1 sigue en `com.fittrainer.data.auth`, y la Task 2 lo pasa a `com.fittrainer.data.auth.tokenstore`), `AuthState`, `Flow`, `MutableStateFlow` |
| `FakeDataStore.kt` | 91-127 | `DataStore`, `AuthFile`, `IOException`, `CompletableDeferred`, `Flow`, `MutableStateFlow`, `emitAll`, `flow`, `Mutex`, `withLock` |
| `FakeSessionTombstones.kt` | 129-152 | `SessionTombstones` |
| `FakeAuthApi.kt` | 154-203 | `AuthApi`, `LoginRequest`, `LoginResponse`, `RefreshRequest`, `RefreshResponse`, `RegisterStudentRequest`, `RegisterStudentResponse`, `StudentDto`, `UserDto`, `CompletableDeferred`, `Response`, `toResponseBody` |

  Antes de cortar se confirman los rangos contra el archivo real: cada rango tiene que empezar en una declaración o en su KDoc. Después se borra `test/java/com/fittrainer/data/FakeAuth.kt`.

- [ ] **Step 4: Reapuntar los imports.** Los símbolos de `FakeAuth` pasan de `com.fittrainer.data.X` a `com.fittrainer.testing.fakes.auth.X`. Los de `FakeHealth` y `FakeInvitation` pasan de `com.fittrainer.data.X` a `com.fittrainer.testing.fakes.X`. Y `com.fittrainer.MainDispatcherRule` pasa a `com.fittrainer.testing.MainDispatcherRule`.

  Ojo con los tests del paquete `com.fittrainer.data.*`: los que hoy usan esos símbolos sin import, porque estaban en el mismo paquete, ahora necesitan el import explícito.

  Los archivos a revisar:
  - `test/.../data/auth/`: `AuthNetworkIntegrationTest.kt`, `TokenAuthenticatorTest.kt`, `AuthRepositoryTest.kt` y `DataStoreTokenStoreUnitTest.kt` (los dos últimos siguen existiendo hasta la Task 2);
  - `data/invitation/`: `InvitationNetworkIntegrationTest.kt` y `InvitationRepositoryTest.kt`;
  - `data/repository/HealthRepositoryTest.kt`, `data/session/TokenSessionRepositoryTest.kt`, `di/HttpLoggingTest.kt`, `navigation/RootViewModelTest.kt` y `ui/health/HealthViewModelTest.kt`;
  - `ui/join/`: `ConfirmInvitationViewModelTest.kt` y `JoinViewModelTest.kt`;
  - `ui/login/LoginViewModelTest.kt`.

  Para confirmar que no queda nada viejo, este comando tiene que dar vacío:

```bash
grep -rnE "import com\.fittrainer\.(MainDispatcherRule|data\.(Fake|authState|fixedClock|MutableClock|httpError|apiError|CREATED_AT|TOKEN|invitationDto))" mobile/app/src
```

- [ ] **Step 5: Verificar.**
  1. `./gradlew testDebugUnitTest`: verde y con el mismo total del Step 1.
  2. El conteo de `@Test` es el mismo.
  3. `find mobile/app/src/test/java/com/fittrainer -maxdepth 1 -type f` da vacío, y `mobile/app/src/test/java/com/fittrainer/data/` ya no tiene archivos sueltos.
  4. Ningún archivo nuevo pasa de 200 líneas (`wc -l`).

- [ ] **Step 6: Commit (Igna):** `git add -A mobile/app/src/test && git commit -m "test(mobile): utilidades de test en testing/ y fakes de auth divididos"`

---

### Task 2: Repartir `TokenStore.kt` en `data/auth/tokenstore/` y dividir sus tests

**Files:**
- Split: `main/java/com/fittrainer/data/auth/TokenStore.kt` (228) → `main/java/com/fittrainer/data/auth/tokenstore/{TokenStore.kt, DataStoreTokenStore.kt, SessionMarks.kt}` (paquete `com.fittrainer.data.auth.tokenstore`)
- Modify (imports): `main/.../data/auth/AuthInterceptor.kt`, `AuthRepository.kt`, `TokenAuthenticator.kt`, `main/.../data/session/TokenSessionRepository.kt`, `main/.../di/AuthModule.kt` y `test/.../testing/fakes/auth/FakeTokenStore.kt`
- Split: `test/java/com/fittrainer/data/auth/AuthRepositoryTest.kt` (207) → `test/java/com/fittrainer/data/auth/authrepository/` (paquete `com.fittrainer.data.auth.authrepository`)
- Split: `test/java/com/fittrainer/data/auth/DataStoreTokenStoreUnitTest.kt` (379) → `test/java/com/fittrainer/data/auth/tokenstore/datastoretokenstore/` (paquete `com.fittrainer.data.auth.tokenstore.datastoretokenstore`)
- Move: `androidTest/java/com/fittrainer/data/auth/DataStoreTokenStoreTest.kt` → `androidTest/java/com/fittrainer/data/auth/tokenstore/DataStoreTokenStoreTest.kt` (paquete `com.fittrainer.data.auth.tokenstore`)

**Interfaces:**
- Consumes: los fakes de la Task 1, en `com.fittrainer.testing.fakes.auth`.
- Produces: `com.fittrainer.data.auth.tokenstore.{TokenStore, SessionNotClosedException, DataStoreTokenStore}`, más los `internal` de `SessionMarks.kt` (`ALL_SESSIONS`, `AuthState?.visible(closed)` y `allSessionsClosedAt(mark)`).

- [ ] **Step 1: Línea de base.** El conteo de `@Test` y el total de `testDebugUnitTest`, como en la Task 1.

- [ ] **Step 2: Repartir el código de `main`**, copiando por rangos de líneas del `TokenStore.kt` original:
  - **`tokenstore/TokenStore.kt`:** la `interface TokenStore` (23-43) y `SessionNotClosedException` (45-47). Imports: `Flow`, `java.io.IOException` y `com.fittrainer.data.auth.AuthState`.
  - **`tokenstore/DataStoreTokenStore.kt`:** el KDoc y la clase (49-199), con su `companion`.
    - `READ_RETRY_DELAY_MS` queda como está.
    - Se sacan las líneas 201-221 (los helpers de marcas) y la constante `ALL_SESSIONS` (226).
    - Lleva los imports de las líneas 3-21 que siga usando, más `com.fittrainer.data.auth.AuthFile`, `AuthState` y `SessionTombstones`.
  - **`tokenstore/SessionMarks.kt`:** importa `AuthState` y tiene:
    - `internal const val ALL_SESSIONS = "*"`, que era `private const` del `companion`;
    - `internal fun AuthState?.visible(closed: Set<String>): AuthState?` (201-202);
    - `private fun String.hides(state: AuthState): Boolean` (204-208), que solo usa `visible`;
    - `internal fun allSessionsClosedAt(mark: String): Long?` (210-221), con su KDoc.

  Esas funciones no usan estado de la instancia, así que el comportamiento es idéntico. Las llamadas desde la clase no cambian, porque están en el mismo paquete. Después se borra `data/auth/TokenStore.kt`.

- [ ] **Step 3: Imports en `main` y en el fake.**
  - `AuthInterceptor`, `AuthRepository` y `TokenAuthenticator` suman `import com.fittrainer.data.auth.tokenstore.TokenStore`.
  - `TokenSessionRepository` cambia `data.auth.TokenStore` por `data.auth.tokenstore.TokenStore`.
  - `AuthModule` cambia `DataStoreTokenStore` y `TokenStore` al paquete nuevo. `AuthCrypto`, `EncryptedAuthSerializer` y `SharedPrefsSessionTombstones` quedan en `data.auth`.
  - `FakeTokenStore` pasa a importar el `TokenStore` nuevo.
  - Si algún otro archivo de `main` usa `SessionNotClosedException` o `DataStoreTokenStore`, también se actualiza. Para buscarlos: `grep -rn "SessionNotClosedException\|DataStoreTokenStore\|data\.auth\.TokenStore" mobile/app/src`.

- [ ] **Step 4: Dividir `AuthRepositoryTest.kt`** en tres clases dentro de `data/auth/authrepository/`. Cada una repite el fixture del original (las líneas 29-31: `api`, `store` y `repo`). El helper `Result<*>.dataError()` (línea 33) solo va en Register y Login, que son las que lo usan.

| Clase | Tests del original |
|---|---|
| `AuthRepositoryRegisterTest` | 35-66 (los 5 de alta) |
| `AuthRepositoryLoginTest` | 68-120 (los de login) |
| `AuthRepositoryLogoutTest` | 122-206 (todos los de logout, también el que usa `DataStoreTokenStore` real) |

  Cada clase importa lo que antes estaba en el mismo paquete (`AuthRepository`, `AuthUser`, `AuthFile`, `Role`, `LogoutResult`…), lo del paquete nuevo (`tokenstore.*`) y los fakes de `testing.fakes.auth`. Se borra el original.

- [ ] **Step 5: Dividir `DataStoreTokenStoreUnitTest.kt`** en `data/auth/tokenstore/datastoretokenstore/`:
  - **`DataStoreTokenStoreTestBase.kt`:** una `abstract class` con los campos de las líneas 30-37 pasados de `private` a `protected` (`sessionA`, `sessionB`, `dataStore`, `tombstones`, `store` y `restarted()`).
  - **Las clases concretas** extienden la base y copian sus tests literalmente:

| Clase | Tests del original |
|---|---|
| `DataStoreTokenStoreBasicsTest` | 39-61, 109-127 y 208-219 |
| `DataStoreTokenStoreFailedClearTest` | 63-107 y 129-174 |
| `DataStoreTokenStoreNotClosedTest` | 176-206 |
| `DataStoreTokenStoreConcurrencyTest` | 221-243 |
| `DataStoreTokenStoreAllMarkTest` | 245-307 |
| `DataStoreTokenStoreClockSkewTest` | 309-378 |

  Notas para la división:
  - `@OptIn(ExperimentalCoroutinesApi::class)` va solo donde se use.
  - Los tests que declaran un `val store` local (en las líneas 136, 225, 249, 268, 296, 314, 348 y 360) ocultan el campo de la base a propósito: se copian tal cual.
  - Antes de cortar se confirman los rangos contra el archivo real: cada rango empieza en un `@Test` o en su comentario.
  - Se borra el original.

- [ ] **Step 6: Mover el test de `androidTest`** a `androidTest/.../data/auth/tokenstore/DataStoreTokenStoreTest.kt`, con el paquete nuevo. Hay que sumar los imports de lo que antes estaba en el mismo paquete: `AuthCrypto`, `AuthState`, `AuthUser`, `EncryptedAuthSerializer` y `SharedPrefsSessionTombstones`.

- [ ] **Step 7: Verificar.** `./gradlew testDebugUnitTest compileDebugAndroidTestKotlin assembleDebug`:
  - todo en verde;
  - el mismo total de tests y el mismo conteo de `@Test`;
  - ningún archivo nuevo pasa de 200 líneas;
  - `data/auth/` queda con 8 archivos y la subcarpeta `tokenstore/`.

- [ ] **Step 8: Commit (Igna):** `git add -A mobile/app/src && git commit -m "refactor(mobile): TokenStore en data/auth/tokenstore y tests de auth divididos"`

---

### Task 3: Dividir las pantallas de `ui/join/`

**Files:**
- Create: `main/java/com/fittrainer/ui/join/components/{PrefilledCard.kt, MessageBlock.kt, CameraPermission.kt, PasteLink.kt}` (paquete `com.fittrainer.ui.join.components`)
- Modify: `main/java/com/fittrainer/ui/join/ConfirmInvitationScreen.kt` (204) y `JoinScreen.kt` (201)

- [ ] **Step 1: Sacar las partes de `ConfirmInvitationScreen.kt`**, copiándolas literalmente:
  - **`components/PrefilledCard.kt`:**
    - `EXPIRES_FORMAT` (línea 56), que sigue `private`;
    - `PrefilledCard` (154-174), que pasa de `private` a `internal`;
    - `DataRow` (176-182), que sigue `private`.
  - **`components/MessageBlock.kt`:** `MessageBlock` (184-204), con su KDoc, de `private` a `internal`.

  En la pantalla quedan las líneas 58-152 (`ConfirmInvitationScreen` y `ReadyContent`, que sigue `private`), más los imports de `components.MessageBlock` y `components.PrefilledCard`. Se sacan los imports que queden sin usar. Si una parte movida usa `goalLabel` o `InvitationMessage`, se importan desde `com.fittrainer.ui.join`.

- [ ] **Step 2: Sacar las partes de `JoinScreen.kt`:**
  - **`components/CameraPermission.kt`:**
    - el `enum CameraAccess` (línea 58);
    - `Context.hasCameraPermission()` y `Context.findActivity()` (191-199);
    - `appSettingsIntent` (200-201).

    Todo pasa de `private` a `internal`.
  - **`components/PasteLink.kt`:** `PasteLink` (162-189), de `private` a `internal`.

  En la pantalla quedan las líneas 60-160, más los imports de `components.*` que use. Se sacan los imports que queden sin usar.

- [ ] **Step 3: Verificar.** `./gradlew testDebugUnitTest assembleDebug`:
  - en verde, con el mismo total;
  - las dos pantallas y los 4 componentes tienen menos de 200 líneas;
  - `ui/join/` queda con 8 archivos más `components/`;
  - `LoggedOutNavHost.kt` no cambia, porque las pantallas siguen en `com.fittrainer.ui.join`.

- [ ] **Step 4: Prueba manual corta** (no hay tests de UI): instalar la app en el emulador (`./gradlew installDebug`), abrir "Tengo una invitación", pegar un link inválido y ver el mensaje de error. Si el backend no está levantado, alcanza con que la pantalla abra y muestre el campo para pegar el link. Esto prueba que `PasteLink` y `CameraPermission` siguen conectados.

- [ ] **Step 5: Commit (Igna):** `git add -A mobile/app/src/main/java/com/fittrainer/ui/join && git commit -m "refactor(mobile): componentes de las pantallas de alta en ui/join/components"`

---

### Task 4: Tarea `checkFileLength` y documentación local

**Files:**
- Modify: `mobile/build.gradle.kts` (raíz, 8 líneas): se registra la tarea
- Modify: `mobile/app/build.gradle.kts` (118 líneas): se engancha a `preBuild` y a `check`
- Modify: `AGENTS.md` (local, no se commitea): la línea de mobile en "Antes de dar una tarea por terminada"

- [ ] **Step 1: La tarea**, en `mobile/build.gradle.kts`, debajo del bloque `plugins`:

```kotlin
// Regla del proyecto (CONTRIBUTING.md): ningún .kt/.kts pasa de 200 líneas físicas.
val checkFileLength by tasks.registering {
    group = "verification"
    description = "Falla si algún .kt/.kts supera 200 líneas físicas."
    val sources = fileTree(rootDir) {
        include("**/*.kt", "**/*.kts")
        exclude("**/build/**", "**/.gradle/**", "**/.kotlin/**")
    }
    inputs.files(sources)
    doLast {
        val limit = 200
        val offenders = sources.files.map { it to it.readLines().size }.filter { it.second > limit }
        if (offenders.isNotEmpty()) throw GradleException(
            offenders.joinToString("\n", "Archivos con más de $limit líneas (ver CONTRIBUTING.md):\n") { (f, n) ->
                " - ${f.relativeTo(rootDir)}: $n"
            }
        )
    }
}
```

- [ ] **Step 2: El enganche**, en `mobile/app/build.gradle.kts`, después del bloque `android {}`:

```kotlin
// Ningún build pasa si un archivo supera las 200 líneas (tarea en el build.gradle.kts raíz).
tasks.named("preBuild") { dependsOn(rootProject.tasks.named("checkFileLength")) }
tasks.named("check") { dependsOn(rootProject.tasks.named("checkFileLength")) }
```

- [ ] **Step 3: Que muerda.**
  1. `./gradlew checkFileLength` tiene que dar verde.
  2. Se crea `mobile/app/src/main/java/com/fittrainer/TmpLargo.kt`, con `package com.fittrainer` y 200 líneas de comentario (201 en total).
  3. `./gradlew assembleDebug` tiene que **fallar** y nombrar ese archivo.
  4. Se borra el archivo, y `assembleDebug` vuelve a dar verde.

- [ ] **Step 4: Verificación final.**
  1. `./gradlew checkFileLength testDebugUnitTest compileDebugAndroidTestKotlin assembleDebug`: todo en verde, con el mismo total de tests y el mismo conteo de `@Test` que en la línea de base de la Task 1.
  2. `find mobile/app/src/main/java/com/fittrainer -maxdepth 1 -type f`: solo `MainActivity.kt` y `FitTrainerApp.kt`.
  3. `find mobile/app/src/test/java/com/fittrainer -maxdepth 1 -type f`: vacío.
  4. Ninguna carpeta de `mobile/app/src` tiene más de 10 archivos directos.

- [ ] **Step 5: `AGENTS.md` local.** La línea de mobile de "Antes de dar una tarea por terminada" queda así:

  > Mobile: `gradlew checkFileLength assembleDebug` compila sin errores (y `gradlew testDebugUnitTest` si hay tests).

  Hay que confirmar con `git check-ignore AGENTS.md` que sigue ignorado.

- [ ] **Step 6: Commit (Igna):** `git add mobile/build.gradle.kts mobile/app/build.gradle.kts && git commit -m "chore(mobile): el build falla si un .kt/.kts pasa de 200 líneas"`

  Además, cuando se mergee la rama de la tarjeta 7, hay que sacar el "(pendiente: lo agrega la tanda de mobile)" de `CONTRIBUTING.md`. Ese archivo no existe en esta rama.

---

## Relacionado

- [[tarjetas|Índice de tarjetas]]
