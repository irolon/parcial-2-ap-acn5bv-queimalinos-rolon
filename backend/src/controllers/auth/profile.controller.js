import { asyncHandler } from '../../shared/utils/async/asyncHandler.js';
import * as profileService from '../../services/auth/profile.service.js';

/** GET /auth/me — perfil del trainer autenticado (GX2). 200 → { data } */
export const getMe = asyncHandler(async (req, res) => {
  const data = await profileService.getMe(req.user);
  res.json({ data });
});

/** PATCH /auth/me — nombre y título profesional del trainer (GX2). 200 → { data } */
export const updateMe = asyncHandler(async (req, res) => {
  const data = await profileService.updateMe(req.user, req.body);
  res.json({ data });
});
