import { verifyAccessToken, MUST_CHANGE_CLAIM } from '../utils/jwt.js';
import { Errors } from '../utils/errors.js';

/**
 * Arma el middleware que valida el header Authorization: Bearer <jwt> y
 * adjunta el usuario autenticado a req.user = { id, role, email }.
 * Si no hay token o es inválido → 401 (vía error.middleware).
 *
 * Con el claim must_change_password (clave blanqueada por el PT) → 403
 * PASSWORD_CHANGE_REQUIRED, salvo que la ruta lo permita (solo PUT
 * /auth/password): el bloqueo vive en el backend para que ningún cliente,
 * ni el celular sin actualizar, lo saltee.
 */
export function buildAuthenticate({ allowPasswordChange = false } = {}) {
  return function authenticateRequest(req, _res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return next(Errors.unauthorized('Falta el token de autenticación'));
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return next(Errors.unauthorized('Token inválido o expirado'));
    }

    if (payload[MUST_CHANGE_CLAIM] === true && !allowPasswordChange) {
      return next(Errors.passwordChangeRequired());
    }
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  };
}

/** El de todas las rutas autenticadas: bloquea con la clave blanqueada. */
export const authenticate = buildAuthenticate();

/** Solo para PUT /auth/password: deja pasar al que tiene que cambiar la clave. */
export const authenticateForPasswordChange = buildAuthenticate({ allowPasswordChange: true });
