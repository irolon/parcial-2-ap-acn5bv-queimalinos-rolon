import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Express real (createApp) con JWT reales y un supabase falso que se comporta como las tablas de la agenda,
// incluido el índice único parcial (trainer_id, scheduled_at) where status <> 'cancelled' (23505).
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockNotify = { notify: jest.fn(), pushOnly: jest.fn() };

export const TRAINER_ID = '11111111-1111-4111-8111-111111111111';
export const STUDENT_ID = '22222222-2222-4222-8222-222222222222';
export const STUDENT2_ID = '33333333-3333-4333-8333-333333333333';
export const OTHER_TRAINER_ID = '99999999-9999-4999-8999-999999999999';

/** Estado de la "base"; los tests lo reinician con resetDb(). */
export const db = { students: [], availability: [], appointments: [], rpcCalls: [] };

export function resetDb() {
  db.students = [
    { id: STUDENT_ID, trainer_id: TRAINER_ID, name: 'Lucía', avatar_url: null, active: true },
    { id: STUDENT2_ID, trainer_id: TRAINER_ID, name: 'Marcos', avatar_url: null, active: true },
  ];
  db.availability = [];
  db.appointments = [];
  db.rpcCalls = [];
}

const sameInstant = (a, b) => new Date(a).getTime() === new Date(b).getTime();

function selectAppointments(calls) {
  let rows = db.appointments;
  for (const [method, args] of calls) {
    if (method === 'eq') rows = rows.filter((r) => r[args[0]] === args[1]);
    if (method === 'in') rows = rows.filter((r) => args[1].includes(r[args[0]]));
    if (method === 'gte') rows = rows.filter((r) => new Date(r[args[0]]) >= new Date(args[1]));
    if (method === 'lt') rows = rows.filter((r) => new Date(r[args[0]]) < new Date(args[1]));
  }
  return [...rows].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
}

const embed = (row) => ({
  ...row,
  student: db.students.find((s) => s.id === row.student_id) ?? null,
});

function handleAppointments(calls) {
  const insert = calls.find(([m]) => m === 'insert');
  if (insert) {
    const row = insert[1][0];
    const taken = db.appointments.some(
      (a) => a.trainer_id === row.trainer_id && sameInstant(a.scheduled_at, row.scheduled_at) && a.status !== 'cancelled'
    );
    if (taken) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
    const created = {
      id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(db.appointments.length + 1).padStart(12, '0')}`,
      created_at: '2026-11-04T12:00:00Z',
      notes: null,
      ...row,
    };
    db.appointments.push(created);
    return { data: embed(created), error: null };
  }
  const update = calls.find(([m]) => m === 'update');
  const rows = selectAppointments(calls);
  if (update) {
    if (!rows[0]) return { data: null, error: null };
    Object.assign(rows[0], update[1][0]);
    return { data: embed(rows[0]), error: null };
  }
  if (calls.some(([m]) => m === 'maybeSingle')) return { data: rows[0] ? embed(rows[0]) : null, error: null };
  const wantsOnlyDate = calls.some(([m, a]) => m === 'select' && a[0] === 'scheduled_at');
  return { data: wantsOnlyDate ? rows.map((r) => ({ scheduled_at: r.scheduled_at })) : rows.map(embed), error: null };
}

function handle({ table, calls }) {
  if (table === 'appointments') return handleAppointments(calls);
  if (table === 'students') {
    const id = calls.find(([m, a]) => m === 'eq' && a[0] === 'id')?.[1][1];
    return { data: db.students.find((s) => s.id === id) ?? null, error: null };
  }
  if (table === 'trainer_availability') {
    const id = calls.find(([m, a]) => m === 'eq' && a[0] === 'trainer_id')?.[1][1];
    return { data: db.availability.filter((a) => a.trainer_id === id), error: null };
  }
  return { data: null, error: { message: `tabla inesperada ${table}` } };
}

const builder = (op) =>
  new Proxy({}, {
    get: (_t, method) => {
      if (method === 'then') return (res, rej) => Promise.resolve(handle(op)).then(res, rej);
      return (...args) => {
        op.calls.push([method, args]);
        return builder(op);
      };
    },
  });

const supabase = {
  from: (table) => builder({ table, calls: [] }),
  rpc: (name, args) => {
    db.rpcCalls.push({ name, args });
    const rows = args.p_slots.map((s) => ({ ...s, trainer_id: args.p_trainer, start_time: `${s.start_time}:00`, end_time: `${s.end_time}:00` }));
    db.availability = rows;
    return Promise.resolve({ data: rows, error: null });
  },
};

jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));
jest.unstable_mockModule(src('services/notifications/notify.service.js'), () => mockNotify);
jest.unstable_mockModule(src('repositories/notifications/trigger-data.repository.js'), () => ({}));

const { createApp } = await import(src('app.js'));
const { signAccessToken } = await import(src('shared/utils/jwt.js'));

export const tokenFor = (sub, role) => signAccessToken({ sub, role, email: `${role}@fit.test` });

let server;
let base;

export async function startServer() {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}

export const stopServer = () => new Promise((resolve) => server.close(resolve));

/** request('post', '/api/appointments', { as: token, body }) → { status, body } */
export async function request(method, path, { as, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method: method.toUpperCase(),
    headers: {
      ...(as ? { authorization: `Bearer ${as}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
