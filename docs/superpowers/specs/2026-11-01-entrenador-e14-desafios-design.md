---
tags: [spec]
tarjeta: E14
---
# Spec — E14 · Desafíos para alumnos

- **Tarjeta:** [E14 del tablero del entrenador](https://trello.com/c/5Bt9NseZ).
- **Fecha:** 2026-11-01.
- **Rama:** `feature/android-entrenador-desafios`, apilada sobre `feature/android-entrenador-ejercicios` (E10, PR #65).
- **Diseño:** el prototipo no tiene estas pantallas. Siguen el estilo de Plantillas (E9) y de la sección Rutinas de la ficha (E8).

> **Cómo quedó (01/11):**
> - **La hoja de la ficha** muestra atenuados, con "Ya lo tiene activo", los desafíos que el alumno ya tiene activos, y no los manda. El 409 queda para cuando otro dispositivo se lo asignó en el medio: avisa en la hoja y refresca la sección.
> - **El lote** no devuelve el alumno de cada asignación creada: el repositorio las empareja con `student_ids` en orden, sin los salteados (así recorre el backend).
> - **La sección** se titula "DESAFÍOS", como las demás de la ficha. La flecha y el título de la lista y del detalle van en `components/BackTitle`.
> - **La app del alumno** de la tarjeta 15 (`fittrainer-logros-pr`) mostró los dos desafíos asignados en el E2E: el criterio de aceptación se probó con la app real, no solo por API.
> - **Ronda 1 de Codex:** el detalle baja los alumnos al abrirse (entrar por Más sin pasar por Alumnos no deja la hoja vacía) y distingue "Bajando tus alumnos…" y el error con reintento de "No tenés alumnos activos". La ficha muestra las asignaciones hechas desde el celular aunque la lista completa del alumno nunca se haya bajado (`fetchedAt` null).

## 1. Objetivo

El entrenador ve los desafíos (los predefinidos y los propios que haya creado en la web), los asigna a uno o varios alumnos y ve el avance de cada alumno en su ficha.

**Criterio de aceptación:** el entrenador asigna un desafío desde el celular y el alumno lo ve en sus logros.

## 2. Decisiones (debate del 01/11)

1. **Dónde vive:**
   - la entrada **"Desafíos"** va en Más, debajo de "Biblioteca";
   - la ficha del alumno suma una sección **"Desafíos"** con su avance y el botón "Asignar desafío".
2. **Sin crear desafíos propios** desde el celular. Los que el entrenador creó en la web aparecen en la lista con la etiqueta **PROPIO**.
3. **Lista (Más → Desafíos):**
   - primero los predefinidos y después los propios, cada grupo por nombre (el orden que ya devuelve el backend);
   - cada fila muestra el nombre, la meta ("12 sesiones · 30 días") y la etiqueta PROPIO si corresponde.
   - Tocar una fila abre el **detalle**: descripción, meta, duración, si da un logro de premio y el botón **"Asignar a alumnos"**.
4. **Asignar a varios** (desde el detalle):
   - una hoja con los alumnos activos, con casillas y búsqueda (desde 8 alumnos), y "Asignar (N)";
   - va un solo `POST /challenges/:id/assignments`;
   - el resultado se muestra en un aviso: "Asignado a 2 alumnos" y, si hubo, "Ya lo tenían activo: Lucía, José". Los `not_your_student` se informan como "Ya no están en tu lista: …".
5. **Asignar a uno** (desde la ficha): "Asignar desafío" abre una hoja con la lista de desafíos. Elegir uno hace `POST /students/:id/challenges`.
   - 409 `CHALLENGE_ALREADY_ACTIVE` → "Ya tiene este desafío activo".
   - Solo con red y solo para alumnos activos (como "Asignar rutina").
6. **Avance en la ficha:**
   - las asignaciones del alumno, primero las activas y después el resto, cada grupo la más nueva primero;
   - cada una muestra el nombre, la barra con `progress_pct`, el texto de avance ("5 de 12 sesiones", "Peso actual 80 kg · meta 75 kg"), el estado (Activo, Cumplido, Vencido, Abandonado) y "Quedan N días" / "Terminó el 12 nov".
   - Sin asignaciones: "Todavía no tiene desafíos".
7. **Datos:** offline-first como E8-E10.
   - La lista y el avance salen de Room, en tablas nuevas (**Room v20**).
   - Asignar es solo online y guarda en Room las asignaciones que devuelve el servidor, así la ficha las muestra enseguida.
   - Un Mutex por entrenador evita que un GET atrasado pise una asignación recién hecha (lo que Codex encontró en E10).
8. **Lado del alumno:** la app del alumno ya muestra sus desafíos en Logros (tarjeta 15, rama `feature/android-logros-pr`, todavía sin PR). El criterio de aceptación se prueba con esa app y, mientras tanto, con `GET /students/:id/challenges` usando el token del alumno.

## 3. Backend

No cambia. Usa:
- `GET /challenges`: globales y propios, primero los globales;
- `POST /challenges/:id/assignments {student_ids}` (de 1 a 50): 201 `{ created: [asignación], skipped: [{ student_id, reason }] }`;
- `GET /students/:id/challenges`: las asignaciones con `current_progress`, `goal_value`, `progress_pct`, `status`, `started_at`, `ends_at`, `completed_at` y el desafío embebido;
- `POST /students/:id/challenges {challenge_id}`: 201 con la asignación, o 409 `CHALLENGE_ALREADY_ACTIVE`;
- 404 `CHALLENGE_NOT_FOUND` si el desafío no existe o es ajeno.

## 4. Mobile

- **Red:** `data/api/challenges/TrainerChallengesApi.kt` con los cuatro endpoints y sus DTOs.
- **Room v20** (`data/db/challenges/trainer/`):
  - `trainer_challenges` (trainerId, id, name, description, goalType, goalValue, durationDays, rewardAchievementId, own, position);
  - `trainer_challenges_sync`;
  - `trainer_student_challenges` (trainerId, studentId, id, challengeId, name, goalType, goalValue, currentProgress, progressPct, status, startedAt, endsAt, completedAt);
  - `trainer_student_challenges_sync`.
- **Repositorio** `data/challenges/trainer/TrainerChallengesRepository`, que devuelve `Result` en todo:
  - `observeCatalog`, `refreshCatalog`;
  - `observeStudent`, `refreshStudent`;
  - `assignToStudent(trainerId, studentId, challengeId)`: 409 → `ChallengeAlreadyActiveException`;
  - `assignMany(trainerId, challengeId, studentIds)` → `BatchAssignResult(created, alreadyActive, notYours)`;
  - 404 → el desafío sale del caché y devuelve `NotFound`.
- **UI** (`ui/challenges/trainer/`):
  - `list/ChallengesScreen` y su ViewModel;
  - `detail/ChallengeDetailScreen` y su ViewModel, con la hoja multi-selección en `detail/AssignStudentsSheet`;
  - `section/ChallengesSection` (ficha) y su ViewModel, con la hoja `section/PickChallengeSheet`;
  - `ChallengesTexts.kt` con la meta, el avance, los estados y los días.
- **Rutas:** `trainer/challenges` y `trainer/challenges/{challengeId}`, que heredan la pestaña Más. La sección de la ficha no navega: asigna desde su hoja.

## 5. Pruebas

- **Unitarias:**
  - textos (meta por tipo, avance, estados, días que quedan);
  - repositorio (refresh guarda y ordena, asignar guarda la asignación, 409, lote con skipped, 404 olvida, carrera GET atrasado vs. asignación);
  - ViewModels: detalle (selección, un solo POST con doble toque, resumen del lote, sin red), sección (orden, asignar, 409, alumno inactivo sin botón).
- **E2E en el emulador:**
  1. Más → Desafíos: se ven los 3 predefinidos.
  2. Asignar "12 sesiones en 30 días" a dos alumnos; a uno que ya lo tiene → aparece en "Ya lo tenían activo".
  3. Ficha de un alumno: el desafío aparece con 0 % y "Quedan 30 días".
  4. Desde la ficha, asignar otro desafío; repetirlo → "Ya tiene este desafío activo".
  5. El alumno lo ve en Logros (app del alumno o `GET /students/:id/challenges` con su token): criterio de aceptación.
  6. Dejar anotadas las asignaciones de prueba (no hay endpoint para borrarlas; se limpian por SQL en Supabase dev).
