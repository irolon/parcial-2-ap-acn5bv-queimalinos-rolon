import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from '../../services/notifications/notifications.service.js';

/** GET /notifications — 200 → { data, meta } */
export const list = asyncHandler(async (req, res) => {
  res.json(await service.list(req.user, req.query));
});

/** PATCH /notifications/:id/read — 204 */
export const markRead = asyncHandler(async (req, res) => {
  await service.markRead(req.user, req.params.id);
  res.status(204).end();
});

/** PATCH /notifications/read-all — 204 */
export const markAllRead = asyncHandler(async (req, res) => {
  await service.markAllRead(req.user);
  res.status(204).end();
});

/** POST /notifications/tokens — 201 si es nuevo, 200 si ya existía → { data } */
export const registerToken = asyncHandler(async (req, res) => {
  const { created, data } = await service.registerToken(req.user, req.body);
  res.status(created ? 201 : 200).json({ data });
});

/** DELETE /notifications/tokens/:token — 204 siempre */
export const removeToken = asyncHandler(async (req, res) => {
  await service.removeToken(req.user, req.params.token);
  res.status(204).end();
});
