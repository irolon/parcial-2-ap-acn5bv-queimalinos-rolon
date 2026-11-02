import { describe, expect, it } from 'vitest';
import { checkImageFile } from '@/utils/messages/imageFile';

const file = (type, size) => ({ type, size });
const MB = 1024 * 1024;

describe('checkImageFile', () => {
  it('acepta JPG, PNG y WebP de hasta 5 MB', () => {
    expect(checkImageFile(file('image/jpeg', 1))).toBeNull();
    expect(checkImageFile(file('image/png', 5 * MB))).toBeNull();
    expect(checkImageFile(file('image/webp', 2 * MB))).toBeNull();
  });

  it('rechaza más de 5 MB', () => {
    expect(checkImageFile(file('image/png', 5 * MB + 1))).toBe('La foto supera 5 MB');
  });

  it('rechaza otros tipos', () => {
    expect(checkImageFile(file('application/pdf', 100))).toBe('La foto tiene que ser JPG, PNG o WebP');
    expect(checkImageFile(file('image/gif', 100))).toBe('La foto tiene que ser JPG, PNG o WebP');
    expect(checkImageFile(file('', 100))).toBe('La foto tiene que ser JPG, PNG o WebP');
  });
});
