# Fotos de perfil en el celular (GX2-M2) · Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans, tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Objetivo:** que el PT vea, suba y quite su foto en el celular; que el alumno vea la foto del PT en su chat; y que el PT vea las fotos de sus alumnos en los 9 lugares donde hoy hay iniciales.

**Arquitectura:**
- **Backend (módulo Students):** `GET /students/overview` suma `avatar_url` firmada a `in_session` y a `lists.*`.
- **Celular:**
  - `StudentAvatar` pasa a dibujar la foto con Coil sobre las iniciales;
  - el perfil del PT deja de descartar su foto y sube y quita por `/auth/me/avatar`;
  - Room v30 guarda la foto de la contraparte en los hilos del chat y la foto en la ficha del alumno;
  - las URLs viajan por el dominio y el `UiState` hasta cada fila.

**Stack:** Node 22 + Express + Jest (backend); Kotlin, Compose, Room, Retrofit, Hilt, Coil (celular).

**Spec:** `docs/superpowers/specs/2026-11-15-fotos-perfil-celular-design.md`

## Restricciones globales

- Ningún archivo de código (tests y `.sql` incluidos) pasa de **200 líneas físicas**. Lo que se divide va en una carpeta con su nombre (`CONTRIBUTING.md`).
- La UI lee siempre de Room. Ninguna pantalla ni ViewModel llama a Retrofit.
- La ruta del bucket nunca sale sin firmar. Si `signAvatars` falla, sale `null` y nunca un 500.
- Room pasa de **v29 a v30** con `AutoMigration(from = 29, to = 30)`, el JSON en `mobile/app/schemas/` y `MigrationV30Test` (androidTest, en `data/db/migration/v3x/`).
- Las fotos son decorativas: sin `contentDescription`, porque el nombre está escrito al lado.
- "En riesgo" sin foto queda como hoy (fondo coral al 18 % con iniciales coral). Con foto, **aro coral de 2 dp**.
- Textos de error de foto: los de siempre (`AVATAR_TOO_LARGE`, `AVATAR_TYPE_INVALID`).
- **No se commitea:** commits, push y PR los hace Igna. Cada tarea termina en "verificar", no en "commit".
- Antes de dar la tarjeta por terminada:
  - backend: `npm run lint && npm test` en `backend/`;
  - celular: `gradlew checkFileLength assembleDebug testDebugUnitTest`, y `connectedDebugAndroidTest` para la migración si hay emulador o celular conectado.

## Qué revisar especialmente

1. **URL firmada vencida o sin red** (más de 1 h, o modo avión): se ven las iniciales, sin hueco ni ícono roto. Lo cubre el diseño de `StudentAvatar` (iniciales debajo y la foto encima). Se prueba a mano en la Tarea 6.
2. **Storage caído en el backend:** `GET /students/overview` responde 200 con `avatar_url: null`. Test en la Tarea 1.
3. **El alumno edita su perfil:** sigue usando `/students/{id}/avatar`, no `/auth/me/avatar`. Test en la Tarea 3.
4. **Un caché viejo de Inicio** (JSON sin `avatar_url`) se lee sin romper, con las URLs en `null`. Test en la Tarea 5.
5. **Una respuesta del hilo sin `counterpart.avatar_url`** (backend viejo) deja `null`, y un refresco posterior con foto la actualiza. Test en la Tarea 4.

---

### Tarea 1: backend, `avatar_url` firmada en el resumen de Inicio

**Archivos:**
- Modificar: `backend/src/repositories/students/overview.repository.js:14` (`select('id, name, created_at')` → suma `avatar_url`)
- Crear: `backend/src/models/students/overview-avatars.js`
- Modificar: `backend/src/services/students/overview.service.js`
- Tests: `backend/tests/unit/models/students/overview-avatars.test.js` (nuevo), `backend/tests/unit/services/students/overview.service.test.js`
- Docs: `docs/arquitectura/contratos-api.md` (sección `GET /students/overview`) y `backend/README.md`, sección `## Avisos` (aviso a Pablo)

**Interfaces:**
- Produce: `attachAvatars(overview, avatarById: Map<string, string|null>) → overview`, en `models/students/overview-avatars.js`. Devuelve un objeto nuevo donde cada ítem de `in_session`, `lists.today`, `lists.at_risk`, `lists.feedback_pending` y `lists.students` suma `avatar_url: avatarById.get(item.student_id) ?? null`. No muta la entrada. No toca `attention`, `recent` ni `daily`.
- Contrato: cada ítem de esas cinco listas suma `avatar_url` (string firmada o `null`).

- [ ] **Paso 1: tests que fallan**
  - `overview-avatars.test.js`:
    - `'agrega avatar_url por student_id en in_session y las cuatro listas'`: con `avatarById = new Map([['s1','https://firmada/1']])`, cada ítem de `s1` tiene `avatar_url: 'https://firmada/1'` y uno de `s2` tiene `null`;
    - `'no toca attention, recent ni daily'`: `toEqual` a los originales;
    - `'no muta la entrada'`.
  - `overview.service.test.js`:
    - `'firma las fotos de los alumnos en una sola llamada'`: el mock de `signAvatars`, o de `avatarsRepo.signPaths` según cómo mockee el archivo hoy, se llama una vez con las rutas y `lists.students[0].avatar_url` es la firmada;
    - `'si Storage falla, avatar_url es null y responde igual'`: `signPaths` rechaza y el resultado tiene `avatar_url: null`, sin tirar.
- [ ] **Paso 2:** `npm test -- overview` → FALLA (`attachAvatars` no existe / `avatar_url` undefined).
- [ ] **Paso 3:** implementar.
  - Repo: `avatar_url` en el select.
  - Service: después de `findActiveStudents`, `const signed = await signAvatars(students)` (`services/students/avatar-urls.service.js`, ya es best-effort) y `avatarById` de `signed`.
  - A `buildOverview` le pasan los `students` sin la ruta cruda, o con la firmada: no importa, porque los builders de las listas eligen campos explícitos.
  - Devolver `attachAvatars(buildOverview(...), avatarById)`.
  - Con 0 alumnos (`empty`) no se firma nada.
- [ ] **Paso 4:** `npm test -- overview` → PASA.
- [ ] **Paso 5: docs.**
  - `contratos-api.md`: `avatar_url` en los ítems de `in_session` y de `lists.*` ("firmada, 1 h; `null` sin foto o si Storage falla").
  - `backend/README.md` → `## Avisos`: una línea para Pablo: "`GET /students/overview`: los ítems de `in_session` y `lists.*` suman `avatar_url` firmada (GX2-M2). La web lo puede usar en el Inicio".
- [ ] **Paso 6:** `cd backend && npm run lint && npm test` → todo verde, "ningún archivo pasa de 200 líneas".

### Tarea 2: celular, `StudentAvatar` con foto

**Archivos:**
- Modificar: `mobile/app/src/main/java/com/fittrainer/ui/students/components/StudentAvatar.kt`

**Interfaces:**
- Produce: `@Composable fun StudentAvatar(initials: String, atRisk: Boolean, size: Dp = 44.dp, url: String? = null)`. Es el mismo nombre y el parámetro nuevo va al final con default `null`, así los 9 lugares compilan sin cambios hasta que las tareas siguientes les pasen la URL.
- Comportamiento:
  - el `Box` va recortado en círculo;
  - las iniciales se dibujan siempre;
  - si `url != null`, un `AsyncImage` (Coil, `ContentScale.Crop`, `contentDescription = null`, `fillMaxSize`) va encima;
  - si `atRisk && url != null`, se suma `border(2.dp, FtColors.Coral, CircleShape)`;
  - `clearAndSetSemantics {}`, como en `ProfileAvatar`.

- [ ] **Paso 1:** implementar. No lleva test unitario: es un composable sin lógica que se pueda probar en JVM, y el comportamiento sin foto o con la foto vencida se prueba a mano en la Tarea 6.
- [ ] **Paso 2:** `gradlew :app:compileDebugKotlin` → OK.

### Tarea 3: celular, foto del PT en su perfil (ver, subir y quitar)

**Archivos:**
- Modificar: `data/account/MyProfile.kt:48` (deja de descartar `avatarUrl` para trainer)
- Modificar: `data/api/account/ProfileApi.kt` (dos métodos nuevos)
- Modificar: `data/account/ProfileRepository.kt` (`setAvatar` / `removeAvatar` reciben el rol)
- Modificar: `ui/account/edit/EditProfileViewModel.kt:143-150` y `ui/account/edit/EditProfileScreen.kt:85` (sin el filtro `Role.STUDENT` para la foto); `PhotoRow.kt`, KDoc ("La foto del usuario")
- Tests: `data/account/ProfileRepositoryTest.kt`, `ui/account/edit/EditProfileViewModelTest.kt` y un test de mapeo (en `ProfileRepositoryTest` o uno nuevo `data/account/MyProfileMappingTest.kt`)

(Rutas bajo `mobile/app/src/main/java/com/fittrainer/` y `mobile/app/src/test/java/com/fittrainer/`.)

**Interfaces:**
- `ProfileApi`:
  - `@Multipart @PUT("auth/me/avatar") suspend fun setTrainerAvatar(@Tag owner: RequiredUser, @Part image: MultipartBody.Part): AvatarResponse`
  - `@DELETE("auth/me/avatar") suspend fun removeTrainerAvatar(@Tag owner: RequiredUser): Response<Unit>`
- `ProfileRepository`:
  - `suspend fun setAvatar(ownerId: String, role: Role, jpeg: ByteArray): Result<Unit>`
  - `suspend fun removeAvatar(ownerId: String, role: Role): Result<Unit>`

  Con `Role.STUDENT` llaman a lo de siempre (`/students/{id}/avatar`); con `Role.TRAINER`, a los nuevos. La escritura en Room no cambia.

- [ ] **Paso 1: tests que fallan**
  - Mapeo: `ProfileDto(avatarUrl = "https://firmada").toEntity(owner, Role.TRAINER, now).avatarUrl == "https://firmada"`.
  - `ProfileRepositoryTest`:
    - `trainerSetAvatarUsesAuthMe`: con `Role.TRAINER` llama a `setTrainerAvatar`, nunca a `setAvatar(…, id, …)`, y guarda la URL en Room;
    - `trainerRemoveAvatarUsesAuthMe`;
    - `studentSetAvatarStillUsesStudentsRoute`: el caso 3 de "Qué revisar".
  - `EditProfileViewModelTest`: `trainerCanPickPhoto`, donde un PT online llama a `repository.setAvatar(owner, Role.TRAINER, jpeg)`. Si hoy hay un test que espera que el PT **no** pueda, se actualiza.
- [ ] **Paso 2:** `gradlew :app:testDebugUnitTest --tests "*ProfileRepositoryTest" --tests "*EditProfileViewModelTest*"` → FALLA.
- [ ] **Paso 3:** implementar según las Interfaces. Los llamadores de `setAvatar`/`removeAvatar` le pasan el rol de la sesión (`session.value.role`).
- [ ] **Paso 4:** los mismos tests → PASAN.

### Tarea 4: celular, Room v30 (foto de la contraparte en el hilo y foto en la ficha)

**Archivos:**
- Modificar: `data/db/messages/trainer/TrainerMessageEntities.kt` (`TrainerMessageThreadEntity` + `val counterpartAvatarUrl: String? = null`)
- Modificar: `data/messages/trainer/TrainerMessage.kt:44` (`ThreadCache` + `val avatarUrl: String?`)
- Modificar: `data/messages/trainer/TrainerMessagesRepository.kt:67,89,91` (en `replaceThread` / `mergeThread` se guarda `page.counterpart.avatarUrl`; `ThreadCache` lo expone). Está en 197 líneas: si se pasa, extraer el armado de `ThreadCache` / el guardado del hilo a `data/messages/trainer/thread/ThreadStore.kt` (o el nombre que ordene mejor), en carpeta propia.
- Modificar: `data/api/students/StudentDetailDtos.kt` (`@SerialName("avatar_url") val avatarUrl: String? = null`), `data/db/students/TrainerStudentDetailEntity.kt` (`val avatarUrl: String? = null`), `data/students/detail/StudentDetail.kt` (`val avatarUrl: String?`) y el mapper o repositorio de la ficha que los une.
- Modificar: `data/db/FitTrainerDatabase.kt` (`version = 30`, `AutoMigration(from = 29, to = 30)`)
- Crear: `mobile/app/schemas/…/30.json` (lo genera el build con `exportSchema`)
- Crear: `mobile/app/src/androidTest/java/com/fittrainer/data/db/migration/v3x/MigrationV30Test.kt` (copiar la forma de `v2x/MigrationV29Test.kt`)
- Tests: `data/messages/trainer/TrainerMessagesRepositoryAvatarTest.kt` (nuevo, al lado de los otros `TrainerMessagesRepository*Test`, como el patrón actual) y `data/students/detail/TrainerStudentDetailRepositoryTest.kt`

**Interfaces:**
- Produce: `ThreadCache.avatarUrl: String?` (la foto de la otra persona: el alumno para el PT, el PT para el alumno) y `StudentDetail.avatarUrl: String?`.

- [ ] **Paso 1: tests que fallan**
  - `TrainerMessagesRepositoryAvatarTest`:
    - `savesCounterpartAvatar`: la página con `counterpart.avatarUrl = "https://firmada"` y `observeThread(...)` emite un `ThreadCache` con `avatarUrl == "https://firmada"`;
    - `mergeUpdatesAvatar`: una primera página sin foto y un refresco con foto dejan la foto (caso 5);
    - `missingAvatarIsNull`.
  - `TrainerStudentDetailRepositoryTest`: `detailKeepsAvatarUrl`.
  - `MigrationV30Test`: una fila de `trainer_message_threads` (o el nombre real de la tabla) y de la ficha, insertadas en v29, sobreviven en v30 con las columnas nuevas en `null`.
- [ ] **Paso 2:** `gradlew :app:testDebugUnitTest --tests "*TrainerMessagesRepositoryAvatarTest" --tests "*TrainerStudentDetailRepositoryTest"` → FALLA.
- [ ] **Paso 3:** implementar. Subir la versión, compilar para generar `30.json` y escribir el test de migración.
- [ ] **Paso 4:** los mismos tests → PASAN. `gradlew :app:assembleDebug` → OK (genera `30.json`). Con un dispositivo conectado: `gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.fittrainer.data.db.migration.v3x.MigrationV30Test` → PASA. Sin dispositivo, anotarlo como pendiente.

### Tarea 5: celular, Inicio con fotos (DTO, dominio y filas)

**Archivos:**
- Modificar: `data/api/students/OverviewDtos.kt`: `@SerialName("avatar_url") val avatarUrl: String? = null` en `InSessionDto`, `TodayDto`, `RiskDto`, `FeedbackDto` y `OverviewStudentDto`.
- Modificar: `data/students/overview/TrainerOverview.kt`: `avatarUrl: String?` en `TodayItem`, `RiskItem`, `FeedbackItem`, `StudentItem` e `InSessionItem`, y los `toDomain` lo copian.
- Modificar: `ui/students/overview/components/HomeLists.kt` (`HomeRow` recibe `url: String?` y se lo pasa a `StudentAvatar`; `TodayRow` y las demás filas lo toman de su ítem), `ui/students/overview/components/InSessionSection.kt:41` y `ui/students/overview/pending/PendingTodayItems.kt:28` (usa `TodayRow`, así que lo toma solo).
- Tests: `data/students/overview/TrainerOverviewMapperTest.kt`

- [ ] **Paso 1: tests que fallan** en `TrainerOverviewMapperTest`:
  - `mapsAvatarUrls`: un JSON con `avatar_url` en un ítem de cada lista y en `in_session` llega a cada `*Item.avatarUrl`;
  - `oldCacheWithoutAvatarReadsNull`: un JSON sin `avatar_url`, con el `Json` del repositorio, da `null` y no tira (caso 4).
- [ ] **Paso 2:** `gradlew :app:testDebugUnitTest --tests "*TrainerOverviewMapperTest"` → FALLA.
- [ ] **Paso 3:** implementar el DTO, el dominio y las filas.
- [ ] **Paso 4:** el test → PASA. `gradlew :app:compileDebugKotlin` → OK.

### Tarea 6: celular, el resto de los lugares y verificación final

**Archivos (cada uno le pasa `url = …` a `StudentAvatar`):**
- `ui/students/components/StudentRow.kt:53`: `row.avatarUrl`. Sumar `avatarUrl` a la fila del `UiState` (`ui/students/StudentsUiState.kt`) desde `TrainerStudent.avatarUrl`.
- `ui/students/detail/components/DetailHeader.kt:27`: la foto de `StudentDetail.avatarUrl` (Tarea 4), pasada por `StudentDetailUiState`.
- `ui/messages/trainer/components/ConversationRow.kt:48`: `conversation.avatarUrl` (ya está en `TrainerMessage.kt:21`).
- `ui/messages/trainer/chat/ChatScreen.kt:72` + `ChatUiState`/`ChatViewModel.kt` (189 líneas): `avatarUrl = t?.avatarUrl`.
- `ui/messages/student/chat/StudentChatScreen.kt:80` + `StudentChatUiState.kt` + `StudentChatViewModel.kt` (197 líneas): `trainerAvatarUrl = t?.avatarUrl`. Si se pasa de 200, extraer el armado del `uiState` a `ui/messages/student/chat/state/…` en carpeta propia.
- `ui/agenda/trainer/AppointmentSheet.kt:67`: `appt.avatarUrl`.
- `ui/templates/trainer/assign/StudentPickerSheet.kt:57`: `student.avatarUrl`.
- Tests: `ui/messages/trainer/chat/ChatViewModelTest.kt` (`exposesCounterpartAvatar`), el test del ViewModel del chat del alumno (`exposesTrainerAvatar`) y el de `StudentsViewModel` o su mapper (`rowCarriesAvatarUrl`).

- [ ] **Paso 1: tests que fallan** (los tres de arriba: la URL del dominio llega al `UiState`).
- [ ] **Paso 2:** correrlos → FALLAN.
- [ ] **Paso 3:** implementar los 7 lugares.
- [ ] **Paso 4:** correrlos → PASAN.
- [ ] **Paso 5: verificación completa.**
  - `cd mobile && gradlew checkFileLength assembleDebug testDebugUnitTest` → BUILD SUCCESSFUL, sin archivos de más de 200 líneas.
  - `cd backend && npm run lint && npm test` → verde.
- [ ] **Paso 6: prueba manual** (emulador o celular, backend local contra Supabase dev, cuentas QA):
  1. El PT sube una foto en Editar perfil: se ve en Más y en Editar perfil. Quitarla vuelve a las iniciales.
  2. El alumno abre su chat y ve la foto del PT. En modo avión se sigue viendo, porque Coil la tiene en caché.
  3. Un alumno QA con foto: el PT la ve en Alumnos, la ficha, Inicio ("en riesgo" con aro coral si corresponde, "en sesión" y Pendientes), Mensajes (lista y cabecera), Agenda y Asignar plantilla.
  4. Sin foto: iniciales en todos lados.
  5. La foto del alumno en su Perfil sigue andando.

  Si no hay dispositivo, anotarlo como pendiente en el comentario de la tarjeta.
