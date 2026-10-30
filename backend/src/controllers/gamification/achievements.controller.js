import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as achievementsService from '../../services/gamification/achievements.service.js';

/** GET /achievements — 200 → { data: catálogo } */
export const catalog = asyncHandler(async (_req, res) => {
  res.json({ data: await achievementsService.listCatalog() });
});

/** GET /students/:id/achievements — 200 → { data } */
export const listForStudent = asyncHandler(async (req, res) => {
  res.json({ data: await achievementsService.listStudentAchievements(req.user, req.params.id) });
});

/** GET /students/:id/streak — 200 → { data } */
export const streak = asyncHandler(async (req, res) => {
  res.json({ data: await achievementsService.getStreak(req.user, req.params.id) });
});
