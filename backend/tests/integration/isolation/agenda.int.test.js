import { api } from '../../helpers/integration/api.js';
import { arDate, buildAgendaWorld } from '../../helpers/integration/isolation/agenda-world.js';

// Aislamiento de la agenda (filas 106–113 de la tarea 10). A atiende de 08 a 10 y
// B de 18 a 20 (hora de Argentina), así los huecos libres de cada uno se distinguen.
let A;
let B;
const range = () => `from=${arDate(0)}&to=${arDate(7)}`;
const ids = (res) => res.body.data.map((x) => x.id);
const arHour = ({ starts_at }) => (new Date(starts_at).getUTCHours() + 21) % 24;

function expectForbidden(res) {
  expect({ status: res.status, code: res.body.error?.code }).toEqual({ status: 403, code: 'FORBIDDEN' });
  expect(res.body.data).toBeUndefined();
}

describe('integración — aislamiento: agenda', () => {
  beforeAll(async () => {
    A = await buildAgendaWorld('a', { start: '08:00', end: '10:00' });
    B = await buildAgendaWorld('b', { start: '18:00', end: '20:00' });
  });

  it('#106 PT B: PATCH /appointments/:apA → 403 y el turno de A sigue confirmado', async () => {
    expectForbidden(await api(B.trainer.token).patch(`/appointments/${A.appointmentId}`).send({ status: 'cancelled' }));
    const mine = await api(A.trainer.token).get(`/appointments?${range()}`);
    expect(mine.body.data.find((a) => a.id === A.appointmentId)?.status).toBe('confirmed');
  });

  it('#107 PT B: POST /appointments con el alumno de A → 403', async () => {
    const scheduled_at = new Date(`${arDate(3)}T18:00:00-03:00`).toISOString();
    expectForbidden(await api(B.trainer.token).post('/appointments').send({ student_id: A.student.id, scheduled_at }));
  });

  it('#108 PT B: GET /appointments trae solo el suyo', async () => {
    const res = await api(B.trainer.token).get(`/appointments?${range()}`);
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([B.appointmentId]);
    expect(JSON.stringify(res.body)).not.toContain(A.student.id);
  });

  it('#109 PT B: GET /availability trae solo sus franjas', async () => {
    const res = await api(B.trainer.token).get('/availability');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(B.slots);
    expect(res.body.data.every((s) => s.start_time === '18:00')).toBe(true);
  });

  it('#110 alumno B: PATCH /appointments/:apA → 403', async () => {
    expectForbidden(await api(B.student.token).patch(`/appointments/${A.appointmentId}`).send({ status: 'cancelled' }));
  });

  it('#111 alumno B: GET /appointments trae solo el suyo', async () => {
    const res = await api(B.student.token).get(`/appointments?${range()}`);
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([B.appointmentId]);
  });

  it('#112 alumno B: GET /availability/free trae huecos de B y ninguno de A', async () => {
    const res = await api(B.student.token).get(`/availability/free?${range()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect([...new Set(res.body.data.map(arHour))].sort()).toEqual([18, 19]);
  });

  it.each([
    ['GET', (r) => r.get('/availability')],
    ['PUT', (r) => r.put('/availability').send({ slots: [] })],
  ])('#113 alumno A: %s /availability → 403 (rol)', async (_m, send) => {
    expectForbidden(await send(api(A.student.token)));
  });

  it('control: PT A y alumno A ven el turno de A; el alumno A ve solo huecos de A', async () => {
    for (const actor of [A.trainer, A.student]) {
      const res = await api(actor.token).get(`/appointments?${range()}`);
      expect(ids(res)).toEqual([A.appointmentId]);
    }
    const free = await api(A.student.token).get(`/availability/free?${range()}`);
    expect([...new Set(free.body.data.map(arHour))].sort()).toEqual([8, 9]);
  });
});
