import { request } from '@/api/shared/client';

const rangeQuery = (from, to) => new URLSearchParams({ from, to }).toString();

/** GET /availability → `[{ weekday, start_time, end_time }]` (franjas del entrenador). */
export async function getAvailability() {
  const res = await request('/availability');
  return res.data;
}

/** PUT /availability → franjas guardadas (reemplaza todas; `[]` la vacía). */
export async function saveAvailability(slots) {
  const res = await request('/availability', { method: 'PUT', body: { slots } });
  return res.data;
}

/** GET /availability/free → `[{ starts_at }]` (ISO UTC) con los horarios libres de `from` a `to` (`YYYY-MM-DD`). */
export async function listFreeSlots(from, to) {
  const res = await request(`/availability/free?${rangeQuery(from, to)}`);
  return res.data;
}

/** GET /appointments → turnos propios de `from` a `to` (`YYYY-MM-DD`, hasta 62 días). */
export async function listAppointments(from, to) {
  const res = await request(`/appointments?${rangeQuery(from, to)}`);
  return res.data;
}

/** POST /appointments (entrenador: `{ student_id, scheduled_at, notes? }`) → turno `confirmed`. */
export async function createAppointment(body) {
  const res = await request('/appointments', { method: 'POST', body });
  return res.data;
}

/** PATCH /appointments/:id con `{ status: 'confirmed' | 'cancelled' }` → turno actualizado. */
export async function updateAppointmentStatus(id, status) {
  const res = await request(`/appointments/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } });
  return res.data;
}
