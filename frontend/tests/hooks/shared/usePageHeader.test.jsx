import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import AppShell from '@/components/shared/layout/AppShell';
import { usePageHeader } from '@/hooks/shared/usePageHeader';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { TRAINER, setSession } from '../../helpers/routes/renderRoute';

function Pinned({ header }) {
  usePageHeader(header);
  return <p>Página fijada</p>;
}

const Plain = () => <p>Sin header propio</p>;

function mount(header) {
  const router = createMemoryRouter(
    [
      {
        element: <AppShell role="trainer" />,
        children: [
          { path: '/fijada', handle: { title: 'Del handle' }, element: <Pinned header={header} /> },
          { path: '/otra', handle: { title: 'Otra sección', subtitle: 'OTRA' }, element: <Plain /> },
        ],
      },
    ],
    { initialEntries: ['/fijada'] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const h1 = () => screen.getByRole('heading', { level: 1 });

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

describe('usePageHeader', () => {
  it('la topbar muestra el título y subtítulo fijados y vuelve al handle al desmontar', async () => {
    const router = mount({ title: 'Lucía Gómez', subtitle: 'ALUMNOS › PERFIL' });
    expect(h1()).toHaveTextContent('Lucía Gómez');
    expect(screen.getByText('ALUMNOS › PERFIL')).toBeInTheDocument();
    await act(() => router.navigate('/otra'));
    expect(h1()).toHaveTextContent('Otra sección');
    expect(screen.queryByText('ALUMNOS › PERFIL')).not.toBeInTheDocument();
  });

  it('con null deja el título del handle', () => {
    mount(null);
    expect(h1()).toHaveTextContent('Del handle');
  });
});
