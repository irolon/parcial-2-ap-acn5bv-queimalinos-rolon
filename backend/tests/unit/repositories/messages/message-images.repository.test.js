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

const repo = await import(src('repositories/messages/message-images.repository.js'));

beforeEach(() => {
  jest.resetAllMocks();
  supabase.storage.from.mockReturnValue(bucket);
});

describe('message-images.repository', () => {
  it('uploadImage sube al bucket message-images con el contentType', async () => {
    bucket.upload.mockResolvedValue({ error: null });
    const buf = Buffer.from([1]);
    await repo.uploadImage('s/a.png', buf, 'image/png');
    expect(supabase.storage.from).toHaveBeenCalledWith('message-images');
    expect(bucket.upload).toHaveBeenCalledWith('s/a.png', buf, { contentType: 'image/png' });
  });

  it('uploadImage con error de Storage → error interno', async () => {
    bucket.upload.mockResolvedValue({ error: { message: 'x' } });
    await expect(repo.uploadImage('p', Buffer.from([1]), 'image/png')).rejects.toMatchObject({ statusCode: 500 });
  });

  it('removeImage borra el path', async () => {
    bucket.remove.mockResolvedValue({ error: null });
    await repo.removeImage('s/a.png');
    expect(bucket.remove).toHaveBeenCalledWith(['s/a.png']);
  });

  it('removeImage con error → error interno', async () => {
    bucket.remove.mockResolvedValue({ error: { message: 'x' } });
    await expect(repo.removeImage('p')).rejects.toMatchObject({ statusCode: 500 });
  });

  it('signUrls firma todo en un pedido de 3600 s y devuelve Map path → url', async () => {
    bucket.createSignedUrls.mockResolvedValue({
      data: [
        { path: 'a', signedUrl: 'https://a', error: null },
        { path: 'b', signedUrl: null, error: 'no existe' },
      ],
      error: null,
    });
    const map = await repo.signUrls(['a', 'b']);
    expect(bucket.createSignedUrls).toHaveBeenCalledTimes(1);
    expect(bucket.createSignedUrls).toHaveBeenCalledWith(['a', 'b'], 3600);
    expect(map.get('a')).toBe('https://a');
    expect(map.has('b')).toBe(false);
  });

  it('signUrls sin paths devuelve un Map vacío sin llamar a Storage', async () => {
    const map = await repo.signUrls([]);
    expect(map.size).toBe(0);
    expect(bucket.createSignedUrls).not.toHaveBeenCalled();
  });

  it('signUrls con error → error interno', async () => {
    bucket.createSignedUrls.mockResolvedValue({ data: null, error: { message: 'x' } });
    await expect(repo.signUrls(['a'])).rejects.toMatchObject({ statusCode: 500 });
  });
});
