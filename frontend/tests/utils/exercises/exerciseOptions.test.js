import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT,
  EQUIPMENT_OPTIONS,
  MUSCLE_GROUPS,
  MUSCLE_OPTIONS,
  equipmentLabel,
  muscleLabel,
} from '@/utils/exercises/exerciseOptions';

describe('exerciseOptions', () => {
  it('muscleLabel traduce o devuelve el código', () => {
    expect(muscleLabel('full_body')).toBe('Cuerpo completo');
    expect(muscleLabel('yoga')).toBe('yoga');
  });

  it('equipmentLabel traduce, devuelve el código o null', () => {
    expect(equipmentLabel('cable')).toBe('Polea');
    expect(equipmentLabel('tractor')).toBe('tractor');
    expect(equipmentLabel(null)).toBeNull();
  });

  it('las opciones del formulario cubren todos los códigos', () => {
    expect(MUSCLE_OPTIONS).toHaveLength(11);
    expect(MUSCLE_OPTIONS.map((o) => o.value)).toEqual(MUSCLE_GROUPS);
    expect(EQUIPMENT_OPTIONS).toHaveLength(8);
    expect(EQUIPMENT_OPTIONS[0]).toEqual({ value: '', label: 'Sin equipamiento' });
    expect(EQUIPMENT_OPTIONS.slice(1).map((o) => o.value)).toEqual(EQUIPMENT);
  });
});
