import { describe, expect, it } from 'vitest';
import { firstName, hoursLeft, qrFileName } from '@/components/invitations/shareFormat';

const NOW = Date.parse('2026-10-18T12:00:00Z');
const at = (hours) => new Date(NOW + hours * 3600_000).toISOString();

describe('shareFormat', () => {
  it('hoursLeft redondea hacia abajo con mínimo 1', () => {
    expect(hoursLeft(at(48), NOW)).toBe(48);
    expect(hoursLeft(at(47.9), NOW)).toBe(47);
    expect(hoursLeft(at(0.2), NOW)).toBe(1);
    expect(hoursLeft(at(-3), NOW)).toBe(1);
    expect(hoursLeft('no es fecha', NOW)).toBeNull();
  });

  it('firstName se queda con el primer nombre', () => {
    expect(firstName('  Tomás   Rivera ')).toBe('Tomás');
    expect(firstName()).toBe('');
  });

  it('qrFileName arma un nombre de archivo sin tildes ni espacios', () => {
    expect(qrFileName('Tomás Rivera')).toBe('invitacion-tomas-rivera.png');
    expect(qrFileName('  Ñandú  O\'Brien ')).toBe('invitacion-nandu-o-brien.png');
    expect(qrFileName('')).toBe('invitacion-alumno.png');
  });
});
