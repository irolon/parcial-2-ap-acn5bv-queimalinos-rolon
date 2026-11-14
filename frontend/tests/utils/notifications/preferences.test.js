import { describe, expect, it } from 'vitest';
import { PREFERENCE_ITEMS, pickPreferences, summary } from '@/utils/notifications/preferences';

const ALL_ON = { message: true, comment: true, appointment: true, pr: true, achievement: true };

describe('utils/notifications/preferences', () => {
  it('PREFERENCE_ITEMS tiene los cinco tipos en el orden de la pantalla, con título y detalle', () => {
    expect(PREFERENCE_ITEMS.map((item) => item.type)).toEqual(['message', 'comment', 'appointment', 'pr', 'achievement']);
    expect(PREFERENCE_ITEMS).toEqual([
      { type: 'message', title: 'Mensajes', detail: 'Cuando tu entrenador/a te escribe' },
      { type: 'comment', title: 'Comentarios', detail: 'Cuando comenta una de tus sesiones' },
      { type: 'appointment', title: 'Turnos', detail: 'Cuando confirma, cancela o te agenda un turno' },
      { type: 'pr', title: 'Récords', detail: 'Cuando superás una marca personal' },
      { type: 'achievement', title: 'Logros', detail: 'Cuando desbloqueás un logro' },
    ]);
  });

  it.each([
    [ALL_ON, 'Todas activadas'],
    [{ ...ALL_ON, comment: false, pr: false }, '3 de 5 activadas'],
    [{ message: true, comment: false, appointment: false, pr: false, achievement: false }, '1 de 5 activadas'],
    [{ message: false, comment: false, appointment: false, pr: false, achievement: false }, 'Todas apagadas'],
  ])('summary(%o) → %s', (prefs, expected) => {
    expect(summary(prefs)).toBe(expected);
  });

  it('pickPreferences deja solo los cinco tipos', () => {
    expect(pickPreferences({ ...ALL_ON, comment: false, updated_at: 'X', student_id: 's-1' })).toEqual({
      ...ALL_ON,
      comment: false,
    });
  });
});
