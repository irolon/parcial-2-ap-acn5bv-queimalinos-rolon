import { Router } from 'express';
import { limitRate } from '../../shared/middlewares/rate-limit.middleware.js';
import { authenticate, authenticateForPasswordChange } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import {
  validateRegister,
  validateLogin,
  validateRefresh,
  validateLogout,
} from '../../validations/auth/auth.validation.js';
import { validateChangePassword } from '../../validations/auth/password.validation.js';
import { validateUpdateMe } from '../../validations/auth/profile.validation.js';
import * as authController from '../../controllers/auth/auth.controller.js';
import * as profileController from '../../controllers/auth/profile.controller.js';

const router = Router();

router.post('/register', limitRate('register'), validate(validateRegister), authController.register);
router.post('/login', limitRate('login'), validate(validateLogin), authController.login);
router.post('/refresh', limitRate('refresh'), validate(validateRefresh), authController.refresh);
// Sin authenticate: se revoca con el refresh token del body, y así el logout
// funciona aunque el access token ya haya vencido. Si viene push_token, se
// borra el del dueño del refresh token.
router.post('/logout', validate(validateLogout), authController.logout);
// GX1: el único endpoint que acepta el access con must_change_password (el
// alumno blanqueado elige acá su clave nueva). Limitador primero: corta la
// fuerza bruta a la clave actual antes de verificar nada.
router.put(
  '/password',
  limitRate('passwordChange'),
  authenticateForPasswordChange,
  validate(validateChangePassword),
  authController.changePassword
);

// GX2: perfil del PT (nombre y título profesional, que ven sus alumnos). Solo trainer.
router.get('/me', authenticate, requireRole('trainer'), profileController.getMe);
router.patch('/me', authenticate, requireRole('trainer'), validate(validateUpdateMe), profileController.updateMe);

export default router;
