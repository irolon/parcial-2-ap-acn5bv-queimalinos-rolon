import { api, expectStatus } from '../api.js';
import { createTrainer, inviteAndJoin } from '../actors.js';
import { createExercise, createRoutine, setRow, uploadSession } from '../fixtures.js';
import { RUN_ID, qaName } from '../run-id.js';

const HOUR = 60 * 60 * 1000;

async function send(res, status, what) {
  const r = await res;
  expectStatus(r, status, what);
  return r.body.data;
}

/** Espera la notificación `comment` del alumno (se crea al comentar la sesión). */
async function commentNotificationId(student) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const list = await send(api(student.token).get('/notifications'), 200, 'GET /notifications');
    const found = list.find((n) => n.type === 'comment');
    if (found) return found.id;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('buildWorld: no apareció la notificación del comentario');
}

/**
 * Un PT con un alumno y un dato de cada recurso con id (todo por la API):
 * ejercicio, rutina, sesión cerrada con una serie, plantilla, desafío, medida,
 * mensaje, notificación del alumno y token push del alumno.
 */
export async function buildWorld(label) {
  const trainer = await createTrainer(`iso-${label}`);
  const student = await inviteAndJoin(trainer, `iso-${label}`);
  const pt = api(trainer.token);

  const exerciseId = await createExercise(trainer, `Ejercicio ${label}`);
  const routine = await createRoutine(trainer, student.id, {
    label: `Rutina ${label}`,
    exerciseIds: [exerciseId],
  });

  const startedAt = new Date(Date.now() - 2 * HOUR).toISOString();
  const set = setRow({ exerciseId, setNumber: 1, reps: 10, kg: 40, executedAt: startedAt });
  const { sessionId } = await uploadSession(student, {
    startedAt,
    finishedAt: new Date(Date.now() - HOUR).toISOString(),
    routineId: routine.id,
    sets: [set],
  });

  const template = await send(
    pt.post('/routine-templates').send({
      name: qaName(`Plantilla ${label}`),
      goal: 'hypertrophy',
      structure: {
        version: 1,
        days: ['monday'],
        exercises: [{ exercise_id: exerciseId, sets: 3, reps: 10 }],
      },
    }),
    201,
    'POST /routine-templates'
  );
  const challenge = await send(
    pt.post('/challenges').send({
      name: qaName(`Desafío ${label}`),
      goal_type: 'sessions_count',
      goal_value: 3,
      duration_days: 30,
    }),
    201,
    'POST /challenges'
  );
  const metric = await send(
    pt.post(`/students/${student.id}/metrics`).send({ weight_kg: 80 }),
    201,
    'POST /students/:id/metrics'
  );
  const message = await send(
    pt.post(`/messages/${student.id}`).send({ body: qaName(`Hola ${label}`) }),
    201,
    'POST /messages/:studentId'
  );
  await send(
    pt.patch(`/sessions/${sessionId}/comment`).send({ trainer_comment: qaName('Bien') }),
    200,
    'PATCH /sessions/:id/comment'
  );
  const notificationId = await commentNotificationId(student);

  const pushToken = `it-${RUN_ID}-${label}`;
  await send(
    api(student.token)
      .post('/notifications/tokens')
      .send({ token: pushToken, platform: 'android' }),
    201,
    'POST /notifications/tokens'
  );

  return {
    trainer,
    student,
    exerciseId,
    routineId: routine.id,
    routineExerciseId: routine.routineExerciseIds[0],
    sessionId,
    setId: set.id,
    templateId: template.id,
    challengeId: challenge.id,
    metricId: metric.id,
    messageId: message.id,
    notificationId,
    pushToken,
  };
}

/** Todos los ids (y el token push) del mundo, para buscar filtraciones. */
export function worldIds(world) {
  const { trainer, student, ...rest } = world;
  return [trainer.id, student.id, ...Object.values(rest)];
}
