# Logros y desafíos en la web — racha en el panel, logros en la ficha y desafíos del PT

- **Tarjeta de equipo:** [S5] Logros y desafíos en la web + creación de challenges por el PT (https://trello.com/c/wf7zYcSO, tarjeta 43), fuente de verdad del alcance y del criterio de aceptación.
- **Tablero personal:** "18 · Logros y desafíos en la web + challenges del PT".
- **Fecha:** 2026-10-31 · **Rama:** `feature/web-challenges` (base `develop`). Usa el backend de gamificación de la tarjeta 41 (PR #35, spec `2026-10-30-gamification-backend-design.md`).

## 1. Objetivo y criterio de aceptación

El lado del entrenador de la gamificación: ver cómo vienen sus alumnos (racha y logros) y crear o asignar desafíos rápido.

**Criterio de aceptación (tarjeta de equipo):** el PT ve la racha de cada alumno en el panel, entra a una ficha y ve los logros desbloqueados, y crea un desafío de "12 sesiones en 30 días" asignándoselo a tres alumnos en menos de un minuto.

**Checklist de la tarjeta de equipo:** racha en el panel (quién está en racha y quién la cortó) · logros desbloqueados en la ficha · formulario de desafío (tipo de meta, valor, duración y premio) · asignar un desafío a varios alumnos de una · 3-4 plantillas asignables con dos clics.

## 2. Decisiones (grilling del 2026-10-31)

| # | Tema | Decisión |
|---|---|---|
| Q1 | Alcance de la gestión | Crear, asignar y borrar desafíos propios sin asignaciones. Sin editar, sin ver participantes por desafío y sin cancelar asignaciones (los participantes se ven en la ficha de cada alumno) |
| Q2 | Racha en el listado | `GET /students` suma `streak: {current_days, longest_days, last_trained_date}` con una consulta en lote a `student_streaks`, como la de la última sesión. Sin fila → `streak: null` |
| Q3 | En racha / la cortó | `current_days > 0` → "🔥 12 días" en `hot`. `current_days = 0` con `longest_days > 0` → "Sin racha · mejor: 20 días". `streak: null` o todo en 0 → "Sin racha". Sin fecha de ruptura: la tarjeta ya muestra "Última sesión" |
| Q4 | "Columna" de racha | Dentro de `StudentCard`, más el orden "Racha" (`orden=racha`): mayor racha actual primero; empate por mejor racha y nombre |
| Q5 | Plantillas | Los desafíos globales son las plantillas. Se renombra "Racha de 14 días" a "Racha de 2 semanas" y se siembra un cuarto: "8 sesiones en 4 semanas" (`sessions_count` 8 / 28 días). Asignar una plantilla no crea filas nuevas |
| Q6 | Dónde vive | Ítem nuevo "Desafíos" en el menú del PT (`/pt/desafios`): "Plantillas" arriba (cada una con "Asignar"), después "Mis desafíos" (con "Asignar" y "Borrar") y el botón "Nuevo desafío". El diálogo de asignar tiene un multi-select de alumnos con buscador; los que ya lo tienen activo aparecen deshabilitados con "Ya lo tiene" |
| Q7 | Premio | Solo "Desafío cumplido" (`CHALLENGE_DONE`) o sin premio; activado por defecto. Ayuda: "Se otorga la primera vez que el alumno cumple un desafío" |
| Q8 | Ficha del alumno | Card "Logros y racha" en la columna derecha, debajo de la rutina activa: racha actual y mejor (en `hot`), logros desbloqueados con ícono y fecha, desafíos activos con barra de progreso y fecha de fin. Completados, vencidos y abandonados colapsados en "Historial (N)" |
| Q9 | Aviso al asignar | En el mismo diálogo, `role="status"`: "Asignado a 3 alumnos · 1 ya lo tenía activo (Lucía)", con el botón "Listo". Sin toasts |
| Q10 | Racha desactualizada | Se acepta: `current_days` se refresca al cerrar sesión y en el job de las 03:00. Como mucho un día de atraso |
| Q11 | Docs | Contrato (`GET /students` con `streak`, `GET /challenges` con conteos), modelo de datos (seed), CU-09 de `casos-de-uso.md`, diagrama de casos de uso con el CU del PT para desafíos, fila 43 en `docs/tarjetas.md`, README raíz y del backend |
| Q12 | Formulario | Nombre, tipo de meta (4, con ayuda y unidad), valor, duración en días (30 por defecto), premio y descripción opcional. Al guardar se abre directo el diálogo de asignar, con "Ahora no" |
| Q13 | Borrar | `GET /challenges` suma `assignments_count` y `active_count`; "Borrar" solo aparece en los propios con `assignments_count = 0`. La card muestra "N activos" |
| Q14 | Lado del alumno en la web | Fuera: es de la tarjeta 22. La card de la ficha queda reusable |
| Q15 | Íconos | lucide por categoría: racha `Flame` (`hot`), volumen `Dumbbell` (`cool`), constancia `CalendarCheck` (`good`), récord `Trophy` (`accent`), hito `Medal` (`accent`) |

## 3. Backend

### 3.1 `GET /api/students` con racha

Cada alumno suma:

```json
"streak": { "current_days": 12, "longest_days": 20, "last_trained_date": "2026-10-30" }
```

- `studentsRepo.findStreaks(ids)` lee `student_streaks` (`student_id, current_days, longest_days, last_trained_date`) con `.in('student_id', ids)`; con la página vacía no consulta (como `findLastSessionDates`).
- Alumno sin fila → `"streak": null`. No se evalúa la racha al listar (sería caro); la fila se crea al cerrar la primera sesión o en el job diario.
- La ficha (`GET /students/:id`) no cambia: la card usa `GET /students/:id/streak`.

### 3.2 `GET /api/challenges` con conteos (solo trainer)

Para el entrenador, cada desafío suma:

- `assignments_count`: asignaciones de sus alumnos en cualquier estado;
- `active_count`: las que están `active`.

Una consulta en lote a `student_challenges` (join `students!inner(trainer_id)` filtrado por el trainer, `.in('challenge_id', ids)`), agrupada en el service. Para el alumno la respuesta no cambia (sin los dos campos).

### 3.3 Plantillas (migración `2026-10-31-challenge-templates.sql` + seed)

```sql
update challenges set name = 'Racha de 2 semanas'
  where trainer_id is null and name = 'Racha de 14 días';
-- + insert del cuarto global "8 sesiones en 4 semanas" (sessions_count, 8, 28 días, sin premio), re-ejecutable por nombre
```

El seed `seeds/challenges.sql` queda con los 4 nombres nuevos. La migración se aplica a mano en Supabase dev.

## 4. Web

### 4.1 Módulo `challenges` (y `achievements`)

- `api/challenges/challenges.api.js`: `listChallenges()`, `createChallenge(body)`, `deleteChallenge(id)`, `assignChallenge(id, studentIds)`.
- `api/achievements/achievements.api.js`: `getStudentAchievements(id)`, `getStudentStreak(id)`, `getStudentChallenges(id)`.
- Hooks TanStack Query en `hooks/challenges/` y `hooks/achievements/`. Asignar invalida `['students']`, `['challenges']` y `['student-challenges', id]` de cada alumno creado.

### 4.2 Panel de alumnos

- `StudentCard` suma una línea con `StreakLabel` (Q3).
- `ORDENES` suma `racha` con la etiqueta "Racha" en `StudentFilters`.

### 4.3 Página `/pt/desafios`

- Ítem del menú: `{ path: 'desafios', label: 'Desafíos', icon: Trophy, subtitle: 'RETOS PARA TUS ALUMNOS' }`, después de "Biblioteca".
- **Plantillas:** los globales, en cards con nombre, meta legible ("12 sesiones · 30 días"), premio si tiene, "N activos" y "Asignar".
- **Mis desafíos:** los propios, igual, más "Borrar" (con confirmación) cuando `assignments_count = 0`. Vacío: "Todavía no creaste desafíos" + "Nuevo desafío".
- **Nuevo desafío** (diálogo, Q12). Validación en el cliente igual que el backend: nombre 1-100, valor > 0, duración entera 1-365, descripción ≤ 1000. Los errores del 400 se muestran por campo (`fieldErrorsFrom`).
- **Asignar** (diálogo): buscador por nombre, lista de alumnos activos con checkbox (máximo 50 seleccionados), deshabilitados con "Ya lo tiene" los que tienen ese desafío activo (4.5), contador "3 seleccionados", botón "Asignar". Al terminar, el aviso de Q9 y "Listo".

Metas legibles por tipo: `sessions_count` "12 sesiones", `streak` "Racha de 14 días", `volume` "10 t de volumen" (desde 1000 kg en toneladas, formato es-AR), `weight_target` "Llegar a 75 kg".

### 4.4 Ficha del alumno

Card "Logros y racha" (`components/achievements/AchievementsCard.jsx` y piezas) con tres bloques: racha, logros (más reciente primero; vacío: "Todavía no desbloqueó logros") y desafíos (activos con barra `progress_pct` y "termina el dd/mm"; historial colapsado). Cada bloque con su estado de carga y error.

### 4.5 "Ya lo tiene"

Para deshabilitarlos, el diálogo pide `GET /api/challenges/:id/active-students` (rol trainer): `{ "data": ["<student_id>", …] }`, los alumnos del entrenador con ese desafío `active`. Desafío inexistente o ajeno (propio de otro trainer) → 404 `CHALLENGE_NOT_FOUND`. No es la vista de participantes (Q1): solo ids, para el diálogo. Si igual se cuela uno (carrera), `skipped` con `already_active` lo nombra en el aviso.

## 5. Fuera de alcance

Editar desafíos, ver participantes por desafío, cancelar asignaciones, logros custom, el lado del alumno en la web (tarjeta 22), la fecha exacta de ruptura de la racha.

## 6. Pruebas

- Backend (Jest): `list` con `streak` (con y sin fila, página vacía); `GET /challenges` con conteos para el trainer y sin conteos para el alumno; `GET /challenges/:id/active-students` (propio, global, ajeno → 404, rol alumno → 403).
- Web (Vitest + Testing Library): `StreakLabel` (3 casos), orden "racha", página de desafíos (plantillas, propios, borrar visible solo sin asignaciones), formulario (validación, errores del 400, abre asignar al guardar), diálogo de asignar (buscador, máximo 50, aviso con `skipped`), card de la ficha (vacíos y con datos).
- E2E en el navegador integrado contra el backend real con la cuenta QA: el criterio de aceptación cronometrado.
