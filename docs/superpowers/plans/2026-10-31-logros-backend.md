# Progreso de logros (backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GET /api/students/:id/achievements/progress` devuelve racha, datos y el progreso de cada logro del catálogo, sin escribir nada.

**Architecture:** Se extrae de `evaluateStudent` la carga de datos (`loadEvaluationInput`) para que el endpoint nuevo use exactamente los mismos `buildFacts`. Una función pura (`achievementProgress`) traduce cada `criteria` a `{ current, target }`. Ruta en `student-gamification.routes.js`, controller en `achievements.controller.js`, service propio.

**Tech Stack:** Node 20, Express (ESM), Jest con `--experimental-vm-modules` y `jest.unstable_mockModule`.

**Spec:** `docs/superpowers/specs/2026-10-31-logros-rachas-desafios-design.md` §2

## Global Constraints

- Worktree `C:\Users\igna_\Desktop\fittrainer-gamification-progress`, rama `feature/gamification-progress`. Comandos desde `backend/`.
- **Los agentes no commitean** (ni `git add`).
- Ningún archivo de código (tests incluidos) pasa de **200 líneas físicas** (`npm run lint` lo chequea).
- Capas `routes → controllers → services → repositories`; los tests copian el árbol de `src/` en `tests/unit/`.
- El endpoint **no escribe** (ni racha, ni logros, ni desafíos).
- `evaluateStudent` no cambia de comportamiento: `tests/unit/services/gamification/evaluate.service.test.js` pasa **sin modificarse**.
- Comentarios en español, con la densidad del código vecino.
- Cierre: `npm run lint` y `npm test` en verde.

## Review Focus

- Logro desbloqueado cuyos datos bajaron (cambió la rutina) → `current = target`, nunca menos.
- `current` nunca supera `target` (el alumno con 40 sesiones ve 10/10 en "10 sesiones").
- Logro `challenge` → 1/1 si está desbloqueado, 0/1 si no.
- Tipo de `criteria` desconocido o `target` inválido → `{ current: 0, target: 1 }` (no rompe la respuesta).
- Alumno sin sesiones → racha `0/0/null`, todos los `current` en 0.

---

### Task 1: Función pura `achievementProgress`

**Files:**
- Create: `backend/src/models/gamification/achievement-progress.js`
- Test: `backend/tests/unit/models/gamification/achievement-progress.test.js`

**Interfaces:**
- Produces: `achievementProgress(criteria, facts, unlocked) → { current: number, target: number }`; `facts` = `{ sessionsCount, longestStreak, prSessions, fullWeeks }` (los de `criteria.js`).

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from '@jest/globals';
import { achievementProgress } from '../../../../src/models/gamification/achievement-progress.js';

const FACTS = { sessionsCount: 3, longestStreak: 9, prSessions: 1, fullWeeks: 0 };

describe('achievementProgress', () => {
  it.each([
    [{ type: 'sessions_count', value: 10 }, { current: 3, target: 10 }],
    [{ type: 'streak', days: 30 }, { current: 9, target: 30 }],
    [{ type: 'pr_count', value: 10 }, { current: 1, target: 10 }],
    [{ type: 'full_week', count: 4 }, { current: 0, target: 4 }],
  ])('%j usa el dato que le corresponde', (criteria, expected) => {
    expect(achievementProgress(criteria, FACTS, false)).toEqual(expected);
  });

  it('recorta current a target', () => {
    expect(achievementProgress({ type: 'streak', days: 7 }, FACTS, false)).toEqual({ current: 7, target: 7 });
  });

  it('desbloqueado vale target aunque el dato haya bajado', () => {
    expect(achievementProgress({ type: 'full_week', count: 4 }, FACTS, true)).toEqual({ current: 4, target: 4 });
  });

  it('challenge: 1/1 desbloqueado, 0/1 si no', () => {
    expect(achievementProgress({ type: 'challenge' }, FACTS, true)).toEqual({ current: 1, target: 1 });
    expect(achievementProgress({ type: 'challenge' }, FACTS, false)).toEqual({ current: 0, target: 1 });
  });

  it('tipo desconocido, criterio vacío o meta inválida → 0/1', () => {
    expect(achievementProgress({ type: 'otro', value: 5 }, FACTS, false)).toEqual({ current: 0, target: 1 });
    expect(achievementProgress(null, FACTS, false)).toEqual({ current: 0, target: 1 });
    expect(achievementProgress({ type: 'sessions_count' }, FACTS, false)).toEqual({ current: 0, target: 1 });
    expect(achievementProgress({ type: 'sessions_count', value: 0 }, FACTS, false)).toEqual({ current: 0, target: 1 });
  });

  it('dato faltante cuenta como 0', () => {
    expect(achievementProgress({ type: 'pr_count', value: 1 }, {}, false)).toEqual({ current: 0, target: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/models/gamification/achievement-progress.test.js`
Expected: FAIL (no existe el módulo).

- [ ] **Step 3: Write minimal implementation**

```js
/**
 * Progreso de un logro del catálogo para GET /students/:id/achievements/progress. Función pura.
 * `facts` = los de criteria.js: { sessionsCount, longestStreak, prSessions, fullWeeks }.
 */

// Por tipo de criterio: de dónde sale la meta y qué dato la mide (las mismas reglas que criteria.js).
const RULES = {
  sessions_count: { target: (c) => c.value, fact: 'sessionsCount' },
  streak: { target: (c) => c.days, fact: 'longestStreak' },
  pr_count: { target: (c) => c.value, fact: 'prSessions' },
  full_week: { target: (c) => c.count, fact: 'fullWeeks' },
};

/**
 * `{ current, target }`, con `current` recortado a `target`. Un logro desbloqueado vale `target` aunque el
 * dato haya bajado (p. ej. cambió la rutina). `challenge` (lo otorga un desafío), un tipo desconocido o una
 * meta inválida tienen meta 1: valen 1 solo si están desbloqueados.
 */
export function achievementProgress(criteria, facts, unlocked) {
  const rule = RULES[criteria?.type];
  const goal = rule ? Number(rule.target(criteria)) : NaN;
  const valid = goal > 0;
  const target = valid ? goal : 1;
  if (unlocked) return { current: target, target };
  if (!valid) return { current: 0, target };
  return { current: Math.min(target, Number(facts?.[rule.fact] ?? 0)), target };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/models/gamification/achievement-progress.test.js`
Expected: PASS.

- [ ] **Step 5: Checkpoint** — sin commit (lo hace la persona).

---

### Task 2: `loadEvaluationInput` y el service de progreso

**Files:**
- Create: `backend/src/services/gamification/evaluation-input.js`
- Create: `backend/src/services/gamification/achievement-progress.service.js`
- Modify: `backend/src/services/gamification/evaluate.service.js` (líneas 1-36: imports, `fetchRecordPairs` y la carga del inicio de `evaluateStudent`)
- Modify: `backend/src/services/gamification/achievements.service.js` (exportar `toStreakView`)
- Modify: `backend/tests/helpers/gamification/evaluate.setup.js` (exportar el service nuevo)
- Test: `backend/tests/unit/services/gamification/achievement-progress.service.test.js`

**Interfaces:**
- Consumes: `achievementProgress` (Task 1); `buildFacts` (`evaluate-facts.js`); `gamificationRepo.findCatalog`, `gamificationRepo.findStudentAchievements` (filas con `achievement_id`, `unlocked_at`); `assertCanAccessStudent`.
- Produces: `loadEvaluationInput(studentId, now) → Promise<{ closed, assignedDays, recordPairs, today }>`;
  `getAchievementsProgress(user, studentId, { now }) → Promise<{ streak, facts, achievements }>` con el shape del spec §2;
  `toStreakView(row)` exportada desde `achievements.service.js`.

- [ ] **Step 1: Write the failing test**

En `evaluate.setup.js`, debajo de `export const achievements = ...`, agregar:

```js
export const progress = await import(src('services/gamification/achievement-progress.service.js'));
```

Crear `achievement-progress.service.test.js`:

```js
import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  progress, mockGam, mockData, mockHistory, mockAccess, STUDENT_ID, NOW, session, resetMocks,
} from '../../../helpers/gamification/evaluate.setup.js';
import { Errors } from '../../../../src/shared/utils/errors.js';

const USER = { id: 'st-1', role: 'student' };
const run = () => progress.getAchievementsProgress(USER, STUDENT_ID, { now: NOW });
const byCode = (result) => Object.fromEntries(result.achievements.map((a) => [a.code, a]));

beforeEach(resetMocks);

describe('getAchievementsProgress', () => {
  it('sin permiso no consulta nada', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValue(Errors.forbidden());
    await expect(run()).rejects.toMatchObject({ statusCode: 403 });
    expect(mockData.findClosedSessions).not.toHaveBeenCalled();
    expect(mockGam.findCatalog).not.toHaveBeenCalled();
  });

  it('sin sesiones: racha y datos en cero, todo el catálogo en 0 y sin desbloquear', async () => {
    mockGam.findStudentAchievements.mockResolvedValue([]);
    const result = await run();
    expect(mockAccess.assertCanAccessStudent).toHaveBeenCalledWith(USER, STUDENT_ID);
    expect(result.streak).toEqual({ current_streak_days: 0, longest_streak_days: 0, last_session_date: null });
    expect(result.facts).toEqual({ sessions_count: 0, longest_streak: 0, pr_sessions: 0, full_weeks: 0 });
    expect(result.achievements.map((a) => a.code)).toEqual(['FIRST_SESSION', 'STREAK_7_DAYS', 'FIRST_PR', 'CHALLENGE_DONE']);
    expect(byCode(result).STREAK_7_DAYS).toEqual({
      id: 'a-s7', code: 'STREAK_7_DAYS', name: 'Racha de 7 días', description: undefined, category: 'streak',
      icon_url: undefined, criteria_type: 'streak', current: 0, target: 7, unlocked_at: null,
    });
  });

  it('cuenta sesiones y racha, y recorta current a target', async () => {
    mockGam.findStudentAchievements.mockResolvedValue([]);
    mockData.findClosedSessions.mockResolvedValue([24, 25, 26, 27, 28, 29, 30].map((d) => session(`s-${d}`, d)));
    const result = await run();
    expect(result.streak).toEqual({ current_streak_days: 7, longest_streak_days: 7, last_session_date: '2026-10-30' });
    expect(result.facts.sessions_count).toBe(7);
    const map = byCode(result);
    expect(map.FIRST_SESSION).toMatchObject({ current: 1, target: 1 });
    expect(map.STREAK_7_DAYS).toMatchObject({ current: 7, target: 7, unlocked_at: null });
    expect(map.CHALLENGE_DONE).toMatchObject({ criteria_type: 'challenge', current: 0, target: 1 });
  });

  it('desbloqueado: current = target aunque los datos sean menores, con su unlocked_at', async () => {
    mockGam.findStudentAchievements.mockResolvedValue([
      { achievement_id: 'a-s7', unlocked_at: '2026-10-01T12:00:00Z' },
      { achievement_id: 'a-done', unlocked_at: '2026-10-02T12:00:00Z' },
    ]);
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 30)]);
    const map = byCode(await run());
    expect(map.STREAK_7_DAYS).toMatchObject({ current: 7, target: 7, unlocked_at: '2026-10-01T12:00:00Z' });
    expect(map.CHALLENGE_DONE).toMatchObject({ current: 1, target: 1, unlocked_at: '2026-10-02T12:00:00Z' });
  });

  it('récords: pr_sessions sale de los récords de las sesiones cerradas', async () => {
    mockGam.findStudentAchievements.mockResolvedValue([]);
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 30)]);
    mockHistory.fetchSessionRecords.mockResolvedValue([{ session_id: 's-1', exercise_id: 'e-1' }]);
    const result = await run();
    expect(result.facts.pr_sessions).toBe(1);
    expect(byCode(result).FIRST_PR).toMatchObject({ current: 1, target: 1 });
  });

  it('no escribe nada', async () => {
    mockGam.findStudentAchievements.mockResolvedValue([]);
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 30)]);
    await run();
    expect(mockGam.upsertStreak).not.toHaveBeenCalled();
    expect(mockGam.insertUnlocked).not.toHaveBeenCalled();
    expect(mockData.updateAssignment).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/services/gamification/achievement-progress.service.test.js`
Expected: FAIL (no existe `achievement-progress.service.js`; el setup falla al importarlo).

- [ ] **Step 3: Write the implementation**

`evaluation-input.js`:

```js
import { localDate } from '../../shared/utils/dates.js';
import * as dataRepo from '../../repositories/gamification/evaluate-data.repository.js';
import { fetchSessionRecords } from '../../repositories/sessions/session-history.repository.js';

const RECORDS_CHUNK = 1000;

/** Récords de las sesiones cerradas, en lotes de hasta 1000 ids. */
async function fetchRecordPairs(studentId, sessionIds) {
  const pairs = [];
  for (let i = 0; i < sessionIds.length; i += RECORDS_CHUNK) {
    pairs.push(...(await fetchSessionRecords(studentId, sessionIds.slice(i, i + RECORDS_CHUNK))));
  }
  return pairs;
}

/**
 * Lo que necesita `buildFacts`: sesiones cerradas, días asignados, récords y el día AR de `now`.
 * La comparten la evaluación (que escribe) y el endpoint de progreso (que solo lee).
 */
export async function loadEvaluationInput(studentId, now = new Date()) {
  const [closed, assignedDays] = await Promise.all([
    dataRepo.findClosedSessions(studentId),
    dataRepo.findAssignedDays(studentId),
  ]);
  const recordPairs = closed.length ? await fetchRecordPairs(studentId, closed.map((s) => s.id)) : [];
  return { closed, assignedDays, recordPairs, today: localDate(now) };
}
```

`evaluate.service.js`: reemplazar desde la primera línea hasta `today: localDate(now),\n  });` (fin del `buildFacts`) por:

```js
import { evaluateCriteria } from '../../models/gamification/criteria.js';
import * as gamificationRepo from '../../repositories/gamification/gamification.repository.js';
import { buildFacts, contextFor } from './evaluate-facts.js';
import { updateActiveChallenges } from './evaluate-challenges.js';
import { loadEvaluationInput } from './evaluation-input.js';

/**
 * Evalúa al alumno desde su historial (idempotente): recalcula y guarda la racha,
 * otorga los logros cuya regla se cumple, actualiza los desafíos activos y
 * otorga el logro premio de los completados.
 * `catalog` opcional: catálogo ya cargado (el job diario lo trae una vez por corrida).
 * Devuelve { unlocked: [{ code, name, category }], streak } con solo lo recién desbloqueado.
 */
export async function evaluateStudent(studentId, { now = new Date(), catalog: preloaded } = {}) {
  const [input, catalog, unlockedIds] = await Promise.all([
    loadEvaluationInput(studentId, now),
    preloaded ?? gamificationRepo.findCatalog(),
    gamificationRepo.findUnlockedAchievementIds(studentId),
  ]);
  const { closed, assignedDays } = input;
  const { facts, streak, recordSessions } = buildFacts(input);
```

El resto de la función queda igual (sigue usando `closed`, `assignedDays`, `now`).

`achievements.service.js`: cambiar `const toStreakView = (row) => ({` por

```js
/** Forma pública de la racha (la usa también el endpoint de progreso). */
export const toStreakView = (row) => ({
```

`achievement-progress.service.js`:

```js
import { assertCanAccessStudent } from '../students/student-access.service.js';
import * as gamificationRepo from '../../repositories/gamification/gamification.repository.js';
import { achievementProgress } from '../../models/gamification/achievement-progress.js';
import { buildFacts } from './evaluate-facts.js';
import { loadEvaluationInput } from './evaluation-input.js';
import { toStreakView } from './achievements.service.js';

/**
 * Racha, datos y progreso de cada logro del catálogo (spec tarjeta 15 §2). Solo lee: a diferencia de
 * evaluateStudent no guarda la racha ni otorga logros. La racha se calcula ahora, coherente con `facts`.
 */
export async function getAchievementsProgress(user, studentId, { now = new Date() } = {}) {
  await assertCanAccessStudent(user, studentId);
  const [input, catalog, unlockedRows] = await Promise.all([
    loadEvaluationInput(studentId, now),
    gamificationRepo.findCatalog(),
    gamificationRepo.findStudentAchievements(studentId),
  ]);
  const { facts, streak } = buildFacts(input);
  const unlockedAt = new Map(unlockedRows.map((row) => [row.achievement_id, row.unlocked_at]));
  return {
    streak: toStreakView(streak),
    facts: {
      sessions_count: facts.sessionsCount,
      longest_streak: facts.longestStreak,
      pr_sessions: facts.prSessions,
      full_weeks: facts.fullWeeks,
    },
    achievements: catalog.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
      category: a.category,
      icon_url: a.icon_url,
      criteria_type: a.criteria?.type ?? null,
      ...achievementProgress(a.criteria, facts, unlockedAt.has(a.id)),
      unlocked_at: unlockedAt.get(a.id) ?? null,
    })),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/services/gamification`
Expected: PASS, incluido `evaluate.service.test.js` **sin modificar**.

- [ ] **Step 5: Checkpoint** — `npm run lint` (sin imports sin usar en `evaluate.service.js`). Sin commit.

---

### Task 3: Ruta y controller

**Files:**
- Modify: `backend/src/controllers/gamification/achievements.controller.js`
- Modify: `backend/src/routes/gamification/student-gamification.routes.js`
- Test: `backend/tests/unit/routes/gamification/student-gamification.routes.test.js`

**Interfaces:**
- Consumes: `getAchievementsProgress(user, studentId)` (Task 2).
- Produces: `GET /students/:id/achievements/progress` → `200 { data: { streak, facts, achievements } }`.

- [ ] **Step 1: Write the failing test**

En `student-gamification.routes.test.js`, agregar al `describe.each` la fila:

```js
  ['GET /students/:id/achievements/progress', studentRouter, '/achievements/progress'],
```

y, dentro de `describe('montaje', ...)`, el caso:

```js
  it('el progreso valida el id y termina en su controller', () => {
    const handlers = handlersOf(studentRouter, '/achievements/progress');
    expect(handlers).toHaveLength(4);
    let err;
    handlers[2]({ params: { id: 'x' } }, {}, (e) => { err = e; });
    expect(err).toMatchObject({ statusCode: 400 });
    expect(handlers[3]).toBe(achievementsController.progress);
  });
```

con el import arriba:

```js
import * as achievementsController from '../../../../src/controllers/gamification/achievements.controller.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/routes/gamification/student-gamification.routes.test.js`
Expected: FAIL (no existe la ruta).

- [ ] **Step 3: Write the implementation**

En `achievements.controller.js`, import y handler nuevos:

```js
import * as progressService from '../../services/gamification/achievement-progress.service.js';
```

```js
/** GET /students/:id/achievements/progress — 200 → { data: { streak, facts, achievements } } */
export const progress = asyncHandler(async (req, res) => {
  res.json({ data: await progressService.getAchievementsProgress(req.user, req.params.id) });
});
```

En `student-gamification.routes.js`, debajo de `router.get('/achievements', ...)`:

```js
// Progreso de cada logro del catálogo (tarjeta 15): solo lectura.
router.get('/achievements/progress', ...studentScoped, achievementsController.progress);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/routes/gamification`
Expected: PASS.

- [ ] **Step 5: Checkpoint** — sin commit.

---

### Task 4: Documentación (aviso a Pablo)

**Files:**
- Modify: `backend/README.md` (tabla "Gamificación — Fase 5")
- Modify: `docs/arquitectura/contratos-api.md` (después de `### GET /students/:id/achievements`, y la línea del historial de cambios al final)

- [ ] **Step 1: README** — debajo de la fila de `GET /api/students/:id/achievements`, agregar:

```markdown
| GET | `/api/students/:id/achievements/progress` | trainer dueño / el propio alumno | Solo lectura: `{ streak, facts, achievements }` con `current`/`target`/`unlocked_at` de cada logro del catálogo (lo usa el celular, tarjeta 15) |
```

- [ ] **Step 2: contratos-api.md** — antes de `### GET /students/:id/streak`, agregar:

````markdown
### GET /students/:id/achievements/progress

Progreso del alumno en cada logro del catálogo. Mismos roles y permisos. **Solo lee**: no guarda la racha ni otorga logros (eso pasa al cerrar una sesión y en el job diario). La racha se calcula en el momento con la misma regla que `GET /streak` (ADR 0005).

**200 OK**

```json
{
  "data": {
    "streak": { "current_streak_days": 6, "longest_streak_days": 9, "last_session_date": "2026-10-30" },
    "facts": { "sessions_count": 3, "longest_streak": 9, "pr_sessions": 1, "full_weeks": 0 },
    "achievements": [
      {
        "id": "uuid", "code": "SESSIONS_10", "name": "10 sesiones", "description": "…",
        "category": "milestone", "icon_url": null, "criteria_type": "sessions_count",
        "current": 3, "target": 10, "unlocked_at": null
      }
    ]
  }
}
```

- `achievements`: todo el catálogo, en el orden de `GET /achievements`.
- `target`: `value` (`sessions_count`, `pr_count`), `days` (`streak`), `count` (`full_week`); `challenge` → 1.
- `current`: el dato de `facts` que corresponde, recortado a `target`. Un logro desbloqueado vale `target` aunque el dato haya bajado. `challenge` vale 1 solo desbloqueado.
- `facts` son los valores sin recortar: `longest_streak` es la mayor racha del historial y `pr_sessions` las sesiones con al menos un récord.
````

En la nota de cambios del final ("Esta es la versión 1.1 del contrato…"), debajo de la línea `> - Añadido módulo completo de Gamificación (...)`, agregar:

```markdown
> - Añadido `GET /students/:id/achievements/progress` (progreso de logros, solo lectura; tarjeta 15).
```

- [ ] **Step 3: Verificación final**

Run: `npm run lint && npm test`
Expected: todo en verde, sin archivos de más de 200 líneas.

- [ ] **Step 4: Checkpoint** — sin commit.
