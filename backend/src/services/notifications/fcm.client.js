import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const REFRESH_MARGIN_MS = 60_000;
const TIMEOUT_MS = 10_000;

let account; // undefined = sin cargar; null = deshabilitado
let cachedToken = null; // { value, expiresAt }
let inFlight = null; // intercambio OAuth en curso (evita duplicados con caché frío)

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
  } catch {
    account = disable('credenciales ilegibles (ruta o JSON inválido)');
  }
  return account;
}

export const isFcmEnabled = () => loadServiceAccount() !== null;

async function requestAccessToken(acc) {
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
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`OAuth ${res.status}`);
  const json = await res.json();
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

/** Access token OAuth2 (JWT bearer); cacheado hasta 60 s antes de vencer y compartido entre llamadas concurrentes. */
export async function getAccessToken() {
  const acc = loadServiceAccount();
  if (!acc) throw new Error('FCM deshabilitado');
  if (cachedToken && Date.now() < cachedToken.expiresAt - REFRESH_MARGIN_MS) return cachedToken.value;
  inFlight ??= requestAccessToken(acc).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

const detailsOf = (body) => (Array.isArray(body?.error?.details) ? body.error.details : []);

/**
 * Solo se borra un token cuando FCM lo señala a él: 'unregistered' exige el FcmError UNREGISTERED
 * y 'invalid' una violación sobre message.token. Un 404/400 genérico (proyecto, API, payload) es 'other'.
 */
function classify(status, body) {
  const details = detailsOf(body);
  if (details.some((d) => d.errorCode === 'UNREGISTERED')) return 'unregistered';
  const aboutToken =
    details.some((d) => (d.fieldViolations ?? []).some((v) => v.field === 'message.token')) ||
    /registration token/i.test(body?.error?.message ?? '');
  if (status === 400 && aboutToken) return 'invalid';
  return 'other';
}

function stringifyData(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  return out;
}

/** Envía un push a un token. Nunca lanza: devuelve { ok } o { ok:false, reason, status }. */
export async function sendToToken(token, { title, body, data = {} }, { validateOnly = false } = {}) {
  try {
    const acc = loadServiceAccount();
    const accessToken = await getAccessToken();
    const stringData = stringifyData(data);
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${acc.project_id}/messages:send`, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
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
  inFlight = null;
}
