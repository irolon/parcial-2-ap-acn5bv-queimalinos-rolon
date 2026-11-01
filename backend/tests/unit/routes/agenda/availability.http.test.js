import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  db, resetDb, mockNotify, request, startServer, stopServer, tokenFor, TRAINER_ID, STUDENT_ID,
} from '../../../helpers/agenda/http.setup.js';

// Miércoles 04/11/2026 12:00 en Argentina. Solo se falsea Date.
const NOW = new Date('2026-11-04T15:00:00.000Z');
const FAKE_ONLY_DATE = [
  'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
  'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval',
  'setTimeout', 'clearTimeout',
];

let trainer;
let student;

beforeAll(startServer);
afterAll(stopServer);
beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: FAKE_ONLY_DATE });
  resetDb();
  mockNotify.notify.mockResolvedValue({ id: 'n-1' });
  trainer = tokenFor(TRAINER_ID, 'trainer');
  student = tokenFor(STUDENT_ID, 'student');
});
afterEach(() => jest.useRealTimers());

const slots = [
  { weekday: 5, start_time: '14:00', end_time: '16:00' },
  { weekday: 5, start_time: '16:00', end_time: '18:00' },
];

describe('PUT /api/availability', () => {
  it('reemplaza todo con la RPC y devuelve lo guardado', async () => {
    const res = await request('put', '/api/availability', { as: trainer, body: { slots } });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(slots);
    expect(db.rpcCalls).toEqual([{ name: 'replace_trainer_availability', args: { p_trainer: TRAINER_ID, p_slots: slots } }]);
  });

  it('franjas solapadas del mismo día: 400 con detalle', async () => {
    const overlapping = [slots[0], { weekday: 5, start_time: '15:00', end_time: '17:00' }];
    const res = await request('put', '/api/availability', { as: trainer, body: { slots: overlapping } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(db.rpcCalls).toHaveLength(0);
  });

  it('el alumno no puede: 403', async () => {
    expect((await request('put', '/api/availability', { as: student, body: { slots } })).status).toBe(403);
  });
});

describe('GET /api/availability', () => {
  it('devuelve las franjas del PT con HH:MM; el alumno no puede', async () => {
    db.availability = [{ trainer_id: TRAINER_ID, weekday: 1, start_time: '08:00:00', end_time: '12:00:00' }];
    const res = await request('get', '/api/availability', { as: trainer });
    expect(res.body.data).toEqual([{ weekday: 1, start_time: '08:00', end_time: '12:00' }]);
    expect((await request('get', '/api/availability', { as: student })).status).toBe(403);
  });
});

describe('GET /api/availability/free', () => {
  const free = (token, from, to) => request('get', `/api/availability/free?from=${from}&to=${to}`, { as: token });
  beforeEach(() => {
    db.availability = [{ trainer_id: TRAINER_ID, weekday: 5, start_time: '14:00:00', end_time: '17:00:00' }];
  });

  it('Review Focus 4: ofrece lo libre y no lo ocupado (pending/confirmed), sí lo cancelado', async () => {
    db.appointments = [
      { id: 'a1', trainer_id: TRAINER_ID, student_id: STUDENT_ID, scheduled_at: '2026-11-06T18:00:00.000Z', status: 'pending' },
      { id: 'a2', trainer_id: TRAINER_ID, student_id: STUDENT_ID, scheduled_at: '2026-11-06T19:00:00.000Z', status: 'cancelled' },
    ];
    const res = await free(student, '2026-11-06', '2026-11-06');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { starts_at: '2026-11-06T17:00:00.000Z' }, { starts_at: '2026-11-06T19:00:00.000Z' },
    ]);
  });

  it('el alumno ve la agenda de su PT y el PT la suya', async () => {
    const a = await free(student, '2026-11-06', '2026-11-06');
    const b = await free(trainer, '2026-11-06', '2026-11-06');
    expect(a.body.data).toEqual(b.body.data);
    expect(a.body.data).toHaveLength(3);
  });

  it('al alumno se le acota a hoy + 28 días; al PT no', async () => {
    // 04/12 es viernes, a 30 días de hoy.
    expect((await free(student, '2026-12-04', '2026-12-04')).body.data).toEqual([]);
    expect((await free(trainer, '2026-12-04', '2026-12-04')).body.data).toHaveLength(3);
  });

  it('rango de más de 31 días o inválido: 400', async () => {
    expect((await free(trainer, '2026-11-01', '2026-12-05')).status).toBe(400);
    expect((await free(trainer, '2026-11-10', '2026-11-05')).status).toBe(400);
    expect((await request('get', '/api/availability/free', { as: trainer })).status).toBe(400);
  });
});
