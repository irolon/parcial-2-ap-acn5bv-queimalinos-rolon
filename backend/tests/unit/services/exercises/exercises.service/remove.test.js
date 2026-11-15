import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  mockRepo,
  service,
  TRAINER_ID,
  OWN_EXERCISE,
  GLOBAL_EXERCISE,
} from '../../../../helpers/exercises/exercises-service.setup.js';

const ARCHIVED = { ...OWN_EXERCISE, archived_at: '2026-11-14T12:00:00.000Z' };

beforeEach(() => jest.clearAllMocks());

describe('exercises.service — remove (borrar o archivar)', () => {
  it('borra un ejercicio propio que no está en uso', async () => {
    mockRepo.findExerciseById.mockResolvedValue({ ...OWN_EXERCISE, archived_at: null });
    mockRepo.deleteExercise.mockResolvedValue(true);

    await expect(service.remove(TRAINER_ID, 'ex-1')).resolves.toEqual({ id: 'ex-1', archived: false });
    expect(mockRepo.deleteExercise).toHaveBeenCalledWith('ex-1');
    expect(mockRepo.archiveExercise).not.toHaveBeenCalled();
  });

  it('si está en una rutina o en el historial, lo archiva en vez de fallar', async () => {
    mockRepo.findExerciseById.mockResolvedValue({ ...OWN_EXERCISE, archived_at: null });
    mockRepo.deleteExercise.mockResolvedValue(false);
    mockRepo.archiveExercise.mockResolvedValue();

    await expect(service.remove(TRAINER_ID, 'ex-1')).resolves.toEqual({ id: 'ex-1', archived: true });
    expect(mockRepo.archiveExercise).toHaveBeenCalledWith('ex-1');
  });

  it('un ejercicio ya archivado es 404 (para el PT ya no está en la biblioteca)', async () => {
    mockRepo.findExerciseById.mockResolvedValue(ARCHIVED);
    await expect(service.remove(TRAINER_ID, 'ex-1')).rejects.toMatchObject({ statusCode: 404 });
    expect(mockRepo.deleteExercise).not.toHaveBeenCalled();
    expect(mockRepo.archiveExercise).not.toHaveBeenCalled();
  });

  it('lanza NOT_FOUND si no existe', async () => {
    mockRepo.findExerciseById.mockResolvedValue(null);
    await expect(service.remove(TRAINER_ID, 'x')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lanza FORBIDDEN al intentar borrar o archivar uno global o ajeno', async () => {
    mockRepo.findExerciseById.mockResolvedValue(GLOBAL_EXERCISE);
    await expect(service.remove(TRAINER_ID, 'ex-2')).rejects.toMatchObject({ statusCode: 403 });
    mockRepo.findExerciseById.mockResolvedValue({ ...OWN_EXERCISE, trainer_id: 'otro' });
    await expect(service.remove(TRAINER_ID, 'ex-1')).rejects.toMatchObject({ statusCode: 403 });
    expect(mockRepo.deleteExercise).not.toHaveBeenCalled();
    expect(mockRepo.archiveExercise).not.toHaveBeenCalled();
  });
});

describe('exercises.service — update de un archivado', () => {
  it('es 404 y no lo modifica', async () => {
    mockRepo.findExerciseById.mockResolvedValue(ARCHIVED);
    await expect(service.update(TRAINER_ID, 'ex-1', { name: 'X' })).rejects.toMatchObject({ statusCode: 404 });
    expect(mockRepo.updateExercise).not.toHaveBeenCalled();
  });
});
