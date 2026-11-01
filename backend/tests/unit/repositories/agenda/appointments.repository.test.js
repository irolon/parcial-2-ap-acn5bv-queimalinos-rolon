import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const result = { current: { data: [], error: null } };
const q = {};
for (const m of ['select', 'eq', 'in', 'gte', 'lt', 'order', 'insert', 'update', 'single', 'maybeSingle']) {
  q[m] = jest.fn(() => q);
}
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/agenda/appointments.repository.js'));

const FROM = new Date('2026-11-02T03:00:00.000Z');
const TO = new Date('2026-11-09T03:00:00.000Z');

beforeEach(() => {
  result.current = { data: [], error: null };
});

describe('appointments.repository', () => {
  it('insertAppointment traduce el 23505 del índice único a SLOT_TAKEN (409)', async () => {
    result.current = { data: null, error: { code: '23505', message: 'duplicate key value' } };
    await expect(repo.insertAppointment({ trainer_id: 't' })).rejects.toMatchObject({
      statusCode: 409, code: 'SLOT_TAKEN', message: 'Ese horario ya está ocupado',
    });
  });

  it('insertAppointment: otro error es 500 y el éxito devuelve la fila', async () => {
    result.current = { data: null, error: { code: '42P01', message: 'boom' } };
    await expect(repo.insertAppointment({})).rejects.toMatchObject({ statusCode: 500 });
    result.current = { data: { id: 'a-1' }, error: null };
    await expect(repo.insertAppointment({ trainer_id: 't' })).resolves.toEqual({ id: 'a-1' });
    expect(supabase.from).toHaveBeenCalledWith('appointments');
  });

  it('findAppointmentsInRange filtra por dueño y por [from, to) ordenado', async () => {
    await repo.findAppointmentsInRange({ student_id: 's-1' }, FROM, TO);
    expect(q.eq).toHaveBeenCalledWith('student_id', 's-1');
    expect(q.gte).toHaveBeenCalledWith('scheduled_at', FROM.toISOString());
    expect(q.lt).toHaveBeenCalledWith('scheduled_at', TO.toISOString());
    expect(q.order).toHaveBeenCalledWith('scheduled_at');
  });

  it('findTakenInRange solo mira pending y confirmed y devuelve los scheduled_at', async () => {
    result.current = { data: [{ scheduled_at: 'a' }, { scheduled_at: 'b' }], error: null };
    await expect(repo.findTakenInRange('t-1', FROM, TO)).resolves.toEqual(['a', 'b']);
    expect(q.eq).toHaveBeenCalledWith('trainer_id', 't-1');
    expect(q.in).toHaveBeenCalledWith('status', ['pending', 'confirmed']);
  });

  it('updateStatus filtra por id y por el estado previo y devuelve la fila', async () => {
    result.current = { data: { id: 'a-1', status: 'cancelled' }, error: null };
    await expect(repo.updateStatus('a-1', 'pending', 'cancelled')).resolves.toEqual({ id: 'a-1', status: 'cancelled' });
    expect(q.update).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(q.eq).toHaveBeenCalledWith('id', 'a-1');
    expect(q.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('updateStatus devuelve null si el estado ya no era el esperado', async () => {
    result.current = { data: null, error: null };
    await expect(repo.updateStatus('a-1', 'pending', 'confirmed')).resolves.toBeNull();
  });

  it('findAppointmentById devuelve null si no existe', async () => {
    result.current = { data: null, error: null };
    await expect(repo.findAppointmentById('x')).resolves.toBeNull();
  });
});
