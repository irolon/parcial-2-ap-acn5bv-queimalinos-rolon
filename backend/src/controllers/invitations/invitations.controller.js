import { asyncHandler } from '../../shared/utils/async/asyncHandler.js';
import * as invitationsService from '../../services/invitations/invitations.service.js';

/** POST /invitations — el trainer autenticado genera una invitación. 201 → { data } */
export const create = asyncHandler(async (req, res) => {
  const result = await invitationsService.createInvitation(req.user.id, req.body);
  res.status(201).json({ data: result });
});

/** GET /invitations/:token — datos precargados de la invitación (público). */
export const getByToken = asyncHandler(async (req, res) => {
  const result = await invitationsService.getByToken(req.params.token);
  res.json(result);
});
