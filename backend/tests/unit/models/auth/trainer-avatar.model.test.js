import { trainerAvatarPath, isTrainerAvatarPath } from '../../../../src/models/auth/trainer-avatar.model.js';

describe('trainer-avatar.model', () => {
  it('trainerAvatarPath arma trainers/<id>/<uuid>.<ext>, distinta en cada llamada', () => {
    expect(trainerAvatarPath('t-1', 'webp')).toMatch(/^trainers\/t-1\/[0-9a-f-]{36}\.webp$/);
    expect(trainerAvatarPath('t-1', 'jpg')).not.toBe(trainerAvatarPath('t-1', 'jpg'));
  });

  it('isTrainerAvatarPath: true solo para rutas de ese PT en el bucket', () => {
    expect(isTrainerAvatarPath('trainers/t-1/a.jpg', 't-1')).toBe(true);
    expect(isTrainerAvatarPath('trainers/t-2/a.jpg', 't-1')).toBe(false);
    expect(isTrainerAvatarPath('students/t-1/a.jpg', 't-1')).toBe(false);
    expect(isTrainerAvatarPath('https://x/y.jpg', 't-1')).toBe(false);
    expect(isTrainerAvatarPath(null, 't-1')).toBe(false);
  });
});
