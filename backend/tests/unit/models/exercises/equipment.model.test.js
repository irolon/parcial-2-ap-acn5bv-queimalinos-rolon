import { describe, it, expect } from '@jest/globals';
import { normalizeEquipment } from '../../../../src/models/exercises/equipment.model.js';

describe('exercises · equipment.model · normalizeEquipment', () => {
  it.each([
    ['mancuernas', 'dumbbell'],
    ['Mancuerna', 'dumbbell'],
    ['barra', 'barbell'],
    ['Barras', 'barbell'],
    ['Máquinas', 'machine'],
    ['maquina', 'machine'],
    ['Polea', 'cable'],
    ['poleas', 'cable'],
    ['Pesa rusa', 'kettlebell'],
    ['pesas rusas', 'kettlebell'],
    ['Kettlebells', 'kettlebell'],
    ['banda', 'band'],
    ['Bandas elásticas', 'band'],
    ['elástico', 'band'],
    ['Peso corporal', 'bodyweight'],
    ['sin equipamiento', 'bodyweight'],
    ['  BARRA  ', 'barbell'],
  ])('"%s" → %s', (value, code) => {
    expect(normalizeEquipment([value])).toEqual({ codes: [code], unmapped: [] });
  });

  it('los códigos del catálogo pasan tal cual', () => {
    expect(normalizeEquipment(['barbell', 'dumbbell', 'cable']).codes).toEqual([
      'barbell',
      'dumbbell',
      'cable',
    ]);
  });

  it('ficha real: catálogo + texto libre, sin repetidos y lo que no mapea aparte (texto original)', () => {
    expect(
      normalizeEquipment(['barbell', 'barra', 'mancuernas', 'Banco plano', 'Rack', 'banco plano'])
    ).toEqual({
      codes: ['barbell', 'dumbbell'],
      unmapped: ['Banco plano', 'Rack'],
    });
  });

  it.each([null, undefined, []])('sin equipamiento (%p) → listas vacías', (value) => {
    expect(normalizeEquipment(value)).toEqual({ codes: [], unmapped: [] });
  });

  it('ignora textos vacíos o que no son string', () => {
    expect(normalizeEquipment(['', '   ', 3, 'barra'])).toEqual({
      codes: ['barbell'],
      unmapped: [],
    });
  });
});
