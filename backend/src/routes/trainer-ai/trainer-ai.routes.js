import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import {
  validateGenerateRoutine,
  validateSaveAsTemplate,
} from '../../validations/trainer-ai/trainer-ai.validation.js';
import * as controller from '../../controllers/trainer-ai/trainer-ai.controller.js';

const router = Router();

router.use(authenticate);

// Asistente IA del entrenador: propone rutinas y las guarda como plantillas (nunca asigna).
router.post('/generate-routine', requireRole('trainer'), validate(validateGenerateRoutine), controller.generateRoutine);
router.post('/save-as-template', requireRole('trainer'), validate(validateSaveAsTemplate), controller.saveAsTemplate);

export default router;
