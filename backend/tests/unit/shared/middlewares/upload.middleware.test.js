import express from 'express';
import { parseImageUpload } from '../../../../src/shared/middlewares/upload.middleware.js';
import { errorHandler } from '../../../../src/shared/middlewares/error.middleware.js';

// App mínima con un servidor real en un puerto libre (supertest no está en devDependencies);
// se le pega con fetch + FormData de Node.
let server;
let base;

beforeAll(async () => {
  const app = express();
  app.post('/up', parseImageUpload, (req, res) =>
    res.json({ size: req.file?.size ?? null, name: req.file?.fieldname ?? null, body: req.body.body ?? null })
  );
  app.use(errorHandler);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

const post = (form) => fetch(`${base}/up`, { method: 'POST', body: form });
const file = (size) => new Blob([Buffer.alloc(size, 1)], { type: 'image/png' });

describe('parseImageUpload', () => {
  it('deja el archivo en req.file y el texto en req.body', async () => {
    const form = new FormData();
    form.append('body', 'hola');
    form.append('image', file(100), 'a.png');
    const res = await post(form);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ size: 100, name: 'image', body: 'hola' });
  });

  it('acepta solo texto, sin archivo', async () => {
    const form = new FormData();
    form.append('body', 'hola');
    expect(await (await post(form)).json()).toEqual({ size: null, name: null, body: 'hola' });
  });

  it('acepta exactamente 5 MB y rechaza 5 MB + 1 con 413 IMAGE_TOO_LARGE', async () => {
    const ok = new FormData();
    ok.append('image', file(5242880), 'a.png');
    expect((await post(ok)).status).toBe(200);

    const big = new FormData();
    big.append('image', file(5242881), 'a.png');
    const res = await post(big);
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe('IMAGE_TOO_LARGE');
  });

  it('un segundo archivo da 400 VALIDATION_ERROR', async () => {
    const form = new FormData();
    form.append('image', file(10), 'a.png');
    form.append('image', file(10), 'b.png');
    const res = await post(form);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('un archivo en otro campo da 400 VALIDATION_ERROR', async () => {
    const form = new FormData();
    form.append('photo', file(10), 'a.png');
    const res = await post(form);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('un segundo campo de texto da 400 VALIDATION_ERROR (fields: 1)', async () => {
    const form = new FormData();
    form.append('body', 'hola');
    form.append('extra', 'otro');
    const res = await post(form);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('un campo de texto de más de 16 KB da 400 VALIDATION_ERROR (fieldSize)', async () => {
    const form = new FormData();
    form.append('body', 'x'.repeat(16 * 1024 + 1));
    const res = await post(form);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('el caso normal (body + image = 2 partes) sigue andando', async () => {
    const form = new FormData();
    form.append('body', '😀'.repeat(2000)); // el máximo (2000 caracteres) pesa 8 KB
    form.append('image', file(10), 'a.png');
    expect((await post(form)).status).toBe(200);
  });

  it('un multipart cortado da 400 Formulario inválido, no 500', async () => {
    const truncated =
      '--XB\r\nContent-Disposition: form-data; name="image"; filename="a.png"\r\n' +
      'Content-Type: image/png\r\n\r\nabc';
    const res = await fetch(`${base}/up`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=XB' },
      body: truncated,
    });
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Formulario inválido');
  });
});
