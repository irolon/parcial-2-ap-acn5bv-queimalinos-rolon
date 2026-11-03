import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from '../../services/messages/messages.service.js';
import * as broadcastService from '../../services/messages/broadcast.service.js';
import { listConversations } from '../../services/messages/conversations.service.js';

/** GET /messages/conversations — 200 → { data } */
export const conversations = asyncHandler(async (req, res) => {
  res.json({ data: await listConversations(req.user.id) });
});

/** GET /messages/unread-count — 200 → { data: { count } } */
export const unreadCount = asyncHandler(async (req, res) => {
  res.json({ data: await service.unreadCount(req.user) });
});

/** POST /messages/broadcast — 201 → { data: { broadcast_id, sent } } */
export const broadcast = asyncHandler(async (req, res) => {
  res.status(201).json({ data: await broadcastService.broadcast(req.user.id, req.body) });
});

/** GET /messages/:studentId — 200 → { data, meta, counterpart } */
export const history = asyncHandler(async (req, res) => {
  res.json(await service.history(req.user, req.params.studentId, req.query));
});

/** POST /messages/:studentId — 201 → { data: mensaje } */
export const send = asyncHandler(async (req, res) => {
  const message = await service.send(req.user, req.params.studentId, {
    body: req.body.body,
    file: req.file,
  });
  res.status(201).json({ data: message });
});

/** POST /messages/:studentId/read — 200 → { data: { updated } } */
export const markRead = asyncHandler(async (req, res) => {
  res.json({ data: await service.markRead(req.user, req.params.studentId) });
});
