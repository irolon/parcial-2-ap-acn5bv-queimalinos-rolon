import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as historyService from '../../services/sessions/session-history.service.js';

/** GET /students/:id/sessions — 200 → { data, meta } */
export const list = asyncHandler(async (req, res) => {
  const { data, meta } = await historyService.listSessions(req.user, req.params.id, req.query);
  res.json({ data, meta });
});

/** GET /students/:id/sessions/:sessionId — 200 → { data } */
export const detail = asyncHandler(async (req, res) => {
  const data = await historyService.getSessionDetail(
    req.user,
    req.params.id,
    req.params.sessionId
  );
  res.json({ data });
});
