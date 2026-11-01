import { describe, expect, it } from 'vitest';
import { previewText } from '@/utils/messages/messagePreview';

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
