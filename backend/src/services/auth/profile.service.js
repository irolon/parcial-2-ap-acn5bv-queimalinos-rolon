import { Errors } from '../../shared/utils/errors.js';
import * as authRepo from '../../repositories/auth/auth.repository.js';
import { signAvatars } from '../students/avatar-urls.service.js';

/** Perfil del PT logueado (GX2): solo estas claves, con la foto firmada (o null). */
async function toProfile(row) {
  if (!row) throw Errors.notFound('Cuenta no encontrada');
  const [signed] = await signAvatars([row]);
  return {
    id: signed.id,
    name: signed.name,
    email: signed.email,
    specialty: signed.specialty ?? null,
    professional_title: signed.professional_title ?? null,
    avatar_url: signed.avatar_url,
    password_changed_at: signed.password_changed_at ?? null,
    created_at: signed.created_at,
  };
}

/** GET /auth/me — perfil del trainer autenticado. */
export async function getMe(user) {
  return toProfile(await authRepo.findTrainerById(user.id));
}

/** PATCH /auth/me — nombre y título profesional (lo ven sus alumnos en "Tu entrenador/a"). */
export async function updateMe(user, fields) {
  return toProfile(await authRepo.updateTrainer(user.id, fields));
}
