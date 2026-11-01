import { DAY_MS } from './dates/dates.js';
import { AR_UTC_OFFSET_H } from './dates/argentina.js';

/** Milisegundos hasta la próxima `hour`:00 hora de Buenos Aires (por defecto 03:00). */
export function msUntilNextRun(now = new Date(), hour = 3) {
  const utcHour = hour + AR_UTC_OFFSET_H;
  let next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour);
  if (next <= now.getTime()) next += DAY_MS;
  return next - now.getTime();
}

/** Corre los jobs en orden; cada uno con su try/catch, así que uno que falla no corta a los demás. */
async function runJobs(jobs) {
  for (const { name, run } of jobs) {
    console.log(`[jobs] ${name}: inicio`);
    try {
      const result = await run();
      console.log(`[jobs] ${name}: fin`, result);
    } catch (err) {
      console.error(`[jobs] ${name}: falló`, err);
    }
  }
}

/**
 * Agenda los jobs nocturnos (setTimeout → correr en secuencia → reagendar).
 * Devuelve `stop()`. Nunca deja escapar un error del timer.
 * @param {{ jobs: Array<{ name: string, run: () => Promise<unknown> }>, hour?: number }} opts
 */
export function startScheduler({ jobs, hour = 3 }) {
  let timer = null;
  let stopped = false;

  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(async () => {
      await runJobs(jobs);
      schedule();
    }, msUntilNextRun(new Date(), hour));
  };

  schedule();
  const names = jobs.map((j) => j.name).join(', ');
  console.log(`[jobs] agendados (${names}) a las ${String(hour).padStart(2, '0')}:00 (Buenos Aires)`);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
