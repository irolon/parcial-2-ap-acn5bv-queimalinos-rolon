import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { msUntilNextRun, startScheduler } from '../../../../src/shared/utils/scheduler.js';

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

  it('corre los jobs a las 03:00 AR en orden y se reagenda', async () => {
    const calls = [];
    const a = jest.fn(async () => { calls.push('a'); return { ok: 1 }; });
    const b = jest.fn(async () => { calls.push('b'); return {}; });
    const stop = startScheduler({ jobs: [{ name: 'a', run: a }, { name: 'b', run: b }] });
    await jest.advanceTimersByTimeAsync(HOUR);
    expect(calls).toEqual(['a', 'b']);
    await jest.advanceTimersByTimeAsync(24 * HOUR);
    expect(calls).toEqual(['a', 'b', 'a', 'b']);
    expect(console.log).toHaveBeenCalledWith('[jobs] a: inicio');
    expect(console.log).toHaveBeenCalledWith('[jobs] a: fin', { ok: 1 });
    stop();
  });

  it('corre el segundo job aunque el primero falle, y sigue agendado', async () => {
    const a = jest.fn().mockRejectedValue(new Error('boom'));
    const b = jest.fn().mockResolvedValue({});
    const stop = startScheduler({ jobs: [{ name: 'a', run: a }, { name: 'b', run: b }] });
    await jest.advanceTimersByTimeAsync(HOUR);
    expect(b).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('[jobs] a: falló', expect.any(Error));
    await jest.advanceTimersByTimeAsync(24 * HOUR);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
    stop();
  });

  it('stop() cancela las corridas futuras', async () => {
    const run = jest.fn().mockResolvedValue({});
    const stop = startScheduler({ jobs: [{ name: 'a', run }] });
    stop();
    await jest.advanceTimersByTimeAsync(48 * HOUR);
    expect(run).not.toHaveBeenCalled();
  });
});
