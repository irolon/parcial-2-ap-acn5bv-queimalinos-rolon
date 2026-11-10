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

  it('buildInvitationBody manda la plantilla inicial con sus días (vacíos también); sin plantilla, nada', () => {
    const data = formData({ ...BASE, template_id: 't-1' });
    data.append('routine_days', 'monday');
    data.append('routine_days', 'friday');
    expect(buildInvitationBody(data)).toMatchObject({ template_id: 't-1', routine_days: ['monday', 'friday'] });
    expect(buildInvitationBody(formData({ ...BASE, template_id: 't-1' }))).toMatchObject({ routine_days: [] });
    const without = buildInvitationBody(formData(BASE));
    expect(without).not.toHaveProperty('template_id');
    expect(without).not.toHaveProperty('routine_days');
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
    const days = [{ field: 'routine_days', message: 'Días inválidos' }, { field: 'template_id', message: 'No existe' }];
    expect(toInvitationErrors(err('VALIDATION_ERROR', days)).fields).toEqual({
      routine_days: 'Días inválidos',
      template_id: 'No existe',
    });
    expect(toInvitationErrors(err('NETWORK_ERROR')).form).toBe('No hay conexión con el servidor');
    expect(toInvitationErrors(err('FORBIDDEN')).form).toBe('Backend');
  });
});
