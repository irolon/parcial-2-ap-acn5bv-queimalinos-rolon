import { describe, expect, it } from '@jest/globals';
import { texts } from '../../../../src/models/notifications/texts.js';

// Viernes 06/11 18:00 en Argentina = 21:00 UTC.
const scheduledAt = '2026-11-06T21:00:00.000Z';

describe('texts · turnos', () => {
  it('appointmentConfirmed', () => {
    expect(texts.appointmentConfirmed({ scheduledAt })).toEqual({
      title: 'Tu turno del vie 06/11 a las 18:00 quedó confirmado', body: null,
    });
  });

  it('appointmentCancelled', () => {
    expect(texts.appointmentCancelled({ scheduledAt }).title).toBe('Tu turno del vie 06/11 a las 18:00 fue cancelado');
  });

  it('appointmentCreatedByTrainer', () => {
    expect(texts.appointmentCreatedByTrainer({ scheduledAt }).title).toBe(
      'Tu entrenador te agendó un turno el vie 06/11 a las 18:00'
    );
  });

  it('appointmentRequested lleva el nombre del alumno', () => {
    expect(texts.appointmentRequested({ studentName: 'Lucía', scheduledAt })).toEqual({
      title: 'Lucía pidió un turno para el vie 06/11 a las 18:00', body: null,
    });
  });

  it('appointmentCancelledByStudent lleva el nombre del alumno', () => {
    expect(texts.appointmentCancelledByStudent({ studentName: 'Lucía', scheduledAt }).title).toBe(
      'Lucía canceló su turno del vie 06/11 a las 18:00'
    );
  });

  it('el día y la hora son de Argentina aunque en UTC sea el día siguiente (22:00 AR)', () => {
    expect(texts.appointmentConfirmed({ scheduledAt: '2026-11-07T01:00:00.000Z' }).title).toBe(
      'Tu turno del vie 06/11 a las 22:00 quedó confirmado'
    );
  });
});
