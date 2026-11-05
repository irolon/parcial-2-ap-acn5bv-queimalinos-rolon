import { appointmentLabel } from '../../../../../src/shared/utils/dates/labels.js';

describe('appointmentLabel', () => {
  it('formatea día, fecha y hora de Argentina', () => {
    expect(appointmentLabel('2026-11-05T21:00:00Z')).toBe('jue 05/11 a las 18:00');
    expect(appointmentLabel('2026-11-06T21:00:00Z')).toBe('vie 06/11 a las 18:00');
  });

  it('usa el día de Argentina aunque en UTC ya sea el siguiente', () => {
    expect(appointmentLabel('2026-11-07T01:00:00Z')).toBe('vie 06/11 a las 22:00');
  });

  it('abrevia miércoles con tilde y rellena la hora', () => {
    expect(appointmentLabel('2026-11-04T11:00:00Z')).toBe('mié 04/11 a las 08:00');
  });
});
