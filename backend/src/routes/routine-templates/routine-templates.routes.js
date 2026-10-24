import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import {
  validateCreateTemplate,
  validateUpdateTemplate,
  validateFromRoutine,
  validateListQuery,
  validateIdParam,
} from '../../validations/routine-templates/routine-templates.validation.js';
import * as controller from '../../controllers/routine-templates/routine-templates.controller.js';

const router = Router();

// Todas las rutas son solo para trainers.
router.use(authenticate, requireRole('trainer'));

router.get('/', validate(validateListQuery, 'query'), controller.list);
router.post('/', validate(validateCreateTemplate), controller.create);
// Antes de '/:id' para que 'from-routine' no se tome como id.
router.post('/from-routine', validate(validateFromRoutine), controller.createFromRoutine);
router.get('/:id', validate(validateIdParam, 'params'), controller.getById);
router.patch(
  '/:id',
  validate(validateIdParam, 'params'),
  validate(validateUpdateTemplate),
  controller.update
);
router.delete('/:id', validate(validateIdParam, 'params'), controller.remove);

export default router;
