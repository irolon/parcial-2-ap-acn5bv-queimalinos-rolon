import { describe, expect, it } from 'vitest';
import { badgeText, previewText } from '@/utils/messages/messagePreview';

const msg = (extra) => ({ body: 'Hola', has_image: false, sender_role: 'student', created_at: 'x', ...extra });

describe('previewText', () => {
  it('texto de la otra persona sin prefijo', () => {
    expect(previewText(msg(), true)).toBe('Hola');
  });

  it('prefijo "Vos: " si lo mandó quien mira (PT o alumno)', () => {
    expect(previewText(msg({ sender_role: 'trainer' }), true)).toBe('Vos: Hola');
    expect(previewText(msg({ sender_role: 'student' }), false)).toBe('Vos: Hola');
    expect(previewText(msg({ sender_role: 'trainer' }), false)).toBe('Hola');
  });

  it('solo foto → "📷 Foto"', () => {
    expect(previewText(msg({ body: null, has_image: true }), true)).toBe('📷 Foto');
    expect(previewText(msg({ body: null, has_image: true, sender_role: 'trainer' }), true)).toBe('Vos: 📷 Foto');
  });

  it('con texto y foto muestra el texto', () => {
    expect(previewText(msg({ body: 'Mirá', has_image: true }), true)).toBe('Mirá');
  });

  it('recorta a 60 y junta saltos de línea', () => {
    expect(previewText(msg({ body: 'a'.repeat(60) }), true)).toBe('a'.repeat(60));
    expect(previewText(msg({ body: 'a'.repeat(61) }), true)).toBe(`${'a'.repeat(60)}…`);
    expect(previewText(msg({ body: 'uno\n\ndos' }), true)).toBe('uno dos');
  });

  it('sin mensajes devuelve vacío', () => {
    expect(previewText(null, true)).toBe('');
  });
});

describe('badgeText', () => {
  it('oculto en 0, número hasta 9 y "9+" desde 10', () => {
    expect(badgeText(0)).toBeNull();
    expect(badgeText(undefined)).toBeNull();
    expect(badgeText(1)).toBe('1');
    expect(badgeText(9)).toBe('9');
    expect(badgeText(10)).toBe('9+');
    expect(badgeText(120)).toBe('9+');
  });
});
