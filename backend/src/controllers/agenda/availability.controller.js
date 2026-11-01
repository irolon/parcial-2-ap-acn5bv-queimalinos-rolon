import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from '../../services/agenda/availability.service.js';
import * as freeService from '../../services/agenda/free-slots.service.js';

/** GET /availability — 200 → { data: [{ weekday, start_time, end_time }] } */
export const list = asyncHandler(async (req, res) => {
  res.json({ data: await service.list(req.user) });
});

/** PUT /availability — 200 → { data } (lo guardado) */
export const replace = asyncHandler(async (req, res) => {
  res.json({ data: await service.replace(req.user, req.body) });
});

/** GET /availability/free?from&to — 200 → { data: [{ starts_at }] } */
export const free = asyncHandler(async (req, res) => {
  const slots = await freeService.listFree(req.user, req.query);
  res.json({ data: slots.map((starts_at) => ({ starts_at })) });
});
