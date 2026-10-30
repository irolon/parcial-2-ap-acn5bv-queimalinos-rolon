import { runDailyGamification } from './daily-job.service.js';
import { DAY_MS } from '../../shared/utils/dates.js';

// Buenos Aires es UTC-3 todo el año (sin horario de verano).
const AR_UTC_OFFSET_HOURS = 3;

/** Milisegundos hasta la próxima `hour`:00 hora de Buenos Aires (por defecto 03:00). */
export function msUntilNextRun(now = new Date(), hour = 3) {
  const utcHour = hour + AR_UTC_OFFSET_HOURS;
  let next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour);
  if (next <= now.getTime()) next += DAY_MS;
  return next - now.getTime();
}

/**
 * Agenda el job diario (setTimeout → correr → reagendar). Devuelve `stop()`.
 * Nunca deja escapar un error del timer: lo loguea y sigue con la próxima corrida.
 */
export function startScheduler({ run = runDailyGamification, hour = 3 } = {}) {
  let timer = null;
  let stopped = false;

  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(async () => {
      console.log('[gamification] job diario: inicio');
      try {
        const result = await run();
        console.log('[gamification] job diario: fin', result);
      } catch (err) {
        console.error('[gamification] job diario: falló', err);
      }
      schedule();
    }, msUntilNextRun(new Date(), hour));
  };

  schedule();
  console.log(`[gamification] job diario agendado a las ${String(hour).padStart(2, '0')}:00 (Buenos Aires)`);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
