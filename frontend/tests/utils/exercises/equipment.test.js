import { describe, expect, it } from 'vitest';
import { extraEquipmentNote, normalizeEquipment } from '@/utils/exercises/equipment';

describe('normalizeEquipment', () => {
  it('lleva el texto libre de la ficha al catálogo sin distinguir mayúsculas, acentos ni plurales', () => {
    expect(normalizeEquipment(['barra', 'Mancuernas', 'Banco plano'])).toEqual({ codes: ['barbell', 'dumbbell'], unmapped: ['Banco plano'] });
    expect(normalizeEquipment(['Máquinas', 'poleas', 'Pesa rusa', 'kettlebell', 'Banda elástica', 'elástico', 'Peso corporal', 'Sin equipamiento']).codes)
      .toEqual(['machine', 'cable', 'kettlebell', 'band', 'bodyweight']);
  });

  it('acepta los códigos en inglés y no repite', () => {
    expect(normalizeEquipment(['barbell', 'BARRAS', 'band', 'Dumbbell'])).toEqual({ codes: ['barbell', 'band', 'dumbbell'], unmapped: [] });
  });

  it('lo que no mapea queda tal como se cargó, sin repetir; ignora vacíos y lo que no es texto', () => {
    expect(normalizeEquipment([' Rack propio ', 'rack propios', '', '  ', null, 3])).toEqual({ codes: [], unmapped: ['Rack propio'] });
    expect(normalizeEquipment(null)).toEqual({ codes: [], unmapped: [] });
  });
});

describe('extraEquipmentNote', () => {
  it('arma la nota como la suma el backend a las preferencias', () => {
    expect(extraEquipmentNote(['Banco plano', 'Rack'])).toBe('Equipamiento extra del gimnasio: Banco plano, Rack');
    expect(extraEquipmentNote([])).toBeNull();
  });
});
