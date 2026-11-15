import { asyncHandler } from '../../shared/utils/async/asyncHandler.js';
import * as exercisesService from '../../services/exercises/exercises.service.js';

/** GET /exercises — biblioteca visible para el trainer (globales + propios). */
export const list = asyncHandler(async (req, res) => {
  const data = await exercisesService.list(req.user.id, req.query);
  res.json({ data });
});

/** GET /exercises/library — biblioteca del alumno (globales + los de su entrenador). */
export const library = asyncHandler(async (req, res) => {
  const data = await exercisesService.library(req.user.id);
  res.json({ data });
});

/** POST /exercises — crea un ejercicio propio. 201 → { data } */
export const create = asyncHandler(async (req, res) => {
  const data = await exercisesService.create(req.user.id, req.body);
  res.status(201).json({ data });
});

/** PATCH /exercises/:id — actualiza un ejercicio propio. */
export const update = asyncHandler(async (req, res) => {
  const data = await exercisesService.update(req.user.id, req.params.id, req.body);
  res.json({ data });
});

/** DELETE /exercises/:id — borra un ejercicio propio (204) o, si está en uso, lo archiva (200 → { data: { id, archived: true } }). */
export const remove = asyncHandler(async (req, res) => {
  const result = await exercisesService.remove(req.user.id, req.params.id);
  if (!result.archived) return res.status(204).send();
  return res.status(200).json({ data: result });
});
