import * as setsRepo from '../../repositories/sessions/session-sets.repository.js';
import { failure } from './classify-sets.js';

const conflict = (value, index) =>
  failure(value.id, index, 'SET_ID_CONFLICT', 'Ya existe una serie con ese id');

/**
 * Guarda las series sin pisar filas de otra sesión, aunque aparezcan entre la
 * lectura previa y la escritura: las nuevas se insertan ignorando duplicados y
 * las ya existentes en esta sesión se actualizan filtrando por session_id.
 * Lo que no se guarda va a `failed` como SET_ID_CONFLICT.
 * Devuelve las series guardadas ({ value, index, created }), en orden de entrada.
 */
export async function persistSets(sessionId, candidates, existingIds, failed) {
  const isNew = ({ value }) => !existingIds.has(value.id);
  const news = candidates.filter(isNew);
  const olds = candidates.filter((c) => !isNew(c));
  const rowOf = ({ value }) => ({ ...value, session_id: sessionId });

  const inserted = new Set(news.length > 0 ? await setsRepo.insertNewSets(news.map(rowOf)) : []);
  const updated = new Set();
  await Promise.all(olds.map(async ({ value }) => {
    const { id, ...fields } = value;
    if (await setsRepo.updateSetInSession(sessionId, id, fields)) updated.add(id);
  }));

  const saved = [];
  for (const c of candidates) {
    const created = inserted.has(c.value.id);
    if (created || updated.has(c.value.id)) saved.push({ ...c, created });
    else failed.push(conflict(c.value, c.index));
  }
  return saved;
}
