import { Errors } from '../../shared/utils/errors.js';
import {
  GENERATION_LIMIT,
  GENERATION_WINDOW_MS,
  IN_PROGRESS_RETRY_SECONDS,
  retryAfterSeconds,
} from '../../models/trainer-ai/ai-generation.model.js';

/** Segundos hasta que `times` (más viejos primero) quede por debajo del límite, o null si ya está. */
function waitFor(times, now) {
  if (times.length < GENERATION_LIMIT) return null;
  return retryAfterSeconds(times[times.length - GENERATION_LIMIT], now);
}

/**
 * Límite en memoria (por proceso) de las generaciones de la IA:
 * - una sola generación en curso por trainer (la segunda concurrente es 429);
 * - todos los intentos que llegan a n8n, exitosos o fallidos, en una ventana deslizante
 *   de 1 h. Se combina con las guardadas en la base (que sobreviven a un reinicio): el
 *   límite aplica a max(guardadas, intentos) ≥ GENERATION_LIMIT.
 * El reloj se inyecta (`now`) para poder probarlo.
 */
export function createGenerationLimiter() {
  const inFlight = new Set();
  const attempts = new Map();

  /** Intentos del trainer dentro de la ventana (descarta los viejos). */
  function recentAttempts(trainerId, now) {
    const since = now.getTime() - GENERATION_WINDOW_MS;
    const recent = (attempts.get(trainerId) ?? []).filter((t) => t > since);
    if (recent.length > 0) attempts.set(trainerId, recent);
    else attempts.delete(trainerId);
    return recent;
  }

  return {
    /** Toma el lugar del trainer; 429 si ya tiene una generación en curso. Sincrónico: sin carreras. */
    start(trainerId) {
      if (inFlight.has(trainerId)) {
        throw Errors.rateLimitExceeded(
          IN_PROGRESS_RETRY_SECONDS,
          'Ya hay una propuesta en curso. Esperá a que termine antes de pedir otra.'
        );
      }
      inFlight.add(trainerId);
    },

    finish(trainerId) {
      inFlight.delete(trainerId);
    },

    /** 429 con Retry-After si las guardadas (`savedTimes`, más viejas primero) o los intentos llegan al límite. */
    assertUnderLimit(trainerId, savedTimes, now) {
      const waits = [waitFor(savedTimes, now), waitFor(recentAttempts(trainerId, now), now)];
      const blocked = waits.filter((w) => w !== null);
      if (blocked.length > 0) throw Errors.rateLimitExceeded(Math.max(...blocked));
    },

    /** Anota un intento (se llama justo antes de pedirle la propuesta a n8n). */
    recordAttempt(trainerId, now) {
      attempts.set(trainerId, [...recentAttempts(trainerId, now), now.getTime()]);
    },

    /** Vacía todo (tests). */
    clear() {
      inFlight.clear();
      attempts.clear();
    },
  };
}

/** El límite del proceso, compartido por todas las requests. */
export const generationLimiter = createGenerationLimiter();
