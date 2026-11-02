import { fileURLToPath } from 'node:url';
import { CRITERIA, meetsCriteria } from '../../../../src/models/gamification/criteria.js';
import { achievementProgress } from '../../../../src/models/gamification/achievement-progress.js';
import { parseAchievementsSeed } from '../../../helpers/gamification/achievements-seed-parser.js';

const SEED_PATH = fileURLToPath(
  new URL('../../../../src/database/seeds/achievements.sql', import.meta.url),
);
const catalog = parseAchievementsSeed(SEED_PATH);

// Datos de alumnas en distintos momentos: nueva, a mitad de camino, justo en las metas y muy avanzada.
const FACTS = [
  { sessionsCount: 0, longestStreak: 0, prSessions: 0, fullWeeks: 0 },
  { sessionsCount: 9, longestStreak: 6, prSessions: 1, fullWeeks: 3 },
  { sessionsCount: 50, longestStreak: 30, prSessions: 10, fullWeeks: 4 },
  { sessionsCount: 500, longestStreak: 365, prSessions: 80, fullWeeks: 52 },
];

describe('seed de logros', () => {
  it('trae los 11 logros, todos de un tipo que el evaluador conoce', () => {
    expect(catalog).toHaveLength(11);
    catalog.forEach(({ criteria }) => expect(Object.keys(CRITERIA)).toContain(criteria.type));
  });

  // El progreso y el evaluador salen de la misma tabla: "cumplido" tiene que significar lo mismo en los dos.
  it.each(FACTS)('evaluador y progreso coinciden con %j', (facts) => {
    catalog.forEach(({ code, criteria }) => {
      const { current, target } = achievementProgress(criteria, facts, false);
      expect([code, meetsCriteria(criteria, facts)]).toEqual([code, current === target]);
    });
  });

  it('una meta en 0 (seed mal cargado) no se otorga ni se muestra cumplida', () => {
    const criteria = { type: 'sessions_count', value: 0 };
    const facts = FACTS[2];
    expect(meetsCriteria(criteria, facts)).toBe(false);
    expect(achievementProgress(criteria, facts, false)).toEqual({ current: 0, target: 1 });
  });
});
