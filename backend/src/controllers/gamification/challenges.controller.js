import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as challengesService from '../../services/gamification/challenges.service.js';
import * as assignmentsService from '../../services/gamification/challenge-assignments.service.js';

/** GET /challenges — 200 → { data } */
export const list = asyncHandler(async (req, res) => {
  res.json({ data: await challengesService.listChallenges(req.user, req.query) });
});

/** POST /challenges — 201 → { data } */
export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ data: await challengesService.createChallenge(req.user, req.body) });
});

/** PATCH /challenges/:id — 200 → { data } */
export const update = asyncHandler(async (req, res) => {
  res.json({ data: await challengesService.updateChallenge(req.user, req.params.id, req.body) });
});

/** DELETE /challenges/:id — 204 */
export const remove = asyncHandler(async (req, res) => {
  await challengesService.deleteChallenge(req.user, req.params.id);
  res.status(204).end();
});

/** POST /challenges/:id/assignments — 201 → { data: { created, skipped } } */
export const assignMany = asyncHandler(async (req, res) => {
  const data = await assignmentsService.assignToMany(req.user, req.params.id, req.body.student_ids);
  res.status(201).json({ data });
});

/** GET /students/:id/challenges — 200 → { data } */
export const listForStudent = asyncHandler(async (req, res) => {
  res.json({ data: await assignmentsService.listForStudent(req.user, req.params.id) });
});

/** POST /students/:id/challenges — 201 → { data } */
export const assignToStudent = asyncHandler(async (req, res) => {
  const data = await assignmentsService.assignToStudent(req.user, req.params.id, req.body.challenge_id);
  res.status(201).json({ data });
});
