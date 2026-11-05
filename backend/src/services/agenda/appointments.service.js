import * as repo from '../../repositories/agenda/appointments.repository.js';
import * as triggers from '../notifications/triggers.service.js';
import { Errors } from '../../shared/utils/errors.js';
import { argDayRange } from '../../shared/utils/dates/ranges.js';
import { STATUS, canTransition, toAppointment } from '../../models/agenda/appointment.model.js';
import { createForStudent, createForTrainer } from './appointment-create.service.js';

/** Turnos propios (PT: los suyos; alumno: los suyos) entre `from` y `to` (fechas de Argentina). */
export async function list(user, { from, to }) {
  const { fromUtc, toUtc } = argDayRange(from, to);
  const filter = user.role === 'trainer' ? { trainer_id: user.id } : { student_id: user.id };
  return (await repo.findAppointmentsInRange(filter, fromUtc, toUtc)).map(toAppointment);
}

/** Crea el turno según el rol (el body ya viene validado por el rol correspondiente). */
export function create(user, input) {
  return user.role === 'trainer' ? createForTrainer(user, input) : createForStudent(user, input);
}

/**
 * Baja de un alumno: sus turnos futuros pending o confirmed pasan a cancelled y liberan el horario.
 * Sin avisos: el alumno ya no entra a la app y la baja la hizo el PT. Idempotente.
 */
export function cancelFutureForStudent(studentId) {
  return repo.cancelFutureForStudent(studentId, new Date());
}

const ownsAppointment = (user, row) =>
  user.role === 'trainer' ? row.trainer_id === user.id : row.student_id === user.id;

// Rol → estado nuevo → evento de notificación a la otra parte.
const EVENTS = {
  trainer: { [STATUS.CONFIRMED]: 'confirmed', [STATUS.CANCELLED]: 'cancelledByTrainer' },
  student: { [STATUS.CANCELLED]: 'cancelledByStudent' },
};

/** Confirma o cancela un turno propio. Ajeno o inexistente → 403; pasado → 409; transición inválida → 409. */
export async function changeStatus(user, id, { status }) {
  const row = await repo.findAppointmentById(id);
  if (!row || !ownsAppointment(user, row)) throw Errors.forbidden();
  if (new Date(row.scheduled_at).getTime() <= Date.now()) throw Errors.appointmentPast();
  if (!canTransition(user.role, row.status, status)) throw Errors.invalidStatusTransition();
  const updated = await repo.updateStatus(id, row.status, status);
  // Alguien cambió el estado entre la lectura y la escritura: no se pisa ni se notifica.
  if (!updated) throw Errors.invalidStatusTransition();
  const appointment = toAppointment(updated);
  await triggers.onAppointmentChanged(EVENTS[user.role][status], appointment);
  return appointment;
}
