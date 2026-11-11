import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  filterStudents,
  filtersToSearch,
  inactiveStudents,
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
    expect(parse('estado=zzz&orden=nada&objetivo=x&adherencia=mucha')).toEqual({ ...DEFAULT_FILTERS, objetivo: 'x' });
  });

  it('ida y vuelta, omitiendo defaults', () => {
    const f = { estado: 'inactivos', objetivo: 'strength', orden: 'nombre', q: 'jo', adherencia: 'baja' };
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

  it('adherencia, combinada con el estado', () => {
    const low = student({ name: 'Baja adherencia', last_session_at: '2026-10-23T10:00:00Z', adherence_7d: { assigned: 4, done: 1, pct: 25 } });
    const high = student({ name: 'Alta', last_session_at: '2026-10-01T10:00:00Z', adherence_7d: { assigned: 4, done: 4, pct: 100 } });
    const list = [low, high, old];
    const pick = (over) => filterStudents(list, { ...DEFAULT_FILTERS, ...over }, NOW);
    expect(pick({ adherencia: 'baja' })).toEqual([low]);
    expect(pick({ adherencia: 'alta' })).toEqual([high]);
    expect(pick({ adherencia: 'sin-plan' })).toEqual([old]);
    expect(pick({ adherencia: 'alta', estado: 'al-dia' })).toEqual([]);
  });

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

  it('ultima-sesion: más días sin entrenar primero, contando desde el alta si nunca entrenó', () => {
    expect(sortStudents(list, 'ultima-sesion', NOW)).toEqual([never1, never2, s2, s1]);
    const longAgo = student({ name: 'Vieja', last_session_at: '2026-08-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' });
    const recentNever = student({ name: 'Reciente', created_at: '2026-10-20T00:00:00Z' });
    expect(sortStudents([recentNever, longAgo], 'ultima-sesion', NOW)).toEqual([longAgo, recentNever]);
  });

  it('ultima-sesion: el empate se desempata por nombre', () => {
    const b = student({ name: 'Bruno', last_session_at: '2026-10-10T08:00:00Z' });
    const a = student({ name: 'Álvaro', last_session_at: '2026-10-10T10:00:00Z' });
    expect(sortStudents([b, a], 'ultima-sesion', NOW)).toEqual([a, b]);
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

  it('el id de la URL en mayúsculas encuentra igual al alumno', () => {
    expect(neighbors(list, b.id.toUpperCase())).toEqual({ prev: a, next: c, index: 1, total: 3 });
  });
});

describe('inactiveStudents', () => {
  it('toma hasta 5 inactivos, los de más días sin entrenar primero', () => {
    const trained = [9, 30, 12, 8].map((d) => student({ last_session_at: new Date(NOW - d * 864e5).toISOString() }));
    const never = [8, 40].map((d) => student({ created_at: new Date(NOW - d * 864e5).toISOString() }));
    const fresh = student({ last_session_at: '2026-10-23T10:00:00Z' });
    const result = inactiveStudents([fresh, ...never, ...trained], NOW);
    expect(result).toEqual([never[1], trained[1], trained[2], trained[0], trained[3]]);
  });
});

describe('sortStudents por racha', () => {
  const withStreak = (name, current, longest) =>
    student({ name, streak: { current_days: current, longest_days: longest, last_trained_date: null } });

  it('mayor racha actual primero, luego mejor marca, sin dato al final y empate por nombre', () => {
    const twelve = withStreak('Doce', 12, 12);
    const three = withStreak('Tres', 3, 9);
    const zeroBest20 = withStreak('Cero20', 0, 20);
    const zeroBest5 = withStreak('Cero5', 0, 5);
    const none = student({ name: 'Nulo', streak: null });
    const tieB = withStreak('Beto', 3, 9);
    const sorted = sortStudents([none, zeroBest5, three, zeroBest20, twelve, tieB], 'racha');
    expect(sorted).toEqual([twelve, tieB, three, zeroBest20, zeroBest5, none]);
  });

  it('parseStudentFilters acepta orden=racha', () => {
    expect(parse('orden=racha').orden).toBe('racha');
  });
});

describe('sortStudents por adherencia', () => {
  const withPct = (name, pct) => student({ name, adherence_7d: { assigned: 3, done: 1, pct } });

  it('menor adherencia primero, sin plan al final y empate por nombre', () => {
    const high = withPct('Alta', 90);
    const low = withPct('Baja', 20);
    const tieB = withPct('Beto', 50);
    const tieA = withPct('Ana', 50);
    const noPlan = withPct('Nadia', null);
    const missing = student({ name: 'Mora' });
    const sorted = sortStudents([missing, high, noPlan, tieB, low, tieA], 'adherencia');
    expect(sorted).toEqual([low, tieA, tieB, high, missing, noPlan]);
  });

  it('parseStudentFilters acepta orden=adherencia y descarta lo inválido', () => {
    expect(parse('orden=adherencia').orden).toBe('adherencia');
    expect(parse('orden=adherencias').orden).toBe(DEFAULT_FILTERS.orden);
  });
});
