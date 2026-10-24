import { describe, expect, it } from 'vitest';
import {
  INITIAL_FILTERS,
  effectiveMuscle,
  filterExercises,
  muscleGroupsIn,
} from '@/utils/exercises/filterExercises';
import { LIBRARY, exercise } from '../../helpers/exercises/fixtures';

const names = (list) => list.map((e) => e.name);
const run = (filters) => names(filterExercises(LIBRARY, { ...INITIAL_FILTERS, ...filters }));

describe('filterExercises', () => {
  it('sin filtros devuelve todo en el mismo orden', () => {
    expect(filterExercises(LIBRARY, INITIAL_FILTERS)).toEqual(LIBRARY);
  });

  it('filtra por músculo', () => {
    expect(run({ muscle: 'chest' })).toEqual(['Press banca plano', 'Press inclinado con mancuernas']);
  });

  it('combina músculo y equipamiento', () => {
    expect(run({ muscle: 'chest', equipment: 'barbell' })).toEqual(['Press banca plano']);
  });

  it('filtra por origen', () => {
    expect(run({ origin: 'own' })).toEqual(['Press inclinado con mancuernas', 'Elevación de talones']);
    expect(run({ origin: 'global' })).toEqual(['Press banca plano', 'Sentadilla', 'Plancha']);
  });

  it('busca por nombre sin mayúsculas ni tildes', () => {
    expect(run({ search: 'PRESS' })).toEqual(['Press banca plano', 'Press inclinado con mancuernas']);
    expect(run({ search: '  elevacion ' })).toEqual(['Elevación de talones']);
  });
});

describe('muscleGroupsIn', () => {
  it('lista los grupos presentes en el orden del backend', () => {
    expect(muscleGroupsIn(LIBRARY)).toEqual(['chest', 'legs', 'core', 'calves']);
  });

  it('deja los desconocidos al final', () => {
    const list = [exercise({ muscle_group: 'yoga' }), exercise({ muscle_group: 'back' })];
    expect(muscleGroupsIn(list)).toEqual(['back', 'yoga']);
  });
});

describe('effectiveMuscle', () => {
  it('cae a "all" si el músculo ya no está disponible', () => {
    const groups = muscleGroupsIn(LIBRARY);
    expect(effectiveMuscle({ muscle: 'back' }, groups)).toBe('all');
    expect(effectiveMuscle({ muscle: 'legs' }, groups)).toBe('legs');
  });
});
