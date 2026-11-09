import { Errors } from '../../shared/utils/errors.js';

const isString = (v) => typeof v === 'string';

/**
 * Valida el body de PATCH /auth/me (GX2, solo trainer): name (2–100) y
 * professional_title (2–80, o null / vacío para borrarlo), recortados. Los demás
 * campos (email, specialty…) se ignoran. Exige al menos uno.
 */
export function validateUpdateMe(body) {
  const details = [];
  const out = {};

  if (body.name !== undefined) {
    const name = isString(body.name) ? body.name.trim() : '';
    if (name.length < 2 || name.length > 100) {
      details.push({ field: 'name', message: 'name debe tener entre 2 y 100 caracteres' });
    } else out.name = name;
  }
  if (body.professional_title !== undefined) {
    const title = isString(body.professional_title) ? body.professional_title.trim() : body.professional_title;
    if (title === null || title === '') out.professional_title = null;
    else if (!isString(title) || title.length < 2 || title.length > 80) {
      details.push({ field: 'professional_title', message: 'professional_title debe tener entre 2 y 80 caracteres' });
    } else out.professional_title = title;
  }

  if (details.length > 0) throw Errors.validation('Error de validación', details);
  if (Object.keys(out).length === 0) {
    throw Errors.validation('Mandá al menos un campo para actualizar', [
      { field: 'body', message: 'Campos editables: name, professional_title' },
    ]);
  }
  return out;
}
