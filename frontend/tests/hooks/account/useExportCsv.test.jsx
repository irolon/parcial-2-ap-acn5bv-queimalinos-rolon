import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useExportCsv } from '@/hooks/account/useExportCsv';
import { configureClient } from '@/api/shared/client';
import { downloadText } from '@/utils/download';
import { calls, errorResponse, stubFetch } from '../../helpers/shared/fetchMock';

vi.mock('@/utils/download', () => ({ downloadText: vi.fn() }));

const CSV = '﻿Fecha;Hora\r\n';
const csvResponse = () => new Response(CSV, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8' } });

function renderExport(args) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return renderHook(() => useExportCsv(args), { wrapper });
}

const save = vi.mocked(downloadText);

beforeEach(() => {
  configureClient({ getToken: () => 'access-1' });
  save.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useExportCsv', () => {
  it('download() pide el CSV del alumno y lo baja con el nombre dado', async () => {
    const fetchMock = stubFetch(async () => csvResponse());
    const { result } = renderExport({ studentId: 's-1', filename: 'fittrainer-mis-sesiones-2026-11-09.csv' });
    await act(() => result.current.download());
    expect(calls(fetchMock)[0][0]).toBe('/students/s-1/export');
    expect(save).toHaveBeenCalledWith(CSV, 'fittrainer-mis-sesiones-2026-11-09.csv', 'text/csv');
  });

  it('sin studentId pide el de todos los alumnos', async () => {
    const fetchMock = stubFetch(async () => csvResponse());
    const { result } = renderExport({ filename: 'fittrainer-alumnos-2026-11-09.csv' });
    await act(() => result.current.download());
    expect(calls(fetchMock)[0][0]).toBe('/students/export');
  });

  it('si falla, expone el error y no descarga', async () => {
    stubFetch(async () => errorResponse(500, 'INTERNAL_ERROR'));
    const { result } = renderExport({ studentId: 's-1', filename: 'x.csv' });
    await act(() => result.current.download());
    await waitFor(() => expect(result.current.error).toMatchObject({ status: 500 }));
    expect(save).not.toHaveBeenCalled();
  });
});
