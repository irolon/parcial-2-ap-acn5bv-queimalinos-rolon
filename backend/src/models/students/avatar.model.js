/**
 * Modelo de dominio: foto de perfil del alumno (GX2).
 * Bucket y forma de las rutas. SIN lógica de negocio ni acceso a datos.
 */
import { randomUUID } from 'node:crypto';

/** Bucket privado de Storage: el browser nunca lo toca, el backend firma las URLs. */
export const AVATARS_BUCKET = 'avatars';

/** Ruta de una foto nueva: students/<id>/<uuid>.<ext> (lo que se guarda en avatar_url). */
export const avatarPath = (studentId, ext) => `students/${studentId}/${randomUUID()}.${ext}`;

/** ¿La ruta es una foto de este alumno en el bucket? (solo esas se borran al reemplazar). */
export const isStudentAvatarPath = (path, studentId) =>
  typeof path === 'string' && path.startsWith(`students/${studentId}/`);
