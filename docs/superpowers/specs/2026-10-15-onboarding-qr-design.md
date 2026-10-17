# Spec — Escaneo de QR y alta del alumno en mobile

- **Tarjeta:** "6 · Escaneo de QR y alta del alumno en mobile" (tablero personal de Igna) → tarjeta de equipo https://trello.com/c/jxIQkSLS
- **Fecha:** 2026-10-15
- **Depende de:** tarjeta 5, auth en mobile (PR #6). Esta rama (`feature/android-onboarding-qr`) sale de `feature/android-auth`.
- **Reglas que aplican:** `AGENTS.md` (sección Mobile), con una excepción a "Room es la única fuente de verdad" (§2).
- **Diseño:** Guía Mobile p.11, "01 Onboarding por QR".
- **Pendiente:** el checklist "Puntos a desarrollar" de la tarjeta de equipo no se pudo leer desde los MCP de Trello. Este spec sale de la descripción de la tarjeta y de la p.11.

## 1. Objetivo

Que un alumno invitado cree su cuenta desde el celular sin tipear sus datos:

1. abre la invitación (escanea el QR, toca el link o lo pega);
2. ve los datos que cargó su entrenador;
3. elige una contraseña;
4. queda logueado y vinculado a ese entrenador.

**Criterio de aceptación (de la tarjeta):** se genera una invitación con QR, se escanea con el celular, se confirman los datos, se elige contraseña y se entra a la app ya logueado como alumno de ese entrenador.

## 2. Decisiones tomadas

- **No depende de la web.** La web de invitaciones todavía no existe. Para probar, la invitación y el QR se generan con `POST /api/invitations` (curl), igual que en la tarjeta 5. La prueba con la web de Pablo se hace juntos cuando exista, y queda anotada en Trello.
- **Los datos precargados se muestran sin editar.** El `POST /api/students` usa el nombre, el email y el objetivo de la invitación y no acepta correcciones. La "confirmación editable" de la p.11 (el botón "Editar algo") queda fuera hasta que el backend lo soporte (backend de Pablo).
- **Solo se muestra lo que devuelve el backend:** nombre, email, objetivo y vencimiento. La frecuencia y la antropometría de la p.11 no están en la invitación.
- **Un solo extractor de token para las tres entradas.** El QR, el link pegado a mano y el deep link pasan por el mismo `InvitationLink.parse()`. Acepta:
  - cualquier URL con el parámetro `token` (el backend genera `${FRONTEND_URL}/join?token=<uuid>`);
  - el UUID solo.

  El token tiene que ser un UUID, porque el backend lo genera con `crypto.randomUUID()`. Con cualquier otra cosa, el mensaje es "Este código no es una invitación de FitTrainer", sin llamar a la API.
- **Deep link sin App Links verificados.** No hay dominio propio. Un solo intent-filter: `http`/`https` con el host de `JOIN_LINK_HOST` (de `mobile/.env`, default `localhost`) y path `/join`, sin `autoVerify`. En Android 12+ un link web sin verificar abre el navegador, no la app, salvo que el usuario lo habilite (Info de la app → Abrir de forma predeterminada → Agregar link). Hasta tener dominio verificado, el camino real del alumno es el QR o pegar el link. Para el celular de desarrollo: `adb shell pm set-app-links-user-selection --user cur --package com.fittrainer true localhost`. No se usa un esquema propio (`fittrainer://`): WhatsApp no lo muestra como link para tocar.

  Cuando haya dominio y deploy (tarjetas de infra), se pasa a App Links verificados.
- **El alta requiere red y no se encola.** No hay nada que guardar offline: sin conexión se muestra el error con "Reintentar". Es la misma excepción que el login: la invitación y la contraseña no pasan por Room. Ninguna pantalla llama a Retrofit directo; todo va por repositorios.
- **La cámara se pide con contexto,** desde la pantalla del escáner y no al abrir la app. Si la rechazan, siempre queda la opción de pegar el link.
- **ML Kit con el modelo incluido en el APK** (`com.google.mlkit:barcode-scanning`), no el de Play Services. Funciona offline desde la primera vez, sin esperar una descarga. Pesa unos 2-3 MB.
- **Pruebas con el celular físico de Igna por USB,** con `adb reverse tcp:3001 tcp:3001`. El celular llega a la API en `http://localhost:3001/api`, sin depender de la IP de la red ni del firewall de Windows.
  - Se agrega `localhost` al `network_security_config` (HTTP en claro solo para ese host y `10.0.2.2`).
  - La regla de `AGENTS.md` "nunca `localhost`" sigue valiendo para el emulador. Se aclara la excepción del celular con `adb reverse`; `AGENTS.md` es local y no se commitea.

## 3. Contrato del backend (ya existe, no se modifica)

| Endpoint | Body | Respuesta OK | Errores relevantes |
|---|---|---|---|
| `GET /api/invitations/:token` (público) | — | 200 `{trainer: {id, name, specialty, avatar_url}, student_name, student_email, goal, expires_at}` | 404 `INVITATION_NOT_FOUND`, 410 `INVITATION_EXPIRED`, 410 `INVITATION_ALREADY_USED` |
| `POST /api/students` (público) | `{token, password}` (contraseña ≥ 8 caracteres) | 201 `{student: {id, trainer_id, name, email, goal, …}, token, refresh_token}` | los mismos 404/410, 409 `STUDENT_EMAIL_EXISTS`, 400 `VALIDATION_ERROR` |
| `POST /api/invitations` (entrenador, solo para pruebas) | `{student_name, student_email, goal, delivery_channel}` | 201 `{token, join_url, qr_base64?, expires_at}` | — |

- **Formato de error:** `{error: {code, message, details}}`. Los dos 410 se distinguen por `code`, así que hay que leer el body del error.
- **`goal`:** `tonify`, `weight_loss`, `hypertrophy` o `strength`. Se muestran como "Tonificar", "Bajar de peso", "Ganar masa muscular" y "Ganar fuerza". Un valor desconocido se muestra tal cual.
- **La respuesta del alta no trae `role`:** si sale bien, es siempre un alumno.

## 4. Arquitectura

Sigue el MVVM de las tarjetas 3 y 5 (Screen → ViewModel → Repository).

```
LoginScreen ──"Tengo una invitación"──► JoinScreen (escáner + pegar link)
                                             │ token
Deep link (MainActivity) ──── token ─────────┤
                                             ▼
                               ConfirmInvitationScreen ← ConfirmInvitationViewModel
                                    ├─ InvitationRepository.get(token)  → InvitationApi
                                    └─ AuthRepository.registerFromInvitation(token, pass)
                                             → AuthApi.registerStudent + TokenStore.save
AppNavHost reacciona a la sesión nueva → pestañas de alumno
```

### Capa de datos

Los dos endpoints son públicos: van con el cliente "auth", sin Bearer ni Authenticator.
- **`InvitationApi`** (nueva): `@GET("invitations/{token}") suspend fun get(token): InvitationDto`.
- **`AuthApi`** (existente) suma `@POST("students") suspend fun registerStudent(body): RegisterStudentResponse`. Va ahí porque, igual que el login, devuelve una sesión. Así `AuthRepository` no cambia su constructor.

**`InvitationRepository.get(token): Result<Invitation>`.** `Invitation` es el modelo de dominio: `trainerName`, `studentName`, `studentEmail`, `goal`, `expiresAt: Instant`.

**`AuthRepository.registerFromInvitation(token, password): Result<AuthUser>`**
- Va en `AuthRepository` porque, igual que `login`, crea la sesión.
- Si sale bien, guarda un `AuthState` con rol `STUDENT`, igual que el login.
- Comparte el manejo de errores del login: una falla al guardar es `Unknown`, no de red.

**Errores nuevos en `DataError`:** `InvitationNotFound`, `InvitationExpired`, `InvitationUsed` y `StudentEmailExists`.
- Un helper `HttpException.errorCode()` lee `error.code` del body. Si el body no se puede leer, cae en `Http(code)`.
- `IOException` → `Offline`, como siempre.

### Entradas del token

**`InvitationLink.parse(raw: String): String?`** es una función pura con tests. Hace trim y devuelve el token o `null`.

**Deep link (`MainActivity`)**
- `launchMode="singleTop"`. Lee el `Intent` en `onCreate` y en `onNewIntent`.
- El token se pasa a un `PendingInvitation` (un `StateFlow` en un singleton de Hilt) que `AppNavHost` consume una sola vez.
- **Sin sesión:** abre `ConfirmInvitationScreen` con ese token.
- **Con sesión iniciada:** muestra un diálogo: "Ya hay una sesión iniciada en este celular. Cerrá sesión para usar la invitación." No se cierra la sesión automáticamente.

**Navegación sin sesión.** La rama `LoggedOut` de `AppNavHost` pasa a tener su propio `NavHost` con tres rutas: `login` → `join` → `confirm/{token}`.

### Escáner (`ui/join/`)

**`JoinScreen`** tiene tres estados según el permiso:

1. **Sin pedir todavía:** explica "Necesitamos la cámara para escanear el código de tu entrenador", con un botón "Permitir cámara" y debajo "Pegar el link de la invitación".
2. **Concedido:** el visor de la cámara (CameraX `PreviewView` en un `AndroidView`) con un recuadro de guía, y el link de pegar abajo.
3. **Rechazado:** explica que sin cámara puede pegar el link. Si el rechazo es permanente (`shouldShowRationale == false` después de pedirlo), agrega un botón "Abrir ajustes".

**Analizador**
- ML Kit configurado solo para `FORMAT_QR_CODE`.
- Con el primer QR que `InvitationLink.parse` acepta, se detiene el análisis y se navega a confirmar. Una sola vez: no se apilan navegaciones.
- **QR que no es una invitación:** muestra el aviso "Este código no es una invitación de FitTrainer" y sigue escaneando.

**Pegar link:** un campo de texto con el botón "Continuar". Pasa por el mismo `parse`; si no es válido, el error va debajo del campo.

### Confirmación (`ui/join/`)

**`ConfirmInvitationUiState`:** `Loading` | `Error(mensaje, puedeReintentar)` | `Ready(invitation, password, passwordVisible, isSubmitting, submitError)`.

**`ConfirmInvitationViewModel`**
- Recibe el token por `SavedStateHandle` y carga la invitación al iniciar.
- **`submit()`:**
  - Exige contraseña de 8 caracteres o más. Con menos, el botón está deshabilitado y se muestra la ayuda "Mínimo 8 caracteres".
  - Si ya está enviando, ignora el envío.
  - Si sale bien, no navega: `AppNavHost` reacciona a la sesión nueva.
- **Mensajes de error:**
  - `InvitationNotFound` → "Esta invitación no existe. Pedile a tu entrenador que te mande una nueva.";
  - `InvitationExpired` → el mensaje del backend: "Esta invitación venció, pedile una nueva a tu profe";
  - `InvitationUsed` → "Esta invitación ya fue usada. Si ya creaste tu cuenta, iniciá sesión.", con un botón a Login;
  - `StudentEmailExists` → "Ya hay una cuenta con ese email. Iniciá sesión.", con un botón a Login;
  - `Offline` → "Sin conexión con el servidor", con "Reintentar";
  - `Http`/`Unknown` → "No se pudo completar el alta", con "Reintentar".
- Los errores al cargar la invitación reemplazan la pantalla. Los errores al enviar van debajo del botón y conservan la contraseña.

**`ConfirmInvitationScreen`**, según la p.11:
- Una X arriba a la izquierda que vuelve a Login.
- Un chip "INVITACIÓN · {nombre del entrenador}".
- "Todo listo," + el primer nombre del alumno en azul de marca, en `displayLarge`.
- "{Entrenador} ya cargó tu perfil. Confirmá los datos y elegí contraseña." en `TextSecondary`.
- **Tarjeta "PRECARGADO"** (etiquetas en JetBrains Mono): Nombre, Email, Objetivo y "Vence" (fecha y hora local de `expires_at`).
- **"ELEGÍ UNA CONTRASEÑA":** un `OutlinedTextField` con `PasswordVisualTransformation`, el ícono de ojo y `ImeAction.Done`, que envía.
- **Botón "→ Entrar a FitTrainer":** primario, de 44 dp o más, con indicador de progreso mientras envía.
- `imePadding()` y scroll vertical.

**Login:** se agrega un botón secundario "Tengo una invitación" debajo de "Ingresar".

### Manifest y configuración

- `<uses-permission android:name="android.permission.CAMERA" />` y `<uses-feature android:name="android.hardware.camera" android:required="false" />`. Sin cámara, se puede pegar el link.
- El intent-filter de §2 en `MainActivity`, con el host por `manifestPlaceholders` desde `JOIN_LINK_HOST`.
- `mobile/.env.example` documenta `JOIN_LINK_HOST` y la variante del celular por USB (`API_BASE_URL=http://localhost:3001/api` + `adb reverse`).
- `network_security_config`: se agrega `localhost` al `domain-config` de HTTP en claro.

## 5. Dependencias nuevas

- CameraX: `camera-camera2`, `camera-lifecycle` y `camera-view`, en la versión estable más reciente al planificar.
- `com.google.mlkit:barcode-scanning` (modelo incluido en el APK).
- Para el permiso se usa `rememberLauncherForActivityResult` de `activity-compose`, que ya está. No se agrega Accompanist.

## 6. Tests y verificación

### Unitarios (JVM, `testDebugUnitTest`)

**`InvitationLink.parse`:**
- URL `http(s)` con `token`, con otros parámetros y con espacios alrededor.
- El UUID solo.
- URL sin `token`, un token que no es UUID, texto vacío y el link de otra app → `null`.

**`InvitationRepository`**, con API falsa:
- 200 → `Invitation` mapeada (con `expiresAt` parseado).
- 404 → `InvitationNotFound`.
- 410 con `INVITATION_EXPIRED` → `InvitationExpired`.
- 410 con `INVITATION_ALREADY_USED` → `InvitationUsed`.
- 410 con un body ilegible → `Http(410)`.
- `IOException` → `Offline`.

**`AuthRepository.registerFromInvitation`:**
- 201 → guarda el `AuthState` con rol `STUDENT` y los dos tokens.
- 409 → `StudentEmailExists`, sin guardar nada.
- Una falla de `TokenStore.save` → `Unknown`.

**Integración con `MockWebServer`:** `GET invitations/{token}` y `POST students` por la cadena real. Se verifica que no llevan `Authorization` y que el body del alta es `{token, password}`.

**`ConfirmInvitationViewModel`:**
- Carga → `Ready`.
- Cada error de carga → su mensaje.
- Una contraseña de menos de 8 caracteres no envía.
- Un doble envío produce una sola llamada.
- Un error al enviar conserva la contraseña.

**`JoinViewModel`** (pegar link y resultado del escáner):
- Un token válido emite la navegación una sola vez.
- Un texto inválido → error, sin navegar.

**`AppNavHost`/`PendingInvitation`:**
- Un deep link sin sesión → confirmar.
- Un deep link con sesión → aviso, sin navegar.
- El token se consume una sola vez.

### Verificación de punta a punta (en el celular de Igna)

Claude prepara todo y lee los resultados con `adb`. Igna escanea con el celular.

1. `gradlew assembleDebug` y `testDebugUnitTest` en verde.
2. Backend levantado. `adb reverse tcp:3001 tcp:3001` y la app instalada en el celular.
3. **QR (criterio de la tarjeta):** se crea una invitación por API con el entrenador de prueba y el `qr_base64` se abre en la pantalla de la PC. Login → "Tengo una invitación" → permitir cámara → escanear → datos correctos → contraseña → pestañas de alumno. `GET /students` del entrenador lo lista.
4. **Login con esa cuenta:** cerrar sesión y entrar con el email y la contraseña nuevos.
5. **Invitación usada:** volver a escanear el mismo QR → "Esta invitación ya fue usada…".
6. **Vencida:** se crea otra invitación y se le pone `expires_at` en el pasado con SQL en Supabase dev → "Esta invitación venció…".
7. **Permiso rechazado:** se rechaza la cámara → se pega el `join_url` → confirmar.
8. **Deep link:** `adb shell am start -a android.intent.action.VIEW -d "<join_url>"` con la app cerrada y con la app abierta → confirmar. Con sesión iniciada → el aviso.
9. **Sin red:** backend apagado en la confirmación → "Sin conexión con el servidor" → se levanta el backend → "Reintentar" anda.
10. Capturas de cada paso con `adb exec-out screencap`.

## 7. Fuera de alcance

- Editar los datos precargados ("Editar algo"): necesita un cambio de backend.
- Frecuencia y antropometría en la confirmación: el backend no las manda en la invitación.
- App Links verificados con dominio propio (`ft.app/i/:token` de la p.11).
- Que el entrenador genere invitaciones desde mobile.
- Prueba con la web de Pablo generando el QR: se hace cuando exista esa pantalla.
- Recuperar contraseña.
