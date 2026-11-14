import { asyncHandler } from '../../shared/utils/async/asyncHandler.js';
import * as service from '../../services/notifications/preferences.service.js';

/** GET /notifications/preferences — 200 → { data } */
export const getPreferences = asyncHandler(async (req, res) => {
  res.json({ data: await service.get(req.user) });
});

/** PUT /notifications/preferences — 200 → { data } */
export const replacePreferences = asyncHandler(async (req, res) => {
  res.json({ data: await service.replace(req.user, req.body) });
});
