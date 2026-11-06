import { jest } from '@jest/globals';

/**
 * Fake mínimo del cliente de supabase-js para los scripts de mantenimiento.
 * Registra cada cadena (`from` + método + filtros) en `calls` y resuelve con
 * la respuesta configurada para `<tabla>:<operación>` (operación = select | delete):
 * un `{ data, error }` fijo o una función `(call) => { data, error }` (p. ej. por página).
 */
export function createFakeSupabase(responses = {}) {
  const calls = [];
  const from = jest.fn((table) => {
    const call = { table, op: null, filters: [] };
    calls.push(call);
    const builder = {
      select: (cols) => {
        call.op = 'select';
        call.columns = cols;
        return builder;
      },
      delete: () => {
        call.op = 'delete';
        return builder;
      },
      then: (resolve, reject) => {
        const configured = responses[`${table}:${call.op}`] ?? { data: [], error: null };
        const response = typeof configured === 'function' ? configured(call) : configured;
        return Promise.resolve(response).then(resolve, reject);
      },
    };
    for (const method of ['in', 'like', 'lt', 'eq', 'order', 'range']) {
      builder[method] = (column, value) => {
        call.filters.push([method, column, value]);
        return builder;
      };
    }
    return builder;
  });
  return { from, calls };
}
