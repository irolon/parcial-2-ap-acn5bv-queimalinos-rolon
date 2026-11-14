import { hashPassword, verifyPassword } from '../../shared/utils/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiryISO,
  MUST_CHANGE_CLAIM,
} from '../../shared/utils/jwt.js';
import { env } from '../../config/env.js';
import { Errors } from '../../shared/utils/errors.js';
import * as repository from '../../repositories/auth/auth.repository.js';
import * as studentsRepository from '../../repositories/students/students.repository/students.repository.js';
import * as credentialsRepo from '../../repositories/auth/credentials.repository.js';
import * as pushTokensRepo from '../../repositories/notifications/push-tokens.repository.js';
import { toTrainer } from '../../models/auth/trainer.model.js';
import { toStudent } from '../../models/students/student.model.js';
import { isActive } from '../../models/auth/refresh-token.model.js';
import { signAvatars } from '../students/avatar-urls.service.js';

/**
 * Emite un par de tokens (access + refresh) y persiste el refresh.
 * Exportado para reutilizarse en otros flujos de alta de sesión (ej. alta de
 * alumno desde invitación), evitando duplicar la lógica de tokens.
 */
export async function issueTokens(user, role) {
  const accessToken = signAccessToken({
    sub: user.id,
    role,
    email: user.email,
    ...mustChangeClaim(user),
  });
  const { token: refreshToken, tokenHash } = generateRefreshToken();
  await repository.saveRefreshToken({
    userId: user.id,
    role,
    tokenHash,
    expiresAt: refreshTokenExpiryISO(),
  });
  return { token: accessToken, refresh_token: refreshToken };
}

/**
 * Claim de la clave blanqueada (GX1): solo si el flag es true (el trainer no
 * tiene la columna). Sin flag el token no lleva la propiedad.
 */
function mustChangeClaim(user) {
  return user?.must_change_password === true ? { [MUST_CHANGE_CLAIM]: true } : {};
}

/** Registra un nuevo Personal Trainer y devuelve sus tokens de sesión. */
export async function register({ name, email, password, specialty }) {
  const passwordHash = await hashPassword(password);
  const trainer = await repository.createTrainer({ name, email, passwordHash, specialty });
  const tokens = await issueTokens(trainer, 'trainer');
  return { trainer, ...tokens };
}

/**
 * Autentica por email + password. Resuelve el rol buscando primero en trainers
 * y luego en students (ambos roles comparten el endpoint de login).
 */
export async function login({ email, password }) {
  const trainer = await repository.findTrainerByEmailWithHash(email);
  if (trainer) {
    return authenticateUser(password, trainer, toTrainer, 'trainer');
  }

  const student = await studentsRepository.findStudentByEmailWithHash(email);
  if (student) {
    return authenticateUser(password, student, toStudent, 'student');
  }

  throw Errors.invalidCredentials();
}

/** Verifica el password de una entidad ya encontrada y emite la sesión. */
async function authenticateUser(password, row, toPublic, role) {
  if (!row.password_hash) throw Errors.invalidCredentials();
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) throw Errors.invalidCredentials();
  // La contraseña se verifica ANTES: con una incorrecta sigue saliendo
  // INVALID_CREDENTIALS, así no se revela que la cuenta existe y está de baja.
  if (role === 'student' && row.active === false) throw Errors.accountDisabled();

  // descarta password_hash vía el modelo; GX2: avatar_url sale firmada (o null).
  const [user] = await signAvatars([toPublic(row)]);
  const tokens = await issueTokens(user, role);
  await assertPasswordUnchanged(row, role, tokens.refresh_token);
  const account = {
    must_change_password: user.must_change_password === true,
    password_changed_at: user.password_changed_at ?? null,
  };
  return { user: { ...user, ...account, role }, ...tokens, expires_in: env.JWT_EXPIRES_IN };
}

/**
 * Login concurrente con un cambio o blanqueo de clave (auditoría, fila 12): si la clave cambió entre la verificación y
 * el guardado del refresh, se revoca ese refresh y el login falla. Si esta relectura es anterior a guardar la nueva,
 * la segunda revocación del cambio ya borra el refresh; si es posterior, ve el hash nuevo. Ningún intercalado lo deja vivo.
 */
async function assertPasswordUnchanged(row, role, refreshToken) {
  const current = await credentialsRepo.findPasswordHash(row.id, role);
  if (current === row.password_hash) return;
  await repository.revokeRefreshToken(hashToken(refreshToken));
  throw Errors.invalidCredentials();
}

/** Emite un nuevo access token a partir de un refresh token válido. */
export async function refresh({ refresh_token }) {
  const stored = await repository.findRefreshToken(hashToken(refresh_token));
  if (!stored) throw Errors.unauthorized('Refresh token inválido');
  if (!isActive(stored)) throw Errors.unauthorized('Refresh token expirado');
  // Segunda barrera: la baja revoca los refresh tokens, pero si quedó alguno
  // vivo, un alumno inactivo igual no renueva.
  let student = null;
  if (stored.role === 'student') {
    student = await studentsRepository.findStudentById(stored.user_id);
    if (!student || !student.active) throw Errors.accountDisabled();
  }

  // El flag viaja también en el cuerpo: la web lo lee al recargar la página.
  const claim = mustChangeClaim(student);
  const token = signAccessToken({ sub: stored.user_id, role: stored.role, ...claim });
  return {
    token,
    expires_in: env.JWT_EXPIRES_IN,
    must_change_password: Boolean(claim[MUST_CHANGE_CLAIM]),
  };
}

/**
 * Revoca un refresh token (logout). Idempotente. Con push_token, además borra
 * ese token de push si es del dueño del refresh (vigente o ya revocado, para
 * que el celular pueda reintentar). Sin dueño no se borra nada.
 */
export async function logout({ refresh_token, push_token }) {
  const tokenHash = hashToken(refresh_token);
  await repository.revokeRefreshToken(tokenHash);
  if (push_token) await removePushToken(tokenHash, push_token);
}

/** Best-effort: un error acá se loguea y no hace fallar el logout. */
async function removePushToken(tokenHash, pushToken) {
  try {
    const owner = await repository.findRefreshTokenOwner(tokenHash);
    if (!owner) return;
    await pushTokensRepo.deleteTokenForUser({ id: owner.user_id, role: owner.role }, pushToken);
  } catch (err) {
    console.error('[auth] logout: no se pudo borrar el push token', err.message);
  }
}
