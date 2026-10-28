import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as sessionsService from '../../services/sessions/sessions.service.js';

/** POST /sessions — 201 si es nueva, 200 si es un reintento con el mismo id. */
export const create = asyncHandler(async (req, res) => {
  const { session, created } = await sessionsService.create(req.user.id, req.body);
  res.status(created ? 201 : 200).json({ data: session });
});

/** PATCH /sessions/:id — 200 → { data: session }. */
export const update = asyncHandler(async (req, res) => {
  const data = await sessionsService.update(req.user.id, req.params.id, req.body);
  res.json({ data });
});
