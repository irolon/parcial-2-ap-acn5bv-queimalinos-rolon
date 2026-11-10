import { describe, expect, it } from 'vitest';
import { makeExercise } from '@/utils/routines/editorState';
import { differsFromProposal, toAssignedBlock } from '@/utils/trainer-ai/assignedBlock';

const byId = new Map([['ex-bench', { id: 'ex-bench', name: 'Press banca plano' }], ['ex-plank', { id: 'ex-plank', name: 'Plancha' }]]);
const PROPOSAL = {
  name: 'Empuje',
  days: ['monday'],
  exercises: [{ exercise_id: 'ex-bench', exercise_name: 'Press banca plano', sets: 4, reps: 8, rest_seconds: 90, suggested_kg: 40, notes: 'Bajada controlada' }],
};
const state = (exercises, extra = {}) => ({ name: ' Empuje ', goal: 'hypertrophy', days: ['monday'], templateId: null, exercises, ...extra });

describe('trainer-ai · assignedBlock', () => {
  it('toAssignedBlock: nombre, días y ejercicios como se asignaron, con el nombre de la biblioteca', () => {
    const block = toAssignedBlock(state([makeExercise('ex-plank', { sets: '3', reps: '1', rest_seconds: '', suggested_kg: '', notes: '' })]), byId);
    expect(block).toEqual({
      name: 'Empuje',
      days: ['monday'],
      exercises: [{ exercise_id: 'ex-plank', exercise_name: 'Plancha', sets: 3, reps: 1, rest_seconds: null, suggested_kg: null, notes: null }],
    });
  });

  it('differsFromProposal: igual que la propuesta → false; cualquier cambio → true', () => {
    const same = toAssignedBlock(state([makeExercise('ex-bench', PROPOSAL.exercises[0])]), byId);
    expect(differsFromProposal(same, PROPOSAL)).toBe(false);
    const sets = toAssignedBlock(state([makeExercise('ex-bench', { ...PROPOSAL.exercises[0], sets: 5 })]), byId);
    expect(differsFromProposal(sets, PROPOSAL)).toBe(true);
    expect(differsFromProposal({ ...same, days: ['tuesday'] }, PROPOSAL)).toBe(true);
    expect(differsFromProposal({ ...same, name: 'Empuje fuerte' }, PROPOSAL)).toBe(true);
    expect(differsFromProposal({ ...same, exercises: [] }, PROPOSAL)).toBe(true);
  });
});
