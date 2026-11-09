import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { mockFcm, mockPrefs, mockTokens } from '../../../../helpers/notifications/notify.setup.js';

// notify.service real (con repos y FCM mockeados en el setup) + message-triggers real: el filtro corre de verdad.
const src = (p) => fileURLToPath(new URL(`../../../../../src/${p}`, import.meta.url));
const mockAuthRepo = { findTrainerById: jest.fn() };
jest.unstable_mockModule(src('repositories/auth/auth.repository.js'), () => mockAuthRepo);
const { onBroadcastSent } = await import(src('services/notifications/message-triggers.service.js'));

const ALL_ON = { message: true, comment: true, appointment: true, pr: true, achievement: true, updated_at: 'X' };

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockAuthRepo.findTrainerById.mockResolvedValue({ id: 'tr-1', name: 'Carla' });
  mockFcm.isFcmEnabled.mockReturnValue(true);
  mockFcm.sendToToken.mockResolvedValue({ ok: true });
  mockTokens.findTokensForUser.mockImplementation(async (id) => [`token-${id}`]);
  mockPrefs.findByStudent.mockImplementation(async (id) => (id === 'b' ? { ...ALL_ON, message: false } : null));
});

describe('envío masivo con preferencias', () => {
  it('el alumno que apagó message no recibe; el resto sí', async () => {
    await onBroadcastSent({ trainerId: 'tr-1', studentIds: ['a', 'b', 'c'], body: 'feriado' });
    expect(mockPrefs.findByStudent).toHaveBeenCalledTimes(3);
    expect(mockTokens.findTokensForUser.mock.calls.map(([id]) => id)).toEqual(['a', 'c']);
    expect(mockFcm.sendToToken.mock.calls.map(([token]) => token)).toEqual(['token-a', 'token-c']);
  });
});
