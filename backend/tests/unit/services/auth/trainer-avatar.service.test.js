import { jest } from '@jest/globals';
import {
  mockAvatarsRepo,
  mockAuthRepo,
  service,
  SELF,
  PREV,
  JPEG,
  NEW_PATH_RE,
} from '../../../helpers/auth/trainer-avatar-service.setup.js';

const file = (buffer = JPEG) => ({ buffer, mimetype: 'image/jpeg', size: buffer.length });
const withPrev = (avatar_url) => mockAuthRepo.findTrainerById.mockResolvedValue({ id: 't-1', avatar_url });

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  withPrev(PREV);
  mockAvatarsRepo.upload.mockResolvedValue(undefined);
  mockAvatarsRepo.remove.mockResolvedValue(undefined);
  mockAuthRepo.updateTrainer.mockImplementation(async (id, f) => ({ id, ...f }));
  mockAvatarsRepo.signPaths.mockImplementation(async (paths) => new Map(paths.map((p) => [p, `https://signed/${p}`])));
});

describe('trainer-avatar.service · setAvatar', () => {
  it('alumno → 403 sin tocar Storage', async () => {
    await expect(service.setAvatar({ id: 's-1', role: 'student' }, file())).rejects.toMatchObject({ statusCode: 403 });
    expect(mockAvatarsRepo.upload).not.toHaveBeenCalled();
  });

  it('sin archivo → 400 en image', async () => {
    await expect(service.setAvatar(SELF, undefined)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'image', message: 'Elegí una foto' }],
    });
  });

  it('firma inválida → 415 IMAGE_TYPE_INVALID y no sube nada', async () => {
    await expect(service.setAvatar(SELF, file(Buffer.from('hola')))).rejects.toMatchObject({
      statusCode: 415,
      code: 'IMAGE_TYPE_INVALID',
    });
    expect(mockAvatarsRepo.upload).not.toHaveBeenCalled();
  });

  it('JPEG válido: sube a trainers/<id>/, guarda la ruta, borra la anterior y devuelve la URL firmada', async () => {
    const out = await service.setAvatar(SELF, file());

    const [path, buffer, type] = mockAvatarsRepo.upload.mock.calls[0];
    expect(path).toMatch(NEW_PATH_RE);
    expect(buffer).toBe(JPEG);
    expect(type).toBe('image/jpeg');
    expect(mockAuthRepo.updateTrainer).toHaveBeenCalledWith('t-1', { avatar_url: path });
    expect(mockAvatarsRepo.remove).toHaveBeenCalledWith(PREV);
    expect(out).toEqual({ avatar_url: `https://signed/${path}` });
  });

  it.each([null, 'https://otro/x.jpg', 'trainers/t-2/x.jpg', 'students/t-1/x.jpg'])(
    'anterior %p → no se borra',
    async (prev) => {
      withPrev(prev);
      await service.setAvatar(SELF, file());
      expect(mockAvatarsRepo.remove).not.toHaveBeenCalled();
    }
  );

  it('cuenta inexistente → 404 sin subir nada', async () => {
    mockAuthRepo.findTrainerById.mockResolvedValue(null);
    await expect(service.setAvatar(SELF, file())).rejects.toMatchObject({ statusCode: 404 });
    expect(mockAvatarsRepo.upload).not.toHaveBeenCalled();
  });

  it('si guardar la ruta falla, borra la subida y propaga el error', async () => {
    const boom = new Error('db');
    mockAuthRepo.updateTrainer.mockRejectedValue(boom);

    await expect(service.setAvatar(SELF, file())).rejects.toBe(boom);

    const uploaded = mockAvatarsRepo.upload.mock.calls[0][0];
    expect(mockAvatarsRepo.remove).toHaveBeenCalledWith(uploaded);
    expect(mockAvatarsRepo.remove).not.toHaveBeenCalledWith(PREV);
  });

  it('si no se puede borrar la anterior, la respuesta sale igual (best-effort)', async () => {
    mockAvatarsRepo.remove.mockRejectedValue(new Error('storage'));
    const out = await service.setAvatar(SELF, file());
    expect(out.avatar_url).toMatch(/^https:\/\/signed\/trainers\/t-1\//);
  });

  it('si la subida falla, no toca la base', async () => {
    mockAvatarsRepo.upload.mockRejectedValue(new Error('storage'));
    await expect(service.setAvatar(SELF, file())).rejects.toThrow('storage');
    expect(mockAuthRepo.updateTrainer).not.toHaveBeenCalled();
  });
});

describe('trainer-avatar.service · removeAvatar', () => {
  it('alumno → 403', async () => {
    await expect(service.removeAvatar({ id: 's-1', role: 'student' })).rejects.toMatchObject({ statusCode: 403 });
    expect(mockAuthRepo.updateTrainer).not.toHaveBeenCalled();
  });

  it('con foto: deja avatar_url en null y la borra del bucket', async () => {
    await service.removeAvatar(SELF);
    expect(mockAuthRepo.updateTrainer).toHaveBeenCalledWith('t-1', { avatar_url: null });
    expect(mockAvatarsRepo.remove).toHaveBeenCalledWith(PREV);
  });

  it('sin foto: no hace nada (idempotente)', async () => {
    withPrev(null);
    await service.removeAvatar(SELF);
    expect(mockAuthRepo.updateTrainer).not.toHaveBeenCalled();
    expect(mockAvatarsRepo.remove).not.toHaveBeenCalled();
  });

  it('ruta ajena: la saca de la cuenta pero no la borra del bucket', async () => {
    withPrev('trainers/t-2/x.jpg');
    await service.removeAvatar(SELF);
    expect(mockAuthRepo.updateTrainer).toHaveBeenCalledWith('t-1', { avatar_url: null });
    expect(mockAvatarsRepo.remove).not.toHaveBeenCalled();
  });

  it('si el borrado del archivo falla, no rompe', async () => {
    mockAvatarsRepo.remove.mockRejectedValue(new Error('storage'));
    await expect(service.removeAvatar(SELF)).resolves.toBeUndefined();
  });

  it('cuenta inexistente → 404', async () => {
    mockAuthRepo.findTrainerById.mockResolvedValue(null);
    await expect(service.removeAvatar(SELF)).rejects.toMatchObject({ statusCode: 404 });
  });
});
