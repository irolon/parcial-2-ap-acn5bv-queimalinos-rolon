import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as routinesService from '../../services/routines/routines.service.js';

/** POST /routines — crea y asigna una rutina. 201 → { data } */
export const create = asyncHandler(async (req, res) => {
  const data = await routinesService.create(req.user.id, req.body);
  res.status(201).json({ data });
});

/** GET /routines — lista las rutinas del trainer. */
export const list = asyncHandler(async (req, res) => {
  const data = await routinesService.list(req.user.id, req.query);
  res.json({ data });
});

/** GET /routines/:id — detalle de una rutina propia con sus ejercicios. */
export const getById = asyncHandler(async (req, res) => {
  const data = await routinesService.getById(req.user.id, req.params.id);
  res.json({ data });
});

/** PATCH /routines/:id — actualiza/desactiva una rutina propia. */
export const update = asyncHandler(async (req, res) => {
  const data = await routinesService.update(req.user.id, req.params.id, req.body);
  res.json({ data });
});

/** POST /routines/:id/exercises — agrega ejercicios a una rutina propia. 201 → { data } */
export const addExercises = asyncHandler(async (req, res) => {
  const data = await routinesService.addExercises(req.user.id, req.params.id, req.body.exercises);
  res.status(201).json({ data });
});

/** GET /routines/today — rutina del día del alumno (solo alumnos). */
export const today = asyncHandler(async (req, res) => {
  const data = await routinesService.today(req.user.id);
  res.json({ data });
});

/** GET /routines/mine — rutinas activas del alumno con sus ejercicios (solo alumnos). */
export const mine = asyncHandler(async (req, res) => {
  const data = await routinesService.mine(req.user.id);
  res.json({ data });
});
