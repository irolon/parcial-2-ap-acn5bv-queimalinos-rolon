---
tags: [plan]
tarjeta: E14
---
# E14 · Desafíos para alumnos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** que el entrenador vea los desafíos, los asigne a uno o varios alumnos y vea el avance en la ficha.

**Architecture:**
- **Datos:** `TrainerChallengesRepository` sobre cuatro tablas nuevas (Room v20), con un Mutex por entrenador.
- **UI:** va en `ui/challenges/trainer/`, con rutas en `navigation/TrainerChallengeRoutes.kt` y una sección nueva en la ficha.
- **Backend:** no cambia.

**Spec:** `docs/superpowers/specs/2026-11-01-entrenador-e14-desafios-design.md`

> **Cómo quedó (01/11):**
> - **La hoja de la ficha** muestra atenuados, con "Ya lo tiene activo", los desafíos que el alumno ya tiene activos, y no los manda. El 409 queda para cuando otro dispositivo se lo asignó en el medio: avisa en la hoja y refresca la sección.
> - **El lote** no devuelve el alumno de cada asignación creada: el repositorio las empareja con `student_ids` en orden, sin los salteados (así recorre el backend).
> - **La sección** se titula "DESAFÍOS", como las demás de la ficha. La flecha y el título de la lista y del detalle van en `components/BackTitle`.
> - **La app del alumno** de la tarjeta 15 (`fittrainer-logros-pr`) mostró los dos desafíos asignados en el E2E: el criterio de aceptación se probó con la app real, no solo por API.
> - **Ronda 1 de Codex:** el detalle baja los alumnos al abrirse (entrar por Más sin pasar por Alumnos no deja la hoja vacía) y distingue "Bajando tus alumnos…" y el error con reintento de "No tenés alumnos activos". La ficha muestra las asignaciones hechas desde el celular aunque la lista completa del alumno nunca se haya bajado (`fetchedAt` null).

## Global Constraints

- **Archivos:** ≤ 200 líneas físicas, tests incluidos. El orden es capa → módulo → archivo, y los tests copian el árbol.
- **Lote:** de 1 a 50 alumnos por POST (`validateBatchAssign`). Con más de 50 activos, el botón se deshabilita y aparece el aviso.
- **Errores:**
  - 409 `CHALLENGE_ALREADY_ACTIVE` → "Ya tiene este desafío activo";
  - 404 → el desafío sale del caché y aparece "El desafío ya no existe";
  - sin red → los botones se deshabilitan.
- **PR:** "feat(mobile): desafíos del entrenador: lista, asignación y avance en la ficha (tarjeta E14)". Base `feature/android-entrenador-ejercicios`.

## Review Focus

1. Doble toque en "Asignar (N)" o en un desafío de la hoja de la ficha → un solo POST → test en Task 3.
2. Un GET atrasado de la ficha no borra una asignación recién hecha → test en Task 2.
3. Lote con todos ya activos → "Ya lo tenían activo: …" sin decir "Asignado a 0" → test en Task 1 (texto) y en Task 3.
4. Un alumno dado de baja → sin botón "Asignar desafío" (el avance se sigue viendo) → test en Task 3.
5. `weight_target` muestra "Peso actual … · meta …" y no "x de y" → test en Task 1.

---

### Task 1: Textos puros

- **Create:** `ui/challenges/trainer/ChallengesTexts.kt` con:
  - `goalLabel(type, value, days)`;
  - `progressLabel`;
  - `statusLabel`;
  - `daysLeftLabel(endsAt, now, zone)`;
  - `batchSummary(result, names)`.
- **Test:** `ChallengesTextsTest`.

### Task 2: Red, Room y repositorio

- **Create:**
  - `data/api/challenges/` (Api + DTOs);
  - `data/db/challenges/trainer/` (entidades + DAO);
  - `data/challenges/trainer/` (modelos, mapper, repositorio, errores);
  - `di/challenges/TrainerChallengesModule`.
- **Modify:**
  - `FitTrainerDatabase` (v20 + AutoMigration 19→20 + DAO);
  - el módulo de Room/Retrofit que provee DAOs y APIs;
  - `schemas/20.json`.
- **Test:**
  - `TrainerChallengesRepositoryTest`: refresh, asignar, 409, lote, 404;
  - `TrainerChallengesRepositoryRaceTest`: GET atrasado;
  - los fakes.

### Task 3: UI y navegación

- **Create:**
  - `ui/challenges/trainer/list/ChallengesScreen` y `ChallengesViewModel`;
  - `ui/challenges/trainer/detail/ChallengeDetailScreen`, `ChallengeDetailViewModel` y `AssignStudentsSheet`;
  - `ui/challenges/trainer/section/ChallengesSection`, `ChallengesSectionViewModel` y `PickChallengeSheet`;
  - `ui/challenges/trainer/components/` (fila del desafío y fila del avance);
  - `navigation/TrainerChallengeRoutes.kt`.
- **Modify:**
  - `TrainerMenuLinks` (+ Desafíos);
  - `RoleShell` (registrar las rutas);
  - `RoleTabs.parentTab` (`trainer/challenges` → Más);
  - `TrainerStudentRoutes` (+ sección).
- **Test:**
  - `ChallengesViewModelTest`;
  - `ChallengeDetailViewModelTest`: selección, doble toque, resumen, sin red, 404;
  - `ChallengesSectionViewModelTest`: orden, asignar, 409, inactivo, doble toque.

### Task 4: Verificación y E2E

- [ ] Correr `gradlew checkFileLength assembleDebug testDebugUnitTest`.
- [ ] Hacer el E2E del §5 del spec.
- [ ] Anotar "Cómo quedó", pasar la tarjeta a 🔍 AUDITORÍA y comentar.
