import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import { uploadImage } from '../../shared/middlewares/upload.middleware.js';
import {
  validateStudentIdParam,
  validateHistoryQuery,
  validateSendBody,
  validateBroadcast,
} from '../../validations/messages/messages.validation.js';
import * as controller from '../../controllers/messages/messages.controller.js';

// Montado en /messages. La conversación es el alumno; el acceso se chequea en el service.
const router = Router();
const both = [authenticate, requireRole('trainer', 'student')];
const trainerOnly = [authenticate, requireRole('trainer')];
const studentId = validate(validateStudentIdParam, 'params');

// Las rutas fijas van antes de /:studentId para que no las capture el parámetro.
router.get('/conversations', ...trainerOnly, controller.conversations);
router.get('/unread-count', ...both, controller.unreadCount);
router.post('/broadcast', ...trainerOnly, validate(validateBroadcast), controller.broadcast);
router.get('/:studentId', ...both, studentId, validate(validateHistoryQuery, 'query'), controller.history);
// uploadImage parsea el multipart: el body recién existe después de él.
router.post('/:studentId', ...both, studentId, uploadImage, validate(validateSendBody), controller.send);
router.post('/:studentId/read', ...both, studentId, controller.markRead);

export default router;
