import { jest } from '@jest/globals';

/**
 * Fake mínimo del cliente de supabase-js para los scripts de mantenimiento.
 * Registra cada cadena (`from` + método + filtros) en `calls` y resuelve con
 * la respuesta configurada para `<tabla>:<operación>` (operación = select | delete).
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
        const response = responses[`${table}:${call.op}`] ?? { data: [], error: null };
        return Promise.resolve(response).then(resolve, reject);
      },
    };
    for (const method of ['in', 'like', 'lt', 'eq']) {
      builder[method] = (column, value) => {
        call.filters.push([method, column, value]);
        return builder;
      };
    }
    return builder;
  });
  return { from, calls };
}
