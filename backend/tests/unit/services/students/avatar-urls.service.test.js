import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const signPaths = jest.fn();
jest.unstable_mockModule(src('repositories/students/avatars.repository.js'), () => ({ signPaths }));

const { signAvatars } = await import(src('services/students/avatar-urls.service.js'));

const PATH = 'students/s-1/a.jpg';

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('avatar-urls.service · signAvatars', () => {
  it('firma las rutas repetidas una sola vez y deja null sin foto', async () => {
    signPaths.mockResolvedValue(new Map([[PATH, 'https://signed/a']]));
    const rows = [{ id: '1', avatar_url: PATH }, { id: '2', avatar_url: null }, { id: '3', avatar_url: PATH }];
    const out = await signAvatars(rows);
    expect(signPaths).toHaveBeenCalledTimes(1);
    expect(signPaths).toHaveBeenCalledWith([PATH]);
    expect(out.map((r) => r.avatar_url)).toEqual(['https://signed/a', null, 'https://signed/a']);
  });

  it('si Storage falla, todas quedan en null y no tira (Review Focus 2)', async () => {
    signPaths.mockRejectedValue(new Error('storage caído'));
    const out = await signAvatars([{ id: '1', avatar_url: PATH }]);
    expect(out).toEqual([{ id: '1', avatar_url: null }]);
    expect(console.error).toHaveBeenCalled();
  });

  it('una ruta que no se pudo firmar queda en null', async () => {
    signPaths.mockResolvedValue(new Map());
    const out = await signAvatars([{ id: '1', avatar_url: PATH }]);
    expect(out[0].avatar_url).toBeNull();
  });

  it('no toca otros campos ni muta la entrada', async () => {
    signPaths.mockResolvedValue(new Map([[PATH, 'https://signed/a']]));
    const row = { id: '1', name: 'Ana', avatar_url: PATH };
    const [out] = await signAvatars([row]);
    expect(out).toEqual({ id: '1', name: 'Ana', avatar_url: 'https://signed/a' });
    expect(out).not.toBe(row);
    expect(row.avatar_url).toBe(PATH);
  });

  it('usa la clave que se le pasa', async () => {
    signPaths.mockResolvedValue(new Map([[PATH, 'https://signed/a']]));
    const [out] = await signAvatars([{ id: '1', photo: PATH }], 'photo');
    expect(out.photo).toBe('https://signed/a');
  });

  it('las filas null pasan tal cual', async () => {
    signPaths.mockResolvedValue(new Map());
    const out = await signAvatars([null, { id: '1', avatar_url: null }]);
    expect(out).toEqual([null, { id: '1', avatar_url: null }]);
  });

  it('una sola llamada a signPaths por invocación', async () => {
    signPaths.mockResolvedValue(new Map());
    await signAvatars([{ id: '1', avatar_url: null }, { id: '2', avatar_url: PATH }]);
    expect(signPaths).toHaveBeenCalledTimes(1);
  });
});
