import { createApp } from '../../../src/app.js';

// Levanta un Express real en un puerto libre (supertest no está en devDependencies) y le pega con fetch.
// startServer(options) pasa las opciones a createApp (por ejemplo, límites bajos para el rate limiting).
export async function startServer(options) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    stop: () => new Promise((resolve) => server.close(resolve)),
    /** send('post', '/api/auth/login', { json, raw, headers }) → { status, headers, body } */
    async send(method, path, { json, raw, headers = {} } = {}) {
      const hasBody = json !== undefined || raw !== undefined;
      const res = await fetch(`${base}${path}`, {
        method: method.toUpperCase(),
        headers: { ...(hasBody ? { 'content-type': 'application/json' } : {}), ...headers },
        body: raw ?? (json !== undefined ? JSON.stringify(json) : undefined),
      });
      const text = await res.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      return { status: res.status, headers: res.headers, body };
    },
  };
}
