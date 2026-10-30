import { jest } from '@jest/globals';
import { generateKeyPairSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
export { publicKey };

export const ACCOUNT = { project_id: 'proj-1', client_email: 'sa@proj-1.iam.gserviceaccount.com', private_key: privateKey };
export const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');

// En test el env real ignora las variables FCM: se mockea para inyectarlas.
export const mockEnv = { FCM_SERVICE_ACCOUNT_PATH: undefined, FCM_SERVICE_ACCOUNT_JSON: undefined };
jest.unstable_mockModule(src('config/env.js'), () => ({ env: mockEnv }));

export const fcm = await import(src('services/notifications/fcm.client.js'));

/** Respuesta de fetch simulada. */
export const reply = (status, body = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
export const tokenReply = (expiresIn = 3600, token = 'at-1') => reply(200, { access_token: token, expires_in: expiresIn });
