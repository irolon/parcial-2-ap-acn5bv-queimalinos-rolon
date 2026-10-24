import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  filterStudents,
  filtersToSearch,
  neighbors,
  parseStudentFilters,
  sortStudents,
} from '@/utils/students/studentFilters';
import { student } from '../../helpers/students/fixtures';

const NOW = new Date('2026-10-24T12:00:00Z');
const parse = (qs) => parseStudentFilters(new URLSearchParams(qs));

describe('parseStudentFilters / filtersToSearch', () => {
  it('sin params devuelve los defaults', () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS);
  });

  it('los valores inválidos caen al default', () => {
    expect(parse('estado=zzz&orden=nada&objetivo=x')).toEqual({ ...DEFAULT_FILTERS, objetivo: 'x' });
  });

  it('ida y vuelta, omitiendo defaults', () => {
    const f = { estado: 'inactivos', objetivo: 'strength', orden: 'nombre', q: 'jo' };
    expect(parse(filtersToSearch(f))).toEqual(f);
    expect(filtersToSearch(DEFAULT_FILTERS)).toBe('');
    expect(filtersToSearch({ ...DEFAULT_FILTERS, q: 'ana' })).toBe('q=ana');
  });
});

describe('filterStudents', () => {
  const jose = student({ name: 'José Pérez', last_session_at: '2026-10-23T10:00:00Z', goal: 'strength' });
  const old = student({ name: 'Ana', last_session_at: '2026-10-01T10:00:00Z' });
  const fresh = student({ name: 'Nico', created_at: '2026-10-22T10:00:00Z' });
  const off = student({ name: 'Baja', active: false });
  const all = [jose, old, fresh, off];
  const run = (over) => filterStudents(all, { ...DEFAULT_FILTERS, ...over }, NOW);

  it('estado', () => {
    expect(run({}).length).toBe(4);
    expect(run({ estado: 'inactivos' })).toEqual([old]);
    expect(run({ estado: 'al-dia' })).toEqual([jose]);
    expect(run({ estado: 'nuevos' })).toEqual([fresh]);
    expect(run({ estado: 'baja' })).toEqual([off]);
  });

  it('busca sin mayúsculas ni tildes y por objetivo exacto', () => {
    expect(run({ q: 'jose' })).toEqual([jose]);
    expect(run({ q: 'PÉREZ' })).toEqual([jose]);
    expect(run({ objetivo: 'strength' })).toEqual([jose]);
  });
});

describe('sortStudents', () => {
  const never2 = student({ name: 'B', created_at: '2026-03-01T00:00:00Z' });
  const never1 = student({ name: 'A', created_at: '2026-02-01T00:00:00Z' });
  const s1 = student({ name: 'Zeta', last_session_at: '2026-10-10T00:00:00Z', created_at: '2026-05-01T00:00:00Z' });
  const s2 = student({ name: 'Álvaro', last_session_at: '2026-10-01T00:00:00Z', created_at: '2026-06-01T00:00:00Z' });
  const list = [s1, never2, s2, never1];

  it('ultima-sesion: nunca entrenó primero, después la más vieja', () => {
    expect(sortStudents(list, 'ultima-sesion')).toEqual([never1, never2, s2, s1]);
  });

  it('nombre (con tildes) y alta; no muta la entrada', () => {
    expect(sortStudents(list, 'nombre').map((s) => s.name)).toEqual(['A', 'Álvaro', 'B', 'Zeta']);
    expect(sortStudents(list, 'alta')).toEqual([s2, s1, never2, never1]);
    expect(list[0]).toBe(s1);
  });
});

describe('neighbors', () => {
  const [a, b, c] = [student(), student(), student()];
  const list = [a, b, c];

  it('medio, bordes, uno solo y ausente', () => {
    expect(neighbors(list, b.id)).toEqual({ prev: a, next: c, index: 1, total: 3 });
    expect(neighbors(list, a.id)).toEqual({ prev: null, next: b, index: 0, total: 3 });
    expect(neighbors(list, c.id)).toEqual({ prev: b, next: null, index: 2, total: 3 });
    expect(neighbors([a], a.id)).toEqual({ prev: null, next: null, index: 0, total: 1 });
    expect(neighbors(list, 'x')).toEqual({ prev: null, next: null, index: -1, total: 3 });
  });
});
