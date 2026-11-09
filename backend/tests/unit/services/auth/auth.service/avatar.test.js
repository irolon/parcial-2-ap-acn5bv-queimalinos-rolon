import { jest } from '@jest/globals';
import {
  mockRepo,
  mockStudentsRepo,
  mockAvatarsRepo,
  authService,
  hashPassword,
  TRAINER,
} from '../../../../helpers/auth/auth-service.setup.js';

// GX2: el login firma user.avatar_url (alumno y trainer): en la base hay una ruta del bucket privado.
describe('auth.service · login con avatar firmado (GX2)', () => {
  const PATH = 'students/student-1/a.jpg';
  const studentRow = async () => ({
    id: 'student-1',
    trainer_id: 'trainer-1',
    name: 'Alumna',
    email: 'alumna@mail.com',
    active: true,
    avatar_url: PATH,
    password_hash: await hashPassword('Password1'),
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRepo.findTrainerByEmailWithHash.mockResolvedValue(null);
    mockRepo.saveRefreshToken.mockResolvedValue(undefined);
  });

  it('alumno con foto → user.avatar_url es la URL firmada', async () => {
    mockStudentsRepo.findStudentByEmailWithHash.mockResolvedValueOnce(await studentRow());
    mockAvatarsRepo.signPaths.mockResolvedValueOnce(new Map([[PATH, 'https://signed/a']]));

    const { user, token } = await authService.login({ email: 'alumna@mail.com', password: 'Password1' });

    expect(mockAvatarsRepo.signPaths).toHaveBeenCalledWith([PATH]);
    expect(user).toMatchObject({ id: 'student-1', role: 'student', avatar_url: 'https://signed/a' });
    expect(user.password_hash).toBeUndefined();
    expect(token).toBeDefined();
  });

  it('si Storage cae, el login igual sale con avatar_url null (Review Focus 2)', async () => {
    mockStudentsRepo.findStudentByEmailWithHash.mockResolvedValueOnce(await studentRow());
    mockAvatarsRepo.signPaths.mockRejectedValueOnce(new Error('storage caído'));

    const { user, token } = await authService.login({ email: 'alumna@mail.com', password: 'Password1' });

    expect(user.avatar_url).toBeNull();
    expect(token).toBeDefined();
  });

  it('el trainer también sale firmado', async () => {
    const trainerPath = 'trainers/t/a.jpg';
    mockRepo.findTrainerByEmailWithHash.mockResolvedValueOnce({
      ...TRAINER,
      avatar_url: trainerPath,
      password_hash: await hashPassword('Password1'),
    });
    mockAvatarsRepo.signPaths.mockResolvedValueOnce(new Map([[trainerPath, 'https://signed/t']]));

    const { user } = await authService.login({ email: TRAINER.email, password: 'Password1' });

    expect(user).toMatchObject({ role: 'trainer', avatar_url: 'https://signed/t' });
  });
});
