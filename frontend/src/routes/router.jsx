import { Navigate } from 'react-router';
import AppShell from '@/components/shared/layout/AppShell';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import NotFoundPage from '@/pages/shared/NotFoundPage';
import PlaceholderPage from '@/pages/shared/PlaceholderPage';
import { GuestOnly, RequireRole, RootRedirect } from './guards';
import { ROLES, STUDENT_NAV, TRAINER_NAV } from './routeTable';

// Cada ítem del sidebar es una página "Próximamente" hasta que llegue su tarjeta.
// `handle` lleva el título y subtítulo que muestra la topbar.
function roleSection(role, nav) {
  return {
    path: nav.base,
    element: <RequireRole role={role} />,
    children: [
      {
        element: <AppShell role={role} />,
        children: [
          { index: true, element: <Navigate to={nav.items[0].path} replace /> },
          ...nav.items.map((item) => ({
            path: item.path,
            handle: { title: item.label, subtitle: item.subtitle },
            element: <PlaceholderPage title={item.label} />,
          })),
        ],
      },
    ],
  };
}

/** Árbol de rutas; lo usan `createBrowserRouter` (App) y `createMemoryRouter` (tests). */
export const routes = [
  { path: '/', element: <RootRedirect /> },
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/registro', element: <RegisterPage /> },
    ],
  },
  roleSection(ROLES.TRAINER, TRAINER_NAV),
  roleSection(ROLES.STUDENT, STUDENT_NAV),
  { path: '*', element: <NotFoundPage /> },
];
