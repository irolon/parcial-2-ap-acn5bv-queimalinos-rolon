import { detectImageType } from '../../../../src/shared/utils/image-type.js';

const bytes = (...b) => Buffer.from(b);
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

describe('detectImageType', () => {
  it('reconoce PNG por sus 8 bytes de firma', () => {
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({
      mime: 'image/png', ext: 'png',
    });
  });

  it('reconoce JPEG (FF D8 FF E0)', () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toEqual({
      mime: 'image/jpeg', ext: 'jpg',
    });
  });

  it('reconoce WebP (RIFF????WEBP)', () => {
    const webp = bytes(...ascii('RIFF'), 0x24, 0, 0, 0, ...ascii('WEBP'), ...ascii('VP8 '));
    expect(detectImageType(webp)).toEqual({ mime: 'image/webp', ext: 'webp' });
  });

  it('RIFF que no es WebP (WAVE) da null', () => {
    expect(detectImageType(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE')))).toBeNull();
  });

  it('PDF da null', () => {
    expect(detectImageType(Buffer.from('%PDF-1.7 ...'))).toBeNull();
  });

  it('buffer corto, vacío o ausente da null', () => {
    expect(detectImageType(bytes(0xff, 0xd8))).toBeNull();
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
    expect(detectImageType(undefined)).toBeNull();
  });
});
