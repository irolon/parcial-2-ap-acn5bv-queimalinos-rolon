import { buildWorld } from '../../helpers/integration/isolation/world.js';
import { rows, runCases } from '../../helpers/integration/isolation/isolation.js';

// Rol equivocado (filas 74–93 de la tarea 9, y la 95 de GX4): el alumno en endpoints de PT y el PT
// en endpoints de alumno, todos 403 FORBIDDEN aunque el recurso sea propio.
let worlds;
const getWorlds = () => worlds;

const cases = [
  ...rows('studentA', [
    [74, 'GET /students'],
    [75, 'GET /students/overview'],
    [76, 'PATCH /students/:stA'],
    [77, 'POST /invitations'],
    [78, 'GET /exercises'],
    [79, 'POST /exercises'],
    [80, 'PATCH /exercises/:exA'],
    [81, 'GET /routines'],
    [82, 'POST /routines'],
    [83, 'GET /routines/:rtA'],
    [84, 'GET /routine-templates'],
    [85, 'POST /challenges'],
    [86, 'PATCH /challenges/:chA'],
    [87, 'POST /challenges/:chA/assignments'],
    [88, 'PATCH /sessions/:sessA/comment'],
    [89, 'POST /messages/broadcast'],
  ]),
  ...rows('trainerA', [
    [90, 'POST /sessions'],
    [91, 'GET /routines/today'],
    [92, 'GET /routines/mine'],
    [93, 'GET /exercises/library'],
    [95, 'DELETE /sessions/:sessA'],
  ]),
].map((c) => ({ ...c, status: 403, code: 'FORBIDDEN' }));

describe('integración — aislamiento: rol equivocado', () => {
  beforeAll(async () => {
    worlds = { A: await buildWorld('a') };
  });

  runCases(cases, getWorlds);
});
