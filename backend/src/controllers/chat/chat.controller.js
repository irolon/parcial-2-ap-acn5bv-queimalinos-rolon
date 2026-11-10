import { asyncHandler } from '../../shared/utils/async/asyncHandler.js';
import { sendMessage, getToday } from '../../services/chat/chat.service.js';
import { getHistory } from '../../services/chat/history.service.js';

/** POST /chat — respuesta del asistente IA, ya validada y guardada. 200 → { data } */
export const send = asyncHandler(async (req, res) => {
  res.json({ data: await sendMessage(req.user.id, req.body) });
});

/** GET /chat/today — la conversación del día y las consultas que quedan. 200 → { data } */
export const today = asyncHandler(async (req, res) => {
  res.json({ data: await getToday(req.user.id) });
});

/** GET /chat/history?before&days — días anteriores, del más nuevo al más viejo. 200 → { data: { days, next_before } } */
export const history = asyncHandler(async (req, res) => {
  res.json({ data: await getHistory(req.user.id, req.query) });
});
