import { describe, it, expect, beforeEach } from '@jest/globals';
import { createGenerationLimiter } from '../../../../src/services/trainer-ai/generation-limiter.js';

const T1 = 'trainer-1';
const T2 = 'trainer-2';
const NOW = new Date('2026-11-06T12:00:00Z');
const at = (iso) => new Date(iso);
const minutesBefore = (min) => new Date(NOW.getTime() - min * 60 * 1000);

describe('trainer-ai · generation-limiter', () => {
  let limiter;
  beforeEach(() => {
    limiter = createGenerationLimiter();
  });

  describe('una generación en curso por trainer', () => {
    it('la segunda concurrente es 429 "Ya hay una propuesta en curso" con Retry-After', () => {
      limiter.start(T1, NOW);
      let error;
      try {
        limiter.start(T1, NOW);
      } catch (err) {
        error = err;
      }
      expect(error).toMatchObject({ statusCode: 429, code: 'RATE_LIMIT_EXCEEDED', headers: { 'Retry-After': '38' } });
      expect(error.message).toMatch('Ya hay una propuesta en curso');
    });

    it('Retry-After es lo que le falta a la generación en curso (redondeado hacia arriba, mínimo 1)', () => {
      limiter.start(T1, NOW);
      const later = (ms) => new Date(NOW.getTime() + ms);
      const retryAt = (ms) => {
        try {
          limiter.start(T1, later(ms));
        } catch (err) {
          return err.headers['Retry-After'];
        }
        return undefined;
      };
      expect(retryAt(12_300)).toBe('26');
      expect(retryAt(37_999)).toBe('1');
      expect(retryAt(45_000)).toBe('1');
    });

    it('otro trainer no se bloquea y al terminar se libera', () => {
      limiter.start(T1);
      expect(() => limiter.start(T2)).not.toThrow();
      limiter.finish(T1);
      expect(() => limiter.start(T1)).not.toThrow();
    });
  });

  describe('límite: max(guardadas en la base, intentos en la última hora) ≥ 20', () => {
    it('con 19 intentos y 19 guardadas todavía pasa', () => {
      for (let i = 0; i < 19; i += 1) limiter.recordAttempt(T1, minutesBefore(30));
      const saved = Array(19).fill(minutesBefore(30).toISOString());
      expect(() => limiter.assertUnderLimit(T1, saved, NOW)).not.toThrow();
    });

    it('20 intentos (aunque fallaran y no estén en la base) → 429 hasta que el más viejo salga de la hora', () => {
      limiter.recordAttempt(T1, minutesBefore(50));
      for (let i = 0; i < 19; i += 1) limiter.recordAttempt(T1, minutesBefore(5));
      expect(() => limiter.assertUnderLimit(T1, [], NOW)).toThrow(
        expect.objectContaining({ statusCode: 429, code: 'RATE_LIMIT_EXCEEDED', headers: { 'Retry-After': '600' } })
      );
      expect(() => limiter.assertUnderLimit(T2, [], NOW)).not.toThrow();
    });

    it('los intentos de hace más de una hora salen de la ventana', () => {
      for (let i = 0; i < 20; i += 1) limiter.recordAttempt(T1, at('2026-11-06T10:59:00Z'));
      expect(() => limiter.assertUnderLimit(T1, [], NOW)).not.toThrow();
    });

    it('20 guardadas en la base → 429 aunque no haya intentos en memoria (reinicio)', () => {
      const saved = ['2026-11-06T11:10:00Z', ...Array(19).fill('2026-11-06T11:50:00Z')];
      expect(() => limiter.assertUnderLimit(T1, saved, NOW)).toThrow(
        expect.objectContaining({ statusCode: 429, headers: { 'Retry-After': '600' } })
      );
    });

    it('una exitosa está en la base y en memoria: no se cuenta dos veces', () => {
      for (let i = 0; i < 10; i += 1) limiter.recordAttempt(T1, minutesBefore(5));
      const saved = Array(10).fill(minutesBefore(5).toISOString());
      expect(() => limiter.assertUnderLimit(T1, saved, NOW)).not.toThrow();
    });
  });
});
