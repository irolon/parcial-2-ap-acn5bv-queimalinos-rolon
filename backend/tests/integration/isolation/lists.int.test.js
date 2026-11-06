import { api } from '../../helpers/integration/api.js';
import { buildWorld } from '../../helpers/integration/isolation/world.js';
import { expectNoLeak } from '../../helpers/integration/isolation/isolation.js';

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
const STUDENT_LISTS = ['/challenges', '/routines/mine', '/notifications', '/messages/unread-count'];

// Control positivo: cada listado trae lo de B (si viniera vacío, el «nada de A» pasaría igual).
const OWN_ITEMS = [
  ['PT B', '/routine-templates', 'trainer', (x) => x.id, (w) => w.templateId],
  ['PT B', '/exercises', 'trainer', (x) => x.id, (w) => w.exerciseId],
  ['PT B', '/challenges', 'trainer', (x) => x.id, (w) => w.challengeId],
  ['PT B', '/messages/conversations', 'trainer', (x) => x.student.id, (w) => w.student.id],
  ['alumno B', '/challenges', 'student', (x) => x.id, (w) => w.challengeId],
  ['alumno B', '/notifications', 'student', (x) => x.id, (w) => w.notificationId],
];

describe('integración — aislamiento: listados', () => {
  let assigned;

  beforeAll(async () => {
    A = await buildWorld('a');
    B = await buildWorld('b');
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

  it.each(OWN_ITEMS)('control: %s GET %s trae lo suyo', async (_who, path, role, idOf, ownId) => {
    const res = await api(B[role].token).get(path);
    expect(res.status).toBe(200);
    expect(res.body.data.map(idOf)).toContain(ownId(B));
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
