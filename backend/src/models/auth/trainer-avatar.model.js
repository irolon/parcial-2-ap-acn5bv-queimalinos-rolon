/**
 * Modelo de dominio: foto de perfil del PT. Mismo bucket que la del alumno (GX2), otro prefijo.
 * Forma de las rutas. SIN lógica de negocio ni acceso a datos.
 */
import { randomUUID } from 'node:crypto';

/** Ruta de una foto nueva: trainers/<id>/<uuid>.<ext> (lo que se guarda en trainers.avatar_url). */
export const trainerAvatarPath = (trainerId, ext) => `trainers/${trainerId}/${randomUUID()}.${ext}`;

/** ¿La ruta es una foto de este PT en el bucket? (solo esas se borran al reemplazar o quitar). */
export const isTrainerAvatarPath = (path, trainerId) =>
  typeof path === 'string' && path.startsWith(`trainers/${trainerId}/`);
