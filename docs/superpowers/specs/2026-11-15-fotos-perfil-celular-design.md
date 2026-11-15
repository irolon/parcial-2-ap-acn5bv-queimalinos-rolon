# Fotos de perfil en el celular (GX2-M2)

Tarjeta de Trello: [GX2-M2] Celular: mostrar las fotos de perfil (https://trello.com/c/LCvGcos1). Fecha: 15/11/2026.
Rama: `feature/android-fotos-perfil`, sobre `develop` (`1ffd4700`). Room: **v29 → v30**.

## Por qué

La web ya muestra las fotos de perfil: la del alumno desde la GX2 (#95) y la del entrenador desde la #124 (`PUT`/`DELETE /auth/me/avatar`). En el celular:
- **La foto del PT se descarta.** `MyProfile.kt:48` la pone en null si el rol no es alumno, y el PT no tiene cómo subirla.
- **Las fotos de los alumnos llegan firmadas** en casi todos los listados, pero se dibujan **iniciales** en 8 lugares.

Pablo lo pidió el 09/11 para que la funcionalidad quede completa en los dos clientes.

## Qué tiene que pasar (lo decidió Igna, 15/11)

### Foto del entrenador
1. **Su perfil:** el PT ve su foto en "Más" (tarjeta de perfil) y en Editar perfil, en vez de las iniciales.
2. **Subirla desde el celular:** en Editar perfil, el PT tiene "Cambiar foto" (galería) y, si tiene una, "Quitar foto". Usa `PUT /auth/me/avatar` (multipart, campo `image`) y `DELETE /auth/me/avatar`. Se comporta igual que la del alumno:
   - la foto se achica a 512 px en JPEG antes de subirla (`AvatarReader`, `AVATAR_MAX_SIDE`);
   - se guarda al momento, sin tocar Guardar;
   - sin conexión, mientras guarda o mientras se sube otra, los botones quedan deshabilitados;
   - un 413 o un 415 muestran los textos de siempre (`AVATAR_TOO_LARGE`, `AVATAR_TYPE_INVALID`).
3. **El alumno la ve en el chat:** en la cabecera de su chat con el PT, la foto del PT en vez de las iniciales.

### Fotos de los alumnos (las ve el PT)
4. Donde hoy el PT ve las iniciales de un alumno, se ve su foto:

| # | Pantalla | Archivo de hoy | De dónde sale la foto |
|---|---|---|---|
| a | Lista de alumnos | `ui/students/components/StudentRow.kt:53` | `TrainerStudent.avatarUrl` (Room, de `GET /students`, ya firmada) |
| b | Ficha del alumno (cabecera) | `ui/students/detail/components/DetailHeader.kt:27` | `GET /students/:id` ya la manda firmada (`students.service.js:81`), pero hoy el celular la descarta: se agrega `avatarUrl` a `StudentDetailDtos.kt` y a `TrainerStudentDetailEntity` (va en la misma v30) |
| c | Inicio: "en riesgo" y listas | `ui/students/overview/components/HomeLists.kt:76` | **hoy no viene** en `GET /students/overview`: se agrega en el backend (ver "Backend") |
| d | Inicio: "en sesión" | `ui/students/overview/components/InSessionSection.kt:41` | igual que c |
| e | Lista de conversaciones | `ui/messages/trainer/components/ConversationRow.kt:48` | `TrainerConversationEntity.avatarUrl` (ya en Room) |
| f | Cabecera del chat del PT | `ui/messages/trainer/chat/ChatScreen.kt:72` | `counterpart.avatar_url` de `GET /messages/:studentId`: se guarda (ver Room) |
| g | Turno en la agenda | `ui/agenda/trainer/AppointmentSheet.kt:67` | `Appointment.avatarUrl` (ya llega) |
| h | Elegir alumno al asignar plantilla | `ui/templates/trainer/assign/StudentPickerSheet.kt:57` | `TrainerStudent.avatarUrl` |
| i | "Pendientes de hoy" (reusa la fila de Inicio) | `ui/students/overview/pending/PendingTodayItems.kt:28` | igual que c (decisión de Claude: misma fila, misma foto) |

## Cómo (decisiones de Claude, aprobadas por Igna en el chat)

- **Un solo componente de avatar** para todo:
  - foto si hay URL y carga; iniciales si no hay URL, mientras carga, si falla o si la firma venció (dura 1 h). Es lo que ya hace `ProfileAvatar` (iniciales debajo y `AsyncImage` de Coil encima);
  - **"en riesgo":** hoy `StudentAvatar` solo pinta un fondo coral al 18 % con las iniciales en coral, y con foto ese fondo queda tapado. Sin foto queda como hoy. Con foto, se agrega un **aro coral de 2 dp** alrededor (decisión de Claude: es un elemento nuevo);
  - es decorativo (sin `contentDescription`), porque el nombre siempre está escrito al lado.

  La forma de unificar `StudentAvatar` y `ProfileAvatar` (un componente nuevo, o `StudentAvatar` con un parámetro `url`) queda para el plan, respetando las 200 líneas y la carpeta `ui/…/components`.
- **Inicio (c, d, i) — backend (lo decidió Igna, 15/11):** `GET /students/overview` pasa a mandar `avatar_url` firmada en cada alumno de `in_session` y de `lists.*` (`today`, `at_risk`, `feedback_pending`, `students`).
  - El endpoint es del módulo Students, que según `AGENTS.md` es de Igna.
  - En `services/students/overview.service.js`, `findActiveStudents` suma `avatar_url`. Se firman todas juntas con `signAvatars` (una llamada a Storage, best-effort: si Storage falla, salen en `null` y nunca da 500), y `buildOverview` (`models/students/overview.js`) las copia a cada ítem. La ruta del bucket no sale nunca sin firmar.
  - Tests del service y del modelo; `docs/arquitectura/contratos-api.md` al día, y el aviso a Pablo en `backend/README.md`, en el mismo commit.
  - **Se descartaron** dos alternativas: que Inicio refresque la lista de alumnos (dos o tres pedidos paginados más en cada refresco) y cruzar con la caché de alumnos (fotos vencidas o ausentes si el PT no pasó por Alumnos).
  - **Celular:** `OverviewDtos.kt` (`InSessionDto` y los ítems de las listas) suma `avatarUrl` y se pasa hasta la fila. El resumen se guarda en Room como JSON (`TrainerOverviewEntity.dataJson`), así que el campo entra solo con el DTO, sin columna nueva. Los resúmenes guardados antes llegan sin foto hasta el próximo refresco. "Pendientes de hoy" (i) toma la URL de la misma fila.
  - **Compatibilidad:** la web ignora el campo nuevo. Un celular nuevo contra un backend viejo ve las iniciales.
- **Cabeceras del chat (f y 3):** columna nueva **`counterpartAvatarUrl: String?`** en `TrainerMessageThreadEntity` (tabla de hilos, la usan el chat del PT y el del alumno). Se llena con `page.counterpart.avatarUrl` en `replaceThread` y `mergeThread` de `TrainerMessagesRepository`, igual que `counterpartName`, y se expone en `ThreadCache`. Así se ve también sin conexión mientras la firma no venza. **Room v30** con `AutoMigration(29, 30)` (columna nullable, sin default), su JSON de schema y el test de migración, como las anteriores.
- **Foto del PT en el perfil:** `ProfileDto.toEntity` deja de descartar `avatarUrl` para el rol trainer. `ProfileRepository.setAvatar`/`removeAvatar` reciben el rol: alumno → `PUT/DELETE /students/{id}/avatar` (como hoy); trainer → `PUT/DELETE /auth/me/avatar` (dos métodos nuevos en `ProfileApi`). En la UI, `EditProfileScreen.kt:85` y la guarda de `EditProfileViewModel.kt:150` dejan de limitarse a `Role.STUDENT`.
- **Una sola tarjeta y una sola PR.**
- **Margen de 200 líneas:** `TrainerMessagesRepository.kt` (197), `StudentChatViewModel.kt` (197) y `ChatViewModel.kt` (189) están al límite. Exponer `counterpartAvatarUrl` probablemente obligue a dividir alguno, en su carpeta, según `CONTRIBUTING.md`.

## Fuera de alcance

- Una sección "Tu entrenador/a" en el perfil del alumno, como la web. El chat alcanza.
- Fotos en la lista de conversaciones del alumno (tiene un solo chat).
- Otros cambios de backend: fuera de `avatar_url` en el resumen de Inicio, todo lo demás ya existe en develop (#95, #124).
- Mostrar fotos en el Inicio de la **web** (puede usar el campo nuevo después; no es parte de esta tarea).
- Re-firmar URLs vencidas por su cuenta: se renuevan con el refresco normal de cada pantalla.

## Que no pase

- Un avatar vacío o roto: sin foto, siempre las iniciales.
- Que se pierda el aviso visual de "en riesgo".
- Que el alumno vea botones de foto ajenos o que el PT pueda tocar la foto de un alumno: el PT solo sube **su** foto.
- Romper la foto del alumno, que ya anda (Perfil, Editar perfil).

## Criterio de aceptación

1. El PT sube una foto desde Editar perfil: la ve en "Más" y en Editar perfil. Quitarla vuelve a las iniciales.
2. El alumno ve la foto del PT en la cabecera de su chat, también sin conexión mientras la firma no venza.
3. El PT ve las fotos de sus alumnos en los 8 lugares de la tabla. Sin foto, las iniciales de siempre. "En riesgo" sigue marcado.
4. La foto del alumno sigue andando como antes.
5. `gradlew checkFileLength assembleDebug testDebugUnitTest` en verde, con tests de: el mapeo del perfil del PT con foto, el repositorio que elige la ruta según el rol, el guardado de `counterpartAvatarUrl` y de la foto de la ficha, la migración v29 → v30 y el mapeo de `avatarUrl` del resumen de Inicio.
5b. Backend: `npm run lint` y `npm test` en verde, con tests de `avatar_url` firmada en el resumen (y `null` si Storage falla).
6. Prueba en el celular o en el emulador contra el backend local con Supabase dev (cuentas QA).

## Lo que queda para el plan

Nombres de los componentes nuevos, cómo se pasan las URLs por cada `UiState`, el orden de las tareas y qué tests van en cada una.
