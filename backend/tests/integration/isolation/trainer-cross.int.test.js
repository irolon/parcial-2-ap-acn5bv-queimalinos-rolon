import { api } from '../../helpers/integration/api.js';
import { buildWorld } from '../../helpers/integration/isolation/world.js';
import { ownerControl, rows, runCases } from '../../helpers/integration/isolation/isolation.js';

// PT B sobre los datos del PT A y de su alumno (filas 1–48 de la tarea 9),
// más el control positivo de los GET como PT A.
let worlds;
const getWorlds = () => worlds;

const exercises = (ex) => ({ exercises: [{ exercise_id: ex, sets: 3, reps: 10 }] });
const routine = (st, ex) => ({
  student_id: st,
  name: 'IT · Ajena',
  goal: 'hypertrophy',
  days: ['monday'],
  ...exercises(ex),
});
const NAME = { name: 'IT · Otro' };

// prettier-ignore
const cases = rows('trainerB', [
  [1, 'GET /students/:stA', 403],
  [2, 'PATCH /students/:stA', 403, null, NAME],
  [3, 'GET /students/:stA/attendance', 403],
  [4, 'GET /students/:stA/metrics', 403],
  [5, 'POST /students/:stA/metrics', 403, null, { weight_kg: 90 }],
  [6, 'DELETE /students/:stA/metrics/:metricA', 403],
  [7, 'DELETE /students/:stB/metrics/:metricA', 404, 'METRIC_NOT_FOUND'],
  [8, 'GET /students/:stA/sessions', 403],
  [9, 'GET /students/:stA/sessions/:sessA', 403],
  [10, 'GET /students/:stB/sessions/:sessA', 404, 'SESSION_NOT_FOUND'],
  [11, 'PATCH /sessions/:sessA/comment', 404, 'SESSION_NOT_FOUND', { trainer_comment: 'IT · ajeno' }],
  [12, 'GET /students/:stA/achievements', 403],
  [13, 'GET /students/:stA/achievements/progress', 403],
  [14, 'GET /students/:stA/streak', 403],
  [15, 'GET /students/:stA/challenges', 403],
  [16, 'POST /students/:stA/challenges', 403, null, { challenge_id: ':chB' }],
  [17, 'POST /students/:stB/challenges', 404, 'CHALLENGE_NOT_FOUND', { challenge_id: ':chA' }],
  [18, 'GET /routines/:rtA', 403],
  [19, 'PATCH /routines/:rtA', 403, null, NAME],
  [20, 'POST /routines/:rtA/exercises', 403, null, exercises(':exB')],
  [21, 'PUT /routines/:rtA/exercises/order', 403, null, { routine_exercise_ids: [':reA'] }],
  [22, 'PATCH /routines/:rtA/exercises/:reA', 403, null, { sets: 5 }],
  [23, 'DELETE /routines/:rtA/exercises/:reA', 403],
  [24, 'PATCH /routines/:rtB/exercises/:reA', 404, 'ROUTINE_EXERCISE_NOT_FOUND', { sets: 5 }],
  [25, 'POST /routines', 403, null, routine(':stA', ':exB')],
  [26, 'POST /routines', 403, null, routine(':stB', ':exA')],
  [27, 'POST /routines/:rtB/exercises', 403, null, exercises(':exA')],
  [28, 'GET /routine-templates/:tpA', 404, 'TEMPLATE_NOT_FOUND'],
  [29, 'PATCH /routine-templates/:tpA', 404, 'TEMPLATE_NOT_FOUND', NAME],
  [30, 'DELETE /routine-templates/:tpA', 404, 'TEMPLATE_NOT_FOUND'],
  [31, 'POST /routine-templates/:tpA/instantiate', 404, 'TEMPLATE_NOT_FOUND', { student_id: ':stB' }],
  [32, 'POST /routine-templates/:tpB/instantiate', 403, null, { student_id: ':stA' }],
  [33, 'POST /routine-templates/from-routine', 403, null, { routine_id: ':rtA' }],
  [34, 'PATCH /exercises/:exA', 403, null, NAME],
  [35, 'DELETE /exercises/:exA', 403],
  [36, 'PATCH /challenges/:chA', 404, 'CHALLENGE_NOT_FOUND', NAME],
  [37, 'DELETE /challenges/:chA', 404, 'CHALLENGE_NOT_FOUND'],
  [38, 'GET /challenges/:chA/active-students', 404, 'CHALLENGE_NOT_FOUND'],
  [39, 'POST /challenges/:chA/assignments', 404, 'CHALLENGE_NOT_FOUND', { student_ids: [':stB'] }],
  [40, 'GET /progress/exercise/:exA?student_id=:stA', 403],
  [41, 'GET /progress/exercise/:exA?student_id=:stB', 404, 'EXERCISE_NOT_FOUND'],
  [42, 'GET /progress/overview?student_id=:stA', 403],
  [43, 'GET /progress/body/:stA', 403],
  [44, 'GET /messages/:stA', 403],
  [45, 'POST /messages/:stA', 403, null, { body: 'IT · ajeno' }],
  [46, 'POST /messages/:stA/read', 403],
  [47, 'POST /messages/broadcast', 403, null, { student_ids: [':stA', ':stB'], body: 'IT · masivo' }],
  [48, 'POST /challenges/:chB/assignments', 201, null, { student_ids: [':stA'] }],
  [94, 'GET /students/:stA/export', 403],
  [95, 'POST /students/:stA/password-reset', 403],
]);

// #47: el masivo rechazado no le llega a nadie (B sigue con su único mensaje).
cases[46].check = async (_res, w) => {
  const history = await api(w.B.trainer.token).get(`/messages/${w.B.student.id}`);
  expect(history.body.data.map((m) => m.id)).toEqual([w.B.messageId]);
};
// #48: no es 403, el lote saltea al alumno ajeno.
cases[47].check = async (res, w) => {
  expect(res.body.data).toEqual({
    created: [],
    skipped: [{ student_id: w.A.student.id, reason: 'not_your_student' }],
  });
};

describe('integración — aislamiento: PT B sobre datos de A', () => {
  beforeAll(async () => {
    worlds = { A: await buildWorld('a'), B: await buildWorld('b') };
  });

  runCases(cases, getWorlds);
  ownerControl(cases, getWorlds);
});
