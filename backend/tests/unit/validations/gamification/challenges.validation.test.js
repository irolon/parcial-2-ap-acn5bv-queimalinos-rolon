import { describe, expect, it } from '@jest/globals';
import {
  validateChallengeIdParam,
  validateCreateChallenge,
  validateUpdateChallenge,
  validateListChallengesQuery,
  validateSelfAssign,
  validateBatchAssign,
} from '../../../../src/validations/gamification/challenges.validation.js';

const UUID = '3f2b8c1e-5a4d-4e6f-8a9b-0c1d2e3f4a5b';
const valid = { name: ' Mes de hierro ', goal_type: 'volume', goal_value: 5000, duration_days: 30 };
const fieldsOf = (fn, input) => {
  try {
    fn(input);
  } catch (e) {
    return e.details.map((d) => d.field);
  }
  return [];
};

describe('validateCreateChallenge', () => {
  it('acepta el mínimo y recorta el nombre', () => {
    expect(validateCreateChallenge(valid)).toEqual({ ...valid, name: 'Mes de hierro' });
  });

  it('acepta description null y premio uuid', () => {
    const out = validateCreateChallenge({ ...valid, description: null, reward_achievement_id: UUID.toUpperCase() });
    expect(out).toMatchObject({ description: null, reward_achievement_id: UUID });
  });

  it.each([
    ['name', { name: '' }],
    ['name', { name: 'x'.repeat(101) }],
    ['description', { description: 'x'.repeat(1001) }],
    ['goal_type', { goal_type: 'nope' }],
    ['goal_value', { goal_value: 0 }],
    ['goal_value', { goal_value: '5' }],
    ['duration_days', { duration_days: undefined }],
    ['duration_days', { duration_days: 366 }],
    ['duration_days', { duration_days: 1.5 }],
    ['reward_achievement_id', { reward_achievement_id: 'x' }],
  ])('rechaza %s inválido', (field, over) => {
    expect(fieldsOf(validateCreateChallenge, { ...valid, ...over })).toContain(field);
  });
});

describe('goal_value entero en sesiones y racha', () => {
  it.each(['sessions_count', 'streak'])('%s rechaza decimales', (goal_type) => {
    expect(fieldsOf(validateCreateChallenge, { ...valid, goal_type, goal_value: 2.5 })).toEqual(['goal_value']);
    expect(validateCreateChallenge({ ...valid, goal_type, goal_value: 12 })).toMatchObject({ goal_value: 12 });
  });

  it.each(['volume', 'weight_target'])('%s acepta decimales', (goal_type) => {
    expect(validateCreateChallenge({ ...valid, goal_type, goal_value: 72.5 })).toMatchObject({ goal_value: 72.5 });
  });

  it('en el PATCH se exige entero cuando vienen tipo y valor juntos', () => {
    expect(fieldsOf(validateUpdateChallenge, { goal_type: 'streak', goal_value: 1.5 })).toEqual(['goal_value']);
    expect(validateUpdateChallenge({ goal_value: 1.5 })).toEqual({ goal_value: 1.5 });
  });
});

describe('validateUpdateChallenge', () => {
  it('acepta un solo campo', () => {
    expect(validateUpdateChallenge({ goal_value: 3 })).toEqual({ goal_value: 3 });
  });
  it('exige al menos un campo', () => {
    expect(fieldsOf(validateUpdateChallenge, {})).toEqual(['body']);
  });
  it('valida los campos presentes', () => {
    expect(fieldsOf(validateUpdateChallenge, { duration_days: 0 })).toEqual(['duration_days']);
  });
});

describe('otros validadores', () => {
  it('query: goal_type válido, active_only ignorado, inválido → 400', () => {
    expect(validateListChallengesQuery({ goal_type: 'streak', active_only: 'true' })).toEqual({ goal_type: 'streak' });
    expect(validateListChallengesQuery({})).toEqual({});
    expect(fieldsOf(validateListChallengesQuery, { goal_type: 'x' })).toEqual(['goal_type']);
  });

  it('param id', () => {
    expect(validateChallengeIdParam({ id: UUID.toUpperCase() }).id).toBe(UUID);
    expect(fieldsOf(validateChallengeIdParam, { id: 'x' })).toEqual(['id']);
  });

  it('self assign', () => {
    expect(validateSelfAssign({ challenge_id: UUID })).toEqual({ challenge_id: UUID });
    expect(fieldsOf(validateSelfAssign, {})).toEqual(['challenge_id']);
  });

  it('batch: 1 a 50 uuids únicos', () => {
    expect(validateBatchAssign({ student_ids: [UUID] })).toEqual({ student_ids: [UUID] });
    expect(fieldsOf(validateBatchAssign, { student_ids: [] })).toEqual(['student_ids']);
    expect(fieldsOf(validateBatchAssign, { student_ids: ['x'] })).toEqual(['student_ids']);
    expect(fieldsOf(validateBatchAssign, { student_ids: [UUID, UUID] })).toEqual(['student_ids']);
    expect(fieldsOf(validateBatchAssign, { student_ids: Array(51).fill(UUID) })).toEqual(['student_ids']);
    expect(fieldsOf(validateBatchAssign, {})).toEqual(['student_ids']);
  });
});
