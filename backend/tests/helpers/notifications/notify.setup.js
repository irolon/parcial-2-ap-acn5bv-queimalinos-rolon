import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockNotifications = { insert: jest.fn(), setPushSent: jest.fn() };
export const mockTokens = { findTokensForUser: jest.fn(), deleteTokens: jest.fn() };
export const mockFcm = { isFcmEnabled: jest.fn(), sendToToken: jest.fn() };
jest.unstable_mockModule(src('repositories/notifications/notifications.repository.js'), () => mockNotifications);
jest.unstable_mockModule(src('repositories/notifications/push-tokens.repository.js'), () => mockTokens);
jest.unstable_mockModule(src('services/notifications/fcm.client.js'), () => mockFcm);

export const { notify } = await import(src('services/notifications/notify.service.js'));

export const INPUT = { userId: 'u-1', userRole: 'student', type: 'comment', title: 'T', body: 'B', data: { a: 1 } };
export const row = { id: 'n-1', user_id: 'u-1', push_sent_at: null };
