import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockRepo, mockAccess, service, USER, STUDENT_ID, S1, S2, row, set,
} from '../../../../helpers/sessions/session-history-service.setup.js';

beforeEach(() => {
  jest.resetAllMocks();
  mockAccess.assertCanAccessStudent.mockResolvedValue({ id: STUDENT_ID });
  mockRepo.findSessionsPage.mockResolvedValue({ data: [], total: 0 });
  mockRepo.findSetsForSessions.mockResolvedValue([]);
  mockRepo.fetchSessionRecords.mockResolvedValue([]);
  mockRepo.findRoutinesByIds.mockResolvedValue([]);
});

describe('session-history.service · listSessions', () => {
  it('sin permiso: propaga el 403 y no consulta nada', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValueOnce(new Error('forbidden'));
    await expect(service.listSessions(USER, STUDENT_ID, { page: 1, limit: 20 })).rejects.toThrow('forbidden');
    expect(mockAccess.assertCanAccessStudent).toHaveBeenCalledWith(USER, STUDENT_ID);
    expect(mockRepo.findSessionsPage).not.toHaveBeenCalled();
  });

  it('pagina y arma meta', async () => {
    mockRepo.findSessionsPage.mockResolvedValueOnce({ data: [row(S1)], total: 57 });
    const res = await service.listSessions(USER, STUDENT_ID, { page: 2, limit: 20 });
    expect(mockRepo.findSessionsPage).toHaveBeenCalledWith(STUDENT_ID, { page: 2, limit: 20 });
    expect(res.meta).toEqual({ total: 57, page: 2, limit: 20, total_pages: 3 });
  });

  it('página vacía: no hace consultas por lote', async () => {
    const res = await service.listSessions(USER, STUDENT_ID, { page: 1, limit: 20 });
    expect(res).toEqual({ data: [], meta: { total: 0, page: 1, limit: 20, total_pages: 0 } });
    expect(mockRepo.findSetsForSessions).not.toHaveBeenCalled();
    expect(mockRepo.fetchSessionRecords).not.toHaveBeenCalled();
    expect(mockRepo.findRoutinesByIds).not.toHaveBeenCalled();
  });

  it('resumen completo: duración, volumen, has_pr del RPC y routine', async () => {
    mockRepo.findSessionsPage.mockResolvedValueOnce({
      data: [row(S1), row(S2, { routine_id: null })],
      total: 2,
    });
    mockRepo.findSetsForSessions.mockResolvedValueOnce([
      set('a', S1, { actual_reps: 10, actual_kg: 50 }),
      set('b', S1, { actual_reps: 5, actual_kg: 20 }),
      set('c', S2, { actual_reps: 8, actual_kg: 10 }),
    ]);
    mockRepo.fetchSessionRecords.mockResolvedValueOnce([{ session_id: S1, exercise_id: 'e-1' }]);
    mockRepo.findRoutinesByIds.mockResolvedValueOnce([{ id: 'r-1', name: 'Push' }]);
    const { data } = await service.listSessions(USER, STUDENT_ID, { page: 1, limit: 20 });
    expect(data[0]).toMatchObject({
      id: S1, duration_min: 54, sets: 2, volume_kg: 600, has_pr: true, routine: { id: 'r-1', name: 'Push' },
    });
    expect(data[1]).toMatchObject({ id: S2, sets: 1, volume_kg: 80, has_pr: false, routine: null });
  });

  it('sesión sin cerrar (finished_at null): duration_min null', async () => {
    mockRepo.findSessionsPage.mockResolvedValueOnce({ data: [row(S1, { finished_at: null })], total: 1 });
    const { data } = await service.listSessions(USER, STUDENT_ID, { page: 1, limit: 20 });
    expect(data[0]).toMatchObject({ finished_at: null, duration_min: null });
  });

  it('rutina borrada (id sin fila): routine null', async () => {
    mockRepo.findSessionsPage.mockResolvedValueOnce({ data: [row(S1)], total: 1 });
    const { data } = await service.listSessions(USER, STUDENT_ID, { page: 1, limit: 20 });
    expect(data[0].routine).toBeNull();
  });

  it('consultas por lote: una por tabla, con todos los ids de la página', async () => {
    mockRepo.findSessionsPage.mockResolvedValueOnce({ data: [row(S1), row(S2)], total: 2 });
    await service.listSessions(USER, STUDENT_ID, { page: 1, limit: 20 });
    expect(mockRepo.findSetsForSessions).toHaveBeenCalledTimes(1);
    expect(mockRepo.findSetsForSessions).toHaveBeenCalledWith([S1, S2]);
    expect(mockRepo.fetchSessionRecords).toHaveBeenCalledTimes(1);
    expect(mockRepo.fetchSessionRecords).toHaveBeenCalledWith(STUDENT_ID, [S1, S2]);
    expect(mockRepo.findRoutinesByIds).toHaveBeenCalledTimes(1);
    expect(mockRepo.findRoutinesByIds).toHaveBeenCalledWith(['r-1']);
  });
});
