import { describe, it, expect, beforeEach } from '@jest/globals';
import { createChatAttempts } from '../../../../src/services/chat/chat-attempts.js';
import { CHAT_ATTEMPT_LIMIT } from '../../../../src/models/chat/chat-message.model.js';

const STUDENT = 's-1';
const T0 = new Date('2026-11-07T15:00:00Z');
const at = (ms) => new Date(T0.getTime() + ms);
const MINUTE = 60_000;

describe('chat · chat-attempts · tope de intentos por hora', () => {
  let attempts;
  beforeEach(() => { attempts = createChatAttempts(); });

  const fill = (count, step = 0) => {
    for (let i = 0; i < count; i += 1) attempts.record(STUDENT, at(i * step));
  };

  it('con uno menos que el tope pasa', () => {
    fill(CHAT_ATTEMPT_LIMIT - 1);
    expect(() => attempts.assertUnderLimit(STUDENT, T0)).not.toThrow();
  });

  it('en el tope → 429 RATE_LIMIT_EXCEEDED con su texto y Retry-After hasta que salga el más viejo', () => {
    fill(CHAT_ATTEMPT_LIMIT, MINUTE / 60); // uno por segundo
    let error;
    try { attempts.assertUnderLimit(STUDENT, at(10 * MINUTE)); } catch (e) { error = e; }
    expect(error).toMatchObject({
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Hiciste muchas consultas seguidas. Probá de nuevo más tarde.',
    });
    expect(error.headers).toEqual({ 'Retry-After': String(50 * 60) });
  });

  it('pasada la hora del más viejo vuelve a pasar', () => {
    fill(CHAT_ATTEMPT_LIMIT);
    expect(() => attempts.assertUnderLimit(STUDENT, at(60 * MINUTE + 1))).not.toThrow();
  });

  it('es por alumno', () => {
    fill(CHAT_ATTEMPT_LIMIT);
    expect(() => attempts.assertUnderLimit('s-2', T0)).not.toThrow();
  });
});
