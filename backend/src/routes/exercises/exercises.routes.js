import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import {
  validateListQuery,
  validateCreateExercise,
  validateUpdateExercise,
  validateIdParam,
} from '../../validations/exercises/exercises.validation.js';
import * as exercisesController from '../../controllers/exercises/exercises.controller.js';

const router = Router();

// Biblioteca del alumno — va antes del guard de trainer: esta ruta responde y la cadena termina acá.
router.get('/library', authenticate, requireRole('student'), exercisesController.library);

// El resto de la biblioteca de ejercicios es de uso del trainer.
router.use(authenticate, requireRole('trainer'));

router.get('/', validate(validateListQuery, 'query'), exercisesController.list);
router.post('/', validate(validateCreateExercise), exercisesController.create);
router.patch(
  '/:id',
  validate(validateIdParam, 'params'),
  validate(validateUpdateExercise),
  exercisesController.update
);
router.delete('/:id', validate(validateIdParam, 'params'), exercisesController.remove);

export default router;
