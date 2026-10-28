import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockRepo, service, STUDENT_ID, SESSION_ID, ROUTINE_ID, BODY, STORED,
} from '../../../../helpers/sessions/sessions-service.setup.js';

beforeEach(() => jest.resetAllMocks());

describe('sessions.service · create', () => {
  it('crea una sesión nueva con el student_id del token', async () => {
    mockRepo.insertSession.mockResolvedValueOnce(STORED);
    const result = await service.create(STUDENT_ID, BODY);
    expect(mockRepo.insertSession).toHaveBeenCalledWith({ ...BODY, student_id: STUDENT_ID });
    expect(result).toEqual({ session: STORED, created: true });
  });

  it('sin routine_id no consulta la propiedad de la rutina', async () => {
    mockRepo.insertSession.mockResolvedValueOnce(STORED);
    await service.create(STUDENT_ID, BODY);
    expect(mockRepo.isRoutineOfStudent).not.toHaveBeenCalled();
  });

  it('routine_id de otra persona: VALIDATION_ERROR sobre routine_id, sin insertar', async () => {
    mockRepo.isRoutineOfStudent.mockResolvedValueOnce(false);
    await expect(service.create(STUDENT_ID, { ...BODY, routine_id: ROUTINE_ID })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [expect.objectContaining({ field: 'routine_id' })],
    });
    expect(mockRepo.isRoutineOfStudent).toHaveBeenCalledWith(ROUTINE_ID, STUDENT_ID);
    expect(mockRepo.insertSession).not.toHaveBeenCalled();
  });

  it('routine_id propia: la crea', async () => {
    mockRepo.isRoutineOfStudent.mockResolvedValueOnce(true);
    mockRepo.insertSession.mockResolvedValueOnce({ ...STORED, routine_id: ROUTINE_ID });
    const result = await service.create(STUDENT_ID, { ...BODY, routine_id: ROUTINE_ID });
    expect(result.created).toBe(true);
  });

  describe('reintento (el id ya existe)', () => {
    beforeEach(() => mockRepo.insertSession.mockResolvedValueOnce(null));

    it('actualiza solo finished_at, rpe y notes que vinieron', async () => {
      mockRepo.findSessionById.mockResolvedValueOnce(STORED);
      const closed = { ...STORED, finished_at: '2026-10-27T11:00:00-03:00', rpe: 7 };
      mockRepo.updateSession.mockResolvedValueOnce(closed);
      const result = await service.create(STUDENT_ID, {
        ...BODY, finished_at: '2026-10-27T11:00:00-03:00', rpe: 7,
      });
      expect(mockRepo.updateSession).toHaveBeenCalledWith(SESSION_ID, {
        finished_at: '2026-10-27T11:00:00-03:00', rpe: 7,
      });
      expect(result).toEqual({ session: closed, created: false });
    });

    it('ignora started_at y routine_id distintos (no se envían al update)', async () => {
      mockRepo.findSessionById.mockResolvedValueOnce(STORED);
      mockRepo.isRoutineOfStudent.mockResolvedValueOnce(true);
      mockRepo.updateSession.mockResolvedValueOnce(STORED);
      await service.create(STUDENT_ID, {
        ...BODY, routine_id: ROUTINE_ID, started_at: '2026-10-26T08:00:00-03:00', notes: 'ok',
      });
      expect(mockRepo.updateSession).toHaveBeenCalledWith(SESSION_ID, { notes: 'ok' });
    });

    it('sin campos nuevos no llama a updateSession y devuelve lo guardado', async () => {
      mockRepo.findSessionById.mockResolvedValueOnce(STORED);
      const result = await service.create(STUDENT_ID, BODY);
      expect(mockRepo.updateSession).not.toHaveBeenCalled();
      expect(result).toEqual({ session: STORED, created: false });
    });

    it('existente de otro alumno: 409 SESSION_ID_CONFLICT', async () => {
      mockRepo.findSessionById.mockResolvedValueOnce({ ...STORED, student_id: 'st-2' });
      await expect(service.create(STUDENT_ID, BODY)).rejects.toMatchObject({
        statusCode: 409, code: 'SESSION_ID_CONFLICT',
      });
      expect(mockRepo.updateSession).not.toHaveBeenCalled();
    });

    it('el existente desapareció entre el insert y la lectura: 409', async () => {
      mockRepo.findSessionById.mockResolvedValueOnce(null);
      await expect(service.create(STUDENT_ID, BODY)).rejects.toMatchObject({ code: 'SESSION_ID_CONFLICT' });
    });
  });
});
