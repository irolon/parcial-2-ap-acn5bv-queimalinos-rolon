import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/shared/client';
import {
  buildInvitationBody,
  toInvitationErrors,
  validateInvitationBody,
} from '@/pages/invitations/invitationForm';

const formData = (values) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

const BASE = {
  student_name: ' Ana Gómez ',
  student_email: ' ana@fit.com ',
  student_phone: ' +54 9 11 1234 5678 ',
  goal: '',
  level: '',
};

describe('invitationForm', () => {
  it('buildInvitationBody recorta, usa both y saca los opcionales vacíos', () => {
    expect(buildInvitationBody(formData(BASE))).toEqual({
      student_name: 'Ana Gómez',
      student_email: 'ana@fit.com',
      student_phone: '+54 9 11 1234 5678',
      delivery_channel: 'both',
    });
    expect(buildInvitationBody(formData({ ...BASE, goal: 'strength', level: 'advanced' }))).toMatchObject(
      { goal: 'strength', level: 'advanced' },
    );
  });

  it('validateInvitationBody pide al menos 8 dígitos de teléfono', () => {
    expect(validateInvitationBody({ student_phone: '+54 ' })).toHaveProperty('student_phone');
    expect(validateInvitationBody({ student_phone: '+54 1234 56' })).toEqual({});
  });

  it('toInvitationErrors mapea email duplicado, validación y el resto', () => {
    const err = (code, details) => new ApiError({ status: 400, code, message: 'Backend', details });
    expect(toInvitationErrors(err('STUDENT_EMAIL_EXISTS')).fields).toEqual({
      student_email: 'Ya existe un alumno con ese email',
    });
    expect(
      toInvitationErrors(err('VALIDATION_ERROR', [{ field: 'level', message: 'Nivel inválido' }])),
    ).toEqual({ form: null, fields: { level: 'Nivel inválido' } });
    expect(toInvitationErrors(err('NETWORK_ERROR')).form).toBe('No hay conexión con el servidor');
    expect(toInvitationErrors(err('FORBIDDEN')).form).toBe('Backend');
  });
});
