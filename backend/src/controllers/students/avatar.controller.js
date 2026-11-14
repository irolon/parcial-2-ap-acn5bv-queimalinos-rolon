import { asyncHandler } from '../../shared/utils/async/asyncHandler.js';
import * as avatarService from '../../services/students/avatar.service.js';

/** PUT /students/:id/avatar — multipart con `image` (el propio alumno). 200 → { data: { avatar_url } } */
export const setAvatar = asyncHandler(async (req, res) => {
  const data = await avatarService.setAvatar(req.user, req.params.id, req.file);
  res.json({ data });
});

/** DELETE /students/:id/avatar — quita la foto (el propio alumno). 204, idempotente. */
export const removeAvatar = asyncHandler(async (req, res) => {
  await avatarService.removeAvatar(req.user, req.params.id);
  res.status(204).end();
});
