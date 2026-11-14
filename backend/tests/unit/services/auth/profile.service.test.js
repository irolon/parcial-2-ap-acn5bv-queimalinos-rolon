import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const mockAuthRepo = { findTrainerById: jest.fn(), updateTrainer: jest.fn() };
const mockAvatarsRepo = { signPaths: jest.fn() };
jest.unstable_mockModule(src('repositories/auth/auth.repository.js'), () => mockAuthRepo);
jest.unstable_mockModule(src('repositories/students/avatars.repository.js'), () => mockAvatarsRepo);

const service = await import(src('services/auth/profile.service.js'));

const USER = { id: 't-1', role: 'trainer' };
const ROW = {
  id: 't-1',
  name: 'Laura Gómez',
  email: 'laura@mail.com',
  specialty: 'Fuerza',
  professional_title: null,
  avatar_url: 'trainers/t-1/a.jpg',
  password_changed_at: null,
  created_at: '2026-06-20T10:00:00Z',
};
const KEYS = ['avatar_url', 'created_at', 'email', 'id', 'name', 'password_changed_at', 'professional_title', 'specialty'];

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockAvatarsRepo.signPaths.mockImplementation(async (paths) => new Map(paths.map((p) => [p, `https://signed/${p}`])));
});

describe('profile.service (GX2)', () => {
  it('getMe devuelve las 8 claves con avatar_url firmado', async () => {
    mockAuthRepo.findTrainerById.mockResolvedValue({ ...ROW, extra: 'no sale' });

    const me = await service.getMe(USER);

    expect(mockAuthRepo.findTrainerById).toHaveBeenCalledWith('t-1');
    expect(Object.keys(me).sort()).toEqual(KEYS);
    expect(me.avatar_url).toBe('https://signed/trainers/t-1/a.jpg');
  });

  it('getMe sin trainer → 404 Cuenta no encontrada', async () => {
    mockAuthRepo.findTrainerById.mockResolvedValue(null);
    await expect(service.getMe(USER)).rejects.toMatchObject({ statusCode: 404, message: 'Cuenta no encontrada' });
  });

  it('getMe con Storage caído → avatar_url null, sin tirar', async () => {
    mockAuthRepo.findTrainerById.mockResolvedValue(ROW);
    mockAvatarsRepo.signPaths.mockRejectedValue(new Error('storage'));
    await expect(service.getMe(USER)).resolves.toMatchObject({ avatar_url: null });
  });

  it('updateMe guarda los campos y devuelve el perfil', async () => {
    mockAuthRepo.updateTrainer.mockResolvedValue({ ...ROW, professional_title: 'Lic.' });

    const me = await service.updateMe(USER, { professional_title: 'Lic.' });

    expect(mockAuthRepo.updateTrainer).toHaveBeenCalledWith('t-1', { professional_title: 'Lic.' });
    expect(Object.keys(me).sort()).toEqual(KEYS);
    expect(me.professional_title).toBe('Lic.');
  });

  it('updateMe sin trainer → 404', async () => {
    mockAuthRepo.updateTrainer.mockResolvedValue(null);
    await expect(service.updateMe(USER, { name: 'X Y' })).rejects.toMatchObject({ statusCode: 404 });
  });
});
