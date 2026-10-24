import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as templatesService from '../../services/routine-templates/routine-templates.service.js';

/** GET /routine-templates — lista las plantillas del trainer. */
export const list = asyncHandler(async (req, res) => {
  const data = await templatesService.list(req.user.id, req.query);
  res.json({ data });
});

/** POST /routine-templates — crea una plantilla. 201 → { data } */
export const create = asyncHandler(async (req, res) => {
  const data = await templatesService.create(req.user.id, req.body);
  res.status(201).json({ data });
});

/** POST /routine-templates/from-routine — guarda una rutina como plantilla. 201 → { data } */
export const createFromRoutine = asyncHandler(async (req, res) => {
  const data = await templatesService.createFromRoutine(req.user.id, req.body);
  res.status(201).json({ data });
});

/** GET /routine-templates/:id — detalle con ejercicios hidratados. */
export const getById = asyncHandler(async (req, res) => {
  const data = await templatesService.getById(req.user.id, req.params.id);
  res.json({ data });
});

/** PATCH /routine-templates/:id — actualiza una plantilla propia. */
export const update = asyncHandler(async (req, res) => {
  const data = await templatesService.update(req.user.id, req.params.id, req.body);
  res.json({ data });
});

/** DELETE /routine-templates/:id — borra una plantilla propia. 204 */
export const remove = asyncHandler(async (req, res) => {
  await templatesService.remove(req.user.id, req.params.id);
  res.status(204).end();
});

/** POST /routine-templates/:id/instantiate — crea una rutina copia para un alumno. 201 → { data } */
export const instantiate = asyncHandler(async (req, res) => {
  const data = await templatesService.instantiate(req.user.id, req.params.id, req.body);
  res.status(201).json({ data });
});
