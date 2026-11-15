import { toPublicInvitation } from '../../../../src/models/invitations/invitation.model.js';

// GET /invitations/:token es público: solo puede mostrar lo que el alumno ve antes de aceptar.
const ROW = {
  id: 'inv-1',
  token: 'tok',
  student_name: 'Pedro Gómez',
  student_email: 'pedro@mail.com',
  student_phone: '5491133334444',
  student_goal: 'hypertrophy',
  expires_at: '2026-11-16T10:00:00Z',
  used_at: null,
  student_gym_equipment: ['barbell'],
  student_injuries: 'rodilla derecha',
  student_level: 'intermediate',
  student_weekly_frequency: 4,
  student_height_cm: 178,
  student_weight_kg: 74.5,
  student_birth_date: '2002-03-15',
  template_id: 'tp-1',
  routine_days: ['monday'],
  trainer: { id: 'trainer-1', name: 'Ignacio', specialty: null, avatar_url: null },
};

describe('invitation.model — toPublicInvitation', () => {
  it('devuelve solo PT, nombre, email, objetivo y vencimiento', () => {
    expect(toPublicInvitation(ROW)).toEqual({
      trainer: ROW.trainer,
      student_name: 'Pedro Gómez',
      student_email: 'pedro@mail.com',
      goal: 'hypertrophy',
      expires_at: '2026-11-16T10:00:00Z',
    });
  });

  it('no expone datos personales ni de salud (peso, altura, nacimiento, frecuencia, lesiones)', () => {
    const json = JSON.stringify(toPublicInvitation(ROW));
    for (const leak of ['74.5', '178', '2002-03-15', 'rodilla', 'weekly', 'height', 'weight', 'birth', 'injur', '5491133334444']) {
      expect(json).not.toContain(leak);
    }
  });

  it('null → null', () => {
    expect(toPublicInvitation(null)).toBeNull();
  });
});
