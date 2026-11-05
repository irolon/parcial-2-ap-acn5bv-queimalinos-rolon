import * as availabilityRepo from '../../repositories/agenda/availability.repository.js';
import * as appointmentsRepo from '../../repositories/agenda/appointments.repository.js';
import * as studentsRepo from '../../repositories/students/students.repository.js';
import { Errors } from '../../shared/utils/errors.js';
import { freeSlots } from '../../models/agenda/availability.model.js';
import { studentHorizonMs } from '../../models/agenda/appointment.model.js';
import { argDayRange } from '../../shared/utils/dates/ranges.js';

/** Entrenador cuya agenda ve el usuario: la propia, o la de su PT si es alumno (null si no tiene). */
async function trainerIdOf(user) {
  if (user.role === 'trainer') return user.id;
  const student = await studentsRepo.findStudentById(user.id);
  if (student && !student.active) throw Errors.forbidden();
  return student?.trainer_id ?? null;
}

/**
 * Horarios libres de 60 min entre `from` y `to` (fechas de Argentina): dentro de la disponibilidad,
 * sin turno pending/confirmed y posteriores a ahora. El alumno, además, hasta hoy + 28 días.
 */
export async function listFree(user, { from, to }) {
  const trainerId = await trainerIdOf(user);
  if (!trainerId) return [];
  const now = new Date();
  const { fromUtc, toUtc } = argDayRange(from, to);
  const [availability, taken] = await Promise.all([
    availabilityRepo.findAvailability(trainerId),
    appointmentsRepo.findTakenInRange(trainerId, fromUtc, toUtc),
  ]);
  const slots = freeSlots({ availability, taken, from, to, now });
  if (user.role !== 'student') return slots;
  const limit = studentHorizonMs(now);
  return slots.filter((iso) => new Date(iso).getTime() <= limit);
}
