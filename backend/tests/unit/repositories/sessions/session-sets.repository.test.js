import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Rutas absolutas: el mock tiene que resolver al MISMO archivo que importa el repositorio.
const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const select = jest.fn();
const eq = jest.fn();
const upsert = jest.fn();
const update = jest.fn();
const chain = { select, eq };
const supabase = { from: jest.fn(() => ({ upsert, update })) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const { insertNewSets, updateSetInSession } = await import(
  src('repositories/sessions/session-sets.repository.js')
);

beforeEach(() => {
  jest.resetAllMocks();
  supabase.from.mockImplementation(() => ({ upsert, update }));
  upsert.mockReturnValue(chain);
  update.mockReturnValue(chain);
  eq.mockReturnValue(chain);
});

describe('session-sets.repository · insertNewSets', () => {
  it('upsert con ignoreDuplicates, select de id y devuelve los ids insertados', async () => {
    select.mockResolvedValue({ data: [{ id: 'a' }], error: null });
    const rows = [{ id: 'a' }, { id: 'b' }];
    await expect(insertNewSets(rows)).resolves.toEqual(['a']);
    expect(upsert).toHaveBeenCalledWith(rows, { onConflict: 'id', ignoreDuplicates: true });
    expect(select).toHaveBeenCalledWith('id');
  });

  it('error de la base: 500', async () => {
    select.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(insertNewSets([{ id: 'a' }])).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe('session-sets.repository · updateSetInSession', () => {
  it('filtra por id y por session_id, y no manda id ni session_id al update', async () => {
    select.mockResolvedValue({ data: [{ id: 'a' }], error: null });
    await expect(updateSetInSession('s-1', 'a', { actual_kg: 5 })).resolves.toBe(true);
    const fields = update.mock.calls[0][0];
    expect(fields).toEqual({ actual_kg: 5 });
    expect(fields).not.toHaveProperty('id');
    expect(fields).not.toHaveProperty('session_id');
    expect(eq).toHaveBeenCalledWith('id', 'a');
    expect(eq).toHaveBeenCalledWith('session_id', 's-1');
    expect(select).toHaveBeenCalledWith('id');
  });

  it('sin filas devueltas (la serie es de otra sesión): false', async () => {
    select.mockResolvedValue({ data: [], error: null });
    await expect(updateSetInSession('s-1', 'a', {})).resolves.toBe(false);
  });

  it('error de la base: 500', async () => {
    select.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(updateSetInSession('s-1', 'a', {})).rejects.toMatchObject({ statusCode: 500 });
  });
});
