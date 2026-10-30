import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as sessionsService from '../../services/sessions/sessions.service.js';
import * as setsService from '../../services/sessions/session-sets.service.js';

/** POST /sessions — 201 si es nueva, 200 si es un reintento. { data: sesión + unlocked_achievements }. */
export const create = asyncHandler(async (req, res) => {
  const { session, created, unlocked_achievements } = await sessionsService.create(req.user.id, req.body);
  res.status(created ? 201 : 200).json({ data: { ...session, unlocked_achievements } });
});

/** PATCH /sessions/:id — 200 → { data: session }. */
export const update = asyncHandler(async (req, res) => {
  const data = await sessionsService.update(req.user.id, req.params.id, req.body);
  res.json({ data });
});

/** POST /sessions/:id/sets — siempre 200 → { data: { saved, failed, unlocked_achievements } }. */
export const addSets = asyncHandler(async (req, res) => {
  const data = await setsService.addSets(req.user.id, req.params.id, req.body);
  res.status(200).json({ data });
});
