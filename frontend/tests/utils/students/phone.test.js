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

  it('recorta antes de validar', () => {
    expect(validatePhone('  123456  ')).toBeNull();
  });
});

describe('whatsappHref', () => {
  it('arma wa.me con solo los dígitos', () => {
    expect(whatsappHref('+54 9 11 2233-4455')).toBe('https://wa.me/5491122334455');
  });

  it('sin dígitos suficientes o vacío → null', () => {
    expect(whatsappHref('(--)')).toBeNull();
    expect(whatsappHref('12 34')).toBeNull();
    expect(whatsappHref('')).toBeNull();
    expect(whatsappHref(null)).toBeNull();
  });
});
