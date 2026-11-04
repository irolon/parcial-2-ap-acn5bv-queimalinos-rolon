import { describe, expect, it } from '@jest/globals';
import { forEachLimit } from '../../../../../src/shared/utils/async/concurrency.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('forEachLimit', () => {
  it('procesa todos los ítems sin pasar de `limit` en vuelo a la vez', async () => {
    let inFlight = 0;
    let max = 0;
    const seen = [];
    await forEachLimit([...Array(25).keys()], 10, async (n) => {
      inFlight += 1;
      max = Math.max(max, inFlight);
      await tick();
      seen.push(n);
      inFlight -= 1;
    });
    expect(max).toBe(10);
    expect(seen.sort((a, b) => a - b)).toEqual([...Array(25).keys()]);
  });

  it('uno colgado ocupa un solo lugar: los demás siguen saliendo', async () => {
    const done = [];
    void forEachLimit(['lento', 'a', 'b', 'c'], 2, (item) =>
      item === 'lento' ? new Promise(() => {}) : tick().then(() => done.push(item))
    );
    for (let i = 0; i < 5; i += 1) await tick();
    expect(done).toEqual(['a', 'b', 'c']);
  });

  it('lista vacía: no llama a fn', async () => {
    let calls = 0;
    await forEachLimit([], 10, async () => {
      calls += 1;
    });
    expect(calls).toBe(0);
  });
});
