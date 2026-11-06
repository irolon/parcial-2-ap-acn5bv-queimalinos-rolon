import { describe, expect, it } from 'vitest';
import { fromBlock } from '@/utils/trainer-ai/blockEditor';
import { SINGLE, SPLIT } from '../../helpers/trainer-ai/fixtures';

const byId = new Map(['ex-bench', 'ex-incline', 'ex-squat', 'ex-plank'].map((id) => [id, { id }]));

describe('fromBlock', () => {
  it('carga nombre, objetivo, días y ejercicios del bloque como strings del editor', () => {
    const { state, missing } = fromBlock(SPLIT.routine_proposal.routines[0], 'hypertrophy', byId);
    expect(missing).toBe(0);
    expect(state).toMatchObject({ name: 'Empuje', goal: 'hypertrophy', days: ['monday'], templateId: null, templateName: null });
    expect(state.exercises.map(({ key, ...e }) => ({ ...e, hasKey: Boolean(key) }))).toEqual([
      { exercise_id: 'ex-bench', sets: '4', reps: '8', rest_seconds: '90', suggested_kg: '40', tempo: '', notes: 'Bajada controlada', hasKey: true },
      { exercise_id: 'ex-incline', sets: '4', reps: '8', rest_seconds: '90', suggested_kg: '', tempo: '', notes: '', hasKey: true },
    ]);
  });

  it('descarta y cuenta lo que ya no está en la biblioteca; ordena los días', () => {
    const block = { ...SINGLE.routine_proposal.routines[0], days: ['friday', 'monday'] };
    const { state, missing } = fromBlock(block, 'strength', byId);
    expect(missing).toBe(1);
    expect(state.days).toEqual(['monday', 'friday']);
    expect(state.exercises.map((e) => e.exercise_id)).toEqual(['ex-squat']);
  });
});
