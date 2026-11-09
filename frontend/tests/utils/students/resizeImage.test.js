import { afterEach, describe, expect, it, vi } from 'vitest';
import { AVATAR_ACCEPT, AVATAR_MAX_SIDE, AVATAR_QUALITY, fitWithin, resizeToJpeg } from '@/utils/students/resizeImage';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('constantes de la foto', () => {
  it('acepta JPG, PNG y WebP, lado mayor 512 y calidad 0,85', () => {
    expect(AVATAR_ACCEPT).toBe('image/jpeg,image/png,image/webp');
    expect(AVATAR_MAX_SIDE).toBe(512);
    expect(AVATAR_QUALITY).toBe(0.85);
  });
});

describe('fitWithin', () => {
  it('escala el lado mayor a 512 conservando la proporción', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 512, height: 384 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 384, height: 512 });
    expect(fitWithin(1000, 333)).toEqual({ width: 512, height: 170 });
  });

  it('nunca agranda', () => {
    expect(fitWithin(300, 200)).toEqual({ width: 300, height: 200 });
  });

  it('respeta otro máximo', () => {
    expect(fitWithin(200, 100, 100)).toEqual({ width: 100, height: 50 });
  });
});

describe('resizeToJpeg', () => {
  it('un tipo fuera de la lista rechaza con IMAGE_TYPE_INVALID sin decodificar', async () => {
    const decode = vi.fn();
    vi.stubGlobal('createImageBitmap', decode);
    const heic = new File(['x'], 'foto.heic', { type: 'image/heic' });
    await expect(resizeToJpeg(heic)).rejects.toThrow('IMAGE_TYPE_INVALID');
    expect(decode).not.toHaveBeenCalled();
  });

  it('si el navegador no puede decodificarla rechaza con IMAGE_TYPE_INVALID', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad')));
    const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    await expect(resizeToJpeg(file)).rejects.toThrow('IMAGE_TYPE_INVALID');
  });

  it('dibuja en un canvas del tamaño achicado y devuelve un JPEG', async () => {
    const bitmap = { width: 4000, height: 3000, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage });
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation(function toBlobMock(cb) {
        cb(new Blob(['jpg'], { type: 'image/jpeg' }));
      });
    const out = await resizeToJpeg(new File(['x'], 'foto.png', { type: 'image/png' }));
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 512, 384);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.85);
    expect(out).toBeInstanceOf(File);
    expect(out.name).toBe('avatar.jpg');
    expect(out.type).toBe('image/jpeg');
  });
});
