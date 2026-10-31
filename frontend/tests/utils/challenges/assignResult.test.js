import { describe, expect, it } from 'vitest';
import { assignResultText } from '@/utils/challenges/assignResult';

const students = new Map(
  [
    ['s-1', 'Tomás'],
    ['s-2', 'Ana'],
    ['s-3', 'Juan'],
    ['s-4', 'Lucía'],
    ['s-5', 'Pedro'],
  ].map(([id, name]) => [id, { id, name }]),
);
const created = (...ids) => ids.map((id) => ({ student_id: id }));
const active = (...ids) => ids.map((id) => ({ student_id: id, reason: 'already_active' }));

describe('assignResultText', () => {
  it('3 creados', () => {
    expect(assignResultText({ created: created('s-1', 's-2', 's-3'), skipped: [] }, students)).toBe('Asignado a 3 alumnos');
  });

  it('1 creado en singular', () => {
    expect(assignResultText({ created: created('s-1'), skipped: [] }, students)).toBe('Asignado a 1 alumno');
  });

  it('nombra al que ya lo tenía activo', () => {
    const result = { created: created('s-1', 's-2', 's-3'), skipped: active('s-4') };
    expect(assignResultText(result, students)).toBe('Asignado a 3 alumnos · 1 ya lo tenía activo (Lucía)');
  });

  it('todos salteados: "Ningún alumno nuevo", nunca "Asignado a 0"', () => {
    const text = assignResultText({ created: [], skipped: active('s-4', 's-5') }, students);
    expect(text).toBe('Ningún alumno nuevo: 2 ya lo tenían activo (Lucía, Pedro)');
    expect(text).not.toMatch(/Asignado a 0/);
  });

  it('cuenta los que no son del entrenador, sin nombre si no está en la lista', () => {
    const result = { created: created('s-1'), skipped: [{ student_id: 's-x', reason: 'not_your_student' }] };
    expect(assignResultText(result, students)).toBe('Asignado a 1 alumno · 1 no es tu alumno');
  });

  it('varios no son del entrenador, en plural', () => {
    const skipped = ['s-x', 's-y'].map((id) => ({ student_id: id, reason: 'not_your_student' }));
    expect(assignResultText({ created: [], skipped }, students)).toBe('Ningún alumno nuevo: 2 no son tus alumnos');
  });
});
