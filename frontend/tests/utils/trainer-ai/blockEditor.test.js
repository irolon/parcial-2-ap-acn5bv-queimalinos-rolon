import { describe, expect, it } from 'vitest';
import { blockIndexOf, fromBlock, planBlockStart } from '@/utils/trainer-ai/blockEditor';
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

describe('blockIndexOf', () => {
  it('solo un entero no negativo es un bloque; vacío, ausente o no numérico no es ninguno', () => {
    expect(blockIndexOf('0')).toBe(0);
    expect(blockIndexOf('2')).toBe(2);
    for (const raw of [null, '', ' ', 'abc', '-1', '1.5', '1e2']) expect(blockIndexOf(raw)).toBeNull();
  });
});

describe('planBlockStart', () => {
  const block = SPLIT.routine_proposal.routines[0];
  const source = { block, goal: 'hypertrophy', draftIsBlock: false };
  const draft = { state: { name: 'Fuerza A' }, missing: 0 };

  it('sin bloque muestra el borrador (o nada)', () => {
    expect(planBlockStart(null, draft, byId)).toEqual({ state: draft.state, ask: null, loaded: null });
    expect(planBlockStart(null, null, byId)).toEqual({ state: null, ask: null, loaded: null });
  });

  it('sin borrador carga el bloque', () => {
    const plan = planBlockStart(source, null, byId);
    expect(plan.state.name).toBe('Empuje');
    expect(plan.loaded.state).toBe(plan.state);
    expect(plan.ask).toBeNull();
  });

  it('con un borrador que no es el bloque muestra el borrador y pregunta', () => {
    const plan = planBlockStart(source, draft, byId);
    expect(plan.state).toBe(draft.state);
    expect(plan.ask.state.name).toBe('Empuje');
    expect(plan.loaded).toBeNull();
  });

  it('si el borrador ya es ese bloque (una recarga) lo recupera sin preguntar', () => {
    expect(planBlockStart({ ...source, draftIsBlock: true }, draft, byId)).toEqual({ state: draft.state, ask: null, loaded: null });
  });
});
