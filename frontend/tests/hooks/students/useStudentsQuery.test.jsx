import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { createQueryClient } from '@/api/shared/queryClient';
import { useStudentsQuery } from '@/hooks/students/useStudents';
import { jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

afterEach(() => {
  focusManager.setFocused(undefined);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useStudentsQuery', () => {
  it('con la configuración de la app, vuelve a pedir la lista al volver a la pestaña ("Entrenando ahora" al día)', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: [] }));
    const client = createQueryClient();
    const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useStudentsQuery({ active: true }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    act(() => focusManager.setFocused(false));
    act(() => focusManager.setFocused(true));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
