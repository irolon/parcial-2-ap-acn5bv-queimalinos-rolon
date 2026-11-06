import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateRoutine, saveAsTemplates } from '@/api/trainer-ai/trainer-ai.api';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('trainer-ai.api', () => {
  it('generateRoutine hace POST /trainer-ai/generate-routine con la señal y devuelve `data`', async () => {
    const data = { generation_id: 'g-1', routine_proposal: { routines: [], rationale: 'Porque sí' } };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    const controller = new AbortController();
    expect(await generateRoutine({ goal: 'strength' }, { signal: controller.signal })).toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/trainer-ai/generate-routine');
    expect(init.method).toBe('POST');
    expect(init.signal).toBe(controller.signal);
    expect(bodyOf(init)).toEqual({ goal: 'strength' });
  });

  it('saveAsTemplates hace POST /trainer-ai/save-as-template y devuelve `data`', async () => {
    const data = { generation_id: 'g-1', templates: [{ id: 't-1', name: 'Fuerza', days: ['monday'] }] };
    const fetchMock = stubFetch(async () => jsonResponse(201, { data }));
    expect(await saveAsTemplates({ generation_id: 'g-1', template_name: 'Fuerza' })).toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/trainer-ai/save-as-template');
    expect(bodyOf(init)).toEqual({ generation_id: 'g-1', template_name: 'Fuerza' });
  });
});
