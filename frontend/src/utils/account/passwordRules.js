// Reglas de la clave nueva: las mismas que el backend (≥ 8, una mayúscula, un número).

export const PASSWORD_RULES = [
  { id: 'length', label: '8 caracteres o más' },
  { id: 'upper', label: 'Una mayúscula' },
  { id: 'number', label: 'Un número' },
];

const TESTS = {
  length: (pw) => pw.length >= 8,
  upper: (pw) => /[A-Z]/.test(pw),
  number: (pw) => /[0-9]/.test(pw),
};

/** Cada regla con `ok` según la clave (para la lista en vivo). */
export function checkPasswordRules(password = '') {
  return PASSWORD_RULES.map((rule) => ({ ...rule, ok: TESTS[rule.id](password) }));
}

/** Errores por campo del formulario de cambio (`{}` si está todo bien). */
export function validatePasswordChange({ current_password = '', new_password = '', repeat = '' }) {
  const errors = {};
  if (!current_password) errors.current_password = 'Ingresá tu contraseña actual';
  if (!checkPasswordRules(new_password).every((rule) => rule.ok)) {
    errors.new_password = 'Tiene que tener 8 caracteres o más, una mayúscula y un número';
  } else if (new_password === current_password) {
    errors.new_password = 'Tiene que ser distinta de la actual';
  }
  if (repeat !== new_password) errors.repeat = 'Las contraseñas no coinciden';
  return errors;
}
