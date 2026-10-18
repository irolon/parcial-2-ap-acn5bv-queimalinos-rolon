import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import {
  validateRegister,
  validateLogin,
  validateRefresh,
} from '../../validations/auth/auth.validation.js';
import * as authController from '../../controllers/auth/auth.controller.js';

const router = Router();

router.post('/register', validate(validateRegister), authController.register);
router.post('/login', validate(validateLogin), authController.login);
router.post('/refresh', validate(validateRefresh), authController.refresh);
// Sin authenticate: se revoca con el refresh token del body, y así el logout
// funciona aunque el access token ya haya vencido.
router.post('/logout', validate(validateRefresh), authController.logout);

export default router;
