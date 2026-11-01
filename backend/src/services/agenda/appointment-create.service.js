import * as appointmentsRepo from '../../repositories/agenda/appointments.repository.js';
import * as availabilityRepo from '../../repositories/agenda/availability.repository.js';
import * as studentsRepo from '../../repositories/students/students.repository.js';
import { assertCanAccessStudent } from '../students/student-access.service.js';
import * as triggers from '../notifications/triggers.service.js';
import { Errors } from '../../shared/utils/errors.js';
import { isOnTheHour, nextHourUtc, utcToArgentina } from '../../shared/utils/dates/argentina.js';
import { DAY_MS } from '../../shared/utils/dates/dates.js';
import {
  APPOINTMENT_DURATION_MIN,
  STATUS,
  STUDENT_MAX_DAYS_AHEAD,
  toAppointment,
} from '../../models/agenda/appointment.model.js';

/** Hora en punto y posterior a ahora: vale para los dos roles. */
function assertOnTheHourAndFuture(scheduledAt, now) {
  if (!isOnTheHour(scheduledAt)) throw Errors.slotUnavailable('El turno tiene que empezar en una hora en punto');
  if (new Date(scheduledAt) < nextHourUtc(now)) throw Errors.slotUnavailable('El turno tiene que ser a futuro');
}

/** ¿El horario cae dentro de alguna franja semanal (en hora de Argentina)? */
function isWithinAvailability(scheduledAt, availability) {
  const { weekday, hour } = utcToArgentina(scheduledAt);
  return availability.some(
    (a) =>
      a.weekday === weekday && Number(a.start_time.slice(0, 2)) <= hour && hour < Number(a.end_time.slice(0, 2))
  );
}

const baseRow = (trainerId, studentId, { scheduled_at, notes }, status) => ({
  trainer_id: trainerId,
  student_id: studentId,
  scheduled_at,
  duration_min: APPOINTMENT_DURATION_MIN,
  status,
  notes,
});

/** El alumno pide un turno en una franja libre de su PT: queda `pending` y se avisa al PT (sin push). */
export async function createForStudent(user, input) {
  const now = new Date();
  assertOnTheHourAndFuture(input.scheduled_at, now);
  if (new Date(input.scheduled_at).getTime() > now.getTime() + STUDENT_MAX_DAYS_AHEAD * DAY_MS) {
    throw Errors.slotUnavailable(`Solo se puede pedir turno hasta ${STUDENT_MAX_DAYS_AHEAD} días adelante`);
  }
  const student = await studentsRepo.findStudentById(user.id);
  if (!student?.trainer_id) throw Errors.forbidden();
  const availability = await availabilityRepo.findAvailability(student.trainer_id);
  if (!isWithinAvailability(input.scheduled_at, availability)) {
    throw Errors.slotUnavailable('Ese horario está fuera de la disponibilidad de tu entrenador');
  }
  const row = await appointmentsRepo.insertAppointment(
    baseRow(student.trainer_id, student.id, input, STATUS.PENDING)
  );
  const appointment = toAppointment(row);
  await triggers.onAppointmentChanged('requested', appointment);
  return appointment;
}

/** El PT agenda un turno a un alumno suyo y activo: queda `confirmed` (sin exigir disponibilidad) y se avisa con push. */
export async function createForTrainer(user, input) {
  const student = await assertCanAccessStudent(user, input.student_id);
  if (!student.active) throw Errors.forbidden();
  assertOnTheHourAndFuture(input.scheduled_at, new Date());
  const row = await appointmentsRepo.insertAppointment(baseRow(user.id, student.id, input, STATUS.CONFIRMED));
  const appointment = toAppointment(row);
  await triggers.onAppointmentChanged('createdByTrainer', appointment);
  return appointment;
}
