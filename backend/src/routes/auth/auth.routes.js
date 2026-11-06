import { Router } from 'express';
import { limitRate } from '../../shared/middlewares/rate-limit.middleware.js';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import {
  validateRegister,
  validateLogin,
  validateRefresh,
  validateLogout,
} from '../../validations/auth/auth.validation.js';
import * as authController from '../../controllers/auth/auth.controller.js';

const router = Router();

router.post('/register', limitRate('register'), validate(validateRegister), authController.register);
router.post('/login', limitRate('login'), validate(validateLogin), authController.login);
router.post('/refresh', limitRate('refresh'), validate(validateRefresh), authController.refresh);
// Sin authenticate: se revoca con el refresh token del body, y así el logout
// funciona aunque el access token ya haya vencido. Si viene push_token, se
// borra el del dueño del refresh token.
router.post('/logout', validate(validateLogout), authController.logout);

export default router;
