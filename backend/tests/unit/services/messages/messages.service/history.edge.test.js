import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockMessagesRepo,
  mockImagesRepo,
  mockStudentsRepo,
  TRAINER,
  STUDENT_ID,
  studentRow,
  messageRow,
} from '../../../../helpers/messages/messages.setup.js';

const service = await import('../../../../../src/services/messages/messages.service.js');

beforeEach(() => {
  jest.resetAllMocks();
  mockStudentsRepo.findStudentById.mockResolvedValue(studentRow());
});

describe('history: firma de fotos best-effort', () => {
  it('si falla signUrls no da 500: las fotos vienen con image_url null y el resto carga', async () => {
    mockMessagesRepo.findPage.mockResolvedValue([
      messageRow({ id: 'foto', body: null, image_path: 's/a.png' }),
      messageRow({ id: 'texto', body: 'hola' }),
      messageRow({ id: 'foto-texto', body: 'mirá', image_path: 's/b.png' }),
    ]);
    mockImagesRepo.signUrls.mockRejectedValue(new Error('Storage caído'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await service.history(TRAINER, STUDENT_ID, { before: null, limit: 50 });
    const byId = Object.fromEntries(res.data.map((m) => [m.id, m]));
    expect(res.data).toHaveLength(3);
    expect(byId.foto).toMatchObject({ body: null, image_url: null, has_image: true });
    expect(byId.texto).toMatchObject({ body: 'hola', image_url: null, has_image: false });
    // Con texto y foto sin firmar, has_image es lo único que la distingue de un mensaje de solo texto.
    expect(byId['foto-texto']).toMatchObject({ body: 'mirá', image_url: null, has_image: true });
    expect(res.counterpart).toBeTruthy();
    expect(JSON.stringify(res)).not.toContain('image_path');
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
