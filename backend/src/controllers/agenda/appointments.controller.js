import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from '../../services/agenda/appointments.service.js';

/** GET /appointments?from&to — 200 → { data: [turno] } */
export const list = asyncHandler(async (req, res) => {
  res.json({ data: await service.list(req.user, req.query) });
});

/** POST /appointments — 201 → { data: turno } */
export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.create(req.user, req.body) });
});

/** PATCH /appointments/:id — 200 → { data: turno } */
export const changeStatus = asyncHandler(async (req, res) => {
  res.json({ data: await service.changeStatus(req.user, req.params.id, req.body) });
});
