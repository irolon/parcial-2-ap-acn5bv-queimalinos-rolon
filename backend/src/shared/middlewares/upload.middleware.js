import multer from 'multer';
import { Errors } from '../utils/errors.js';
import { MAX_IMAGE_BYTES } from '../../models/messages/message.model.js';

// En memoria: la foto (≤ 5 MB) se valida por firma y se sube a Storage desde el service.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});
const single = upload.single('image');

const invalidForm = () =>
  Errors.validation('Formulario inválido', [{ field: 'image', message: 'Formulario inválido' }]);

/**
 * Traduce los errores del parseo multipart (multer y busboy, p. ej. "Unexpected end of form")
 * al formato de error de la API. Solo se llama con errores que vienen de multer.
 */
function translate(err) {
  if (!(err instanceof multer.MulterError)) return invalidForm();
  if (err.code === 'LIMIT_FILE_SIZE') return Errors.imageTooLarge();
  if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
    return Errors.validation('Error de validación', [
      { field: 'image', message: 'Enviá un solo archivo, en el campo "image"' },
    ]);
  }
  return invalidForm();
}

/** multipart/form-data con un solo archivo opcional `image`; deja `req.file` y `req.body`. */
export const parseImageUpload = (req, res, next) => {
  single(req, res, (err) => next(err ? translate(err) : undefined));
};
