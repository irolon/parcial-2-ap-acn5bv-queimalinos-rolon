import { api } from '../api.js';
import { worldIds } from './world.js';

const TOKEN_OF = {
  trainerA: (w) => w.A.trainer.token,
  trainerB: (w) => w.B.trainer.token,
  studentA: (w) => w.A.student.token,
  studentB: (w) => w.B.student.token,
};
const OWNER_OF = {
  trainerA: 'trainerA',
  trainerB: 'trainerA',
  studentA: 'studentA',
  studentB: 'studentA',
};

// `:stA`, `:sessB`, … en paths y bodies → el id de ese mundo.
const PLACEHOLDER = /:(st|ex|rt|re|sess|open|set|tp|ch|metric|notif|token)(A|B)\b/g;
const FIELD = {
  st: (x) => x.student.id,
  ex: (x) => x.exerciseId,
  rt: (x) => x.routineId,
  re: (x) => x.routineExerciseId,
  sess: (x) => x.sessionId,
  open: (x) => x.openSessionId, // la abierta (sin finished_at) que arma el test que la usa
  set: (x) => x.setId,
  tp: (x) => x.templateId,
  ch: (x) => x.challengeId,
  metric: (x) => x.metricId,
  notif: (x) => x.notificationId,
  token: (x) => encodeURIComponent(x.pushToken),
};

/** Reemplaza los marcadores por los ids de `w = { A, B }` (en strings, arrays y objetos). */
export function resolve(value, w) {
  if (typeof value === 'string') {
    return value.replace(PLACEHOLDER, (_m, kind, side) => FIELD[kind](w[side]));
  }
  if (Array.isArray(value)) return value.map((v) => resolve(v, w));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, w)]));
  }
  return value;
}

/** Filas `[n, 'GET /path/:stA', status, code?, body?]` de un actor → casos. */
export const rows = (as, table) =>
  table.map(([n, req, status, code, body]) => {
    const [method, path] = req.split(' ');
    return { name: `#${n} ${req}`, as, method: method.toLowerCase(), path, status, code, body };
  });

/** Manda la request de un caso como su actor. */
export function sendCase(c, w) {
  const req = api(TOKEN_OF[c.as](w))[c.method](resolve(c.path, w));
  return c.body ? req.send(resolve(c.body, w)) : req;
}

/** Verifica que el cuerpo no contenga ningún id del mundo. */
export function expectNoLeak(body, world) {
  const text = JSON.stringify(body);
  expect(worldIds(world).filter((id) => text.includes(id))).toEqual([]);
}

/**
 * Un `it` por caso `{ name, as, method, path, body?, status, code?, check?(res, w) }`.
 * En los rechazos verifica el código de error y que no venga `data`.
 */
export function runCases(cases, getWorlds) {
  it.each(cases)('$name → $status', async (c) => {
    const w = getWorlds();
    const res = await sendCase(c, w);
    expect({ status: res.status, body: res.body }).toMatchObject({ status: c.status });
    if (c.code) expect(res.body.error?.code).toBe(c.code);
    if (c.status >= 400) {
      expect(res.body.data).toBeUndefined();
      expectNoLeak(res.body, w.A); // ni el mensaje ni los details del error traen ids de A
    }
    if (c.check) await c.check(res, w);
  });
}

/**
 * Control positivo de los casos GET: la misma request como el dueño, con los ids
 * de A en lugar de los de B (w = { A, B: A }) → 200.
 */
export function ownerControl(cases, getWorlds) {
  const gets = cases
    .filter((c) => c.method === 'get')
    .map((c) => ({ ...c, name: `dueño: ${c.name}`, as: OWNER_OF[c.as] }));
  it.each(gets)('$name → 200', async (c) => {
    const { A } = getWorlds();
    const res = await sendCase(c, { A, B: A });
    expect({ status: res.status, body: res.body }).toMatchObject({ status: 200 });
  });
}
