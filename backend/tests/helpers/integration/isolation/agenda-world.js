import { api, expectStatus } from '../api.js';
import { createTrainer, inviteAndJoin } from '../actors.js';

const DAY = 24 * 60 * 60 * 1000;
const AR_OFFSET = 3 * 60 * 60 * 1000; // Argentina = UTC-3 fijo

/** Fecha 'YYYY-MM-DD' de Argentina dentro de `days` días. */
export const arDate = (days) => new Date(Date.now() + days * DAY - AR_OFFSET).toISOString().slice(0, 10);

/** Franjas de todos los días de la semana entre `start` y `end` (horas en punto de Argentina). */
const everyDay = (start, end) =>
  [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, start_time: start, end_time: end }));

/**
 * Un PT con un alumno, disponibilidad de todos los días entre `start` y `end` y un turno
 * confirmado que agenda el PT en 2 días a las `start` (todo por la API).
 * A y B usan horarios distintos para que se note si los huecos de uno aparecen en el otro.
 */
export async function buildAgendaWorld(label, { start, end }) {
  const trainer = await createTrainer(`ag-${label}`);
  const student = await inviteAndJoin(trainer, `ag-${label}`);
  const pt = api(trainer.token);

  const put = await pt.put('/availability').send({ slots: everyDay(start, end) });
  expectStatus(put, 200, 'PUT /availability');

  const scheduledAt = new Date(`${arDate(2)}T${start}:00-03:00`).toISOString();
  const created = await pt.post('/appointments').send({ student_id: student.id, scheduled_at: scheduledAt });
  expectStatus(created, 201, 'POST /appointments');

  return { trainer, student, slots: put.body.data, appointmentId: created.body.data.id };
}
