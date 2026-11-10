import { randomUUID } from 'node:crypto';
import { api } from '../helpers/integration/api.js';
import { createTrainer, inviteAndJoin } from '../helpers/integration/actors.js';
import { createExercise, setRow, uploadSession } from '../helpers/integration/fixtures.js';

const START = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
const END = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const at = (min) => new Date(Date.parse(START) + min * 60000).toISOString();
const withoutAchievements = ({ unlocked_achievements: _ignored, ...rest }) => rest;

// Idempotencia real contra la base: reintentos de sesión y de lotes de series,
// ids repetidos, fallas parciales y conflictos con la sesión de otro alumno.
describe('integración — idempotencia de sesiones y series', () => {
  const S = randomUUID();
  let trainer;
  let studentA;
  let studentB;
  let exerciseId;
  let s1;
  let s2;
  let s3;

  const row = (n, extra = {}) =>
    setRow({ exerciseId, setNumber: n, reps: 10, kg: 50, executedAt: at(n), ...extra });
  const postSets = (student, sessionId, sets) =>
    api(student.token).post(`/sessions/${sessionId}/sets`).send({ sets });
  const detailSets = async () => {
    const res = await api(trainer.token).get(`/students/${studentA.id}/sessions/${S}`);
    expect(res.status).toBe(200);
    return { session: res.body.data, sets: res.body.data.exercises.flatMap((e) => e.sets) };
  };

  beforeAll(async () => {
    trainer = await createTrainer('idem');
    studentA = await inviteAndJoin(trainer, 'idem-a');
    studentB = await inviteAndJoin(trainer, 'idem-b');
    exerciseId = await createExercise(trainer, 'Press idem');
    [s1, s2, s3] = [row(1), row(2), row(3)];
  });

  it('POST /sessions: crear, cerrar con reintento y reenviar igual no cambia nada', async () => {
    const created = await api(studentA.token).post('/sessions').send({ id: S, started_at: START });
    expect(created.status).toBe(201);
    expect(created.body.data.finished_at).toBeNull();

    const body = { id: S, started_at: START, finished_at: END };
    const closed = await api(studentA.token).post('/sessions').send(body);
    expect(closed.status).toBe(200);
    expect(closed.body.data.finished_at).not.toBeNull();

    const again = await api(studentA.token).post('/sessions').send(body);
    expect(again.status).toBe(200);
    expect(withoutAchievements(again.body.data)).toEqual(withoutAchievements(closed.body.data));

    const { session } = await detailSets();
    expect(Date.parse(session.finished_at)).toBe(Date.parse(END));
  });

  it('el mismo lote dos veces guarda 3 series, no 6', async () => {
    const first = await postSets(studentA, S, [s1, s2, s3]);
    expect(first.status).toBe(200);
    expect(first.body.data.saved).toEqual([s1, s2, s3].map((s) => ({ id: s.id, created: true })));
    expect(first.body.data.failed).toEqual([]);

    const second = await postSets(studentA, S, [s1, s2, s3]);
    expect(second.status).toBe(200);
    expect(second.body.data.saved).toEqual([s1, s2, s3].map((s) => ({ id: s.id, created: false })));
    expect(second.body.data.failed).toEqual([]);

    const { sets } = await detailSets();
    expect(sets).toHaveLength(3);
    expect(new Set(sets.map((s) => s.id)).size).toBe(3);
  });

  it('un id repetido dentro del lote guarda el primero y rechaza el segundo', async () => {
    const s4 = row(4, { reps: 7 });
    const s4bis = { ...s4, actual_reps: 12 };

    const res = await postSets(studentA, S, [s4, s4bis]);

    expect(res.status).toBe(200);
    expect(res.body.data.saved).toEqual([{ id: s4.id, created: true }]);
    expect(res.body.data.failed).toEqual([
      expect.objectContaining({ index: 1, code: 'VALIDATION_ERROR' }),
    ]);
    const { sets } = await detailSets();
    expect(sets.find((s) => s.id === s4.id).actual_reps).toBe(7);
  });

  it('una serie con ejercicio inexistente falla sola y el reintento corregido la crea', async () => {
    const s5 = row(5);
    const s6 = row(6, { exerciseId: randomUUID() });

    const res = await postSets(studentA, S, [s5, s6]);
    expect(res.status).toBe(200);
    expect(res.body.data.saved).toEqual([{ id: s5.id, created: true }]);
    expect(res.body.data.failed).toEqual([
      expect.objectContaining({ id: s6.id, index: 1, code: 'EXERCISE_NOT_FOUND' }),
    ]);

    const retry = await postSets(studentA, S, [s5, { ...s6, exercise_id: exerciseId }]);
    expect(retry.status).toBe(200);
    expect(retry.body.data.saved).toEqual([
      { id: s5.id, created: false },
      { id: s6.id, created: true },
    ]);
    expect(retry.body.data.failed).toEqual([]);

    const { sets } = await detailSets();
    expect(sets).toHaveLength(6);
  });

  it('el alumno B no puede reusar el id de la sesión ni de una serie de A', async () => {
    const conflict = await api(studentB.token).post('/sessions').send({ id: S, started_at: START });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('SESSION_ID_CONFLICT');
    expect(conflict.body.data).toBeUndefined();

    const { sessionId: sessionB } = await uploadSession(studentB, { startedAt: START });
    const res = await postSets(studentB, sessionB, [{ ...s1, actual_reps: 1, actual_kg: 1 }]);
    expect(res.status).toBe(200);
    expect(res.body.data.saved).toEqual([]);
    expect(res.body.data.failed).toEqual([
      expect.objectContaining({ id: s1.id, code: 'SET_ID_CONFLICT' }),
    ]);

    const { sets } = await detailSets();
    expect(sets).toHaveLength(6);
    expect(sets.find((s) => s.id === s1.id)).toMatchObject({ actual_reps: 10, actual_kg: 50 });
  });
});
