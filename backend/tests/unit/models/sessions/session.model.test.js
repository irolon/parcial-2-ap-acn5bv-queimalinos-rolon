import {
  SESSIONS_TABLE,
  SESSION_SETS_TABLE,
  SESSION_COLUMNS,
  isSubstitution,
  OPEN_SESSION_MAX_HOURS,
  openSince,
} from '../../../../src/models/sessions/session.model.js';

const A = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';
const B = '4a2d3c0b-2e3f-4a6b-9c8d-0e1f2a3b4c5d';

describe('session.model', () => {
  it('expone tablas y columnas', () => {
    expect(SESSIONS_TABLE).toBe('sessions');
    expect(SESSION_SETS_TABLE).toBe('session_sets');
    expect(SESSION_COLUMNS).toBe(
      'id, student_id, routine_id, started_at, finished_at, rpe, notes, has_modifications'
    );
  });

  it('isSubstitution: solo si hay original y es distinto', () => {
    expect(isSubstitution({ exercise_id: A, original_exercise_id: null })).toBe(false);
    expect(isSubstitution({ exercise_id: A })).toBe(false);
    expect(isSubstitution({ exercise_id: A, original_exercise_id: A })).toBe(false);
    expect(isSubstitution({ exercise_id: A, original_exercise_id: B })).toBe(true);
  });

  it('openSince: 4 h antes de now (las abiertas más viejas se dan por abandonadas)', () => {
    expect(OPEN_SESSION_MAX_HOURS).toBe(4);
    expect(openSince(new Date('2026-11-09T21:05:00.000Z'))).toBe('2026-11-09T17:05:00.000Z');
  });
});
