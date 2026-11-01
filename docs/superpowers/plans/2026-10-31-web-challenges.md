# Logros y desafíos en la web — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Racha en el panel de alumnos, card de logros y racha en la ficha, y página `/pt/desafios` para crear, asignar y borrar desafíos (tarjeta 43).

**Architecture:** Dos cambios chicos en el backend de gamificación ya mergeado (racha en `GET /students`, conteos y `active-students` en desafíos, más el seed de plantillas). En la web, módulos nuevos `challenges` y `achievements` en `api/`, `hooks/` y `components/`, con TanStack Query, siguiendo los patrones de `routines` y `students`.

**Tech Stack:** Backend Express ESM + supabase-js, Jest ESM (`npm test`, nunca `npx jest`). Web React 19, React Router 7, TanStack Query, Tailwind, Radix Dialog (`components/shared/ui/Dialog.jsx`), lucide-react, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-31-web-challenges-design.md`

## Global Constraints

- Ningún archivo de código (tests incluidos) pasa de 200 líneas; ninguna carpeta de código pasa de 10 archivos. `components/shared/ui` ya tiene 10: no se agregan archivos ahí.
- Carpetas capa → módulo → archivo; tests espejan `src` en `backend/tests/` y `frontend/tests/`. Un test dividido va en una carpeta con el nombre de la unidad.
- Commits sin firma ni trailers de IA. Título de la PR con "(tarjeta 43)".
- Docs en la misma PR: contrato, modelo de datos, casos de uso, `docs/tarjetas.md`, READMEs.
- Textos en español rioplatense, como en el spec (Q3, Q7, Q9, Q12). Números en formato es-AR.
- Antes de cada commit: `npm test` y `npm run lint` del paquete tocado en verde.

## Review Focus

- Alumno con `streak: null` (nunca cerró una sesión): la tarjeta dice "Sin racha" y el orden "Racha" lo deja al final sin romper (Task 3).
- Asignar con 0 seleccionados o más de 50: el botón queda deshabilitado; nunca sale el pedido (Task 5).
- Doble click en "Asignar" o "Crear": un solo pedido (`useRef` como `AssignRoutineDialog`) (Task 5).
- Respuesta de asignación con todos `skipped`: el aviso dice "Ningún alumno nuevo: …" y no "Asignado a 0 alumnos" (Task 5).
- Desafío `weight_target` en la ficha: la barra usa `progress_pct` del backend y el texto "Llegar a 75 kg", sin calcular dirección en el cliente (Task 6).

---

### Task 1: Racha en `GET /students`

**Files:**
- Modify: `backend/src/repositories/students/students.repository.js` (sumar `findStreaks`)
- Modify: `backend/src/services/students/students.service.js:17-35` (`list`)
- Test: `backend/tests/unit/services/students/students.service/` (el archivo de `list` que ya existe ahí, o uno nuevo `list-streak.test.js` si pasa de 200)
- Docs: `docs/arquitectura/contratos-api.md` (GET /students, ~173-196)

**Interfaces:**
- Produces: cada alumno de `GET /students` con `streak: {current_days, longest_days, last_trained_date} | null`.

- [ ] **Step 1: Tests**
  - `list agrega la racha de cada alumno`: repo mockeado devuelve `[{student_id:'a', current_days:12, longest_days:20, last_trained_date:'2026-10-30'}]` → `data[0].streak` igual sin `student_id`.
  - `list deja streak en null si el alumno no tiene fila`.
  - `list con la página vacía no consulta rachas` (`findStreaks` no se llama).
- [ ] **Step 2:** `npm test -- students.service` → FAIL.
- [ ] **Step 3:** `findStreaks(studentIds): Promise<Array<{student_id,current_days,longest_days,last_trained_date}>>` sobre `STUDENT_STREAKS_TABLE` (importar del modelo de gamificación) con `.in('student_id', ids)`; en `list`, pedirlo en paralelo con `findLastSessionDates` (`Promise.all`) y mapear.
- [ ] **Step 4:** `npm test` en `backend/` → PASS.
- [ ] **Step 5:** Contrato: sumar `streak` al ejemplo y la nota "null si todavía no se calculó". Commit `feat(students): racha de cada alumno en el listado (tarjeta 43)`.

### Task 2: Desafíos — conteos, `active-students` y plantillas

**Files:**
- Modify: `backend/src/repositories/gamification/challenges.repository.js` (sumar `countByChallenge`, `findActiveStudentIds`)
- Modify: `backend/src/services/gamification/challenges.service.js` (`listChallenges`, nuevo `activeStudents`)
- Modify: `backend/src/controllers/gamification/challenges.controller.js`, `backend/src/routes/gamification/challenges.routes.js`
- Create: `backend/src/database/migrations/2026-10-31-challenge-templates.sql`
- Modify: `backend/src/database/seeds/challenges.sql`
- Test: `backend/tests/unit/services/gamification/challenges.service.test.js` (si pasa de 200, carpeta `challenges.service/`), `backend/tests/unit/routes/…` del módulo si existe el patrón
- Docs: `contratos-api.md` (módulo Gamificación), `modelo-de-datos.md` (seed de desafíos), `backend/README.md` (tabla de rutas)

**Interfaces:**
- Produces: `GET /challenges` (trainer) → cada desafío con `assignments_count:number`, `active_count:number`. `GET /challenges/:id/active-students` (trainer) → `{data: string[]}`; 404 `CHALLENGE_NOT_FOUND` si no es visible.

- [ ] **Step 1: Tests**
  - `listChallenges del trainer suma assignments_count y active_count` (repo `countByChallenge` devuelve `[{challenge_id:'c1', status:'active'},{challenge_id:'c1', status:'completed'}]` → c1: 2 y 1; c2 sin filas: 0 y 0).
  - `listChallenges del alumno no suma conteos` (sin las claves, `countByChallenge` no se llama).
  - `activeStudents devuelve los ids activos de sus alumnos` y `activeStudents con un desafío ajeno → CHALLENGE_NOT_FOUND` (usa `getVisibleChallenge`).
- [ ] **Step 2:** `npm test -- challenges` → FAIL.
- [ ] **Step 3:** Repo:
  - `countByChallenge(trainerId, challengeIds)`: `student_challenges` `select('challenge_id, status, students!inner(trainer_id)')`, `.eq('students.trainer_id', trainerId)`, `.in('challenge_id', ids)`; lista vacía → `[]` sin consultar. El conteo se agrupa en el service.
  - `findActiveStudentIds(challengeId, trainerId)`: mismo join, `status = 'active'`, devuelve `student_id[]`.
  - Ruta `router.get('/:id/active-students', ...trainerOnly, validate(validateChallengeIdParam,'params'), controller.activeStudents)`.
- [ ] **Step 4:** Migración: `update … set name = 'Racha de 2 semanas' where trainer_id is null and name = 'Racha de 14 días';` + insert re-ejecutable de `('8 sesiones en 4 semanas', 'Cerrá 8 sesiones de entrenamiento en 4 semanas.', 'sessions_count', 8, 28, null)`. Seed con los 4 nombres finales (la fila de racha ya con el nombre nuevo). `npm test` → PASS.
- [ ] **Step 5:** Docs y commit `feat(challenges): conteos de asignaciones, alumnos activos por desafío y 4 plantillas (tarjeta 43)`. La migración la aplica el controlador en Supabase dev (no el implementador).

### Task 3: Web — API, hooks, racha en la tarjeta y orden "Racha"

**Files:**
- Create: `frontend/src/api/challenges/challenges.api.js`, `frontend/src/api/achievements/achievements.api.js`
- Create: `frontend/src/hooks/challenges/useChallenges.js`, `frontend/src/hooks/achievements/useStudentGamification.js`
- Create: `frontend/src/components/achievements/StreakLabel.jsx`
- Create: `frontend/src/utils/challenges/challengeFormat.js` (meta legible, compartido por Tasks 4-6)
- Modify: `frontend/src/components/students/StudentCard.jsx`, `frontend/src/utils/students/studentFilters.js`, `frontend/src/components/students/StudentFilters.jsx`
- Test: `frontend/tests/components/achievements/StreakLabel.test.jsx`, `frontend/tests/utils/students/studentFilters.test.js`, `frontend/tests/utils/challenges/challengeFormat.test.js`, `frontend/tests/api/challenges/…` siguiendo el patrón de `tests/api/`

**Interfaces:**
- Produces:
  - api: `listChallenges()`, `createChallenge(body)`, `deleteChallenge(id)`, `assignChallenge(id, studentIds) → {created, skipped}`, `getActiveStudents(id) → string[]`; `listAchievements()`, `getStudentAchievements(id)`, `getStudentStreak(id)`, `getStudentChallenges(id)`.
  - hooks: `useChallengesQuery()` (key `['challenges']`), `useActiveStudentsQuery(id)` (`['challenges', id, 'active-students']`), `useCreateChallenge()`, `useDeleteChallenge()`, `useAssignChallenge()` (invalida `['challenges']`, `['students']` y `['student-challenges', sid]` de cada creado); `useAchievementsCatalog()` (key `['achievements']`), `useStudentAchievementsQuery(id)`, `useStudentStreakQuery(id)`, `useStudentChallengesQuery(id)` (keys `['student-achievements', id]`, `['student-streak', id]`, `['student-challenges', id]`).
  - `<StreakLabel streak={…} />`; `goalLabel(challenge) → string` ("12 sesiones", "Racha de 14 días", "10 t de volumen", "Llegar a 75 kg"), `durationLabel(days) → "30 días"`.

- [ ] **Step 1: Tests**
  - `StreakLabel`: `{current_days:12}` → "🔥 12 días"; `{current_days:0, longest_days:20}` → "Sin racha · mejor: 20 días"; `null` y todo en 0 → "Sin racha"; 1 → "🔥 1 día".
  - `sortStudents(…, 'racha')`: 12 antes que 3; 0 con mejor 20 antes que 0 con mejor 5; `streak:null` al final; empate → nombre.
  - `parseStudentFilters` acepta `orden=racha`.
  - `goalLabel`: los 4 tipos; volumen 10000 → "10 t de volumen", 800 → "800 kg de volumen", 12500 → "12,5 t de volumen".
- [ ] **Step 2:** `npm test` en `frontend/` → FAIL.
- [ ] **Step 3:** Implementar; `ORDENES` suma `'racha'` y la etiqueta "Racha" en `StudentFilters`. `StudentCard` agrega `<StreakLabel>` debajo de "Última sesión" (mono 11px, `text-hot` cuando hay racha).
- [ ] **Step 4:** `npm test` y `npm run lint` → PASS.
- [ ] **Step 5:** Commit `feat(web): racha en el panel de alumnos y cliente de desafíos (tarjeta 43)`.

### Task 4: Web — página `/pt/desafios`

**Files:**
- Modify: `frontend/src/routes/routeTable.js` (ítem `{ path: 'desafios', label: 'Desafíos', icon: Trophy, subtitle: 'RETOS PARA TUS ALUMNOS' }` después de `biblioteca`), `frontend/src/routes/router.jsx`
- Create: `frontend/src/pages/challenges/ChallengesPage.jsx`, `frontend/src/components/challenges/ChallengeCard.jsx`, `frontend/src/components/challenges/ChallengeSection.jsx`
- Test: `frontend/tests/pages/challenges/ChallengesPage.test.jsx`, `frontend/tests/components/challenges/ChallengeCard.test.jsx`

**Interfaces:**
- Consumes: hooks y `goalLabel` de Task 3.
- Produces: `ChallengesPage` que abre `NewChallengeDialog` y `AssignChallengeDialog` (Task 5) por estado local `{type:'new'|'assign', challenge?}`. Hasta que exista Task 5, los botones existen y el test verifica que cambian el estado (el diálogo se monta en Task 5).

- [ ] **Step 1: Tests**
  - Muestra "Plantillas" con los `trainer_id === null` y "Mis desafíos" con los propios; cada card: nombre, `goalLabel` · `durationLabel`, "Desafío cumplido" si tiene premio, "N activos" si `active_count > 0`.
  - "Borrar" solo en propios con `assignments_count === 0`; nunca en plantillas. Confirmar llama `deleteChallenge(id)`; 409 → `role="alert"` "Ya está asignado a alumnos: no se puede borrar".
  - Sin propios: "Todavía no creaste desafíos" con "Nuevo desafío".
  - Carga y error con `QueryState`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar (confirmación de borrado con `Dialog` como los diálogos de alumnos). **Step 4:** test + lint PASS.
- [ ] **Step 5:** Commit `feat(web): página de desafíos del entrenador (tarjeta 43)`.

### Task 5: Web — diálogos "Nuevo desafío" y "Asignar"

**Files:**
- Create: `frontend/src/components/challenges/dialogs/NewChallengeDialog.jsx`, `.../dialogs/AssignChallengeDialog.jsx`, `.../dialogs/StudentMultiSelect.jsx`, `frontend/src/utils/challenges/challengeForm.js` (validación y armado del body), `frontend/src/utils/challenges/assignResult.js` (texto del aviso)
- Modify: `frontend/src/pages/challenges/ChallengesPage.jsx`
- Test: `frontend/tests/utils/challenges/challengeForm.test.js`, `.../assignResult.test.js`, `frontend/tests/components/challenges/dialogs/*.test.jsx`

**Interfaces:**
- Consumes: `useCreateChallenge`, `useAssignChallenge`, `useActiveStudentsQuery`, `useStudentsQuery({active:true})`, `fieldErrorsFrom`.
- Produces: `NewChallengeDialog({open, onClose, onCreated(challenge)})` — la página, en `onCreated`, abre `AssignChallengeDialog` con ese desafío. `AssignChallengeDialog({challenge, onClose})`. `validateChallengeForm(values) → {field: message}`, `toChallengeBody(values)`, `assignResultText({created, skipped}, studentsById) → string`.

- [ ] **Step 1: Tests**
  - `validateChallengeForm`: nombre vacío y de 101; valor 0 y negativo; duración 0, 366 y 2,5; descripción de 1001 → errores; válido → `{}`.
  - `toChallengeBody`: premio activado → `reward_achievement_id` = id de `CHALLENGE_DONE` (sale de `useAchievementsCatalog()` de Task 3, buscando `code === 'CHALLENGE_DONE'`; si no está, el checkbox se oculta); desactivado → `null`; descripción vacía → `null`; duración por defecto 30.
  - `assignResultText`: 3 creados → "Asignado a 3 alumnos"; 3 creados + 1 `already_active` (Lucía) → "Asignado a 3 alumnos · 1 ya lo tenía activo (Lucía)"; 0 creados + 2 salteados → "Ningún alumno nuevo: 2 ya lo tenían activo (…)"; 1 → "Asignado a 1 alumno".
  - `AssignChallengeDialog`: buscador filtra por nombre sin tildes; los activos (`active-students`) aparecen deshabilitados con "Ya lo tiene"; contador "N seleccionados"; botón deshabilitado con 0 y con más de 50; doble click → un solo `assignChallenge`; al terminar, aviso `role="status"` y botón "Listo".
  - `NewChallengeDialog`: errores por campo del 400; al guardar llama `onCreated`; "Ahora no" en el asignar cierra todo.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. Tipo de meta con las 4 opciones y su ayuda/unidad (spec Q12); premio como checkbox con la ayuda "Se otorga la primera vez que el alumno cumple un desafío". **Step 4:** test + lint PASS.
- [ ] **Step 5:** Commit `feat(web): crear y asignar desafíos a varios alumnos (tarjeta 43)`.

### Task 6: Web — card "Logros y racha" en la ficha

**Files:**
- Create: `frontend/src/components/achievements/AchievementsCard.jsx`, `.../AchievementList.jsx`, `.../ChallengeProgressList.jsx`, `.../categoryIcon.js` (mapa Q15)
- Modify: `frontend/src/pages/students/StudentProfilePage.jsx` (columna derecha, debajo de `ActiveRoutineCard`)
- Test: `frontend/tests/components/achievements/AchievementsCard.test.jsx` (y los de las piezas)

**Interfaces:**
- Consumes: `useStudentStreakQuery`, `useStudentAchievementsQuery`, `useStudentChallengesQuery`, `goalLabel`.
- Produces: `<AchievementsCard studentId />`, reusable por la tarjeta 22.

- [ ] **Step 1: Tests**
  - Racha: "Racha actual 12 días · Mejor 20 días".
  - Logros: nombre, fecha "dd/mm/aaaa" e ícono por categoría (`aria-hidden`); vacío "Todavía no desbloqueó logros".
  - Desafíos activos: nombre, `goalLabel`, barra con `aria-valuenow` = `progress_pct` y "termina el dd/mm"; `weight_target` muestra "Llegar a 75 kg" sin cálculo propio.
  - Completados/vencidos/abandonados en "Historial (N)" colapsado; se expande al click.
  - Cada bloque con su carga/error independiente.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** test + lint PASS.
- [ ] **Step 5:** Commit `feat(web): logros, racha y desafíos en la ficha del alumno (tarjeta 43)`.

### Task 7: Docs de producto

**Files:**
- Modify: `docs/producto/casos-de-uso.md` (CU-09: sección "Desafíos", plantillas, premio único, 4a crear sin asignar), `docs/arquitectura/diagrama-casos-de-uso.md` (agregar el CU del PT "Crear y asignar desafío" con el número libre siguiente y dejar CU-09 "Comentar sesión" como está; en `casos-de-uso.md` alinear el número con el diagrama), `docs/tarjetas.md` (fila 43 con spec y plan; "tarjeta 18" en MIS TAREAS), `README.md` raíz (Web: racha, logros y desafíos)

- [ ] **Step 1:** Editar y verificar que los números de CU coinciden entre los dos archivos (`grep -n "CU-" …`).
- [ ] **Step 2:** Commit `docs: casos de uso, tarjetas y README de logros y desafíos en la web (tarjeta 43)`.
