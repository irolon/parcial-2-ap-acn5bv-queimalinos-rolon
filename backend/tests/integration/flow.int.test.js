import { api } from '../helpers/integration/api.js';
import {
  createExercise,
  createRoutine,
  setRow,
  uploadSession,
} from '../helpers/integration/fixtures.js';
import { trackTrainer } from '../helpers/integration/registry.js';
import { QA_PASSWORD, qaEmail, qaName } from '../helpers/integration/run-id.js';

const HOUR = 60 * 60 * 1000;
const ago = (ms) => new Date(Date.now() - ms).toISOString();

// Flujo de punta a punta: PT → invitación → alumno → rutina → sesión → progreso → comentario.
// Los `it` corren en orden y comparten el estado del describe.
describe('integración — flujo de punta a punta', () => {
  const email = qaEmail('pt');
  const trainer = {};
  const student = {};
  let invitationToken;
  let exerciseId;
  let routineId;
  let sessionId;

  it('el PT se registra y entra', async () => {
    const reg = await api()
      .post('/auth/register')
      .send({ name: qaName('PT flujo'), email, password: QA_PASSWORD });
    expect(reg.status).toBe(201);
    trackTrainer(reg.body.trainer.id);
    expect(reg.body).toMatchObject({
      token: expect.any(String),
      refresh_token: expect.any(String),
    });
    trainer.id = reg.body.trainer.id;

    const login = await api().post('/auth/login').send({ email, password: QA_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('trainer');
    trainer.token = login.body.token;
  });

  it('invita a un alumno por QR y la invitación se puede consultar', async () => {
    const res = await api(trainer.token)
      .post('/invitations')
      .send({
        student_name: qaName('Alumno flujo'),
        student_email: qaEmail('st'),
        delivery_channel: 'qr',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.qr_base64).toMatch(/^data:image\/png/);
    invitationToken = res.body.data.token;

    const lookup = await api().get(`/invitations/${invitationToken}`);
    expect(lookup.status).toBe(200);
  });

  it('el alumno se da de alta con la invitación', async () => {
    const res = await api()
      .post('/students')
      .send({ token: invitationToken, password: QA_PASSWORD });
    expect(res.status).toBe(201);
    student.id = res.body.student.id;
    student.token = res.body.token;
    expect(student.token).toEqual(expect.any(String));
  });

  it('el PT crea un ejercicio y una rutina de los 7 días', async () => {
    exerciseId = await createExercise(trainer, 'Press flujo');
    ({ id: routineId } = await createRoutine(trainer, student.id, {
      label: 'Rutina flujo',
      exerciseIds: [exerciseId],
    }));
    expect(routineId).toEqual(expect.any(String));
  });

  it('el alumno ve su rutina de hoy (sin carga previa) y entre las suyas', async () => {
    const today = await api(student.token).get('/routines/today');
    expect(today.status).toBe(200);
    expect(today.body.data.routine_id).toBe(routineId);
    expect(today.body.data.exercises[0].last_session_kg).toBeNull();

    const mine = await api(student.token).get('/routines/mine');
    expect(mine.status).toBe(200);
    expect(mine.body.data.map((r) => r.routine_id)).toContain(routineId);
  });

  it('el alumno sube una sesión cerrada con 3 series', async () => {
    const startedAt = ago(2 * HOUR);
    const at = (min) => new Date(Date.parse(startedAt) + min * 60000).toISOString();
    const result = await uploadSession(student, {
      startedAt,
      finishedAt: ago(HOUR),
      routineId,
      sets: [
        setRow({ exerciseId, setNumber: 1, reps: 10, kg: 60, executedAt: at(5) }),
        setRow({ exerciseId, setNumber: 2, reps: 10, kg: 60, executedAt: at(10) }),
        setRow({ exerciseId, setNumber: 3, reps: 8, kg: 60, executedAt: at(15) }),
      ],
    });
    sessionId = result.sessionId;
    expect(result.saved).toHaveLength(3);
    expect(result.failed).toEqual([]);
  });

  it('el PT ve la sesión en el historial y su detalle', async () => {
    const list = await api(trainer.token).get(`/students/${student.id}/sessions`);
    expect(list.status).toBe(200);
    expect(list.body.data[0]).toMatchObject({ id: sessionId, sets: 3, volume_kg: 1680 });

    const detail = await api(trainer.token).get(`/students/${student.id}/sessions/${sessionId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.exercises[0].sets).toHaveLength(3);
  });

  it('el progreso del ejercicio y el resumen reflejan la sesión', async () => {
    const curve = await api(trainer.token).get(
      `/progress/exercise/${exerciseId}?student_id=${student.id}`
    );
    expect(curve.status).toBe(200);
    expect(curve.body.data.points).toHaveLength(1);
    expect(curve.body.data.points[0]).toMatchObject({ max_kg: 60, volume_kg: 1680, e1rm_kg: 80 });

    const overview = await api(trainer.token).get(`/progress/overview?student_id=${student.id}`);
    expect(overview.status).toBe(200);
    expect(overview.body.data.exercises.map((e) => e.id)).toContain(exerciseId);
  });

  it('el PT comenta la sesión y el detalle lo trae', async () => {
    const res = await api(trainer.token)
      .patch(`/sessions/${sessionId}/comment`)
      .send({ trainer_comment: 'IT · Buen trabajo' });
    expect(res.status).toBe(200);

    const detail = await api(trainer.token).get(`/students/${student.id}/sessions/${sessionId}`);
    expect(detail.body.data.trainer_comment).toBe('IT · Buen trabajo');
  });

  it('el alumno consulta su racha, sus logros y el catálogo', async () => {
    const streak = await api(student.token).get(`/students/${student.id}/streak`);
    expect(streak.status).toBe(200);
    expect(streak.body.data).toEqual({
      current_streak_days: expect.any(Number),
      longest_streak_days: expect.any(Number),
      last_session_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });

    const mine = await api(student.token).get(`/students/${student.id}/achievements`);
    expect(mine.status).toBe(200);
    expect(Array.isArray(mine.body.data)).toBe(true);

    const catalog = await api(student.token).get('/achievements');
    expect(catalog.status).toBe(200);
    expect(catalog.body.data.length).toBeGreaterThan(0);
  });
});
