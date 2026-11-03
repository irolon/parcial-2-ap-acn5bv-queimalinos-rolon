import {
  MESSAGES_TABLE,
  MESSAGE_IMAGES_BUCKET,
  MESSAGE_COLUMNS,
  MAX_BODY,
  MAX_IMAGE_BYTES,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_BROADCAST,
  SIGNED_URL_SECONDS,
  SENDER_ROLES,
  toMessage,
  toPublicPerson,
  toLastMessage,
} from '../../../../src/models/messages/message.model.js';

describe('message.model', () => {
  it('constantes de la spec', () => {
    expect(MESSAGES_TABLE).toBe('messages');
    expect(MESSAGE_IMAGES_BUCKET).toBe('message-images');
    expect([MAX_BODY, MAX_IMAGE_BYTES, DEFAULT_LIMIT, MAX_LIMIT, MAX_BROADCAST, SIGNED_URL_SECONDS]).toEqual([
      2000, 5242880, 50, 100, 200, 3600,
    ]);
  });

  it('MESSAGE_COLUMNS lista las columnas de la tabla', () => {
    expect(MESSAGE_COLUMNS.split(', ')).toEqual([
      'id', 'student_id', 'sender_role', 'body', 'image_path', 'broadcast_id', 'read_at', 'created_at',
    ]);
  });

  describe('toMessage', () => {
    const row = {
      id: 'm1', student_id: 's1', sender_role: 'trainer', body: 'hola', image_path: 's1/x.png',
      broadcast_id: null, read_at: null, created_at: '2026-10-31T10:00:00Z',
    };

    it('devuelve la forma pública sin image_path', () => {
      const msg = toMessage(row, 'https://firmada');
      expect(msg).toEqual({
        id: 'm1', student_id: 's1', sender_role: 'trainer', body: 'hola', image_url: 'https://firmada',
        broadcast_id: null, read_at: null, created_at: '2026-10-31T10:00:00Z',
      });
      expect(msg).not.toHaveProperty('image_path');
    });

    it('sin URL ni texto deja image_url y body en null', () => {
      const msg = toMessage({ ...row, body: undefined, broadcast_id: 'b1' });
      expect(msg.image_url).toBeNull();
      expect(msg.body).toBeNull();
      expect(msg.broadcast_id).toBe('b1');
    });
  });

  it('SENDER_ROLES', () => {
    expect(SENDER_ROLES).toEqual({ TRAINER: 'trainer', STUDENT: 'student' });
  });

  it('toPublicPerson deja solo id, name y avatar_url (null si falta)', () => {
    expect(toPublicPerson({ id: 'a', name: 'Ana', email: 'x@y.z' })).toEqual({ id: 'a', name: 'Ana', avatar_url: null });
    expect(toPublicPerson({ id: 'a', name: 'Ana', avatar_url: 'u' }).avatar_url).toBe('u');
  });

  it('toLastMessage resume el mensaje sin exponer image_path', () => {
    const last = toLastMessage({ body: null, image_path: 's/x.png', sender_role: 'student', created_at: 't', id: 'm' });
    expect(last).toEqual({ body: null, has_image: true, sender_role: 'student', created_at: 't' });
  });
});
