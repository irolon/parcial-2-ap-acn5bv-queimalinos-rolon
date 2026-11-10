import { validateCreateInvitation } from '../../../../src/validations/invitations/invitations.validation.js';

const BASE = {
  student_name: 'Pedro Gómez',
  student_email: 'Pedro@Mail.com',
  goal: 'hypertrophy',
  delivery_channel: 'qr',
};
const invalid = (body) =>
  expect(() => validateCreateInvitation({ ...BASE, ...body })).toThrow(
    expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 })
  );

describe('invitations.validation — objetivo opcional', () => {
  it('conserva el goal válido', () => {
    expect(validateCreateInvitation(BASE).goal).toBe('hypertrophy');
  });

  it('sin goal queda en null', () => {
    const { goal, ...sinGoal } = BASE;
    expect(validateCreateInvitation(sinGoal).goal).toBeNull();
  });

  it('goal null explícito queda en null', () => {
    expect(validateCreateInvitation({ ...BASE, goal: null }).goal).toBeNull();
  });

  it('rechaza un goal fuera del enum', () => invalid({ goal: 'flexibility' }));
});

describe('invitations.validation — contexto para la IA (opcional)', () => {
  it('acepta gym_equipment, injuries y level y los sanea', () => {
    const out = validateCreateInvitation({
      ...BASE,
      gym_equipment: [' barbell ', 'cable'],
      injuries: ' rodilla derecha ',
      level: 'advanced',
    });
    expect(out).toMatchObject({
      gym_equipment: ['barbell', 'cable'],
      injuries: 'rodilla derecha',
      level: 'advanced',
    });
  });

  it('sin contexto, los tres quedan en null', () => {
    expect(validateCreateInvitation(BASE)).toMatchObject({
      gym_equipment: null,
      injuries: null,
      level: null,
    });
  });

  it('null explícito cuenta como ausente', () => {
    expect(validateCreateInvitation({ ...BASE, level: null, gym_equipment: null })).toMatchObject({
      level: null,
      gym_equipment: null,
    });
  });

  it('rechaza level fuera del enum', () => invalid({ level: 'pro' }));
  it('rechaza gym_equipment que no es lista', () => invalid({ gym_equipment: 'barbell' }));
  it('rechaza injuries de más de 1000 caracteres', () => invalid({ injuries: 'x'.repeat(1001) }));
});

describe('invitations.validation — plantilla inicial (opcional)', () => {
  const TPL = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';
  const fields = (body) => {
    try {
      validateCreateInvitation({ ...BASE, ...body });
    } catch (err) {
      return err.details.map((d) => d.field);
    }
    return [];
  };

  it('sin plantilla, template_id y routine_days quedan en null', () => {
    expect(validateCreateInvitation(BASE)).toMatchObject({ template_id: null, routine_days: null });
    expect(validateCreateInvitation({ ...BASE, template_id: null, routine_days: null })).toMatchObject({
      template_id: null,
      routine_days: null,
    });
  });

  it('con plantilla y días los devuelve; sin días, routine_days null', () => {
    const days = ['monday', 'friday'];
    expect(validateCreateInvitation({ ...BASE, template_id: TPL, routine_days: days })).toMatchObject({
      template_id: TPL,
      routine_days: days,
    });
    expect(validateCreateInvitation({ ...BASE, template_id: TPL }).routine_days).toBeNull();
  });

  it('template_id con formato inválido es 400 en template_id', () => {
    expect(fields({ template_id: 'no-uuid' })).toEqual(['template_id']);
  });

  it('días sin plantilla son 400 en routine_days', () => {
    expect(fields({ routine_days: ['monday'] })).toEqual(['routine_days']);
  });

  it('días vacíos, repetidos o inválidos son 400 en routine_days', () => {
    for (const routine_days of [[], ['monday', 'monday'], ['lunes'], 'monday']) {
      expect(fields({ template_id: TPL, routine_days })).toEqual(['routine_days']);
    }
  });
});
