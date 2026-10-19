import { fieldErrorsFrom } from '@/utils/fieldErrors';

/**
 * Traduce el error normalizado del registro a lo que muestra el formulario.
 * - `EMAIL_ALREADY_EXISTS` → mensaje en el campo email.
 * - `VALIDATION_ERROR` con detalles → un mensaje junto a cada campo.
 * - el resto → mensaje general.
 * @returns {{ form: string|null, fields: Record<string, string> }}
 */
export function toRegisterErrors(error) {
  return fieldErrorsFrom(error, {
    fields: ['name', 'email', 'password', 'specialty'],
    fieldCodes: {
      EMAIL_ALREADY_EXISTS: { field: 'email', message: 'Ya existe una cuenta con ese email' },
    },
    fallback: 'No pudimos crear tu cuenta',
  });
}
