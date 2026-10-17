import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as bodyMetricsService from '../../services/body-metrics/body-metrics.service.js';

/** GET /students/:id/metrics — historial ascendente con IMC. 200 → { data } */
export const list = asyncHandler(async (req, res) => {
  const data = await bodyMetricsService.list(req.user, req.params.id);
  res.json({ data });
});

/** POST /students/:id/metrics — 201 si es nueva, 200 si es un reintento con el mismo id. */
export const create = asyncHandler(async (req, res) => {
  const { metric, created } = await bodyMetricsService.create(req.user, req.params.id, req.body);
  res.status(created ? 201 : 200).json({ data: metric });
});

/** DELETE /students/:id/metrics/:metricId — 204. */
export const remove = asyncHandler(async (req, res) => {
  await bodyMetricsService.remove(req.user, req.params.id, req.params.metricId);
  res.status(204).end();
});
