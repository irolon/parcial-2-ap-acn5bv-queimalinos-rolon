import { Navigate } from 'react-router';
import AppShell from '@/components/shared/layout/AppShell';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ExerciseLibraryPage from '@/pages/exercises/ExerciseLibraryPage';
import RoutineEditorPage from '@/pages/routines/RoutineEditorPage';
import RoutinesPage from '@/pages/routines/RoutinesPage';
import NewStudentPage from '@/pages/invitations/NewStudentPage';
import MyProgressPage from '@/pages/progress/MyProgressPage';
import JoinPage from '@/pages/students/JoinPage';
import StudentMessagesPage from '@/pages/messages/StudentMessagesPage';
import StudentProfilePage from '@/pages/students/StudentProfilePage';
import StudentsPage from '@/pages/students/StudentsPage';
import NotFoundPage from '@/pages/shared/NotFoundPage';
import PlaceholderPage from '@/pages/shared/PlaceholderPage';
import { GuestOnly, RequireRole, RootRedirect } from './guards';
import { NEW_ROUTINE, NEW_STUDENT, ROLES, STUDENT_NAV, STUDENT_PROFILE, TRAINER_NAV } from './routeTable';

// Cada ítem del sidebar es una página "Próximamente" hasta que llegue su tarjeta;
// `pages` suma las páginas reales de la sección y `elements` reemplaza el placeholder de un ítem
// (clave: su `path`). `handle` lleva el título y subtítulo de la topbar.
function roleSection(role, nav, pages = [], elements = {}) {
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
            element: elements[item.path] ?? <PlaceholderPage title={item.label} />,
          })),
          ...pages,
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
      { path: '/join', element: <JoinPage /> },
    ],
  },
  roleSection(ROLES.TRAINER, TRAINER_NAV, [
    {
      path: NEW_STUDENT.path,
      handle: { title: NEW_STUDENT.title, subtitle: NEW_STUDENT.subtitle },
      element: <NewStudentPage />,
    },
    { path: STUDENT_PROFILE.path, element: <StudentProfilePage /> },
    { path: NEW_ROUTINE.path, element: <RoutineEditorPage /> },
  ], {
    dashboard: <DashboardPage />,
    alumnos: <StudentsPage />,
    rutinas: <RoutinesPage />,
    biblioteca: <ExerciseLibraryPage />,
  }),
  roleSection(ROLES.STUDENT, STUDENT_NAV, [], {
    progreso: <MyProgressPage />,
    mensajes: <StudentMessagesPage />,
  }),
  { path: '*', element: <NotFoundPage /> },
];
