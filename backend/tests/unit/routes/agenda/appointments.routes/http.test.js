import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  db, resetDb, mockNotify, request, startServer, stopServer, tokenFor,
  TRAINER_ID, STUDENT_ID, STUDENT2_ID, OTHER_TRAINER_ID,
} from '../../../../helpers/agenda/http.setup.js';

// Miércoles 04/11/2026 12:00 en Argentina. Solo se falsea Date: el servidor y fetch usan timers reales.
const NOW = new Date('2026-11-04T15:00:00.000Z');
const FAKE_ONLY_DATE = [
  'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
  'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval',
  'setTimeout', 'clearTimeout',
];

// Viernes 06/11 18:00 AR = 21:00 UTC. Disponibilidad del PT: viernes 14–20.
const FRI_18 = '2026-11-06T21:00:00.000Z';
let trainer;
let student;
let student2;

beforeAll(startServer);
afterAll(stopServer);
beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: FAKE_ONLY_DATE });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  resetDb();
  db.availability = [{ trainer_id: TRAINER_ID, weekday: 5, start_time: '14:00:00', end_time: '20:00:00' }];
  mockNotify.notify.mockResolvedValue({ id: 'n-1' });
  trainer = tokenFor(TRAINER_ID, 'trainer');
  student = tokenFor(STUDENT_ID, 'student');
  student2 = tokenFor(STUDENT2_ID, 'student');
});
afterEach(() => jest.useRealTimers());

const askAs = (token, scheduled_at = FRI_18) =>
  request('post', '/api/appointments', { as: token, body: { scheduled_at, notes: 'Piernas' } });

describe('POST /api/appointments', () => {
  it('sin token: 401', async () => {
    expect((await request('post', '/api/appointments', { body: { scheduled_at: FRI_18 } })).status).toBe(401);
  });

  it('alumno: 201 pending con la forma pública y notificación al PT sin push', async () => {
    const res = await askAs(student);
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      id: expect.any(String), trainer_id: TRAINER_ID,
      student: { id: STUDENT_ID, name: 'Lucía', avatar_url: null },
      scheduled_at: FRI_18, duration_min: 60, status: 'pending', notes: 'Piernas', created_at: expect.any(String),
    });
    expect(mockNotify.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TRAINER_ID, userRole: 'trainer', type: 'appointment', push: false })
    );
  });

  it('Review Focus 1: dos solicitudes simultáneas al mismo horario: una da 201 y la otra 409 SLOT_TAKEN, nunca 500', async () => {
    const results = await Promise.all([askAs(student), askAs(student2)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = results.find((r) => r.status === 409);
    expect(loser.body.error).toMatchObject({ code: 'SLOT_TAKEN', message: 'Ese horario ya está ocupado' });
    expect(db.appointments).toHaveLength(1);
    expect(mockNotify.notify).toHaveBeenCalledTimes(1);
  });

  it('un horario cancelado se puede volver a pedir', async () => {
    const first = await askAs(student);
    await request('patch', `/api/appointments/${first.body.data.id}`, { as: trainer, body: { status: 'cancelled' } });
    expect((await askAs(student2)).status).toBe(201);
  });

  it('fuera de la disponibilidad: 400 SLOT_UNAVAILABLE', async () => {
    const res = await askAs(student, '2026-11-07T21:00:00.000Z');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SLOT_UNAVAILABLE');
  });

  it('body inválido: 400 VALIDATION_ERROR', async () => {
    const res = await request('post', '/api/appointments', { as: student, body: { scheduled_at: 'mañana' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PT: 201 confirmed para un alumno suyo, push al alumno, sin exigir disponibilidad', async () => {
    const res = await request('post', '/api/appointments', {
      as: trainer, body: { student_id: STUDENT_ID, scheduled_at: '2026-11-07T15:00:00.000Z' },
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'confirmed', student: { id: STUDENT_ID } });
    expect(mockNotify.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: STUDENT_ID, userRole: 'student', push: true })
    );
  });

  it('PT con un alumno ajeno o inactivo: 403', async () => {
    db.students[0].trainer_id = OTHER_TRAINER_ID;
    db.students[1].active = false;
    for (const student_id of [STUDENT_ID, STUDENT2_ID]) {
      const res = await request('post', '/api/appointments', { as: trainer, body: { student_id, scheduled_at: FRI_18 } });
      expect(res.status).toBe(403);
    }
    expect(db.appointments).toHaveLength(0);
  });
});

describe('PATCH /api/appointments/:id', () => {
  const patch = (token, id, status) => request('patch', `/api/appointments/${id}`, { as: token, body: { status } });
  const seed = async () => (await askAs(student)).body.data.id;

  beforeEach(() => mockNotify.notify.mockClear());

  it('el PT confirma: 200 y push al alumno', async () => {
    const id = await seed();
    mockNotify.notify.mockClear();
    const res = await patch(trainer, id, 'confirmed');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('confirmed');
    expect(mockNotify.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: STUDENT_ID, userRole: 'student', push: true })
    );
  });

  it('el alumno no puede confirmar: 409 INVALID_STATUS_TRANSITION', async () => {
    const res = await patch(student, await seed(), 'confirmed');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('el alumno cancela: 200 y fila al PT sin push', async () => {
    const id = await seed();
    mockNotify.notify.mockClear();
    expect((await patch(student, id, 'cancelled')).status).toBe(200);
    expect(mockNotify.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TRAINER_ID, userRole: 'trainer', push: false })
    );
  });

  it('nadie reabre un cancelado', async () => {
    const id = await seed();
    await patch(trainer, id, 'cancelled');
    const res = await patch(trainer, id, 'confirmed');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('un turno pasado no se toca: 409 APPOINTMENT_PAST', async () => {
    const id = await seed();
    db.appointments[0].scheduled_at = '2026-11-03T21:00:00.000Z';
    const res = await patch(trainer, id, 'cancelled');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'APPOINTMENT_PAST', message: 'El turno ya pasó' });
  });

  it('turno ajeno o inexistente: 403', async () => {
    const id = await seed();
    expect((await patch(student2, id, 'cancelled')).status).toBe(403);
    expect((await patch(tokenFor(OTHER_TRAINER_ID, 'trainer'), id, 'cancelled')).status).toBe(403);
    expect((await patch(trainer, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cancelled')).status).toBe(403);
  });

  it('status inválido o id inválido: 400', async () => {
    expect((await patch(trainer, await seed(), 'pending')).status).toBe(400);
    expect((await patch(trainer, 'no-es-uuid', 'cancelled')).status).toBe(400);
  });
});

describe('GET /api/appointments', () => {
  it('el PT ve los suyos y el alumno solo los propios, ordenados', async () => {
    await askAs(student);
    db.availability.push({ trainer_id: TRAINER_ID, weekday: 5, start_time: '08:00:00', end_time: '10:00:00' });
    await askAs(student2, '2026-11-06T12:00:00.000Z');
    const range = '?from=2026-11-02&to=2026-11-08';

    const asTrainer = await request('get', `/api/appointments${range}`, { as: trainer });
    expect(asTrainer.body.data.map((a) => a.student.name)).toEqual(['Marcos', 'Lucía']);

    const asStudent = await request('get', `/api/appointments${range}`, { as: student });
    expect(asStudent.body.data.map((a) => a.student.name)).toEqual(['Lucía']);
  });

  it('rango fuera de 1–62 días o sin fechas: 400', async () => {
    expect((await request('get', '/api/appointments?from=2026-11-01&to=2027-02-01', { as: trainer })).status).toBe(400);
    expect((await request('get', '/api/appointments', { as: trainer })).status).toBe(400);
  });
});
