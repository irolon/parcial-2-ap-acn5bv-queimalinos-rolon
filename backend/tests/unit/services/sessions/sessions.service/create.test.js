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

  it('routine_id ajena o borrada: crea la sesión con routine_id null (201), sin error', async () => {
    mockRepo.isRoutineOfStudent.mockResolvedValueOnce(false);
    mockRepo.insertSession.mockResolvedValueOnce(STORED);
    const result = await service.create(STUDENT_ID, { ...BODY, routine_id: ROUTINE_ID });
    expect(mockRepo.isRoutineOfStudent).toHaveBeenCalledWith(ROUTINE_ID, STUDENT_ID);
    expect(mockRepo.insertSession).toHaveBeenCalledWith({
      ...BODY, routine_id: null, student_id: STUDENT_ID,
    });
    expect(result.created).toBe(true);
  });

  it('routine_id propia: la crea vinculada', async () => {
    mockRepo.isRoutineOfStudent.mockResolvedValueOnce(true);
    mockRepo.insertSession.mockResolvedValueOnce({ ...STORED, routine_id: ROUTINE_ID });
    const result = await service.create(STUDENT_ID, { ...BODY, routine_id: ROUTINE_ID });
    expect(mockRepo.insertSession).toHaveBeenCalledWith({
      ...BODY, routine_id: ROUTINE_ID, student_id: STUDENT_ID,
    });
    expect(result.created).toBe(true);
  });

  describe('reintento (el id ya existe)', () => {
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
      mockRepo.updateSession.mockResolvedValueOnce(STORED);
      await service.create(STUDENT_ID, {
        ...BODY, routine_id: ROUTINE_ID, started_at: '2026-10-26T08:00:00-03:00', notes: 'ok',
      });
      expect(mockRepo.updateSession).toHaveBeenCalledWith(SESSION_ID, { notes: 'ok' });
      expect(mockRepo.isRoutineOfStudent).not.toHaveBeenCalled();
      expect(mockRepo.insertSession).not.toHaveBeenCalled();
    });

    it('routine_id borrada en el reintento: no se valida y igual guarda el cierre (200)', async () => {
      mockRepo.findSessionById.mockResolvedValueOnce(STORED);
      mockRepo.isRoutineOfStudent.mockResolvedValue(false);
      const closed = { ...STORED, finished_at: '2026-10-27T11:00:00-03:00' };
      mockRepo.updateSession.mockResolvedValueOnce(closed);
      const result = await service.create(STUDENT_ID, {
        ...BODY, routine_id: ROUTINE_ID, finished_at: '2026-10-27T11:00:00-03:00',
      });
      expect(result).toEqual({ session: closed, created: false });
    });

    it('finished_at anterior al started_at guardado: se ignora y guarda rpe y notes', async () => {
      mockRepo.findSessionById.mockResolvedValueOnce(STORED);
      mockRepo.updateSession.mockResolvedValueOnce(STORED);
      await service.create(STUDENT_ID, {
        ...BODY, finished_at: '2026-10-27T09:00:00-03:00', rpe: 5, notes: 'x',
      });
      expect(mockRepo.updateSession).toHaveBeenCalledWith(SESSION_ID, { rpe: 5, notes: 'x' });
    });

    it('carrera: el insert devuelve null y el existente es del alumno: va por el reintento', async () => {
      mockRepo.findSessionById.mockResolvedValueOnce(null).mockResolvedValueOnce(STORED);
      mockRepo.insertSession.mockResolvedValueOnce(null);
      mockRepo.updateSession.mockResolvedValueOnce(STORED);
      const result = await service.create(STUDENT_ID, { ...BODY, rpe: 4 });
      expect(mockRepo.updateSession).toHaveBeenCalledWith(SESSION_ID, { rpe: 4 });
      expect(result.created).toBe(false);
    });

    it('rpe ya guardado: el reintento con otro rpe no lo pisa ni llama a update', async () => {
      const stored = { ...STORED, rpe: 8 };
      mockRepo.findSessionById.mockResolvedValueOnce(stored);
      const result = await service.create(STUDENT_ID, { ...BODY, rpe: 7 });
      expect(mockRepo.updateSession).not.toHaveBeenCalled();
      expect(result).toEqual({ session: stored, created: false });
    });

    it('completa solo los campos null guardados (finished_at) y respeta los demás', async () => {
      mockRepo.findSessionById.mockResolvedValueOnce({ ...STORED, rpe: 8 });
      mockRepo.updateSession.mockResolvedValueOnce(STORED);
      await service.create(STUDENT_ID, {
        ...BODY, finished_at: '2026-10-27T11:00:00-03:00', rpe: 7, notes: 'n',
      });
      expect(mockRepo.updateSession).toHaveBeenCalledWith(SESSION_ID, {
        finished_at: '2026-10-27T11:00:00-03:00', notes: 'n',
      });
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
      mockRepo.findSessionById.mockResolvedValue(null);
      mockRepo.insertSession.mockResolvedValueOnce(null);
      await expect(service.create(STUDENT_ID, BODY)).rejects.toMatchObject({ code: 'SESSION_ID_CONFLICT' });
    });
  });
});
