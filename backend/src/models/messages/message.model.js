/**
 * Modelo de dominio: Mensajería interna PT ↔ alumno.
 * Tabla, bucket, límites y forma pública del mensaje. SIN lógica de negocio ni acceso a datos.
 */

export const MESSAGES_TABLE = 'messages';
/** Bucket privado de Storage: el browser nunca lo toca, el backend firma las URLs. */
export const MESSAGE_IMAGES_BUCKET = 'message-images';

export const MESSAGE_COLUMNS =
  'id, student_id, sender_role, body, image_path, broadcast_id, read_at, created_at';

/** Roles que pueden firmar un mensaje. */
export const SENDER_ROLES = { TRAINER: 'trainer', STUDENT: 'student' };

/** Mismos límites que los checks del schema y del bucket. */
export const MAX_BODY = 2000;
export const MAX_IMAGE_BYTES = 5242880; // 5 MB
/** Página del historial: 50 por defecto, hasta 100. */
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;
/** Destinatarios máximos de un envío masivo. */
export const MAX_BROADCAST = 200;
/** Vigencia de las URLs firmadas de las fotos. */
export const SIGNED_URL_SECONDS = 3600;

/** Forma pública del mensaje: `image_path` nunca sale, se reemplaza por `image_url` firmada. */
export const toMessage = (row, imageUrl = null) => ({
  id: row.id,
  student_id: row.student_id,
  sender_role: row.sender_role,
  body: row.body ?? null,
  image_url: imageUrl ?? null,
  broadcast_id: row.broadcast_id ?? null,
  read_at: row.read_at ?? null,
  created_at: row.created_at,
});

/** Forma pública de la persona del otro lado de la conversación. */
export const toPublicPerson = (row) => ({ id: row.id, name: row.name, avatar_url: row.avatar_url ?? null });

/** Resumen del último mensaje para la lista de conversaciones: nunca expone `image_path`. */
export const toLastMessage = (row) => ({
  body: row.body ?? null,
  has_image: Boolean(row.image_path),
  sender_role: row.sender_role,
  created_at: row.created_at,
});
