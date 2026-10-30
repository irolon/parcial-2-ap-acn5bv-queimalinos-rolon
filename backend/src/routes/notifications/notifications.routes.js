import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import {
  validateNotificationIdParam,
  validateListQuery,
  validateRegisterToken,
} from '../../validations/notifications/notifications.validation.js';
import * as controller from '../../controllers/notifications/notifications.controller.js';

// Montado en /notifications. Todo es propio del usuario autenticado (trainer o student).
const router = Router();
const guards = [authenticate, requireRole('trainer', 'student')];

router.get('/', ...guards, validate(validateListQuery, 'query'), controller.list);
// /read-all va antes de /:id/read para que no lo capture el parámetro.
router.patch('/read-all', ...guards, controller.markAllRead);
router.patch('/:id/read', ...guards, validate(validateNotificationIdParam, 'params'), controller.markRead);
router.post('/tokens', ...guards, validate(validateRegisterToken), controller.registerToken);
router.delete('/tokens/:token', ...guards, controller.removeToken);

export default router;
