import { api } from '../../helpers/integration/api.js';
import { buildWorld } from '../../helpers/integration/isolation/world.js';
import { expectNoLeak } from '../../helpers/integration/isolation/isolation.js';
import { arDate } from '../../helpers/integration/isolation/agenda-world.js';

// Listados del PT B y del alumno B (filas 94–105 de la tarea 9): 200 y ningún id de A.
let A;
let B;

const TRAINER_LISTS = [
  '/students',
  '/students/overview',
  '/routines',
  '/routine-templates',
  '/exercises',
  '/challenges',
  '/messages/conversations',
  '/notifications',
];
const STUDENT_LISTS = ['/challenges', '/routines/mine', '/notifications', '/messages/unread-count', '/chat/today', '/chat/history'];

// Control positivo: cada listado trae lo de B (si viniera vacío, el «nada de A» pasaría igual).
// [quién, path, rol, ids del body, id propio de B]
const ids = (idOf) => (data) => data.map(idOf);
const OWN_ITEMS = [
  ['PT B (alumnos)', '/students/overview', 'trainer', (d) => d.lists.students.map((s) => s.student_id), (w) => w.student.id],
  ['PT B (actividad)', '/students/overview', 'trainer', (d) => d.recent.map((r) => r.session_id), (w) => w.sessionId],
  ['PT B', '/routines', 'trainer', ids((x) => x.id), (w) => w.routineId],
  ['PT B', '/routine-templates', 'trainer', ids((x) => x.id), (w) => w.templateId],
  ['PT B', '/exercises', 'trainer', ids((x) => x.id), (w) => w.exerciseId],
  ['PT B', '/challenges', 'trainer', ids((x) => x.id), (w) => w.challengeId],
  ['PT B', '/messages/conversations', 'trainer', ids((x) => x.student.id), (w) => w.student.id],
  ['PT B', '/notifications', 'trainer', ids((x) => x.id), (w) => w.trainerNotificationId],
  ['alumno B', '/challenges', 'student', ids((x) => x.id), (w) => w.challengeId],
  ['alumno B', '/notifications', 'student', ids((x) => x.id), (w) => w.notificationId],
];

/** El alumno B pide un turno en la disponibilidad de su PT → el PT recibe la notificación `appointment`. */
async function trainerNotificationId(world) {
  const slots = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, start_time: '10:00', end_time: '12:00' }));
  const put = await api(world.trainer.token).put('/availability').send({ slots });
  expect(put.status).toBe(200);
  const scheduled_at = new Date(`${arDate(2)}T10:00:00-03:00`).toISOString();
  const asked = await api(world.student.token).post('/appointments').send({ scheduled_at });
  expect(asked.status).toBe(201);
  const list = await api(world.trainer.token).get('/notifications');
  const found = list.body.data.find((n) => n.type === 'appointment');
  if (!found) throw new Error('lists: no apareció la notificación del turno pedido');
  return found.id;
}

describe('integración — aislamiento: listados', () => {
  let assigned;

  beforeAll(async () => {
    A = await buildWorld('a');
    B = await buildWorld('b');
    B.trainerNotificationId = await trainerNotificationId(B);
    // IT-26: el PT B asigna su desafío a su alumno (el control de abajo lo verifica).
    assigned = await api(B.trainer.token)
      .post(`/challenges/${B.challengeId}/assignments`)
      .send({ student_ids: [B.student.id] });
  });

  it.each(TRAINER_LISTS)('PT B: GET %s no trae nada de A', async (path) => {
    const res = await api(B.trainer.token).get(path);
    expect({ status: res.status, body: res.body }).toMatchObject({ status: 200 });
    expectNoLeak(res.body, A);
  });

  it.each(STUDENT_LISTS)('alumno B: GET %s no trae nada de A', async (path) => {
    const res = await api(B.student.token).get(path);
    expect({ status: res.status, body: res.body }).toMatchObject({ status: 200 });
    expectNoLeak(res.body, A);
  });

  it('alumno B: unread-count cuenta solo su mensaje (no el de A)', async () => {
    const res = await api(B.student.token).get('/messages/unread-count');
    expect(res.body.data).toEqual({ count: 1 });
  });

  it.each(OWN_ITEMS)('control: %s GET %s trae lo suyo', async (_who, path, role, idsOf, ownId) => {
    const res = await api(B[role].token).get(path);
    expect(res.status).toBe(200);
    expect(idsOf(res.body.data)).toContain(ownId(B));
  });

  it('IT-26: PT B asigna su desafío a su alumno → 201 con la asignación creada', async () => {
    expect(assigned.status).toBe(201);
    expect(assigned.body.data.skipped).toEqual([]);
    expect(assigned.body.data.created).toHaveLength(1);
    expect(assigned.body.data.created[0].challenge.id).toBe(B.challengeId);
    const own = await api(B.trainer.token).get(`/students/${B.student.id}/challenges`);
    expect(own.body.data.map((c) => c.id)).toEqual([assigned.body.data.created[0].id]);
  });

  it('control: los listados de B sí traen lo de B', async () => {
    const students = await api(B.trainer.token).get('/students');
    expect(students.body.data.map((s) => s.id)).toEqual([B.student.id]);
    const mine = await api(B.student.token).get('/routines/mine');
    expect(mine.body.data.map((r) => r.routine_id)).toEqual([B.routineId]);
  });
});
