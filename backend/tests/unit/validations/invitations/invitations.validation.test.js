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
