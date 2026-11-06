import { asyncHandler } from '../../shared/utils/async/asyncHandler.js';
import { generateRoutine as generate } from '../../services/trainer-ai/generate.service.js';
import { saveAsTemplate as save } from '../../services/trainer-ai/save.service.js';

/** POST /trainer-ai/generate-routine — propuesta de la IA, validada y guardada. 200 → { data } */
export const generateRoutine = asyncHandler(async (req, res) => {
  const data = await generate(req.user.id, req.body);
  res.json({ data });
});

/** POST /trainer-ai/save-as-template — una plantilla por bloque de la propuesta. 201 → { data } */
export const saveAsTemplate = asyncHandler(async (req, res) => {
  const data = await save(req.user.id, req.body);
  res.status(201).json({ data });
});
