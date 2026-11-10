import { supabase } from '../../../src/config/supabase.js';
import { api } from '../../helpers/integration/api.js';
import { buildWorld } from '../../helpers/integration/isolation/world.js';
import { ownerControl, rows, runCases } from '../../helpers/integration/isolation/isolation.js';

// Alumno B sobre los datos del alumno A (filas 49–73 de la tarea 9),
// más el control positivo de los GET como alumno A.
let worlds;
const getWorlds = () => worlds;

const NOW = new Date().toISOString();
const set = (id) => ({
  sets: [
    { id, exercise_id: ':exB', set_number: 1, actual_reps: 1, actual_kg: 1, executed_at: NOW },
  ],
});

// prettier-ignore
const cases = rows('studentB', [
  [49, 'GET /students/:stA', 403],
  [50, 'GET /students/:stA/attendance', 403],
  [51, 'GET /students/:stA/metrics', 403],
  [52, 'POST /students/:stA/metrics', 403, null, { weight_kg: 90 }],
  [53, 'GET /students/:stA/sessions', 403],
  [54, 'GET /students/:stA/sessions/:sessA', 403],
  [55, 'PATCH /sessions/:sessA', 404, 'SESSION_NOT_FOUND', { notes: 'IT · ajeno' }],
  [56, 'POST /sessions/:sessA/sets', 404, 'SESSION_NOT_FOUND', set('00000000-0000-4000-8000-000000000056')],
  [57, 'POST /sessions', 409, 'SESSION_ID_CONFLICT', { id: ':sessA', started_at: NOW }],
  [58, 'GET /progress/exercise/:exA', 404, 'EXERCISE_NOT_FOUND'],
  [59, 'GET /progress/exercise/:exB?student_id=:stA', 403],
  [60, 'GET /progress/overview?student_id=:stA', 403],
  [61, 'GET /progress/body/:stA', 403],
  [62, 'GET /students/:stA/achievements', 403],
  [63, 'GET /students/:stA/achievements/progress', 403],
  [64, 'GET /students/:stA/streak', 403],
  [65, 'GET /students/:stA/challenges', 403],
  [66, 'POST /students/:stA/challenges', 403, null, { challenge_id: ':chA' }],
  [67, 'POST /students/:stB/challenges', 404, 'CHALLENGE_NOT_FOUND', { challenge_id: ':chA' }],
  [68, 'GET /messages/:stA', 403],
  [69, 'POST /messages/:stA', 403, null, { body: 'IT · ajeno' }],
  [70, 'POST /messages/:stA/read', 403],
  [71, 'PATCH /notifications/:notifA/read', 404, 'NOTIFICATION_NOT_FOUND'],
  [72, 'DELETE /notifications/tokens/:tokenA', 204],
  [73, 'POST /sessions/:sessB/sets', 200, null, set(':setA')],
  [96, 'PUT /students/:stA/avatar', 403],
  [97, 'DELETE /students/:stA/avatar', 403],
  [100, 'PATCH /students/:stA', 403, null, { phone: '11 2345 6789' }],
]);

// #72: responde 204 igual, pero el token de A sigue siendo de A.
cases[23].check = async (_res, w) => {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('user_id')
    .eq('token', w.A.pushToken);
  expect(error).toBeNull();
  expect(data).toEqual([{ user_id: w.A.student.id }]);
};
// #73: el lote de B rechaza la serie por conflicto y la de A queda intacta.
cases[24].check = async (res, w) => {
  expect(res.body.data.saved).toEqual([]);
  expect(res.body.data.failed).toEqual([
    expect.objectContaining({ id: w.A.setId, code: 'SET_ID_CONFLICT' }),
  ]);
  const detail = await api(w.A.trainer.token).get(
    `/students/${w.A.student.id}/sessions/${w.A.sessionId}`
  );
  const sets = detail.body.data.exercises.flatMap((e) => e.sets);
  expect(sets).toEqual([
    expect.objectContaining({ id: w.A.setId, actual_reps: 10, actual_kg: 40 }),
  ]);
};

describe('integración — aislamiento: alumno B sobre datos del alumno A', () => {
  beforeAll(async () => {
    worlds = { A: await buildWorld('a'), B: await buildWorld('b') };
  });

  runCases(cases, getWorlds);
  ownerControl(cases, getWorlds);
});
