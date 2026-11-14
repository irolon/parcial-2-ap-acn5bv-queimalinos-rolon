# Biblioteca de ejercicios: archivar en vez de bloquear, video embebido y aviso de nombres repetidos (deseables)

Fecha: 14/11/2026 · Rama: `feature/exercise-library-archive` · Dos tarjetas deseables en una PR porque tocan los mismos archivos de la biblioteca.

## Objetivo

1. **Archivar ejercicios en uso** (surge de la tarjeta 6). Hoy, si un ejercicio propio está en una rutina o en el historial, `DELETE /exercises/:id` responde 409 y no hay forma de sacarlo de la biblioteca. Ahora "borrar" un ejercicio en uso lo **archiva**: desaparece de la biblioteca y del panel del editor, pero las rutinas, plantillas, sesiones y el progreso viejos lo siguen mostrando.
2. **Video embebido** en el detalle del ejercicio (web): reproductor de YouTube en vez del botón "Ver video" que abría otra pestaña.
3. **Aviso de nombre repetido** (web): al crear o editar un ejercicio con el mismo nombre que otro de la biblioteca (global o propio), un aviso que no bloquea.

## Decisiones

### Archivar (backend + web)

- **Columna `exercises.archived_at timestamptz null`** (no un booleano): `null` = activo; con fecha = archivado y cuándo. Sirve para auditar sin costo extra y se filtra igual (`archived_at is null`).
- **`DELETE /exercises/:id` decide solo**: intenta borrar; si la base responde `23503` (el ejercicio está en `routine_exercises` o `session_sets`), lo archiva en vez de devolver 409.
  - Borrado de verdad → **204** sin cuerpo (como hoy).
  - Archivado → **200** `{ data: { id, archived: true } }`.
  - El celular no se rompe: su `delete` es `Response<Unit>` (Retrofit descarta el cuerpo) y en los dos casos lo saca de Room, que es lo que corresponde.
  - El 409 `EXERCISE_IN_USE` desaparece (se saca `Errors.exerciseInUse` del catálogo: ya nada lo emite; el celular trata el 409 por status y nunca lo va a recibir).
- **Archivado = invisible para editar**: `PATCH` y `DELETE` de un ejercicio archivado responden 404 "Ejercicio no encontrado" (para el PT ya no existe en su biblioteca). Un global sigue sin poder borrarse (403) y solo el dueño puede archivar/borrar el suyo (403 si es ajeno), igual que hoy.
- **Sin "desarchivar" ni "ver archivados"** en esta tarjeta (alcance chico). Si el PT lo necesita, crea uno nuevo con el mismo nombre.
- **Dónde se filtran los archivados (no aparecen):**
  - `GET /exercises` (biblioteca del PT y panel del editor de rutinas).
  - `GET /exercises/library` (biblioteca del alumno).
  - Biblioteca que viaja a n8n para generar rutinas con IA (`findLibraryForEquipment`) y los ejercicios de la plantilla base que se suman a esa biblioteca (`findLibraryByIds`). Como la validación de la propuesta de la IA usa los ids de esa biblioteca, un id archivado que devuelva la IA queda rechazado ("no está en la biblioteca").
  - Alternativas del chat del alumno (`findAlternatives`).
- **Dónde se siguen resolviendo (no se filtra):**
  - `findExerciseById` (ownership, ejercicio actual del chat, progreso por ejercicio).
  - `findAccessibleExerciseIds`: guardar series de una sesión (una rutina vieja puede tener el archivado y el alumno lo sigue entrenando, incluso offline), ver progreso de ese ejercicio y editar una rutina que ya lo tiene. Decisión: no se bloquea agregar un archivado por API; la web no lo ofrece porque no está en el panel, y al cargar una plantilla o borrador en el editor el archivado se quita con el aviso que ya existe ("Quitamos N ejercicios que ya no están en la biblioteca").
  - Hidratación de plantillas, historial de sesiones, exportación, notificaciones y rutinas (joins por id).
- **Web**: el diálogo de borrado avisa antes: "Si está en una rutina o en el historial de un alumno, lo archivamos: sale de la biblioteca pero las rutinas y sesiones viejas lo siguen mostrando." Si el servidor responde que lo archivó, el diálogo se cierra igual y la biblioteca se refresca.

### Video embebido (web)

- `https://www.youtube-nocookie.com/embed/<id>` en un `iframe` con `title="Video de <nombre>"`, `loading="lazy"`, `allow="encrypted-media; picture-in-picture; fullscreen"`, `allowFullScreen` y `referrerPolicy="strict-origin-when-cross-origin"` (YouTube pide el referrer para reproducir embebido).
- El id sale de `youtube.com/watch?v=`, `youtu.be/`, `/shorts/` y `/embed/` (la función `youTubeId` que ya existía) y solo se embebe si tiene forma de id (`[A-Za-z0-9_-]`), así nunca se arma una URL rara.
- Debajo del reproductor queda un link chico "Abrir en YouTube" (hay videos con el embebido deshabilitado por el autor).
- Links que no son de YouTube: igual que hoy (miniatura rayada + "Ver video" en otra pestaña).
- CSP: la web no define CSP propia (ni `<meta>` en `index.html` ni encabezados en el deploy); el `helmet()` del backend solo afecta respuestas de la API. No hace falta tocar nada.

### Aviso de nombre repetido (web)

- Se compara contra la biblioteca ya cargada (`GET /exercises`, la caché de React Query), sin pedir nada nuevo.
- Normalización: sin tildes (NFD), minúsculas, espacios colapsados y recortados. "Press  Banca" = "press banca" = "Prés banca".
- Al editar, se ignora el mismo ejercicio.
- Texto: "Ya hay un ejercicio global llamado «X». Podés guardarlo igual." (o "propio"). Es `role="status"`, no bloquea el Guardar.

## Contrato

`DELETE /exercises/:id` (trainer, dueño):

| Caso | Respuesta |
| --- | --- |
| No está en uso | 204 sin cuerpo |
| Está en una rutina o en una sesión | 200 `{ data: { id, archived: true } }` |
| No existe o ya está archivado | 404 `NOT_FOUND` |
| Global o de otro PT | 403 `FORBIDDEN` |

`GET /exercises`, `GET /exercises/library`: sin cambios de forma; ya no incluyen archivados.

## Cambios de datos

- Migración `backend/src/database/migrations/2026-11/09-15/2026-11-14-biblioteca.sql`: `alter table exercises add column if not exists archived_at timestamptz;` (aditiva, idempotente).
- `database/schema/03-routines.sql` y `database/checks/schema-checks.sql` al día.
- **Orden de deploy**: la migración tiene que correr **antes** de desplegar el backend: los listados filtran `archived_at is null` y sin la columna PostgREST responde error (la biblioteca daría 500).

## Criterio de aceptación

- Borrar un propio sin uso lo elimina (204); uno en uso lo archiva (200) y no vuelve a aparecer en `GET /exercises`, `/exercises/library`, la biblioteca de la IA ni las alternativas del chat.
- Rutinas, plantillas, historial, progreso y sesiones nuevas de rutinas viejas siguen resolviendo el archivado.
- El detalle de un ejercicio con video de YouTube muestra el reproductor `youtube-nocookie`; otros links muestran "Ver video".
- Crear o editar con un nombre repetido muestra el aviso y deja guardar.
- Tests unitarios (repos mockeados) para todo lo del backend; prueba en el navegador solo para el video y el aviso.
