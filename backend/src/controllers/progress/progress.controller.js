import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as progressService from '../../services/progress/progress.service.js';

/** GET /progress/exercise/:exerciseId — 200 → { data } */
export const exerciseProgress = asyncHandler(async (req, res) => {
  const data = await progressService.exerciseProgress(req.user, req.params.exerciseId, req.query);
  res.json({ data });
});

/** GET /progress/body/:studentId — 200 → { data } */
export const bodyProgress = asyncHandler(async (req, res) => {
  const data = await progressService.bodyProgress(req.user, req.params.studentId);
  res.json({ data });
});
