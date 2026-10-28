import { parseSet } from '../../validations/sessions/session-set.validation.js';

/** Entrada de `failed` de la respuesta de POST /sessions/:id/sets. */
export const failure = (id, index, code, message) => ({ id, index, code, message });

const rawId = (raw) => (typeof raw?.id === 'string' ? raw.id : null);

/**
 * Valida cada serie del lote. Devuelve las válidas con su índice original y
 * las fallidas (inválidas, o con un id ya usado antes en el mismo lote).
 */
export function parseBatch(sets) {
  const valid = [];
  const failed = [];
  const seen = new Set();
  sets.forEach((raw, index) => {
    const parsed = parseSet(raw);
    if (!parsed.ok) {
      const [first] = parsed.details;
      failed.push(failure(rawId(raw), index, 'VALIDATION_ERROR', `${first.field}: ${first.message}`));
    } else if (seen.has(parsed.value.id)) {
      failed.push(failure(parsed.value.id, index, 'VALIDATION_ERROR', 'id: repetido en el lote'));
    } else {
      seen.add(parsed.value.id);
      valid.push({ value: parsed.value, index });
    }
  });
  return { valid, failed };
}
