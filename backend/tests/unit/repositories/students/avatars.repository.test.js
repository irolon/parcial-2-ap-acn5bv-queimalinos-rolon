import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const bucket = {
  upload: jest.fn(),
  remove: jest.fn(),
  createSignedUrls: jest.fn(),
};
const supabase = { storage: { from: jest.fn(() => bucket) } };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/students/avatars.repository.js'));

beforeEach(() => {
  jest.resetAllMocks();
  supabase.storage.from.mockReturnValue(bucket);
});

describe('avatars.repository', () => {
  it('upload sube al bucket avatars con el contentType', async () => {
    bucket.upload.mockResolvedValue({ error: null });
    const buf = Buffer.from([1]);
    await repo.upload('students/s-1/a.png', buf, 'image/png');
    expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
    expect(bucket.upload).toHaveBeenCalledWith('students/s-1/a.png', buf, { contentType: 'image/png' });
  });

  it('upload con error de Storage → error interno', async () => {
    bucket.upload.mockResolvedValue({ error: { message: 'x' } });
    await expect(repo.upload('p', Buffer.from([1]), 'image/png')).rejects.toMatchObject({ statusCode: 500 });
  });

  it('remove borra la ruta', async () => {
    bucket.remove.mockResolvedValue({ error: null });
    await repo.remove('p');
    expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
    expect(bucket.remove).toHaveBeenCalledWith(['p']);
  });

  it('remove con error → error interno', async () => {
    bucket.remove.mockResolvedValue({ error: { message: 'x' } });
    await expect(repo.remove('p')).rejects.toMatchObject({ statusCode: 500 });
  });

  it('signPaths firma todo en un pedido de 3600 s y descarta los que traen error', async () => {
    bucket.createSignedUrls.mockResolvedValue({
      data: [
        { path: 'a', signedUrl: 'https://a', error: null },
        { path: 'b', signedUrl: null, error: 'no existe' },
      ],
      error: null,
    });
    const map = await repo.signPaths(['a', 'b']);
    expect(bucket.createSignedUrls).toHaveBeenCalledTimes(1);
    expect(bucket.createSignedUrls).toHaveBeenCalledWith(['a', 'b'], 3600);
    expect(map.get('a')).toBe('https://a');
    expect(map.has('b')).toBe(false);
  });

  it('signPaths sin rutas devuelve un Map vacío sin llamar a Storage', async () => {
    const map = await repo.signPaths([]);
    expect(map.size).toBe(0);
    expect(bucket.createSignedUrls).not.toHaveBeenCalled();
  });

  it('signPaths con error → error interno', async () => {
    bucket.createSignedUrls.mockResolvedValue({ data: null, error: { message: 'x' } });
    await expect(repo.signPaths(['a'])).rejects.toMatchObject({ statusCode: 500 });
  });
});
