import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockMessagesRepo,
  mockStudentsRepo,
  mockAuthRepo,
  mockAvatarsRepo,
  TRAINER,
  STUDENT,
  STUDENT_ID,
  studentRow,
} from '../../../../helpers/messages/messages.setup.js';

const service = await import('../../../../../src/services/messages/messages.service.js');

const TRAINER_ROW = {
  id: TRAINER.id,
  name: 'Laura',
  email: 'x',
  avatar_url: null,
  professional_title: 'Lic. en Ed. Física',
};
const history = (user) => service.history(user, STUDENT_ID, { before: null, limit: 50 });

beforeEach(() => {
  jest.resetAllMocks();
  mockStudentsRepo.findStudentById.mockResolvedValue(studentRow());
  mockMessagesRepo.findPage.mockResolvedValue([]);
  mockAuthRepo.findTrainerById.mockResolvedValue(TRAINER_ROW);
});

describe('history: counterpart', () => {
  it('el PT ve al alumno, sin professional_title', async () => {
    const res = await history(TRAINER);
    expect(res.counterpart).toEqual({ id: STUDENT_ID, name: 'Ana', avatar_url: null });
    expect(res.counterpart).not.toHaveProperty('professional_title');
    expect(mockAuthRepo.findTrainerById).not.toHaveBeenCalled();
  });

  it('el alumno ve a su PT con el título profesional (GX2)', async () => {
    const res = await history(STUDENT);
    expect(mockAuthRepo.findTrainerById).toHaveBeenCalledWith(TRAINER.id);
    expect(res.counterpart).toEqual({
      id: TRAINER.id,
      name: 'Laura',
      avatar_url: null,
      professional_title: 'Lic. en Ed. Física',
    });
  });

  it('avatar_url con ruta sale firmada (GX2)', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(studentRow({ avatar_url: 'students/s/a.jpg' }));
    mockAvatarsRepo.signPaths.mockResolvedValue(new Map([['students/s/a.jpg', 'https://signed/a']]));
    const res = await history(TRAINER);
    expect(mockAvatarsRepo.signPaths).toHaveBeenCalledWith(['students/s/a.jpg']);
    expect(res.counterpart.avatar_url).toBe('https://signed/a');
  });

  it('si Storage cae, el historial sale con avatar_url null (GX2)', async () => {
    mockAuthRepo.findTrainerById.mockResolvedValue({ ...TRAINER_ROW, avatar_url: 'trainers/t/a.jpg' });
    mockAvatarsRepo.signPaths.mockRejectedValue(new Error('storage caído'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await history(STUDENT);
    expect(res.counterpart).toMatchObject({ name: 'Laura', avatar_url: null });
    log.mockRestore();
  });
});
