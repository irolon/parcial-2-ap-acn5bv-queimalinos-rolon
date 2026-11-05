/**
 * Envuelve un controller async para que cualquier excepción se propague
 * al error.middleware sin necesidad de try/catch en cada handler.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
