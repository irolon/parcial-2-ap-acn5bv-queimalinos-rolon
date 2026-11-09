/**
 * Ejecuta una función validadora sobre una parte del request (body | query | params)
 * y reemplaza el original por la versión saneada que devuelve.
 *
 * El validador recibe el objeto crudo y debe:
 *   - devolver el objeto saneado si es válido, o
 *   - lanzar un AppError (típicamente Errors.validation(...)) si no lo es.
 *
 *   router.post('/login', validate(validateLogin), authController.login)
 */
export function validate(validator, source = 'body') {
  const middleware = (req, _res, next) => {
    try {
      req[source] = validator(req[source] || {});
      return next();
    } catch (err) {
      return next(err);
    }
  };
  // Marca para el barrido de rutas (tests/unit/app): qué parte del request valida.
  middleware.validates = source;
  return middleware;
}
