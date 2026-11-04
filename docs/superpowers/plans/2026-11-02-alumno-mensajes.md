---
tags: [plan]
tarjeta: 18
---
# Plan — 18 · Chat PT–alumno en mobile (lado del alumno)

Spec: `docs/superpowers/specs/2026-11-02-alumno-mensajes-design.md`. Rama `feature/android-mensajes-alumno` sobre la #68.

## Tareas

1. **Red y repositorio (foto).**
   - `TrainerMessagesApi.sendPhoto`: `@Multipart` con `image` (y `body` opcional).
   - `TrainerMessagesRepository.sendPhoto(ownerId, studentId, jpeg, caption)`: guarda la respuesta en Room igual que `send`. 413/415 → `PhotoRejectedException`.
   - Tests en `TrainerMessagesRepositoryPhotoTest` (con y sin epígrafe, 413, 415, sin red).
2. **Compresión.** `data/messages/photo/PhotoCompressor`:
   - lee el `Uri`, respeta el EXIF y achica a 1600 px;
   - JPEG 85;
   - error → `null`.
   - La cuenta del tamaño (`scaledSize`) es pura, con test unitario. La decodificación tiene test instrumentado con un bitmap generado.
3. **Componentes compartidos.**
   - `MessageBubble(message, zone, mine)`.
   - `Composer` con un slot opcional de adjuntar y la miniatura de la foto (`PhotoDraft`).
   - Los usos del PT no cambian de comportamiento.
4. **Chat del alumno.** `ui/messages/student/chat/`:
   - `StudentChatViewModel`: Room, polling cada 4 s visible, leído al llegar, foto adjunta o sacada, epígrafe, errores 409/403/413/415 y sin red.
   - `StudentChatScreen`: encabezado con el nombre del PT, filas por día, "Ver anteriores" y la hoja de adjuntar con cámara (`TakePicture` + `FileProvider`) o galería (`PickVisualMedia`).
   - Tests del ViewModel.
5. **Pestaña y globito.**
   - `STUDENT_MESSAGES_ROUTE`, en `RoleTabs`.
   - `StudentMessagesBadgeViewModel`: no leídos del PT en Room, con refresco del chat cada 15 s en primer plano; tiene test. El globito va en `tabBadges`.
   - `RoleShell` está en 200 líneas: el contenido de las pestañas pasa a `navigation/RoleTabContent.kt`.
6. **Manifest:** `FileProvider` (`${applicationId}.photos`) con `res/xml/photo_paths.xml` (caché `message-photos/`).
7. **Docs:**
   - aviso a Pablo en `backend/README.md` (push de mensajes);
   - "Cómo quedó" en el spec;
   - `docs/tarjetas.md` si corresponde.
8. **Verificación:**
   - `checkFileLength assembleDebug testDebugUnitTest compileDebugAndroidTestKotlin`;
   - el test instrumentado de la compresión en el emulador;
   - E2E con el backend local (alumna.card8 ↔ profe.card8).
9. **Auditoría:** la tarjeta 18 pasa a 🔍 AUDITORÍA CODEX con "Lista para auditar".
