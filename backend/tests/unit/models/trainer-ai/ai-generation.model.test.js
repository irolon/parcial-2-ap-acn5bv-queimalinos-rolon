import { describe, it, expect } from '@jest/globals';
import {
  retryAfterSeconds,
  templateNameFor,
  blockStructure,
  proposalExerciseIds,
} from '../../../../src/models/trainer-ai/ai-generation.model.js';

describe('ai-generation.model', () => {
  it('retryAfterSeconds: segundos hasta que la más vieja salga de la hora', () => {
    const now = new Date('2026-11-06T12:00:00Z');
    expect(retryAfterSeconds('2026-11-06T11:10:00Z', now)).toBe(600);
    expect(retryAfterSeconds('2026-11-06T10:00:00Z', now)).toBe(1);
  });

  it('templateNameFor: el nombre solo con 1 bloque, "nombre · bloque" cortado a 120 con varios', () => {
    expect(templateNameFor('Fuerza', 'Empuje', 1)).toBe('Fuerza');
    expect(templateNameFor('Fuerza', 'Empuje', 2)).toBe('Fuerza · Empuje');
    expect(templateNameFor('x'.repeat(118), 'Empuje', 3)).toHaveLength(120);
  });

  it('blockStructure arma la structure v1 con order y tempo null', () => {
    const block = {
      name: 'A',
      days: ['monday'],
      exercises: [
        { exercise_id: 'e1', sets: 3, reps: 10, rest_seconds: 60, suggested_kg: null, notes: null },
        { exercise_id: 'e2', sets: 4, reps: 8, rest_seconds: 90, suggested_kg: 40, notes: 'x' },
      ],
    };
    expect(blockStructure(block)).toEqual({
      version: 1,
      days: ['monday'],
      exercises: [
        { exercise_id: 'e1', sets: 3, reps: 10, rest_seconds: 60, suggested_kg: null, tempo: null, notes: null, order: 0 },
        { exercise_id: 'e2', sets: 4, reps: 8, rest_seconds: 90, suggested_kg: 40, tempo: null, notes: 'x', order: 1 },
      ],
    });
  });

  it('proposalExerciseIds devuelve los ids sin repetir', () => {
    const p = {
      routines: [{ exercises: [{ exercise_id: 'a' }, { exercise_id: 'b' }] }, { exercises: [{ exercise_id: 'a' }] }],
    };
    expect(proposalExerciseIds(p)).toEqual(['a', 'b']);
  });
});
