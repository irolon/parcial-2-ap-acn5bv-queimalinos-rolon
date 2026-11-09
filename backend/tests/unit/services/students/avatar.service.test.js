import { jest } from '@jest/globals';
import {
  mockAvatarsRepo,
  mockStudentsRepo,
  mockAccess,
  service,
  SELF,
  PREV,
  PNG,
  NEW_PATH_RE,
} from '../../../helpers/students/avatar-service.setup.js';

const file = (buffer = PNG) => ({ buffer, mimetype: 'image/png', size: buffer.length });
const withPrev = (avatar_url) => mockAccess.assertCanAccessStudent.mockResolvedValue({ id: 's-1', avatar_url });

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  withPrev(PREV);
  mockAvatarsRepo.upload.mockResolvedValue(undefined);
  mockAvatarsRepo.remove.mockResolvedValue(undefined);
  mockStudentsRepo.updateStudent.mockImplementation(async (id, f) => ({ id, ...f }));
  mockAvatarsRepo.signPaths.mockImplementation(async (paths) => new Map(paths.map((p) => [p, `https://signed/${p}`])));
});

describe('avatar.service · setAvatar (GX2)', () => {
  it('trainer → 403 sin tocar Storage', async () => {
    await expect(service.setAvatar({ id: 't-1', role: 'trainer' }, 's-1', file())).rejects.toMatchObject({ statusCode: 403 });
    expect(mockAvatarsRepo.upload).not.toHaveBeenCalled();
  });

  it('otro alumno → 403', async () => {
    await expect(service.setAvatar({ id: 's-2', role: 'student' }, 's-1', file())).rejects.toMatchObject({ statusCode: 403 });
    expect(mockAvatarsRepo.upload).not.toHaveBeenCalled();
  });

  it('sin archivo → 400 en image', async () => {
    await expect(service.setAvatar(SELF, 's-1', undefined)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'image', message: 'Elegí una foto' }],
    });
  });

  it('firma inválida → 415 IMAGE_TYPE_INVALID y no sube nada', async () => {
    await expect(service.setAvatar(SELF, 's-1', file(Buffer.from('hola')))).rejects.toMatchObject({
      statusCode: 415,
      code: 'IMAGE_TYPE_INVALID',
    });
    expect(mockAvatarsRepo.upload).not.toHaveBeenCalled();
  });

  it('PNG válido: sube, guarda la ruta, borra la anterior y devuelve la URL firmada', async () => {
    const out = await service.setAvatar(SELF, 's-1', file());

    const [path, buffer, type] = mockAvatarsRepo.upload.mock.calls[0];
    expect(path).toMatch(NEW_PATH_RE);
    expect(buffer).toBe(PNG);
    expect(type).toBe('image/png');
    expect(mockStudentsRepo.updateStudent).toHaveBeenCalledWith('s-1', { avatar_url: path });
    expect(mockAvatarsRepo.remove).toHaveBeenCalledWith(PREV);
    expect(out).toEqual({ avatar_url: `https://signed/${path}` });
  });

  it.each([null, 'https://otro/x.jpg', 'students/s-2/x.jpg'])('anterior %p → no se borra', async (prev) => {
    withPrev(prev);
    await service.setAvatar(SELF, 's-1', file());
    expect(mockAvatarsRepo.remove).not.toHaveBeenCalled();
  });

  it('si guardar la ruta falla, borra la subida y propaga el error (Review Focus 3)', async () => {
    const boom = new Error('db');
    mockStudentsRepo.updateStudent.mockRejectedValue(boom);

    await expect(service.setAvatar(SELF, 's-1', file())).rejects.toBe(boom);

    const uploaded = mockAvatarsRepo.upload.mock.calls[0][0];
    expect(mockAvatarsRepo.remove).toHaveBeenCalledWith(uploaded);
    expect(mockAvatarsRepo.remove).not.toHaveBeenCalledWith(PREV);
  });

  it('si borrar la subida también falla, igual sale el error original', async () => {
    const boom = new Error('db');
    mockStudentsRepo.updateStudent.mockRejectedValue(boom);
    mockAvatarsRepo.remove.mockRejectedValue(new Error('storage'));
    await expect(service.setAvatar(SELF, 's-1', file())).rejects.toBe(boom);
  });

  it('si borrar la anterior falla, igual devuelve la foto nueva (Review Focus 3)', async () => {
    mockAvatarsRepo.remove.mockRejectedValue(new Error('storage'));
    const out = await service.setAvatar(SELF, 's-1', file());
    expect(out.avatar_url).toMatch(/^https:\/\/signed\//);
    expect(console.error).toHaveBeenCalled();
  });

  it('si no se puede firmar, devuelve avatar_url null', async () => {
    mockAvatarsRepo.signPaths.mockRejectedValue(new Error('storage'));
    await expect(service.setAvatar(SELF, 's-1', file())).resolves.toEqual({ avatar_url: null });
  });
});

describe('avatar.service · removeAvatar (GX2)', () => {
  it('trainer u otro alumno → 403', async () => {
    await expect(service.removeAvatar({ id: 't-1', role: 'trainer' }, 's-1')).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.removeAvatar({ id: 's-2', role: 'student' }, 's-1')).rejects.toMatchObject({ statusCode: 403 });
    expect(mockStudentsRepo.updateStudent).not.toHaveBeenCalled();
  });

  it('sin foto no hace nada (idempotente)', async () => {
    withPrev(null);
    await service.removeAvatar(SELF, 's-1');
    expect(mockStudentsRepo.updateStudent).not.toHaveBeenCalled();
    expect(mockAvatarsRepo.remove).not.toHaveBeenCalled();
  });

  it('con foto: la saca de la ficha y la borra del bucket', async () => {
    await service.removeAvatar(SELF, 's-1');
    expect(mockStudentsRepo.updateStudent).toHaveBeenCalledWith('s-1', { avatar_url: null });
    expect(mockAvatarsRepo.remove).toHaveBeenCalledWith(PREV);
  });

  it('si borrar del bucket falla, igual termina', async () => {
    mockAvatarsRepo.remove.mockRejectedValue(new Error('storage'));
    await expect(service.removeAvatar(SELF, 's-1')).resolves.toBeUndefined();
  });

  it('una foto que no es del bucket se saca de la ficha pero no se borra', async () => {
    withPrev('https://otro/x.jpg');
    await service.removeAvatar(SELF, 's-1');
    expect(mockStudentsRepo.updateStudent).toHaveBeenCalledWith('s-1', { avatar_url: null });
    expect(mockAvatarsRepo.remove).not.toHaveBeenCalled();
  });
});
