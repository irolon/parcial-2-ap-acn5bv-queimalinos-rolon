import {
  validateExerciseItem,
  normalizeExerciseOrder,
} from '../../../../src/validations/routines/routine-exercise.validation.js';

const UUID = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';
const OK = { exercise_id: UUID, sets: 3, reps: 10 };

const itemErrors = (patch) => {
  const details = [];
  validateExerciseItem({ ...OK, ...patch }, 'exercises[0]', details);
  return details.map((d) => d.field);
};

describe('validateExerciseItem', () => {
  it('ítem válido con opcionales ausentes los deja en null', () => {
    const details = [];
    const out = validateExerciseItem(OK, 'exercises[0]', details);
    expect(details).toEqual([]);
    expect(out).toEqual({
      exercise_id: UUID,
      sets: 3,
      reps: 10,
      rest_seconds: null,
      suggested_kg: null,
      tempo: null,
      notes: null,
      order: undefined,
    });
  });
  it('sets: 0 es error en exercises[0].sets', () => {
    expect(itemErrors({ sets: 0 })).toEqual(['exercises[0].sets']);
  });
  it('rest_seconds inválido es error, no null silencioso', () => {
    expect(itemErrors({ rest_seconds: -1 })).toEqual(['exercises[0].rest_seconds']);
    expect(itemErrors({ rest_seconds: 'x' })).toEqual(['exercises[0].rest_seconds']);
  });
  it('rechaza suggested_kg negativo, tempo > 20, notes > 500 y order negativo', () => {
    expect(itemErrors({ suggested_kg: -5 })).toEqual(['exercises[0].suggested_kg']);
    expect(itemErrors({ tempo: 'x'.repeat(21) })).toEqual(['exercises[0].tempo']);
    expect(itemErrors({ notes: 'x'.repeat(501) })).toEqual(['exercises[0].notes']);
    expect(itemErrors({ order: -1 })).toEqual(['exercises[0].order']);
  });
  it('acepta los límites exactos', () => {
    const limits = {
      rest_seconds: 0,
      suggested_kg: 0,
      tempo: 'x'.repeat(20),
      notes: 'x'.repeat(500),
      order: 0,
    };
    expect(itemErrors(limits)).toEqual([]);
  });
});

describe('normalizeExerciseOrder', () => {
  const ids = (items) => items.map((i) => i.exercise_id);
  const orders = (items) => items.map((i) => i.order);

  it('sin order explícito renumera 0..n-1 en el orden recibido', () => {
    const out = normalizeExerciseOrder([{ exercise_id: 'a' }, { exercise_id: 'b' }]);
    expect(ids(out)).toEqual(['a', 'b']);
    expect(orders(out)).toEqual([0, 1]);
  });
  it('mezclar explícito e implícito no repite órdenes', () => {
    const out = normalizeExerciseOrder([{ exercise_id: 'a', order: 1 }, { exercise_id: 'b' }]);
    expect(orders(out)).toEqual([0, 1]);
    expect(ids(out)).toEqual(['a', 'b']);
  });
  it('explícitos repetidos se desempatan por posición', () => {
    const out = normalizeExerciseOrder([
      { exercise_id: 'a', order: 2 },
      { exercise_id: 'b', order: 2 },
    ]);
    expect(orders(out)).toEqual([0, 1]);
    expect(ids(out)).toEqual(['a', 'b']);
  });
  it('ordena por el order explícito aunque llegue desordenado', () => {
    const out = normalizeExerciseOrder([
      { exercise_id: 'a', order: 5 },
      { exercise_id: 'b', order: 0 },
    ]);
    expect(ids(out)).toEqual(['b', 'a']);
    expect(orders(out)).toEqual([0, 1]);
  });
});
