import { randomBytes } from 'node:crypto';
import { QA_EMAIL_DOMAIN } from '../../../scripts/lib/qa-env.js';

/** Id de la corrida: marca todo lo que crea la integración (emails y nombres). */
export const RUN_ID = `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;

/** Contraseña de test de los usuarios QA (cumple la política: mayúscula y número). */
export const QA_PASSWORD = 'ItQaPass2026';

export const qaEmail = (role) => `it.${RUN_ID}.${role}@${QA_EMAIL_DOMAIN}`;
export const qaName = (label) => `IT · ${label}`;
