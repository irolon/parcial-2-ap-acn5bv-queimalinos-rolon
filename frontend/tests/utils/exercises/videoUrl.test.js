import { describe, expect, it } from 'vitest';
import { isSafeVideoUrl, isValidVideoUrl, thumbnailUrl, youTubeId } from '@/utils/exercises/videoUrl';

const ID = 'uEtiwYaT3d0';

describe('youTubeId', () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=5`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
  ])('extrae el id de %s', (url) => {
    expect(youTubeId(url)).toBe(ID);
  });

  it.each(['https://vimeo.com/1', 'no es url', null, undefined, 'https://www.youtube.com/watch'])(
    'devuelve null para %s',
    (url) => {
      expect(youTubeId(url)).toBeNull();
    },
  );
});

describe('thumbnailUrl', () => {
  it('arma la miniatura de YouTube o null', () => {
    expect(thumbnailUrl(`https://youtu.be/${ID}`)).toBe(`https://img.youtube.com/vi/${ID}/hqdefault.jpg`);
    expect(thumbnailUrl('https://vimeo.com/1')).toBeNull();
  });
});

describe('isSafeVideoUrl', () => {
  it('acepta solo http/https', () => {
    expect(isSafeVideoUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeVideoUrl('HTTPS://a.com')).toBe(true);
    expect(isSafeVideoUrl('http://a.com')).toBe(true);
    expect(isSafeVideoUrl(null)).toBe(false);
  });
});

describe('isValidVideoUrl', () => {
  it('acepta http/https con host, hasta 500 caracteres', () => {
    expect(isValidVideoUrl('https://youtu.be/abc')).toBe(true);
    expect(isValidVideoUrl('HTTP://a.com/x')).toBe(true);
    expect(isValidVideoUrl(`https://a.com/${'x'.repeat(486)}`)).toBe(true);
  });

  it('rechaza sin protocolo, sin host, de otro esquema o demasiado larga', () => {
    expect(isValidVideoUrl('youtube.com/watch?v=x')).toBe(false);
    expect(isValidVideoUrl('https://')).toBe(false);
    expect(isValidVideoUrl('javascript:alert(1)')).toBe(false);
    expect(isValidVideoUrl(`https://a.com/${'x'.repeat(487)}`)).toBe(false);
  });
});
