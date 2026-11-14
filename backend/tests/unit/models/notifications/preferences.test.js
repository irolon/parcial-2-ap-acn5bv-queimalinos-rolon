import {
  PREFERENCE_TYPES,
  PREFERENCES_TABLE,
  allowsPush,
  toPreferences,
} from '../../../../src/models/notifications/preferences.js';

const ALL_ON = { message: true, comment: true, appointment: true, pr: true, achievement: true };

describe('preferencias de notificación', () => {
  it('tabla y tipos en el orden de la pantalla', () => {
    expect(PREFERENCES_TABLE).toBe('notification_preferences');
    expect(PREFERENCE_TYPES).toEqual(['message', 'comment', 'appointment', 'pr', 'achievement']);
  });

  it.each([null, undefined])('toPreferences(%s): sin fila, todo prendido y updated_at null', (row) => {
    expect(toPreferences(row)).toEqual({ ...ALL_ON, updated_at: null });
  });

  it('toPreferences con fila: solo los cinco tipos y updated_at', () => {
    const row = { student_id: 's-1', ...ALL_ON, message: false, updated_at: '2026-11-09T10:00:00Z' };
    expect(toPreferences(row)).toEqual({ ...ALL_ON, message: false, updated_at: '2026-11-09T10:00:00Z' });
  });

  it('allowsPush: apagado no, prendido sí', () => {
    const prefs = { ...ALL_ON, comment: false };
    expect(allowsPush(prefs, 'comment')).toBe(false);
    expect(allowsPush(prefs, 'pr')).toBe(true);
  });

  it.each(['inactivity', 'routine_modified', undefined])('allowsPush con tipo fuera de la lista (%s) → true', (type) => {
    expect(allowsPush({ ...ALL_ON, comment: false }, type)).toBe(true);
  });
});
