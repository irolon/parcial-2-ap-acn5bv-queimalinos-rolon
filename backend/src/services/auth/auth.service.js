import { hashPassword, verifyPassword } from '../../shared/utils/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiryISO,
} from '../../shared/utils/jwt.js';
import { env } from '../../config/env.js';
import { Errors } from '../../shared/utils/errors.js';
import * as repository from '../../repositories/auth/auth.repository.js';
import * as studentsRepository from '../../repositories/students/students.repository.js';
import { toTrainer } from '../../models/auth/trainer.model.js';
import { toStudent } from '../../models/students/student.model.js';
import { isActive } from '../../models/auth/refresh-token.model.js';

/**
 * Emite un par de tokens (access + refresh) y persiste el refresh.
 * Exportado para reutilizarse en otros flujos de alta de sesión (ej. alta de
 * alumno desde invitación), evitando duplicar la lógica de tokens.
 */
export async function issueTokens(user, role) {
  const accessToken = signAccessToken({ sub: user.id, role, email: user.email });
  const { token: refreshToken, tokenHash } = generateRefreshToken();
  await repository.saveRefreshToken({
    userId: user.id,
    role,
    tokenHash,
    expiresAt: refreshTokenExpiryISO(),
  });
  return { token: accessToken, refresh_token: refreshToken };
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

  const user = toPublic(row); // descarta password_hash vía el modelo
  const tokens = await issueTokens(user, role);
  return { user: { ...user, role }, ...tokens, expires_in: env.JWT_EXPIRES_IN };
}

/** Emite un nuevo access token a partir de un refresh token válido. */
export async function refresh({ refresh_token }) {
  const stored = await repository.findRefreshToken(hashToken(refresh_token));
  if (!stored) throw Errors.unauthorized('Refresh token inválido');
  if (!isActive(stored)) throw Errors.unauthorized('Refresh token expirado');
  // Segunda barrera: la baja revoca los refresh tokens, pero si quedó alguno
  // vivo, un alumno inactivo igual no renueva.
  if (stored.role === 'student') {
    const student = await studentsRepository.findStudentById(stored.user_id);
    if (!student || !student.active) throw Errors.accountDisabled();
  }

  const token = signAccessToken({ sub: stored.user_id, role: stored.role });
  return { token, expires_in: env.JWT_EXPIRES_IN };
}

/** Revoca un refresh token (logout). Idempotente. */
export async function logout({ refresh_token }) {
  await repository.revokeRefreshToken(hashToken(refresh_token));
}
