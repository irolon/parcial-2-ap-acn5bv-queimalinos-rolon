/**
 * Área de toque mínima de 44 px en la vista angosta (< 768 px) para los controles chicos
 * de la agenda: los botones `sm` (32 px) y la ✕ de quitar franja (ícono de 14 px).
 * En escritorio quedan como están.
 */
export const TOUCH_SM = 'max-md:h-11 max-md:min-w-11';

/** Botón de solo ícono: centra el ícono en un cuadrado de 44 px en la vista angosta. */
export const TOUCH_ICON = 'inline-flex items-center justify-center max-md:size-11';

/** Turno de la lista de la semana: 44 px de alto en la vista angosta, con el texto centrado en vertical. */
export const TOUCH_BLOCK = 'max-md:min-h-11 max-md:justify-center';
