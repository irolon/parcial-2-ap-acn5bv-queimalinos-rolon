import { jest } from '@jest/globals';

/**
 * Supabase falso para los repositories de trainer-ai y chat: cada consulta encadenable anota
 * sus llamadas en `calls` ([método, ...args]) y al hacer await devuelve `result`.
 * `rpc` devuelve `rpcResult`. Reiniciar con reset() en beforeEach.
 */
const CHAIN = ['select', 'insert', 'update', 'eq', 'neq', 'not', 'or', 'in', 'gte', 'lt', 'order', 'limit', 'single', 'maybeSingle'];

export const fake = { calls: [], tables: [], result: { data: null, error: null }, rpcResult: { data: null, error: null } };

function query() {
  const q = {};
  for (const method of CHAIN) {
    q[method] = (...args) => {
      fake.calls.push([method, ...args]);
      return q;
    };
  }
  q.then = (resolve, reject) => Promise.resolve(fake.result).then(resolve, reject);
  return q;
}

export const supabase = {
  from: jest.fn((table) => {
    fake.tables.push(table);
    return query();
  }),
  rpc: jest.fn(async () => fake.rpcResult),
};

export function reset() {
  fake.calls = [];
  fake.tables = [];
  fake.result = { data: null, error: null };
  fake.rpcResult = { data: null, error: null };
  supabase.from.mockClear();
  supabase.rpc.mockClear();
}

/** Argumentos de las llamadas a `method` en la última consulta. */
export const callsOf = (method) => fake.calls.filter(([m]) => m === method).map(([, ...args]) => args);
