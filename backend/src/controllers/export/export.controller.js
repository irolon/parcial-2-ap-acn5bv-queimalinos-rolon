import { asyncHandler } from '../../shared/utils/async/asyncHandler.js';
import * as exportService from '../../services/export/sessions-export.service.js';

/*
 * Exportación de sesiones en CSV (GX1). El cuerpo va tal cual lo armó el
 * modelo (con BOM, para que Excel en español lea los acentos) y como
 * adjunto: el navegador y el celular lo bajan con ese nombre.
 */
function sendCsv(res, { filename, csv }) {
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

/** GET /students/export — todas las sesiones de todos los alumnos del PT. 200 text/csv */
export const exportTrainer = asyncHandler(async (req, res) => {
  sendCsv(res, await exportService.forTrainer(req.user));
});

/** GET /students/:id/export — sesiones de un alumno (el propio alumno o el PT dueño). 200 text/csv */
export const exportStudent = asyncHandler(async (req, res) => {
  sendCsv(res, await exportService.forStudent(req.user, req.params.id));
});
