import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import {
  validateNotificationIdParam,
  validateListQuery,
  validateRegisterToken,
  validateTokenParam,
  validatePreferences,
} from '../../validations/notifications/notifications.validation.js';
import * as controller from '../../controllers/notifications/notifications.controller.js';
import * as preferences from '../../controllers/notifications/preferences.controller.js';

// Montado en /notifications. Todo es propio del usuario autenticado (trainer o student).
const router = Router();
const guards = [authenticate, requireRole('trainer', 'student')];
// Las preferencias de push son solo del alumno (GX3).
const studentOnly = [authenticate, requireRole('student')];

router.get('/', ...guards, validate(validateListQuery, 'query'), controller.list);
router.get('/preferences', ...studentOnly, preferences.getPreferences);
router.put('/preferences', ...studentOnly, validate(validatePreferences), preferences.replacePreferences);
// /read-all va antes de /:id/read para que no lo capture el parámetro.
router.patch('/read-all', ...guards, controller.markAllRead);
router.patch('/:id/read', ...guards, validate(validateNotificationIdParam, 'params'), controller.markRead);
router.post('/tokens', ...guards, validate(validateRegisterToken), controller.registerToken);
router.delete('/tokens/:token', ...guards, validate(validateTokenParam, 'params'), controller.removeToken);

export default router;
