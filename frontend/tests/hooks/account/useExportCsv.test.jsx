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
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useExportCsv', () => {
  it('download() pide el CSV del alumno y lo baja como <prefijo>-<fecha del día>.csv', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 9, 12, 0));
    const fetchMock = stubFetch(async () => csvResponse());
    const { result } = renderExport({ studentId: 's-1', filenamePrefix: 'fittrainer-mis-sesiones' });
    await act(() => result.current.download());
    expect(calls(fetchMock)[0][0]).toBe('/students/s-1/export');
    expect(save).toHaveBeenCalledWith(CSV, 'fittrainer-mis-sesiones-2026-11-09.csv', 'text/csv');
  });

  it('sin studentId pide el de todos los alumnos', async () => {
    const fetchMock = stubFetch(async () => csvResponse());
    const { result } = renderExport({ filenamePrefix: 'fittrainer-alumnos' });
    await act(() => result.current.download());
    expect(calls(fetchMock)[0][0]).toBe('/students/export');
  });

  it('la fecha del nombre es la de la descarga, no la del render (la página quedó abierta pasada la medianoche)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 8, 23, 59));
    stubFetch(async () => csvResponse());
    const { result } = renderExport({ filenamePrefix: 'fittrainer-alumnos' });
    vi.setSystemTime(new Date(2026, 10, 9, 0, 1));
    await act(() => result.current.download());
    expect(save).toHaveBeenCalledWith(CSV, 'fittrainer-alumnos-2026-11-09.csv', 'text/csv');
  });

  it('si falla, expone el error y no descarga', async () => {
    stubFetch(async () => errorResponse(500, 'INTERNAL_ERROR'));
    const { result } = renderExport({ studentId: 's-1', filenamePrefix: 'x' });
    await act(() => result.current.download());
    await waitFor(() => expect(result.current.error).toMatchObject({ status: 500 }));
    expect(save).not.toHaveBeenCalled();
  });
});
