import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import { validateChatBody } from '../../validations/chat/chat.validation.js';
import * as controller from '../../controllers/chat/chat.controller.js';

const router = Router();

router.use(authenticate);

// Chat IA del alumno durante la sesión (tarjeta 13). Montado en /chat.
router.post('/', requireRole('student'), validate(validateChatBody), controller.send);
router.get('/today', requireRole('student'), controller.today);

export default router;
