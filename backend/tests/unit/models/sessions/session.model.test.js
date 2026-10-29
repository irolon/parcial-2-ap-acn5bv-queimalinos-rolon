import {
  SESSIONS_TABLE,
  SESSION_SETS_TABLE,
  SESSION_COLUMNS,
  isSubstitution,
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
});
