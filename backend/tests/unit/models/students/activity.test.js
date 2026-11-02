import { activityStatus, daysWithoutTraining } from '../../../../src/models/students/activity.js';

const TODAY = '2026-11-10';

describe('models/students/activity (las reglas de la web y del celular)', () => {
  it('6 días sin entrenar está al día y 7 está en riesgo', () => {
    expect(activityStatus({ active: true, last_session_at: '2026-11-04T15:00:00Z' }, TODAY)).toBe('active');
    expect(activityStatus({ active: true, last_session_at: '2026-11-03T15:00:00Z' }, TODAY)).toBe('inactive');
  });

  it('nunca entrenó: nuevo con 6 días de alta, en riesgo con 7', () => {
    expect(activityStatus({ active: true, last_session_at: null, created_at: '2026-11-04T15:00:00Z' }, TODAY)).toBe('new');
    expect(activityStatus({ active: true, last_session_at: null, created_at: '2026-11-03T15:00:00Z' }, TODAY)).toBe('inactive');
  });

  it('dado de baja gana sobre todo', () => {
    expect(activityStatus({ active: false, last_session_at: '2026-11-09T15:00:00Z' }, TODAY)).toBe('disabled');
  });

  it('las 23:30 argentinas cuentan para ese día', () => {
    // 04/11 23:30 en Argentina = 05/11 02:30Z → 6 días al 10/11.
    expect(daysWithoutTraining({ last_session_at: '2026-11-05T02:30:00Z' }, TODAY)).toBe(6);
  });
});
