import { supabase } from '../../src/config/supabase.js';
import { api } from '../helpers/integration/api.js';
import { createTrainer } from '../helpers/integration/actors.js';
import { QA_PASSWORD, qaEmail, qaName } from '../helpers/integration/run-id.js';

// Rechazos de alta contra la base real: email duplicado (IT-02) y WhatsApp sin teléfono (IT-07).
describe('integración — rechazos de alta', () => {
  let trainer;

  beforeAll(async () => {
    trainer = await createTrainer('rechazos');
  });

  it('registrarse con un email ya usado → 409 EMAIL_ALREADY_EXISTS (también en mayúsculas)', async () => {
    for (const email of [trainer.email, trainer.email.toUpperCase()]) {
      const res = await api()
        .post('/auth/register')
        .send({ name: qaName('PT duplicado'), email, password: QA_PASSWORD });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    }

    const { data } = await supabase.from('trainers').select('id').eq('email', trainer.email);
    expect(data).toEqual([{ id: trainer.id }]);
  });

  it.each([
    ['sin teléfono', {}],
    ['con teléfono vacío', { student_phone: '' }],
    ['con un teléfono de menos de 8 dígitos', { student_phone: '11-22' }],
  ])('invitar por canal both %s → 400 VALIDATION_ERROR en student_phone', async (_l, extra) => {
    const email = qaEmail('st-both');
    const res = await api(trainer.token)
      .post('/invitations')
      .send({
        student_name: qaName('Alumno both'),
        student_email: email,
        delivery_channel: 'both',
        ...extra,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'student_phone' })]);

    const { data } = await supabase.from('invitations').select('id').eq('student_email', email);
    expect(data).toEqual([]);
  });
});
