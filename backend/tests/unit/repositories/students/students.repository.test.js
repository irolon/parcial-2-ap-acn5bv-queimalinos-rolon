import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

// Builder encadenable y "thenable": cada método devuelve el mismo objeto.
// `queue`: respuestas por página (fetchAll pide de a 1000); si está vacía se usa `current`.
const result = { current: { data: [], error: null }, queue: [] };
const q = {};
for (const m of ['select', 'eq', 'in', 'gte', 'not', 'order', 'range']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.queue.length ? result.queue.shift() : result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/students/students.repository.js'));

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: [], error: null };
  result.queue = [];
});

describe('students.repository — consultas por lote de la lista', () => {
  it('findActiveRoutineDays: une los días de las rutinas activas, [] si no tiene', async () => {
    result.current = {
      data: [
        { student_id: 's1', days: ['monday', 'friday'], created_at: '2026-10-01T12:00:00Z' },
        { student_id: 's1', days: ['friday', 'wednesday'], created_at: '2026-09-01T12:00:00Z' },
      ],
      error: null,
    };
    const map = await repo.findActiveRoutineDays(['s1', 's2']);
    expect(q.in).toHaveBeenCalledWith('student_id', ['s1', 's2']);
    expect(q.eq).toHaveBeenCalledWith('active', true);
    expect(map.get('s1').sort()).toEqual(['friday', 'monday', 'wednesday']);
    expect(map.get('s2')).toEqual([]);
  });

  it('findActiveRoutineDays: con más de 1000 rutinas pagina y no pierde días', async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `r${i}`, student_id: 's1', days: ['monday'], created_at: '2026-10-01T12:00:00Z' }));
    result.queue = [
      { data: page1, error: null },
      { data: [{ id: 'r1000', student_id: 's1', days: ['saturday'], created_at: '2026-10-01T12:00:00Z' }], error: null },
    ];
    const map = await repo.findActiveRoutineDays(['s1']);
    expect(q.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(q.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(q.order).toHaveBeenCalledWith('id');
    expect(map.get('s1').sort()).toEqual(['monday', 'saturday']);
  });

  it('findActiveRoutineSchedules: cada día vale desde la rutina más vieja que lo incluye (fecha argentina)', async () => {
    result.current = {
      data: [
        { student_id: 's1', days: ['monday', 'friday'], created_at: '2026-10-20T12:00:00Z' },
        // 02:30Z del 02/10 es el 01/10 en Argentina.
        { student_id: 's1', days: ['friday'], created_at: '2026-10-02T02:30:00Z' },
      ],
      error: null,
    };
    const map = await repo.findActiveRoutineSchedules(['s1', 's2']);
    expect(q.select).toHaveBeenCalledWith('id, student_id, days, created_at');
    expect(Object.fromEntries(map.get('s1').daySince)).toEqual({ monday: '2026-10-20', friday: '2026-10-01' });
    expect(map.get('s2')).toEqual({ days: [], daySince: new Map() });
  });

  it('findFinishedSessionDates: solo terminadas desde la fecha, en día argentino', async () => {
    result.current = {
      data: [
        { id: 'a', student_id: 's1', started_at: '2026-11-02T02:30:00Z' },
        { id: 'b', student_id: 's1', started_at: '2026-11-03T15:00:00Z' },
      ],
      error: null,
    };
    const map = await repo.findFinishedSessionDates(['s1', 's2'], '2026-10-29T00:00:00-03:00');
    expect(q.gte).toHaveBeenCalledWith('started_at', '2026-10-29T00:00:00-03:00');
    expect(q.not).toHaveBeenCalledWith('finished_at', 'is', null);
    // 02:30Z del 02/11 es el 01/11 a las 23:30 en Argentina.
    expect(map.get('s1')).toEqual(['2026-11-01', '2026-11-03']);
    expect(map.get('s2')).toEqual([]);
  });

  it('un error de supabase se propaga', async () => {
    result.current = { data: null, error: { message: 'boom' } };
    await expect(repo.findActiveRoutineDays(['s1'])).rejects.toThrow('boom');
  });
});
