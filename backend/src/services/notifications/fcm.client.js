import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const REFRESH_MARGIN_MS = 60_000;

let account; // undefined = sin cargar; null = deshabilitado
let cachedToken = null; // { value, expiresAt }

/** Deshabilita FCM con un único aviso (nunca se loguea la clave). */
function disable(reason) {
  console.warn(`[notifications] FCM deshabilitado: ${reason}`);
  return null;
}

function readRaw() {
  if (env.FCM_SERVICE_ACCOUNT_PATH) return fs.readFileSync(env.FCM_SERVICE_ACCOUNT_PATH, 'utf8');
  if (env.FCM_SERVICE_ACCOUNT_JSON) return Buffer.from(env.FCM_SERVICE_ACCOUNT_JSON, 'base64').toString('utf8');
  return null;
}

/** Cuenta de servicio desde la ruta o el base64 del entorno; memoizada. null si falta o es inválida. */
export function loadServiceAccount() {
  if (account !== undefined) return account;
  try {
    const raw = readRaw();
    if (!raw) {
      account = disable('sin credenciales configuradas');
      return account;
    }
    const parsed = JSON.parse(raw);
    const missing = ['project_id', 'client_email', 'private_key'].filter((k) => !parsed[k]);
    account = missing.length > 0 ? disable(`faltan campos: ${missing.join(', ')}`) : parsed;
  } catch (err) {
    account = disable(`credenciales ilegibles (${err.message})`);
  }
  return account;
}

export const isFcmEnabled = () => loadServiceAccount() !== null;

/** Access token OAuth2 (JWT bearer); cacheado hasta 60 s antes de vencer. */
export async function getAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt - REFRESH_MARGIN_MS) return cachedToken.value;
  const acc = loadServiceAccount();
  const iat = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: acc.client_email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 },
    acc.private_key,
    { algorithm: 'RS256' }
  );
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: GRANT_TYPE, assertion }).toString(),
  });
  if (!res.ok) throw new Error(`OAuth ${res.status}`);
  const json = await res.json();
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

function classify(status, body) {
  const text = JSON.stringify(body ?? {});
  if (status === 404 || text.includes('UNREGISTERED')) return 'unregistered';
  if (status === 400 && text.includes('INVALID_ARGUMENT')) return 'invalid';
  return 'other';
}

/** Envía un push a un token. Nunca lanza: devuelve { ok } o { ok:false, reason, status }. */
export async function sendToToken(token, { title, body, data = {} }, { validateOnly = false } = {}) {
  try {
    const acc = loadServiceAccount();
    const accessToken = await getAccessToken();
    const stringData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${acc.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        validate_only: validateOnly,
        message: { token, notification: { title, body }, data: stringData, android: { priority: 'high' } },
      }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) cachedToken = null;
    const errBody = await res.json().catch(() => null);
    return { ok: false, reason: classify(res.status, errBody), status: res.status };
  } catch {
    return { ok: false, reason: 'other' };
  }
}

/** Solo para tests: limpia la memoización y el access token. */
export function __resetForTests() {
  account = undefined;
  cachedToken = null;
}
