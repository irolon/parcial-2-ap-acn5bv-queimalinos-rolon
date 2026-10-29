import * as setsRepo from '../../repositories/sessions/session-sets.repository.js';
import { failure } from './classify-sets.js';

const conflict = (value, index) =>
  failure(value.id, index, 'SET_ID_CONFLICT', 'Ya existe una serie con ese id');

/**
 * Guarda las series sin pisar filas de otra sesión, aunque aparezcan entre la
 * lectura previa y la escritura: las nuevas se insertan ignorando duplicados y
 * las ya existentes en esta sesión se actualizan filtrando por session_id.
 * Una nueva que el insert omitió se relee: si quedó en ESTA sesión (otro request
 * del mismo lote) se actualiza con estos valores; si es de otra sesión (o
 * desapareció) va a `failed` como SET_ID_CONFLICT.
 * Devuelve las series guardadas ({ value, index, created }), en orden de entrada.
 */
export async function persistSets(sessionId, candidates, existingIds, failed) {
  const news = candidates.filter(({ value }) => !existingIds.has(value.id));
  const toUpdate = new Set(existingIds);
  const rowOf = ({ value }) => ({ ...value, session_id: sessionId });

  const inserted = new Set(news.length > 0 ? await setsRepo.insertNewSets(news.map(rowOf)) : []);
  const skipped = news.filter(({ value }) => !inserted.has(value.id)).map(({ value }) => value.id);
  if (skipped.length > 0) {
    for (const row of await setsRepo.findSetsByIds(skipped)) {
      if (row.session_id === sessionId) toUpdate.add(row.id);
    }
  }

  const updated = new Set();
  await Promise.all(candidates.filter(({ value }) => toUpdate.has(value.id)).map(async ({ value }) => {
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
