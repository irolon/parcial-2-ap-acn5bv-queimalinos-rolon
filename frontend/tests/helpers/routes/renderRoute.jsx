import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { routes } from '@/routes/router';

export const TRAINER = { id: 't-1', email: 'laura@fit.com', name: 'Laura Pereyra', role: 'trainer' };
export const STUDENT = { id: 's-1', email: 'tomas@fit.com', name: 'Tomás Ruiz', role: 'student' };

/** Deja el store con una sesión iniciada (o en el `status` pedido). */
export function setSession(user, status = user ? 'authenticated' : 'anonymous') {
  useAuthStore.setState({
    user,
    token: user ? 'access-1' : null,
    refreshToken: user ? 'refresh-1' : null,
    status,
  });
}

/** Monta el árbol real de rutas en memoria, arrancando en `path`. */
export function renderRoute(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utils, router, queryClient, pathname: () => router.state.location.pathname };
}
