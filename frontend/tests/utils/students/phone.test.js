import { describe, expect, it } from 'vitest';
import { PHONE_ERROR, validatePhone, whatsappHref } from '@/utils/students/phone';

describe('validatePhone', () => {
  it('acepta números con espacios, + - ( )', () => {
    expect(validatePhone('+54 9 11 2233-4455')).toBeNull();
    expect(validatePhone('(011) 4455-6677')).toBeNull();
  });

  it('vacío es válido (el teléfono es opcional)', () => {
    expect(validatePhone('')).toBeNull();
    expect(validatePhone('   ')).toBeNull();
    expect(validatePhone(null)).toBeNull();
  });

  it('menos de 6, más de 30 o con letras → PHONE_ERROR', () => {
    expect(validatePhone('12345')).toBe(PHONE_ERROR);
    expect(validatePhone('1'.repeat(31))).toBe(PHONE_ERROR);
    expect(validatePhone('11 2233 abcd')).toBe(PHONE_ERROR);
  });

  it('sin al menos 6 dígitos → PHONE_ERROR aunque tenga 6+ caracteres', () => {
    expect(validatePhone('------')).toBe(PHONE_ERROR);
    expect(validatePhone('(12) 3-4-5')).toBe(PHONE_ERROR);
    expect(validatePhone('12-34-56')).toBeNull();
  });

  it('recorta antes de validar', () => {
    expect(validatePhone('  123456  ')).toBeNull();
  });
});

describe('whatsappHref', () => {
  it('arma wa.me con solo los dígitos', () => {
    expect(whatsappHref('+54 9 11 2233-4455')).toBe('https://wa.me/5491122334455');
  });

  it('normaliza números argentinos al formato internacional (549 + área + número)', () => {
    expect(whatsappHref('11 2345-6789')).toBe('https://wa.me/5491123456789');
    expect(whatsappHref('011 2345 6789')).toBe('https://wa.me/5491123456789');
    expect(whatsappHref('+54 9 11 2345 6789')).toBe('https://wa.me/5491123456789');
    expect(whatsappHref('5411 2345 6789')).toBe('https://wa.me/5491123456789');
  });

  it('si no reconoce el formato deja los dígitos como están', () => {
    expect(whatsappHref('2345678')).toBe('https://wa.me/2345678');
    expect(whatsappHref('+1 (415) 555-26710')).toBe('https://wa.me/141555526710');
  });

  it('sin dígitos suficientes o vacío → null', () => {
    expect(whatsappHref('(--)')).toBeNull();
    expect(whatsappHref('12 34')).toBeNull();
    expect(whatsappHref('')).toBeNull();
    expect(whatsappHref(null)).toBeNull();
  });
});
