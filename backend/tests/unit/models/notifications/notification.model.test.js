import {
  NOTIFICATION_TYPES,
  INACTIVITY_MISSED_DAYS,
  INACTIVITY_COOLDOWN_DAYS,
  PUSH_PLATFORMS,
  NOTIFICATION_COLUMNS,
  PUSH_TOKEN_COLUMNS,
} from '../../../../src/models/notifications/notification.model.js';

describe('notification.model', () => {
  it('tipos iguales al check del schema', () => {
    expect(NOTIFICATION_TYPES).toEqual([
      'inactivity', 'appointment', 'comment', 'pr', 'achievement', 'routine_modified',
    ]);
  });

  it('constantes de inactividad y plataformas', () => {
    expect(INACTIVITY_MISSED_DAYS).toBe(3);
    expect(INACTIVITY_COOLDOWN_DAYS).toBe(7);
    expect(PUSH_PLATFORMS).toEqual(['android', 'web']);
  });

  it('columnas incluyen data y push_sent_at', () => {
    expect(NOTIFICATION_COLUMNS).toContain('data');
    expect(NOTIFICATION_COLUMNS).toContain('push_sent_at');
    expect(PUSH_TOKEN_COLUMNS).toContain('last_seen_at');
  });
});
