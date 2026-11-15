import { describe, expect, it } from 'vitest';
import { findSameName, normalizeName } from '@/utils/exercises/sameName';

const LIBRARY = [
  { id: 'g-1', name: 'Press banca plano', is_global: true },
  { id: 'p-1', name: 'Remo con banda', is_global: false },
];

describe('normalizeName', () => {
  it('ignora mayúsculas, tildes y espacios de más', () => {
    expect(normalizeName('  Prés   BANCA ')).toBe('pres banca');
    expect(normalizeName('Elevación de talones')).toBe(normalizeName('elevacion de  talones'));
  });

  it('tolera valores vacíos', () => {
    expect(normalizeName(undefined)).toBe('');
    expect(normalizeName(null)).toBe('');
  });
});

describe('findSameName', () => {
  it('encuentra un global o un propio con el mismo nombre normalizado', () => {
    expect(findSameName(LIBRARY, 'press  BANCA plano')).toBe(LIBRARY[0]);
    expect(findSameName(LIBRARY, 'Remo con bandá')).toBe(LIBRARY[1]);
  });

  it('no avisa si el nombre es distinto, vacío o la biblioteca no cargó', () => {
    expect(findSameName(LIBRARY, 'Press banca inclinado')).toBeNull();
    expect(findSameName(LIBRARY, '   ')).toBeNull();
    expect(findSameName(undefined, 'Press banca plano')).toBeNull();
  });

  it('al editar ignora el mismo ejercicio', () => {
    expect(findSameName(LIBRARY, 'Remo con banda', 'p-1')).toBeNull();
    expect(findSameName(LIBRARY, 'Press banca plano', 'p-1')).toBe(LIBRARY[0]);
  });
});
