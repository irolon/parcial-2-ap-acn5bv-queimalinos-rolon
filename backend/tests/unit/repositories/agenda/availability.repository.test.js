import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const result = { current: { data: [], error: null } };
const q = {};
for (const m of ['select', 'eq', 'order']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q), rpc: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/agenda/availability.repository.js'));

beforeEach(() => {
  result.current = { data: [], error: null };
});

describe('availability.repository', () => {
  it('replaceAvailability llama a la RPC atómica con el entrenador y las franjas', async () => {
    const slots = [{ weekday: 1, start_time: '08:00', end_time: '12:00' }];
    result.current = { data: [{ weekday: 1 }], error: null };
    await expect(repo.replaceAvailability('t-1', slots)).resolves.toEqual([{ weekday: 1 }]);
    expect(supabase.rpc).toHaveBeenCalledWith('replace_trainer_availability', { p_trainer: 't-1', p_slots: slots });
  });

  it('findAvailability ordena por día y hora', async () => {
    await repo.findAvailability('t-1');
    expect(supabase.from).toHaveBeenCalledWith('trainer_availability');
    expect(q.eq).toHaveBeenCalledWith('trainer_id', 't-1');
    expect(q.order).toHaveBeenNthCalledWith(1, 'weekday');
    expect(q.order).toHaveBeenNthCalledWith(2, 'start_time');
  });

  it('un error de la base es 500', async () => {
    result.current = { data: null, error: { message: 'boom' } };
    await expect(repo.findAvailability('t-1')).rejects.toMatchObject({ statusCode: 500 });
  });
});
