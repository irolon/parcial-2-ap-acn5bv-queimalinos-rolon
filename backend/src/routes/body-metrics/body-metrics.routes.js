import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireRole } from '../../shared/middlewares/role.middleware.js';
import { validateStudentIdParam } from '../../validations/students/students.validation.js';
import {
  validateCreateMetric,
  validateMetricParams,
} from '../../validations/body-metrics/body-metrics.validation.js';
import * as bodyMetricsController from '../../controllers/body-metrics/body-metrics.controller.js';

// Montado en /students/:id/metrics. mergeParams: trae el :id del router padre.
const router = Router({ mergeParams: true });

// Trainer dueño o el propio alumno: el ownership se valida en el service.
router.use(authenticate, requireRole('trainer', 'student'));

router.get('/', validate(validateStudentIdParam, 'params'), bodyMetricsController.list);
router.post(
  '/',
  validate(validateStudentIdParam, 'params'),
  validate(validateCreateMetric),
  bodyMetricsController.create
);
router.delete('/:metricId', validate(validateMetricParams, 'params'), bodyMetricsController.remove);

export default router;
