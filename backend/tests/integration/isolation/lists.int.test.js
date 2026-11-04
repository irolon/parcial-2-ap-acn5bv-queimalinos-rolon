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

describe('integración — aislamiento: listados', () => {
  beforeAll(async () => {
    A = await buildWorld('a');
    B = await buildWorld('b');
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

  it('control: los listados de B sí traen lo de B', async () => {
    const students = await api(B.trainer.token).get('/students');
    expect(students.body.data.map((s) => s.id)).toEqual([B.student.id]);
    const mine = await api(B.student.token).get('/routines/mine');
    expect(mine.body.data.map((r) => r.routine_id)).toEqual([B.routineId]);
  });
});
