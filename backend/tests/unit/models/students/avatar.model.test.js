import {
  AVATARS_BUCKET,
  avatarPath,
  isStudentAvatarPath,
} from '../../../../src/models/students/avatar.model.js';

describe('avatar.model', () => {
  it('el bucket es avatars', () => {
    expect(AVATARS_BUCKET).toBe('avatars');
  });

  it('avatarPath arma students/<id>/<uuid>.<ext>', () => {
    expect(avatarPath('s-1', 'jpg')).toMatch(/^students\/s-1\/[0-9a-f-]{36}\.jpg$/);
  });

  it('avatarPath no repite la ruta entre llamadas', () => {
    expect(avatarPath('s-1', 'png')).not.toBe(avatarPath('s-1', 'png'));
  });

  it('isStudentAvatarPath: true solo para rutas de ese alumno en el bucket', () => {
    expect(isStudentAvatarPath('students/s-1/a.jpg', 's-1')).toBe(true);
    expect(isStudentAvatarPath('students/s-2/a.jpg', 's-1')).toBe(false);
    expect(isStudentAvatarPath('https://x/y.jpg', 's-1')).toBe(false);
    expect(isStudentAvatarPath(null, 's-1')).toBe(false);
  });
});
