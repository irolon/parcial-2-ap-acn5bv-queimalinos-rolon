import { Errors } from '../../../../../src/shared/utils/errors.js';
import {
  mockRepo,
  mockRoutinesService,
  service,
  TRAINER_ID,
  STRUCTURE,
  TEMPLATE,
  EX_ID,
} from '../../../../helpers/routine-templates/routine-templates-service.setup.js';

describe('routine-templates.service (CRUD)', () => {
  beforeEach(() => {
    mockRoutinesService.assertExercisesAccessible.mockResolvedValue();
    mockRepo.createTemplate.mockImplementation(async (f) => ({ id: 'tp-1', ...f }));
    mockRepo.updateTemplate.mockImplementation(async (id, f) => ({ ...TEMPLATE, ...f }));
  });

  describe('list', () => {
    it('lista las plantillas del trainer como resumen', async () => {
      mockRepo.findTemplates.mockResolvedValue([TEMPLATE]);
      const result = await service.list(TRAINER_ID, { goal: 'strength' });
      expect(mockRepo.findTemplates).toHaveBeenCalledWith({ trainerId: TRAINER_ID, goal: 'strength' });
      expect(result[0]).toMatchObject({ id: 'tp-1', exercise_count: 1, days: STRUCTURE.days });
      expect(result[0].structure).toBeUndefined();
    });
  });

  describe('create', () => {
    it('guarda frequency_per_week = days.length y generated_by_ai false', async () => {
      await service.create(TRAINER_ID, { name: 'Fuerza', goal: 'strength', level: null, structure: STRUCTURE });
      expect(mockRepo.createTemplate).toHaveBeenCalledWith({
        trainer_id: TRAINER_ID,
        name: 'Fuerza',
        goal: 'strength',
        level: null,
        frequency_per_week: 2,
        generated_by_ai: false,
        structure: STRUCTURE,
      });
    });

    it('lanza 403 si algún ejercicio no es accesible', async () => {
      mockRoutinesService.assertExercisesAccessible.mockRejectedValue(Errors.forbidden());
      await expect(
        service.create(TRAINER_ID, { name: 'F', goal: 'strength', structure: STRUCTURE })
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockRoutinesService.assertExercisesAccessible).toHaveBeenCalledWith(TRAINER_ID, [EX_ID]);
      expect(mockRepo.createTemplate).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('hidrata cada ejercicio con sus datos', async () => {
      mockRepo.findTemplateById.mockResolvedValue(TEMPLATE);
      mockRepo.findExercisesByIds.mockResolvedValue([{ id: EX_ID, name: 'Sentadilla' }]);
      const result = await service.getById(TRAINER_ID, 'tp-1');
      expect(result.structure.exercises[0].exercise).toEqual({ id: EX_ID, name: 'Sentadilla' });
      expect(result.structure.exercises[0].sets).toBe(4);
    });

    it('una structure incompleta ({}) no tira: devuelve exercises: [] para poder corregirla', async () => {
      mockRepo.findTemplateById.mockResolvedValue({ ...TEMPLATE, structure: {} });
      mockRepo.findExercisesByIds.mockResolvedValue([]);
      const result = await service.getById(TRAINER_ID, 'tp-1');
      expect(result.structure.exercises).toEqual([]);
    });

    it('deja exercise: null si el ejercicio ya no existe', async () => {
      mockRepo.findTemplateById.mockResolvedValue(TEMPLATE);
      mockRepo.findExercisesByIds.mockResolvedValue([]);
      const result = await service.getById(TRAINER_ID, 'tp-1');
      expect(result.structure.exercises[0].exercise).toBeNull();
    });

    it('404 TEMPLATE_NOT_FOUND si es de otro trainer', async () => {
      mockRepo.findTemplateById.mockResolvedValue({ ...TEMPLATE, trainer_id: 'otro' });
      await expect(service.getById(TRAINER_ID, 'tp-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'TEMPLATE_NOT_FOUND',
      });
    });

    it('404 TEMPLATE_NOT_FOUND si no existe', async () => {
      mockRepo.findTemplateById.mockResolvedValue(null);
      await expect(service.getById(TRAINER_ID, 'x')).rejects.toMatchObject({ code: 'TEMPLATE_NOT_FOUND' });
    });
  });

  describe('update', () => {
    it('recalcula frequency_per_week si viene structure', async () => {
      mockRepo.findTemplateById.mockResolvedValue(TEMPLATE);
      const structure = { ...STRUCTURE, days: ['monday', 'tuesday', 'friday'] };
      await service.update(TRAINER_ID, 'tp-1', { structure });
      expect(mockRepo.updateTemplate).toHaveBeenCalledWith('tp-1', { structure, frequency_per_week: 3 });
    });

    it('no toca frequency_per_week ni valida ejercicios si no viene structure', async () => {
      mockRepo.findTemplateById.mockResolvedValue(TEMPLATE);
      await service.update(TRAINER_ID, 'tp-1', { name: 'Nuevo' });
      expect(mockRepo.updateTemplate).toHaveBeenCalledWith('tp-1', { name: 'Nuevo' });
      expect(mockRoutinesService.findMissingExerciseIds).not.toHaveBeenCalled();
    });

    it('404 si la plantilla es ajena', async () => {
      mockRepo.findTemplateById.mockResolvedValue({ ...TEMPLATE, trainer_id: 'otro' });
      await expect(service.update(TRAINER_ID, 'tp-1', { name: 'N' })).rejects.toMatchObject({
        code: 'TEMPLATE_NOT_FOUND',
      });
      expect(mockRepo.updateTemplate).not.toHaveBeenCalled();
    });

    it('403 si structure incluye ejercicios no accesibles', async () => {
      mockRepo.findTemplateById.mockResolvedValue(TEMPLATE);
      mockRoutinesService.assertExercisesAccessible.mockRejectedValue(Errors.forbidden());
      await expect(service.update(TRAINER_ID, 'tp-1', { structure: STRUCTURE })).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('remove', () => {
    it('borra la plantilla propia', async () => {
      mockRepo.findTemplateById.mockResolvedValue(TEMPLATE);
      await service.remove(TRAINER_ID, 'tp-1');
      expect(mockRepo.deleteTemplate).toHaveBeenCalledWith('tp-1');
    });

    it('404 si es ajena y no borra', async () => {
      mockRepo.findTemplateById.mockResolvedValue({ ...TEMPLATE, trainer_id: 'otro' });
      await expect(service.remove(TRAINER_ID, 'tp-1')).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.deleteTemplate).not.toHaveBeenCalled();
    });
  });
});
