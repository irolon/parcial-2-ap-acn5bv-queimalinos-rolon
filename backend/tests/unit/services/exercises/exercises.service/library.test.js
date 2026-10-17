import {
  mockRepo,
  mockStudentsRepo,
  service,
  TRAINER_ID,
} from '../../../../helpers/exercises/exercises-service.setup.js';

const LIBRARY = [{ id: 'ex-1', name: 'Press banca', muscle_group: 'chest', equipment: null, description: null, video_url: null }];

describe('exercises.service · library', () => {
  it('trae los globales y los del entrenador del alumno', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValueOnce({ id: 'st-1', trainer_id: TRAINER_ID });
    mockRepo.findLibrary.mockResolvedValueOnce(LIBRARY);

    expect(await service.library('st-1')).toEqual(LIBRARY);
    expect(mockStudentsRepo.findStudentById).toHaveBeenCalledWith('st-1');
    expect(mockRepo.findLibrary).toHaveBeenCalledWith(TRAINER_ID);
  });

  it('alumno sin entrenador: pide solo los globales', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValueOnce({ id: 'st-1', trainer_id: null });
    mockRepo.findLibrary.mockResolvedValueOnce([]);

    expect(await service.library('st-1')).toEqual([]);
    expect(mockRepo.findLibrary).toHaveBeenCalledWith(null);
  });

  it('lanza NOT_FOUND si el alumno del token no existe', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValueOnce(null);

    await expect(service.library('st-x')).rejects.toMatchObject({ statusCode: 404 });
    expect(mockRepo.findLibrary).not.toHaveBeenCalled();
  });
});
