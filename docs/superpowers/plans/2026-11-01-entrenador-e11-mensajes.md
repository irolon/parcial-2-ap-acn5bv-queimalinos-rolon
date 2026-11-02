---
tags: [plan]
tarjeta: E11
---
# Plan — E11 · Mensajes del entrenador

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e11-mensajes-design.md`.

## Restricciones globales

- ≤ 200 líneas físicas por archivo, organizado capa → módulo → archivo y con los tests copiando el árbol.
- La UI lee de Room. Las escrituras del entrenador son solo online.
- Room v22, AutoMigration 21→22, con `MigrationV22Test`.

## Task 1: Datos

- **Red:** `data/api/messages/TrainerMessagesDtos.kt`, `TrainerMessagesApi.kt` (conversations, history, send JSON, markRead, broadcast), registrados en `NetworkModule`.
- **Room:** `data/db/messages/trainer/TrainerMessageEntities.kt`, `TrainerMessagesDao.kt`; v22 en `FitTrainerDatabase` y el DAO en `DatabaseModule`.
- **Dominio y repositorio:** `data/messages/trainer/TrainerMessage.kt` (modelos y excepciones), `TrainerMessageMapper.kt`, `TrainerMessagesRepository.kt` (Mutex por PT, hueco, más viejos, errores), y `di/messages/TrainerMessagesModule.kt` (cleaner).
- **Tests:** `TrainerMessagesRepositoryTest`, `TrainerMessagesRepositoryErrorsTest`, la carrera, y fakes en `testing/fakes/messages/`.

## Task 2: Lista, globito y difusión

- `ui/messages/trainer/MessagesTexts.kt` (vista previa, hora, separador de día, textos).
- `list/ConversationsScreen.kt`, `ConversationsViewModel.kt` y `components/ConversationRow.kt`.
- `broadcast/BroadcastSheet.kt` y el estado de la hoja en `ConversationsViewModel`.
- `badge/MessagesBadgeViewModel.kt` (polling de 15 s mientras la app está en primer plano). En `RoleNavigationBar`, el globito pasa a ser un mapa de pestaña → no leídos.
- **Tests:** textos, ViewModel de la lista con la difusión, y el globito.

## Task 3: Chat

- `chat/ChatViewModel.kt` (polling de 4 s, leído, enviar, más viejos) y `chat/ChatScreen.kt`, con `components/MessageBubble.kt` y `components/Composer.kt`. Coil para las fotos (`io.coil-kt:coil-compose:2.7.0`).
- Rutas `trainer/messages/{studentId}` en `navigation/TrainerMessageRoutes.kt`; la pestaña reemplaza al placeholder. Botón "Mensaje" en la ficha.
- **Tests:** `ChatViewModelTest` (enviar, 409, polling y leído).

## Task 4: Verificación y E2E

- `gradlew checkFileLength assembleDebug testDebugUnitTest`, `MigrationV22Test` y el E2E del §5 del spec.
- "Cómo quedó", tarjeta a 🔍 AUDITORÍA y comentario.

**Estado (01/11):** las cuatro tareas están hechas; ver "Cómo quedó" en el spec.
