import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

export const WORKOUT_URL = '/alumno/entrenar';
export const TODAY_URL = '/alumno/hoy';
export const HISTORY_URL = '/alumno/historial';

/**
 * Monta `ui` en un router en memoria con los destinos de la sesión activa (Hoy e Historial son pantallas de mentira)
 * y su QueryClient. `pathname()` dice dónde terminó el router.
 */
export function renderAt(ui, path = WORKOUT_URL) {
  const router = createMemoryRouter(
    [
      { path: WORKOUT_URL, element: ui },
      { path: TODAY_URL, element: <p>Pantalla de Hoy</p> },
      { path: HISTORY_URL, element: <p>Pantalla del historial</p> },
    ],
    { initialEntries: [path] },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utils, router, queryClient, pathname: () => router.state.location.pathname };
}
