import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { Errors } from '../../shared/utils/errors.js';
import { toQrDataUrl } from '../../shared/utils/qr.js';
import * as repository from '../../repositories/invitations/invitations.repository.js';
import {
  INVITATION_EXPIRY_HOURS,
  includesWhatsapp,
  includesQr,
  isUsed,
  isExpired,
  toPublicInvitation,
} from '../../models/invitations/invitation.model.js';

/** URL que abre el alumno para registrarse (web o deep link a mobile). */
function buildJoinUrl(token) {
  return `${env.FRONTEND_URL}/join?token=${token}`;
}

/** Deep link de WhatsApp con el mensaje de invitación pre-armado. */
function buildWhatsappShareUrl(phone, studentName, joinUrl) {
  const msg = `Hola ${studentName}! Te invito a FitTrainer para seguir tu entrenamiento conmigo. Ingresá acá: ${joinUrl}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function expiryISO() {
  return new Date(Date.now() + INVITATION_EXPIRY_HOURS * 3_600_000).toISOString();
}

/**
 * CU-01 — Genera una invitación para un alumno y devuelve el token, la URL de
 * registro y (según el canal) el QR en base64 y/o el link de WhatsApp.
 */
export async function createInvitation(trainerId, data) {
  if (await repository.studentEmailExists(data.student_email)) {
    throw Errors.studentEmailExists();
  }

  const token = crypto.randomUUID();
  const row = await repository.createInvitation({
    trainerId,
    token,
    studentName: data.student_name,
    studentEmail: data.student_email,
    studentPhone: data.student_phone,
    studentGoal: data.goal ?? null,
    deliveryChannel: data.delivery_channel,
    studentGymEquipment: data.gym_equipment ?? null,
    studentInjuries: data.injuries ?? null,
    studentLevel: data.level ?? null,
    expiresAt: expiryISO(),
  });

  const joinUrl = buildJoinUrl(token);
  const result = {
    invitation_id: row.id,
    token,
    join_url: joinUrl,
    expires_at: row.expires_at,
  };

  if (includesQr(data.delivery_channel)) {
    result.qr_base64 = await toQrDataUrl(joinUrl);
  }
  if (includesWhatsapp(data.delivery_channel)) {
    result.whatsapp_share_url = buildWhatsappShareUrl(data.student_phone, data.student_name, joinUrl);
  }

  return result;
}

/**
 * CU-02 (precondición) — Valida un token y devuelve los datos precargados.
 * Lanza 404 si no existe, 410 si fue usado o expiró.
 */
export async function getByToken(token) {
  const invitation = await repository.findInvitationByToken(token);
  if (!invitation) throw Errors.invitationNotFound();
  if (isUsed(invitation)) throw Errors.invitationUsed();
  if (isExpired(invitation)) throw Errors.invitationExpired();
  return toPublicInvitation(invitation);
}
