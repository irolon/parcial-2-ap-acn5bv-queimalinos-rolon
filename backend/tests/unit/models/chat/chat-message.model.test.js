import { describe, it, expect } from '@jest/globals';
import {
  CHAT_DAILY_LIMIT,
  HISTORY_SIZE,
  ALTERNATIVES_LIMIT,
  MAX_SUGGESTIONS,
  CHAT_WEBHOOK_TIMEOUT_MS,
  chatDayBounds,
  remainingToday,
} from '../../../../src/models/chat/chat-message.model.js';

describe('chat-message.model', () => {
  it('límites del spec: 20 por día, historial de 6, 30 alternativas, 3 sugerencias, 9 s', () => {
    expect([CHAT_DAILY_LIMIT, HISTORY_SIZE, ALTERNATIVES_LIMIT, MAX_SUGGESTIONS]).toEqual([20, 6, 30, 3]);
    expect(CHAT_WEBHOOK_TIMEOUT_MS).toBe(9000);
  });

  describe('chatDayBounds: el día de Argentina (UTC-3) en UTC, fin exclusivo', () => {
    it('al mediodía', () => {
      expect(chatDayBounds(new Date('2026-11-07T15:00:00Z'))).toEqual({
        fromIso: '2026-11-07T03:00:00.000Z',
        toIso: '2026-11-08T03:00:00.000Z',
      });
    });

    it('a las 23:59 AR (02:59 UTC del día siguiente) sigue siendo el mismo día', () => {
      expect(chatDayBounds(new Date('2026-11-08T02:59:59Z')).fromIso).toBe('2026-11-07T03:00:00.000Z');
    });

    it('a las 00:00 AR (03:00 UTC) arranca el día nuevo', () => {
      expect(chatDayBounds(new Date('2026-11-08T03:00:00Z'))).toEqual({
        fromIso: '2026-11-08T03:00:00.000Z',
        toIso: '2026-11-09T03:00:00.000Z',
      });
    });
  });

  it('remainingToday: lo que queda de 20, nunca negativo', () => {
    expect(remainingToday(0)).toBe(20);
    expect(remainingToday(3)).toBe(17);
    expect(remainingToday(20)).toBe(0);
    expect(remainingToday(25)).toBe(0);
  });
});
