import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockRepo, service, STUDENT_ID, SESSION_ID, EX_A, EX_B, arrange, rawSet, setId,
} from '../../../../helpers/sessions/session-sets-service.setup.js';

beforeEach(() => { jest.resetAllMocks(); arrange(); });

describe('session-sets.service · addSets (carrera entre la lectura y la escritura)', () => {
  it('las nuevas se insertan sin pisar (created: true)', async () => {
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1), rawSet(2)] });
    expect(mockRepo.insertNewSets.mock.calls[0][0].map((r) => r.id)).toEqual([setId(1), setId(2)]);
    expect(res.saved).toEqual([{ id: setId(1), created: true }, { id: setId(2), created: true }]);
  });

  it('el insert devuelve menos ids que los enviados: los faltantes van a SET_ID_CONFLICT', async () => {
    mockRepo.insertNewSets.mockResolvedValue([setId(1)]);
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1), rawSet(2)] });
    expect(res.saved).toEqual([{ id: setId(1), created: true }]);
    expect(res.failed).toEqual([expect.objectContaining({ id: setId(2), index: 1, code: 'SET_ID_CONFLICT' })]);
  });

  it('el update no devuelve la fila (cambió de sesión): SET_ID_CONFLICT', async () => {
    arrange({ existing: [{ id: setId(1), session_id: SESSION_ID }, { id: setId(2), session_id: SESSION_ID }] });
    mockRepo.updateSetInSession.mockImplementation(async (_sid, id) => id !== setId(2));
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1), rawSet(2)] });
    expect(res.saved).toEqual([{ id: setId(1), created: false }]);
    expect(res.failed).toEqual([expect.objectContaining({ id: setId(2), index: 1, code: 'SET_ID_CONFLICT' })]);
  });

  it('lote mixto nuevas y existentes: insert y update por separado, saved en orden', async () => {
    arrange({ existing: [{ id: setId(2), session_id: SESSION_ID }] });
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1), rawSet(2), rawSet(3)] });
    expect(mockRepo.insertNewSets.mock.calls[0][0].map((r) => r.id)).toEqual([setId(1), setId(3)]);
    expect(mockRepo.updateSetInSession).toHaveBeenCalledTimes(1);
    expect(res.saved).toEqual([
      { id: setId(1), created: true }, { id: setId(2), created: false }, { id: setId(3), created: true },
    ]);
  });

  it('la sustitución no guardada (conflicto en la carrera) no marca la sesión', async () => {
    mockRepo.insertNewSets.mockResolvedValue([]);
    await service.addSets(STUDENT_ID, SESSION_ID, {
      sets: [rawSet(1, { exercise_id: EX_B, original_exercise_id: EX_A })],
    });
    expect(mockRepo.markSessionModified).not.toHaveBeenCalled();
  });

  it('solo cuenta la sustitución guardada: marca si al menos una se guardó', async () => {
    mockRepo.insertNewSets.mockResolvedValue([setId(2)]);
    await service.addSets(STUDENT_ID, SESSION_ID, {
      sets: [rawSet(1), rawSet(2, { exercise_id: EX_B, original_exercise_id: EX_A })],
    });
    expect(mockRepo.markSessionModified).toHaveBeenCalledWith(SESSION_ID);
  });
});
