import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

/** Monta un componente en un router en memoria (arranca en Hoy) con su QueryClient. `pathname()` dice dónde terminó. */
export function renderInRouter(ui, { path = '/alumno/hoy' } = {}) {
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: [path] });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utils, router, queryClient, pathname: () => router.state.location.pathname };
}
