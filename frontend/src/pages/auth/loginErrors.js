import { fieldErrorsFrom } from '@/utils/fieldErrors';

/**
 * Traduce el error normalizado del login a lo que muestra el formulario.
 * - `VALIDATION_ERROR` con detalles → un mensaje junto a cada campo.
 * - `INVALID_CREDENTIALS` → mensaje propio; `ACCOUNT_DISABLED` y el resto → el del backend.
 * @returns {{ form: string|null, fields: Record<string, string> }}
 */
export function toLoginErrors(error) {
  return fieldErrorsFrom(error, {
    fields: ['email', 'password'],
    messages: { INVALID_CREDENTIALS: 'Email o contraseña incorrectos' },
    fallback: 'No pudimos iniciar sesión',
  });
}
