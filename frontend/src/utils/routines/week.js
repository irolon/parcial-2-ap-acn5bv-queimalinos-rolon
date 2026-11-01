import { argentinaDate } from '@/utils/dates';
import { plural } from '@/utils/shared/plural';
import { DAY_OPTIONS } from '@/utils/students/routineDays';

// 'monday' → 1 … 'sunday' → 7 (los días de una rutina vienen en inglés).
const WEEKDAY_OF = Object.fromEntries(DAY_OPTIONS.map((day, index) => [day.value, index + 1]));

/**
 * "Esta semana" de lunes a domingo en Argentina: `[{ weekday 1-7, label 'L', planned, trained, isToday }]`.
 * - `routineDays`: días de las rutinas activas, en inglés (`planned`).
 * - `sessions`: las del historial; entrena un día la sesión terminada que empezó ese día (`trained`), igual que la racha.
 */
export function weekStrip({ routineDays = [], sessions = [], now = new Date() } = {}) {
  const today = argentinaDate(now);
  const monday = today.dayNumber - (today.weekday - 1);
  const planned = new Set(routineDays.map((day) => WEEKDAY_OF[day]));
  const trained = new Set();
  for (const session of sessions) {
    if (!session.finished_at || !session.started_at) continue;
    const day = argentinaDate(session.started_at);
    if (day.dayNumber >= monday && day.dayNumber < monday + 7) trained.add(day.weekday);
  }
  return DAY_OPTIONS.map((day, index) => ({
    weekday: index + 1,
    label: day.short,
    planned: planned.has(index + 1),
    trained: trained.has(index + 1),
    isToday: today.weekday === index + 1,
  }));
}

const workouts = (n) => plural(n, 'entrenamiento', 'entrenamientos');

/**
 * Lo que dice "Esta semana" debajo de los días: "2 de 3 entrenamientos" (los días de la rutina entrenados contra los
 * que tocan). Entrenar un día que no es de la rutina no cuenta en el "N de M": va aparte ("2 de 3 entrenamientos · +1
 * extra"). Sin días planificados no hay "de M": "1 entrenamiento".
 */
export function weekSummary(strip = []) {
  const trained = strip.filter((day) => day.trained);
  const planned = strip.filter((day) => day.planned).length;
  if (planned > 0) {
    const done = trained.filter((day) => day.planned).length;
    const extra = trained.length - done;
    return `${done} de ${workouts(planned)}${extra ? ` · +${extra} extra` : ''}`;
  }
  return trained.length > 0 ? workouts(trained.length) : 'Sin entrenamientos planificados';
}

/**
 * Próximo día de entrenamiento después de hoy ('jueves'), con los días de todas las rutinas;
 * `null` si el alumno no tiene rutinas con días. Si el único día es hoy, es el de la semana que viene.
 */
export function nextTrainingDay(routines = [], now = new Date()) {
  const trainingDays = new Set(routines.flatMap((routine) => routine.days ?? []).map((day) => WEEKDAY_OF[day]));
  const { weekday } = argentinaDate(now);
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const candidate = ((weekday - 1 + ahead) % 7) + 1;
    if (trainingDays.has(candidate)) return DAY_OPTIONS[candidate - 1].label.toLowerCase();
  }
  return null;
}
