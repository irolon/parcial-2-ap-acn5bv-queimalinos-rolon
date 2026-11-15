import { describe, expect, it } from 'vitest';
import { buildInvitationExtras, validateInvitationExtras } from '@/pages/invitations/invitationExtras';

const formData = (values, equipment = []) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  for (const item of equipment) data.append('gym_equipment', item);
  return data;
};
const EMPTY = { weekly_frequency: '', height_cm: '', weight_kg: '', birth_date: '', injuries: '' };
const NOW = new Date('2026-11-14T12:00:00');

describe('buildInvitationExtras', () => {
  it('sin datos extra no manda nada', () => {
    expect(buildInvitationExtras(formData(EMPTY))).toEqual({});
    expect(buildInvitationExtras(formData({}))).toEqual({});
  });

  it('manda frecuencia, altura y peso como números (acepta coma decimal) y la fecha tal cual', () => {
    const data = formData({ weekly_frequency: '4', height_cm: '178', weight_kg: '74,5', birth_date: '2002-03-15' });
    expect(buildInvitationExtras(data)).toEqual({
      weekly_frequency: 4,
      height_cm: 178,
      weight_kg: 74.5,
      birth_date: '2002-03-15',
    });
  });

  it('manda el equipamiento y las lesiones recortadas', () => {
    const data = formData({ ...EMPTY, injuries: '  Lumbalgia  ' }, ['barbell', 'Banco']);
    expect(buildInvitationExtras(data)).toEqual({ gym_equipment: ['barbell', 'Banco'], injuries: 'Lumbalgia' });
  });

  it('un número que no se entiende queda como NaN para que lo marque la validación', () => {
    expect(buildInvitationExtras(formData({ height_cm: 'abc' })).height_cm).toBeNaN();
  });
});

describe('validateInvitationExtras', () => {
  it('sin datos extra no hay errores', () => {
    expect(validateInvitationExtras({}, NOW)).toEqual({});
  });

  it('acepta valores dentro de rango', () => {
    expect(validateInvitationExtras({ height_cm: 50, weight_kg: 300, birth_date: '2026-11-14' }, NOW)).toEqual({});
  });

  it('marca altura, peso y fecha fuera de rango', () => {
    expect(validateInvitationExtras({ height_cm: 300, weight_kg: Number.NaN, birth_date: '2026-11-15' }, NOW)).toEqual({
      height_cm: 'Entre 50 y 250 cm',
      weight_kg: 'Entre 20 y 300 kg',
      birth_date: 'La fecha no puede ser futura',
    });
    expect(validateInvitationExtras({ birth_date: '1899-12-31' }, NOW)).toEqual({
      birth_date: 'La fecha tiene que ser desde 1900',
    });
  });
});
