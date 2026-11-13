import {
  generateTemporaryPassword,
  TEMP_PASSWORD_ALPHABET,
} from '../../../../src/shared/utils/password.js';

// GX1: la clave temporal se dicta o se pasa por WhatsApp, así que no lleva
// caracteres que se confunden entre sí.
describe('generateTemporaryPassword', () => {
  it('tiene 10 caracteres, todos del alfabeto', () => {
    const temporary = generateTemporaryPassword();
    expect(temporary).toHaveLength(10);
    for (const char of temporary) expect(TEMP_PASSWORD_ALPHABET).toContain(char);
  });

  it('el alfabeto no tiene caracteres ambiguos (0 O 1 l I)', () => {
    for (const char of ['0', 'O', '1', 'l', 'I']) {
      expect(TEMP_PASSWORD_ALPHABET).not.toContain(char);
    }
  });

  it('siempre tiene al menos una mayúscula y un número (cumple las reglas del registro)', () => {
    for (let i = 0; i < 200; i += 1) {
      const temporary = generateTemporaryPassword();
      expect(temporary).toMatch(/[A-Z]/);
      expect(temporary).toMatch(/[0-9]/);
    }
  });

  it('1000 muestras son todas distintas', () => {
    const samples = Array.from({ length: 1000 }, () => generateTemporaryPassword());
    expect(new Set(samples).size).toBe(1000);
  });
});
