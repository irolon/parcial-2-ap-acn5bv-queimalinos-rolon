import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockSessions, mockRepo, service, STUDENT_ID, SESSION_ID, SESSION,
  arrange, batch, rawSet, setId,
} from '../../../../helpers/sessions/session-sets-service.setup.js';

beforeEach(() => { jest.resetAllMocks(); arrange(); });

describe('session-sets.service · addSets (lote)', () => {
  it('24 series válidas: un solo upsert con 24 filas, todas created: true', async () => {
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: batch(24) });
    expect(mockRepo.upsertSets).toHaveBeenCalledTimes(1);
    const rows = mockRepo.upsertSets.mock.calls[0][0];
    expect(rows).toHaveLength(24);
    expect(rows.every((r) => r.session_id === SESSION_ID)).toBe(true);
    expect(res.saved).toHaveLength(24);
    expect(res.saved.every((s) => s.created === true)).toBe(true);
    expect(res.failed).toEqual([]);
  });

  it('reenviar el mismo lote (ya existe en esta sesión): upsert de 24, todas created: false', async () => {
    const sets = batch(24);
    arrange({ existing: sets.map((s) => ({ id: s.id, session_id: SESSION_ID })) });
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets });
    expect(mockRepo.upsertSets.mock.calls[0][0]).toHaveLength(24);
    expect(res.saved).toHaveLength(24);
    expect(res.saved.every((s) => s.created === false)).toBe(true);
  });

  it('corrección: la misma serie con otro actual_kg lleva el valor nuevo', async () => {
    const original = rawSet(1);
    arrange({ existing: [{ id: original.id, session_id: SESSION_ID }] });
    await service.addSets(STUDENT_ID, SESSION_ID, { sets: [{ ...original, actual_kg: 42.5 }] });
    expect(mockRepo.upsertSets.mock.calls[0][0][0]).toMatchObject({ id: original.id, actual_kg: 42.5 });
  });

  it('id en mayúsculas existente en minúsculas: es la misma serie (created: false)', async () => {
    const s = rawSet(1);
    arrange({ existing: [{ id: s.id, session_id: SESSION_ID }] });
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [{ ...s, id: s.id.toUpperCase() }] });
    expect(res.saved).toEqual([{ id: s.id, created: false }]);
  });

  it('lote mixto: válidas guardadas, inválidas en failed con su index', async () => {
    const sets = [rawSet(1), { ...rawSet(2), actual_reps: -1 }, rawSet(3), 'basura'];
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets });
    expect(res.saved.map((s) => s.id)).toEqual([setId(1), setId(3)]);
    expect(res.failed).toHaveLength(2);
    expect(res.failed[0]).toMatchObject({ id: setId(2), index: 1, code: 'VALIDATION_ERROR' });
    expect(res.failed[0].message).toContain('actual_reps');
    expect(res.failed[1]).toMatchObject({ index: 3, code: 'VALIDATION_ERROR' });
  });

  it('id repetido dentro del lote: la segunda va a failed', async () => {
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1), rawSet(1)] });
    expect(mockRepo.upsertSets.mock.calls[0][0]).toHaveLength(1);
    expect(res.saved).toHaveLength(1);
    expect(res.failed).toEqual([expect.objectContaining({ id: setId(1), index: 1, code: 'VALIDATION_ERROR' })]);
  });

  it('sesión cerrada: guarda igual', async () => {
    arrange({ session: { ...SESSION, finished_at: '2026-10-27T11:00:00-03:00' } });
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1)] });
    expect(res.saved).toHaveLength(1);
  });

  it('sesión ajena: 404 y no se consulta nada después', async () => {
    mockSessions.getOwnedSession.mockRejectedValue(Object.assign(new Error('x'), { code: 'SESSION_NOT_FOUND' }));
    await expect(service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1)] }))
      .rejects.toMatchObject({ code: 'SESSION_NOT_FOUND' });
    expect(mockRepo.findSetsByIds).not.toHaveBeenCalled();
    expect(mockRepo.upsertSets).not.toHaveBeenCalled();
  });

  it('envelope inválido: VALIDATION_ERROR', async () => {
    await expect(service.addSets(STUDENT_ID, SESSION_ID, { sets: [] }))
      .rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });
});
