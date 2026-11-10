import { exerciseSets } from '@/utils/workout/workoutState/workoutState';
import { chatDayOf } from './chatDay';

// Lecturas de la conversación con el asistente para la página Asistente IA (GX5) y para "Aplicar".

const DAY_MS = 86_400_000;

/** El ejercicio sobre el que se preguntó: `exercise_id` (los que se suman en esta pestaña) o el del servidor. */
export const askedAbout = (message) => message?.exercise_id ?? message?.exercise?.id ?? null;

/** "HOY", "AYER" o "05/11" para el día `date` (aaaa-mm-dd), visto desde `today` (aaaa-mm-dd). */
export function dayLabel(date, today) {
  if (date === today) return 'HOY';
  if (Date.parse(today) - Date.parse(date) === DAY_MS) return 'AYER';
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

/** El título de un día en la lista: la primera consulta del alumno, o null. */
export const dayTitle = (messages) => messages.find((m) => m.role === 'user')?.content ?? null;

/** "CONTEXTO · PUSH · PRESS BANCA" con lo que haya (rutina y ejercicio), o null si no hay nada. */
export function contextLabel(message) {
  const parts = [message?.routine_name, message?.exercise?.name].filter(Boolean);
  return parts.length > 0 ? ['CONTEXTO', ...parts].join(' · ').toUpperCase() : null;
}

/**
 * Si la sugerencia `suggestion` de la respuesta `message` se puede aplicar a la sesión en curso `workout` (decisión
 * 7b): el mensaje es de hoy (`today`, aaaa-mm-dd de Argentina), la sesión no terminó y se preguntó sobre el ejercicio
 * a la vista (el actual o el planificado, si ya se reemplazó). Las de otro ejercicio, otra sesión o días pasados son
 * solo texto. Devuelve `{ status, index, planned, current }` (`current`: el nombre del ejercicio a la vista):
 * - `none`: no se aplica (o la sugerencia es ese mismo ejercicio);
 * - `can`: se puede (el ejercicio no tiene series);
 * - `locked`: ya tiene series registradas;
 * - `applied`: la sesión ya hace esa sugerencia en lugar del planificado.
 */
export function canApply({ message, suggestion, workout, today }) {
  const none = { status: 'none' };
  const current = workout && !workout.finishedAt ? workout.exercises[workout.cursor] : null;
  const asked = askedAbout(message);
  if (!current || !asked || chatDayOf(new Date(message.created_at)) !== today) return none;
  const plannedId = current.originalExerciseId ?? current.exerciseId;
  if (asked !== current.exerciseId && asked !== plannedId) return none;
  const planned = current.originalName ?? current.name;
  const result = (status) => ({ status, index: workout.cursor, planned, current: current.name });
  if (suggestion.exercise_id === current.exerciseId) return current.originalExerciseId ? result('applied') : none;
  return result(exerciseSets(workout).length > 0 ? 'locked' : 'can');
}
