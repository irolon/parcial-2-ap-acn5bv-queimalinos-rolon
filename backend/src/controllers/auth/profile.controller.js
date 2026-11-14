import { asyncHandler } from '../../shared/utils/async/asyncHandler.js';
import * as profileService from '../../services/auth/profile.service.js';
import * as trainerAvatarService from '../../services/auth/trainer-avatar.service.js';

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

/** PUT /auth/me/avatar — multipart con `image` (el PT logueado). 200 → { data: { avatar_url } } */
export const setAvatar = asyncHandler(async (req, res) => {
  const data = await trainerAvatarService.setAvatar(req.user, req.file);
  res.json({ data });
});

/** DELETE /auth/me/avatar — quita la foto del PT. 204, idempotente. */
export const removeAvatar = asyncHandler(async (req, res) => {
  await trainerAvatarService.removeAvatar(req.user);
  res.status(204).end();
});
