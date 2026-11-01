---
tags: [spec]
tarjeta: E4
---
# Spec — E4 · Historial de sesiones del alumno y comentario del entrenador (mobile)

- **Tarjeta:** [E4 del tablero del entrenador](https://trello.com/c/GgpGgDvw).
- **Fecha:** 2026-11-01.
- **Rama:** `feature/android-entrenador-historial`, apilada sobre `feature/android-entrenador-ficha` (E3).
- **Diseño:** sección "ÚLTIMAS SESIONES" de `EM_PerfilAlumno`, y el detalle del historial del alumno (tarjeta 12) como base visual.
- **Contrato:** `GET /students/:id/sessions`, `GET /students/:id/sessions/:sessionId` y `PATCH /sessions/:id/comment`. El backend no se toca.

## 1. Objetivo

El entrenador ve cómo entrenó cada alumno, serie por serie (con el descanso real contra el plan, de la tarjeta dwQI3sGR), y le deja su devolución, que el alumno lee en su historial.

**Criterio de aceptación:** el entrenador abre una sesión de un alumno, ve las series y el descanso real contra el plan, deja un comentario y el alumno lo ve en su celular.

## 2. Decisiones (debate del 01/11)

- **Reuso, sin tocar el historial del alumno:**
  - se reusan los DTOs (`data/api/history/HistoryDtos.kt`), `SessionApi.history` y `historyDetail` (ya reciben `studentId`);
  - los mappers de dominio (`HistoryItem`, `HistoryDetail`);
  - los textos (`HistoryTexts.kt`) y los componentes visuales (`HistoryCard`, `ExerciseBlock`, `DetailHeader`).
  - El repositorio y las tablas del alumno (`HistoryRepository`, `history_*`) **no** se tocan: tienen lógica propia (sesiones locales sin subir, no leídos, páginas).
- **Caché propio del entrenador**, en tablas nuevas para el entrenador, por `(trainerId, studentId)`: la lista de cada alumno visto (la página 1 de 20 y lo que se trajo con "Ver más") y el detalle de cada sesión abierta. **Todo pasa por Room, también "Ver más"** (AGENTS.md): la UI nunca muestra una respuesta de la API directo. Un refresh exitoso vuelve la lista a la página 1; uno fallido no toca nada.
- **Comentario solo online:** hasta 1000 caracteres; vacío borra (`""` en el PATCH). Sin red, el campo se ve pero "Guardar" queda deshabilitado con "Necesitás conexión". Si sale bien, se actualiza el caché de la sesión (detalle y resumen) con la respuesta.

## 3. Pantallas

### 3.1 En la ficha (E3)

- Sección "ÚLTIMAS SESIONES" con las 3 más recientes.
- Cada fila muestra fecha ("22 OCT"), rutina, RPE si hay, 🏆 si hubo récord y 💬 si ya tiene comentario del entrenador.
- "Ver todas" abre la lista completa.

### 3.2 Lista (`trainer/students/{studentId}/sessions`)

- Título con el nombre del alumno.
- Tarjetas como las del historial del alumno: fecha, rutina, "N min · N series · N kg", RPE, 🏆 y 💬.
- "Ver más" al final cuando hay más páginas (solo con red).
- **Estados:** cargando, vacío ("Todavía no registró sesiones."), sin red con caché (aviso) y error sin caché.

### 3.3 Detalle (`trainer/students/{studentId}/sessions/{sessionId}`)

- Mismo contenido que el detalle del alumno:
  - cabecera con fecha, rutina y resumen;
  - RPE y nota del alumno;
  - un bloque por ejercicio con el plan y las series, con el descanso real ("desc. 2:00 (plan 1:30)" en ámbar si difiere).
- Abajo, "TU COMENTARIO":
  - campo multilínea con el comentario actual y contador "N/1000";
  - "Guardar" y, si hay uno guardado, "Borrar".
  - Tras guardar: "Comentario guardado".

## 4. Datos

> Actualizado al implementar (01/11) y con la revisión de la #55.

- **Room (v14), dos tablas:**
  - `trainer_sessions` (PK `trainerId, id`): `studentId`, los campos del resumen, `listed` (se muestra en la lista) y `exercisesJson` (el detalle del GET de detalle como JSON, reusando `HistoryExerciseDto`; `null` = nunca se abrió).
  - `trainer_sessions_sync` (PK `trainerId, studentId`): `fetchedAt`, `nextPage` (la página que pide "Ver más") y `hasMore`.
  - La lista es `listed = 1`, ordenada por `startedAt DESC, id DESC`. Una sesión repetida entre páginas es una sola fila.
  - Al refrescar la página 1, las filas que salen de la lista y nunca se abrieron se borran. El detalle se conserva si no cambiaron las series, el volumen, el PR, las modificaciones ni el fin.
- **`StudentSessionsRepository`** en `data/students/sessions/`:
  - `observeLatest(trainerId, studentId): Flow<SessionsCache(items, fetchedAt, hasMore)>`;
  - `refreshLatest(trainerId, studentId)`: página 1, `replaceLatest` transaccional. El ViewModel no lo llama al volver a la pantalla si el último refresh OK es de hace menos de 5 min o si se trajo más con "Ver más" (si no, volver de un detalle cortaba la lista a la página 1); "Reintentar" siempre baja;
  - `loadMore(trainerId, studentId)`: la página `nextPage`, `appendPage` transaccional;
  - `observeDetail(trainerId, sessionId)` y `refreshDetail(trainerId, studentId, sessionId)`;
  - `saveComment(trainerId, studentId, sessionId, text)`: guarda la respuesta del PATCH, conservando el detalle;
  - todo lo de un mismo `(trainerId, studentId)` corre con un **Mutex**: un GET que salió antes de un PATCH termina antes de que el PATCH empiece, así nunca pisa un comentario;
  - 403/404 → `DataError.NotFound`; en el detalle y el comentario, además, la sesión sale del caché;
  - es parte del `UserDataCleaner`.
- **Errores en la UI:** sin red se ve lo guardado con el indicador; otro error al refrescar la lista o el detalle muestra "No pudimos actualizar…" con **Reintentar** y conserva lo guardado; NotFound en el detalle avisa y vuelve.
- **`SessionApi`** suma `comment(sessionId, body)` (`PATCH sessions/{id}/comment`), con `trainer_comment` en null explícito para borrar.

## 5. Pruebas

- **Unit:**
  - mappers DTO ↔ entidad (con el descanso);
  - repositorio: refresh de la página 1 que reemplaza solo la de ese alumno, detalle, comentario que actualiza el caché, borrar con `""`, error que conserva el caché, dueño distinto que no ve lo de otro;
  - ViewModel del detalle: sin red, contador, más de 1000 bloqueado, guardar y borrar.
- **Migración (androidTest).**
- **E2E:** como `profe.card8`, abrir la sesión del 01/11 de alumna.card8 (descanso 0:30 / 0:19 / 1:00), comentar "Buen ritmo, cuidá el descanso". Después, como alumna.card8, ver el comentario en su historial.

## 6. Fuera de alcance

Filtros del historial del entrenador; notificar al alumno del comentario (lo hace el backend de notificaciones si corresponde).
