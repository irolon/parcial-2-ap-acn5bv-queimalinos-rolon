import multer from 'multer';
import { Errors } from '../utils/errors.js';
import { MAX_IMAGE_BYTES } from '../../models/messages/message.model.js';

// En memoria: la foto (≤ 5 MB) se valida por firma y se sube a Storage desde el service.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});
const single = upload.single('image');

/** Traduce los errores de multer al formato de error de la API. */
function translate(err) {
  if (!(err instanceof multer.MulterError)) return err;
  if (err.code === 'LIMIT_FILE_SIZE') return Errors.imageTooLarge();
  const message =
    err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT'
      ? 'Enviá un solo archivo, en el campo "image"'
      : err.message;
  return Errors.validation('Error de validación', [{ field: 'image', message }]);
}

/** multipart/form-data con un solo archivo opcional `image`; deja `req.file` y `req.body`. */
export const uploadImage = (req, res, next) => {
  single(req, res, (err) => next(err ? translate(err) : undefined));
};
