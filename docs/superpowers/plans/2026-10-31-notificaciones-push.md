---
tags: [plan]
tarjeta: 17
---
# Push y centro de notificaciones (alumno): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el alumno reciba push de comentarios, récords y logros, y tenga una campana en Hoy con su lista de avisos guardada en Room.

**Architecture:**
- `GET /notifications` se guarda en Room por dueño. La UI lee de Room. Marcar leído escribe primero en Room y después sube.
- El push lo recibe un `FirebaseMessagingService`. Los dos caminos del tap convergen en `MainActivity`: con la app cerrada, los extras del sistema; con la app abierta, el `PendingIntent` propio.
- `MainActivity` deja el destino en un singleton, `NotificationLaunchRequests`, que consume la navegación (mismo patrón que `WorkoutLaunchRequests`).

**Tech Stack:** Kotlin, Compose, Hilt, Retrofit + kotlinx.serialization, Room (AutoMigration 9→10), WorkManager, Firebase Cloud Messaging (BoM `33.7.0`, plugin `com.google.gms.google-services` `4.4.2`).

**Spec:** `docs/superpowers/specs/2026-10-31-notificaciones-push-design.md`

## Global Constraints
- Ningún archivo de código, tests incluidos, pasa de **200 líneas físicas**. Orden capa → módulo → archivo, y las carpetas de más de 10 archivos se dividen (`CONTRIBUTING.md`).
- Room es la única fuente de verdad. Ningún ViewModel ni pantalla llama a Retrofit.
- Solo se muestran los tipos `comment`, `pr` y `achievement`. Los demás se descartan al guardar.
- Textos exactos de la spec:
  - "Avisos" (título de la lista)
  - "Marcar todo leído"
  - "Hoy" · "Ayer" · "Antes"
  - "Todavía no tenés avisos"
  - "Sin conexión · mostrando lo guardado"
  - "Conectate una vez para ver tus avisos"
  - "No pudimos actualizar"
  - "Las notificaciones están apagadas" / "Activar"
  - el canal "Avisos de tu entrenador"
  - el badge muestra "9+" si pasa de 9
- Zona horaria de los grupos y del tiempo relativo: `America/Argentina/Buenos_Aires`, inyectada como `ZoneId` / `Clock` (igual que el historial).
- Los agentes no commitean: el paso "Commit" de cada tarea es **snapshot** (lo maneja el controlador). Igna commitea.
- Room pasa a **v11** con `AutoMigration(from = 10, to = 11)`. Se regenera `app/schemas/.../11.json`. (Al escribir el plan era la v10; la v9 la tomó el descanso ajustable y la v10 los gráficos, así que donde abajo dice v10 o 9→10, léase v11 o 10→11, con el caso en `MigrationV11Test`.)
- La rama sale de `feature/android-graficos` (#44), que trae Room v9 y la pantalla de Gráficos.

## Review Focus
1. **Un refresco pisa una marca de leído pendiente:** el alumno marcó leído sin red, llega un refresco con `read=false` y el aviso vuelve a aparecer como no leído. → Test en la tarea 2: `refrescoNoPisaLeidoPendiente`.
2. **Push con `data` incompleto o mal formado** (`exercise_ids` que no es un JSON, falta `session_id`): no tiene que crashear y abre la lista. → Test en la tarea 4: `destinoConDatosRotosVaALaLista`.
3. **Logout sin red:** el DELETE del token falla y el logout igual termina. Con red, el DELETE sale **antes** de borrar el JWT. → Test en la tarea 3: `logoutSigueSiFallaElBorradoDelToken` y `borraElTokenAntesQueElJwt`.
4. **Tap de un push con otra cuenta o sin sesión:** se descarta sin navegar y sin llamar a la API. → Test en la tarea 7: `sinSesionDeAlumnoDescartaElDestino`.
5. **Grupos en el borde de la medianoche:** un aviso de las 23:59 de ayer va a "Ayer" en hora de Argentina, aunque en UTC ya sea hoy. → Test en la tarea 4: `bordeDeMedianocheEnArgentina`.

---

### Task 1: Firebase, API, entidad, DAO y Room v10

**Files:**
- Modify:
  - `mobile/gradle/libs.versions.toml`
  - `mobile/build.gradle.kts` (plugin `com.google.gms.google-services` 4.4.2, `apply false`)
  - `mobile/app/build.gradle.kts` (plugin, `platform(firebase-bom:33.7.0)`, `firebase-messaging`)
- Create:
  - `mobile/app/google-services.json`: copia de `C:\Users\igna_\Downloads\google-services (2).json`. Proyecto `fittrainer-bdb46`, paquete `com.fittrainer`. Se commitea (spec §5).
  - `data/api/notifications/NotificationsApi.kt`
  - `data/api/notifications/NotificationDtos.kt`
  - `data/db/notifications/NotificationEntity.kt`
  - `data/db/notifications/NotificationDao.kt`
- Modify: `data/db/FitTrainerDatabase.kt` (entidad, `version = 10`, `AutoMigration(9, 10)`, `notificationDao()`), `di/DatabaseModule.kt`, `di/NetworkModule.kt`.
- Test: `test/.../data/api/notifications/NotificationDtosTest.kt`, `androidTest/.../data/db/notifications/NotificationDaoTest.kt`, migración 9→10 en `FitTrainerDatabaseMigrationTest`.

**Interfaces (Produces):**
- `NotificationsApi`:
  - `list(limit: Int, before: String?): NotificationPageDto`, sobre `GET notifications`;
  - `markRead(id: String)`, sobre `PATCH notifications/{id}/read`;
  - `markAllRead()`;
  - `registerToken(body: PushTokenDto)`;
  - `removeToken(token: String)`, sobre `DELETE notifications/tokens/{token}`.
- `NotificationDto(id, type, title, body: String?, data: JsonObject = {}, read: Boolean, createdAt: String @SerialName("created_at"))`. Además, `NotificationPageDto(data, meta: NotificationMetaDto(unreadCount @SerialName("unread_count"), nextBefore: String? @SerialName("next_before")))` y `PushTokenDto(token, platform = "android")`.
- `NotificationEntity`:
  - campos: `id` PK, `ownerId`, `type`, `title`, `body: String?`, `dataJson: String`, `read: Boolean`, `readPending: Boolean = false`, `createdAt: Long` (epoch ms);
  - índice `(ownerId, createdAt)`.
- `NotificationDao`:
  - `observe(ownerId): Flow<List<NotificationEntity>>`, ordenado por `createdAt DESC, id DESC`;
  - `observeUnreadCount(ownerId): Flow<Int>`;
  - `upsertKeepingPending(ownerId, rows)`: transacción; si la fila guardada tiene `readPending = true`, conserva `read = true` y `readPending = true`;
  - `replaceFirstPage(ownerId, rows)`: borra las del dueño más nuevas o iguales que la más vieja de `rows` que no vinieron, y hace upsert conservando las pendientes;
  - `markRead(ownerId, id)`, que pone `read = 1, readPending = 1`;
  - `markAllRead(ownerId)`;
  - `pendingReads(ownerId): List<String>`;
  - `clearPending(ids)`;
  - `clear(ownerId)` y `clearAll()`;
  - `inTransaction(block)`.

- [ ] **Step 1:** `NotificationDtosTest.parseaLaRespuestaReal`: un JSON como el de `contratos-api.md` (§ GET /notifications) con `data: {"session_id":"s1"}` y `meta.next_before: null` → `page.data[0].data["session_id"]` es `"s1"` y `page.meta.nextBefore` es null.
- [ ] **Step 2:** Correr `./gradlew testDebugUnitTest --tests '*NotificationDtosTest*'`. Esperado: FAIL, las clases no existen.
- [ ] **Step 3:** Agregar las dependencias, `google-services.json`, los DTOs, la API, la entidad, el DAO y Room v10, y registrar en DI.
- [ ] **Step 4:** Tests instrumentados de `NotificationDaoTest`:
  - `upsertConservaLeidoPendiente`: una fila con `read=1, readPending=1` y un upsert con `read=0` → sigue `read=1`;
  - `replaceFirstPageBorraSoloDentroDeLaVentana`;
  - `unreadCountPorDueno`: otro dueño no cuenta.
  Además, `FitTrainerDatabaseMigrationTest` 9→10 con la tabla nueva vacía.
- [ ] **Step 5:** Correr `./gradlew checkFileLength assembleDebug testDebugUnitTest assembleDebugAndroidTest`. Esperado: BUILD SUCCESSFUL.
- [ ] **Step 6:** Snapshot.

### Task 2: NotificationsRepository

**Files:** Create `data/notifications/NotificationsRepository.kt`, `data/notifications/NotificationMapper.kt` y `di/NotificationsModule.kt` (bind `UserDataCleaner` `@IntoSet`). Test: `test/.../data/notifications/NotificationsRepositoryTest.kt`, `testing/fakes/notifications/FakeNotificationDao.kt` y `FakeNotificationsApi.kt`.

**Interfaces:**
- Consumes: Task 1.
- Produces: `NotificationsRepository` con:
  - `observe(ownerId): Flow<List<AppNotification>>`;
  - `observeUnread(ownerId): Flow<Int>`;
  - `everLoaded(ownerId): Flow<Boolean>`, true si alguna vez terminó un refresco OK; se guarda en una tabla meta o en DataStore por dueño, a criterio, mientras sea Room o DataStore;
  - `refresh(ownerId): Result<Unit>`, que trae la página 1 (`limit = 20`), sube primero los leídos pendientes y guarda `nextBefore`;
  - `loadMore(ownerId): Result<Boolean>`, que devuelve si hay más;
  - `markRead(ownerId, id)`;
  - `markAllRead(ownerId)`;
  - `uploadPendingReads(ownerId): Result<Unit>`;
  - `clearUserData(ownerId: String?)`.
- `AppNotification(id, type: NotificationType, title, body: String?, data: Map<String, String>, read: Boolean, createdAt: Instant)`, con `enum NotificationType { COMMENT, PR, ACHIEVEMENT }`.
- Mapper:
  - `NotificationDto.toEntity(ownerId): NotificationEntity?` devuelve null si `type` no es `comment`, `pr` ni `achievement`;
  - los valores de `data` se guardan como texto (los arrays, serializados en JSON, igual que en el push).

Reglas que el plan fija:
- Un 404 al marcar leído (`NOTIFICATION_NOT_FOUND`) borra la marca pendiente y no reintenta.
- El chequeo de dueño + `clearGeneration` es como en `HistoryRepository.checkOwner`: un pedido que vuela durante el logout no escribe.
- `markAllRead` marca en Room todas las del dueño y deja un pendiente especial `ALL`, que se sube con `PATCH read-all`.

- [ ] **Step 1:** Tests:
  - `refrescoGuardaSoloLosTiposDelAlumno`: llegan `comment`, `inactivity` y `pr` → se guardan 2;
  - `refrescoNoPisaLeidoPendiente`;
  - `marcarLeidoSinRedQuedaPendienteYSubeDespues`: la API falla; después `uploadPendingReads` llama `markRead("n1")` y limpia;
  - `marcarLeido404SeDescarta`;
  - `marcarTodoLeidoSubeReadAll`;
  - `loadMoreUsaNextBefore`;
  - `pedidoQueVuelaDuranteElLogoutNoEscribe`.
- [ ] **Step 2:** Correr los tests. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr `./gradlew checkFileLength testDebugUnitTest`. Esperado: PASS.
- [ ] **Step 5:** Snapshot.

### Task 3: Token de push (alta y baja)

**Files:**
- Create: `data/notifications/push/PushTokenRegistry.kt` y `data/notifications/push/FcmTokenSource.kt` (interfaz más impl con `FirebaseMessaging.getInstance().token.await()`; `kotlinx-coroutines-play-services` si no está).
- Modify: `data/session/TokenSessionRepository.kt` (`signOut` llama `pushTokens.unregister()` antes de borrar el JWT) y el punto donde se emite la sesión de alumno al loguear o arrancar.
- Test: `test/.../data/notifications/push/PushTokenRegistryTest.kt` y el test existente de `TokenSessionRepository`.

**Interfaces (Produces):** `PushTokenRegistry` con:
- `registerIfStudent()`: lee la sesión; si es `Session.Student`, pide el token y hace `POST`; los errores se tragan y se loguean;
- `onNewToken(token: String)`: igual, con ese token;
- `unregister()`: `DELETE` del token actual con un timeout corto (5 s); los errores se tragan.

Disparadores:
- `registerIfStudent()` al iniciar la app con sesión de alumno (desde `FitTrainerApp` o el `RootViewModel`, el que ya observa la sesión) y después de un login de alumno.
- `onNewToken` desde el servicio de la tarea 5.

- [ ] **Step 1:** Tests:
  - `registraSoloConSesionDeAlumno`: con sesión de entrenador no llama a la API;
  - `onNewTokenRegistraElNuevo`;
  - `borraElTokenAntesQueElJwt`: en `signOut`, el orden de llamadas es `removeToken` y después el borrado de credenciales;
  - `logoutSigueSiFallaElBorradoDelToken`.
- [ ] **Step 2:** Correr los tests. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr `./gradlew checkFileLength testDebugUnitTest`. Esperado: PASS.
- [ ] **Step 5:** Snapshot.

### Task 4: Lógica pura (grupos, tiempo relativo, destino)

**Files:** Create `ui/notifications/NotificationGroups.kt`, `ui/notifications/NotificationTexts.kt` y `data/notifications/NotificationDestination.kt`. Test: el espejo en `test/`.

**Interfaces (Produces):**
- `enum NotificationGroup { TODAY, YESTERDAY, EARLIER }`.
- `fun group(items: List<AppNotification>, now: Instant, zone: ZoneId): List<Pair<NotificationGroup, List<AppNotification>>>` devuelve solo los grupos no vacíos, en orden.
- `NotificationTexts`:
  - `relativeTime(at, now, zone)` devuelve "ahora" (< 1 min), "hace N min", "hace N h" (hoy), "ayer" o "d mmm" (por ejemplo "25 oct", con el formato corto de `ChartsTexts`);
  - `badge(n)` devuelve "" con 0, "n" de 1 a 9 y "9+" con más de 9;
  - etiquetas de los grupos;
  - las constantes de texto de Global Constraints.
- `sealed interface NotificationDestination`: `SessionDetail(sessionId)`, `ExerciseChart(exerciseId)` y `NotificationsList`.
- `fun destinationOf(type: String?, data: Map<String, String>): NotificationDestination`:
  - `comment` con `session_id` da `SessionDetail`;
  - `pr` con `exercise_ids` (un JSON array con al menos un elemento) da `ExerciseChart(primero)`;
  - todo lo demás, incluido lo mal formado, da `NotificationsList`.

- [ ] **Step 1:** Tests:
  - `bordeDeMedianocheEnArgentina`: `2026-10-31T02:59:00Z` con now `2026-10-31T15:00:00Z` → YESTERDAY;
  - `gruposVaciosNoAparecen`;
  - `tiempoRelativo` (ahora, 5 min, 3 h, ayer y "25 oct");
  - `badgeNueveMas`;
  - `destinoPorTipo`;
  - `destinoConDatosRotosVaALaLista`: `exercise_ids = "no-json"`, `exercise_ids = "[]"` y `comment` sin `session_id`.
- [ ] **Step 2:** Correr los tests. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr los tests. Esperado: PASS.
- [ ] **Step 5:** Snapshot.

### Task 5: Servicio FCM, canal y tap

**Files:**
- Create:
  - `notifications/push/FitTrainerMessagingService.kt`, en `com.fittrainer.notifications.push`;
  - `notifications/push/PushChannel.kt`: canal `"student_notices"`, nombre "Avisos de tu entrenador", `IMPORTANCE_DEFAULT`, creado en `FitTrainerApp.onCreate`;
  - `data/notifications/NotificationLaunchRequests.kt`: singleton con `StateFlow<PendingLaunch?>`, `request(...)` y `consume()`.
- Modify:
  - `AndroidManifest.xml`: el servicio con el `intent-filter` `com.google.firebase.MESSAGING_EVENT`, y `<meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="student_notices"/>`;
  - `MainActivity.kt`: `handleNotificationLaunch(intent)` en `onCreate` (sin estado guardado) y en `onNewIntent`.

**Interfaces (Produces):**
- `PendingLaunch(destination: NotificationDestination, notificationId: String?)`.
- `fun launchFromExtras(extras: Map<String, String>): PendingLaunch?` es pura. Devuelve null si los extras no traen `type` (el intent no viene de un push), y si no, `destinationOf(type, extras)` con `notification_id`.
- El servicio:
  - en `onMessageReceived`, muestra la notificación con `title` y `body` en el canal, con un `PendingIntent` a `MainActivity` que lleva todos los pares de `data` como extras (`FLAG_IMMUTABLE`, request code distinto por `notification_id`);
  - después dispara `NotificationsRepository.refresh` en un scope de app (inyectado; si no hay sesión de alumno, no hace nada);
  - en `onNewToken`, llama `PushTokenRegistry.onNewToken`.

- [ ] **Step 1:** Tests de `launchFromExtras`:
  - `extrasDePushDeComentario` da `SessionDetail` con `notificationId`;
  - `intentSinTypeNoEsDePush` da null;
  - `resumenDeLogrosSinId` da `NotificationsList` sin id.
- [ ] **Step 2:** Correr los tests. Esperado: FAIL.
- [ ] **Step 3:** Implementar el servicio, el canal, el manifest y `MainActivity`. El servicio no lleva test unitario (depende de Firebase); se prueba a mano en la tarea 8.
- [ ] **Step 4:** Correr `./gradlew checkFileLength assembleDebug testDebugUnitTest`. Esperado: PASS.
- [ ] **Step 5:** Snapshot.

### Task 6: Campana y lista de avisos

**Files:**
- Create:
  - `ui/notifications/NotificationsViewModel.kt`;
  - `ui/notifications/NotificationsUiState.kt`;
  - `ui/notifications/NotificationsScreen.kt`;
  - `ui/notifications/components/` (`NotificationItem`, `PermissionBanner`, `NotificationsStates`);
  - `ui/today/components/NotificationBell.kt`.
- Modify: `ui/today/components/TodayHeader.kt` (la campana a la derecha del saludo), `TodayViewModel` o un `NotificationBellViewModel` chico para el número, `navigation/RoleTabs.kt` (`NOTIFICATIONS_ROUTE = "student/notifications"`) y `navigation/RoleShell.kt` (composable de la lista).
- Test: `test/.../ui/notifications/NotificationsViewModelTest.kt`.

**Interfaces:**
- Consumes: tareas 2 y 4.
- Produces:
  - `NotificationsViewModel` con `uiState`, `onStart()` (refresca), `onRefresh()`, `onLoadMore()`, `onMarkAllRead()` y `onOpen(item)` (marca leído y emite un evento `Open(destination)`);
  - `NotificationsUiState(groups, isOffline, isRefreshing, refreshFailed, everLoaded, hasMore, notificationsEnabled)`.
- La campana tiene su propio `NotificationBellViewModel`, que sigue el patrón de `ProgressBadgeViewModel`:
  - `unread: StateFlow<Int>`;
  - `onAppStart()`, que se llama desde el `LifecycleStartEffect` de la barra. Refresca con red y como mucho cada 5 minutos (spec §4.3), y toma el dueño con `filterNotNull().first()` dentro del `launch`;
  - un colector de conectividad que, al volver la red, llama `uploadPendingReads`.

  Test: `refrescaAlAbrirLaAppComoMuchoCada5Min` y `alVolverLaRedSubeLeidosPendientes`.
- `notificationsEnabled` sale de `NotificationManagerCompat.areNotificationsEnabled()`. Se lee en `onStart` vía una interfaz inyectable (`NotificationPermission`), para poder testearlo.
- **Activar** abre `Settings.ACTION_APP_NOTIFICATION_SETTINGS` con `EXTRA_APP_PACKAGE`.
- Estados de la tabla de la spec §3.2, con sus textos exactos. Pull-to-refresh con `PullToRefreshBox`.
- Los no leídos van con fondo azulado y un punto, **sin borde lateral**. Toque mínimo de 44.

- [ ] **Step 1:** Tests:
  - `sinRedYNuncaCargoPideConectarse`;
  - `sinRedConGuardadosMuestraGuardados`;
  - `falloElRefrescoMuestraReintentar`;
  - `abrirMarcaLeidoYEmiteDestino`;
  - `marcarTodoSoloSiHayNoLeidos`;
  - `permisoApagadoMuestraCartel`.
- [ ] **Step 2:** Correr los tests. Esperado: FAIL.
- [ ] **Step 3:** Implementar las pantallas, la campana y la ruta.
- [ ] **Step 4:** Correr `./gradlew checkFileLength assembleDebug testDebugUnitTest`. Esperado: PASS.
- [ ] **Step 5:** Snapshot.

### Task 7: Navegación a los destinos

**Files:**
- Create: `ui/notifications/launch/NotificationLaunchViewModel.kt` (vive en `RoleShell`) y `ui/notifications/launch/LaunchResolver.kt`, que es pura y testeable.
- Modify:
  - `navigation/RoleShell.kt`: consume `NotificationLaunchRequests` y los eventos `Open` de la lista, y navega;
  - `ui/progress/ProgressScreen.kt`: acepta un pedido "abrir Gráficos" que pone la solapa en Gráficos;
  - `ui/progress/charts/ChartsViewModel.kt`: `openExercise(id)` pone la vista en LOADS y elige el ejercicio si está en la lista; si no, no toca la elección.
- Test: `test/.../ui/notifications/launch/LaunchResolverTest.kt`, más un test de `openExercise` en el test del ViewModel de gráficos.

**Interfaces:**
- `suspend fun resolve(launch: PendingLaunch, session: Session?, ...): NavTarget`.
- `NavTarget` puede ser `HistoryDetail(id)`, `ProgressHistory`, `ProgressCharts(exerciseId)`, `Notifications` o `None`.
- Reglas (spec §3.3):
  - sin `Session.Student` da `None`, sin llamadas a la API ni a Room;
  - si hay `notificationId`, se llama `markRead`;
  - `SessionDetail`: si la sesión no está en `history_sessions` del dueño y hay red, `HistoryRepository.refreshList(owner)`; si aparece, `HistoryDetail`; si no, `ProgressHistory`;
  - `ExerciseChart` da `ProgressCharts(id)`;
  - `NotificationsList` da `Notifications`.

- [ ] **Step 1:** Tests:
  - `sinSesionDeAlumnoDescartaElDestino`;
  - `comentarioDeSesionGuardadaAbreElDetalle`;
  - `comentarioDeSesionNoGuardadaRefrescaYAbre`;
  - `comentarioSinRedYSinSesionVaAlHistorial`;
  - `recordAbreGraficosConElEjercicio`;
  - `marcaLeidoAlAbrir`;
  - `openExerciseFueraDeLaListaNoCambiaLaEleccion`.
- [ ] **Step 2:** Correr los tests. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr `./gradlew checkFileLength assembleDebug testDebugUnitTest`. Esperado: PASS.
- [ ] **Step 5:** Snapshot.

### Task 8: Verificación completa, E2E y docs

**Files:** Modify `docs/tarjetas.md` (fila 17: spec y plan) y `docs/arquitectura/contratos-api.md` solo si el celular usa algo que el contrato no aclara (no debería). No se toca `backend/README.md`, porque no hay cambios de API.

- [ ] **Step 1:** Correr `./gradlew checkFileLength assembleDebug testDebugUnitTest` y `connectedDebugAndroidTest` (DAO y migración). Todo verde.
- [ ] **Step 2:** E2E en el emulador con `alumna.card8` (spec §7). Para cargar avisos de prueba, insertar filas en `notifications` de Supabase dev, de tipo `comment` (con un `session_id` real de la alumna), `pr` (con `exercise_ids` de Press banca plano `760750fd-57b4-4909-9dc8-58700ef063ea`), `achievement` y uno `inactivity` (no tiene que aparecer).
  1. La campana muestra 3 y la lista sale agrupada.
  2. Tocar el comentario abre el detalle y la campana baja a 2.
  3. En modo avión, "Marcar todo leído" deja la campana en 0 y al volver la red queda leído en la base.
  4. Simular el tap del push con `adb shell am start -n com.fittrainer/.MainActivity --es type pr --es exercise_ids '["760750fd-..."]' --es notification_id <id>`: abre Gráficos con Press banca.
  5. Con el permiso de notificaciones revocado (`adb shell pm revoke com.fittrainer android.permission.POST_NOTIFICATIONS`), aparece el cartel y "Activar" abre los ajustes.
- [ ] **Step 3:** Prueba del push real: **pendiente no técnico**. Necesita la cuenta de servicio de Pablo; queda anotada en la tarjeta.
- [ ] **Step 4:** Snapshot. Después, auditoría de Codex en Trello.
