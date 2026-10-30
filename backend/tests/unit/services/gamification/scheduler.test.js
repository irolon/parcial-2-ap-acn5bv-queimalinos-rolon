import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
jest.unstable_mockModule(src('services/gamification/daily-job.service.js'), () => ({
  runDailyGamification: jest.fn(),
}));

const { msUntilNextRun, startScheduler } = await import('../../../../src/services/gamification/scheduler.js');

const HOUR = 60 * 60 * 1000;

describe('msUntilNextRun', () => {
  it('antes de las 03:00 AR espera hasta ese mismo día', () => {
    expect(msUntilNextRun(new Date('2026-10-30T05:00:00Z'))).toBe(HOUR);
  });

  it('justo a las 03:00 AR espera un día completo', () => {
    expect(msUntilNextRun(new Date('2026-10-30T06:00:00Z'))).toBe(24 * HOUR);
  });

  it('pasadas las 03:00 AR espera hasta la madrugada siguiente', () => {
    expect(msUntilNextRun(new Date('2026-10-30T15:00:00Z'))).toBe(15 * HOUR);
  });

  it('cruza el fin de mes', () => {
    expect(msUntilNextRun(new Date('2026-10-31T23:00:00Z'))).toBe(7 * HOUR);
  });

  it('respeta otra hora local', () => {
    expect(msUntilNextRun(new Date('2026-10-30T05:00:00Z'), 4)).toBe(2 * HOUR);
  });
});

describe('startScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-30T05:00:00Z') });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.useRealTimers());

  it('corre el job a las 03:00 AR y se reagenda', async () => {
    const run = jest.fn().mockResolvedValue({ failedChallenges: 0, evaluated: 1, errors: 0 });
    const stop = startScheduler({ run });
    await jest.advanceTimersByTimeAsync(HOUR);
    expect(run).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(24 * HOUR);
    expect(run).toHaveBeenCalledTimes(2);
    stop();
  });

  it('un error del job no sale del timer y la próxima corrida sigue agendada', async () => {
    const run = jest.fn().mockRejectedValue(new Error('boom'));
    const stop = startScheduler({ run });
    await jest.advanceTimersByTimeAsync(HOUR);
    await jest.advanceTimersByTimeAsync(24 * HOUR);
    expect(run).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalled();
    stop();
  });

  it('stop() cancela las corridas futuras', async () => {
    const run = jest.fn().mockResolvedValue({});
    const stop = startScheduler({ run });
    stop();
    await jest.advanceTimersByTimeAsync(48 * HOUR);
    expect(run).not.toHaveBeenCalled();
  });
});
