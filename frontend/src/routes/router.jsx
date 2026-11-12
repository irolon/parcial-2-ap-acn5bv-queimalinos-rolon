import { Navigate } from 'react-router';
import AppShell from '@/components/shared/layout/AppShell';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import AgendaPage from '@/pages/agenda/AgendaPage';
import ChallengesPage from '@/pages/challenges/ChallengesPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ExerciseLibraryPage from '@/pages/exercises/ExerciseLibraryPage';
import RoutineEditorPage from '@/pages/routines/RoutineEditorPage';
import RoutinesPage from '@/pages/routines/RoutinesPage';
import AiRoutinePage from '@/pages/trainer-ai/AiRoutinePage';
import NewStudentPage from '@/pages/invitations/NewStudentPage';
import MyProgressPage from '@/pages/progress/MyProgressPage';
import JoinPage from '@/pages/students/JoinPage';
import MessagesPage from '@/pages/messages/MessagesPage';
import StudentMessagesPage from '@/pages/messages/StudentMessagesPage';
import StudentProfilePage from '@/pages/students/StudentProfilePage';
import StudentsPage from '@/pages/students/StudentsPage';
import AssistantPage from '@/pages/student/AssistantPage';
import HistoryPage from '@/pages/student/HistoryPage';
import MyAppointmentsPage from '@/pages/student/MyAppointmentsPage';
import MyProfilePage from '@/pages/student/MyProfilePage';
import MyRoutinesPage from '@/pages/student/MyRoutinesPage';
import RoutineDetailPage from '@/pages/student/RoutineDetailPage';
import TodayPage from '@/pages/student/TodayPage';
import WorkoutPage from '@/pages/student/WorkoutPage';
import NotFoundPage from '@/pages/shared/NotFoundPage';
import PlaceholderPage from '@/pages/shared/PlaceholderPage';
import { GuestOnly, RequireRole, RootRedirect } from './guards';
import {
  AI_ROUTINE,
  NEW_ROUTINE,
  NEW_STUDENT,
  ROLES,
  STUDENT_NAV,
  STUDENT_PROFILE,
  STUDENT_ROUTINE,
  TRAINER_NAV,
  WORKOUT_PATH,
} from './routeTable';

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
            handle: { title: item.title ?? item.label, subtitle: item.subtitle },
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
    ],
  },
  // Fuera de GuestOnly: con una sesión abierta la página lo avisa en vez de perder el link.
  { path: '/join', element: <JoinPage /> },
  roleSection(ROLES.TRAINER, TRAINER_NAV, [
    {
      path: NEW_STUDENT.path,
      handle: { title: NEW_STUDENT.title, subtitle: NEW_STUDENT.subtitle },
      element: <NewStudentPage />,
    },
    { path: STUDENT_PROFILE.path, element: <StudentProfilePage /> },
    { path: NEW_ROUTINE.path, element: <RoutineEditorPage /> },
    {
      path: AI_ROUTINE.path,
      handle: { title: AI_ROUTINE.title, subtitle: AI_ROUTINE.subtitle },
      element: <AiRoutinePage />,
    },
  ], {
    dashboard: <DashboardPage />,
    agenda: <AgendaPage />,
    alumnos: <StudentsPage />,
    rutinas: <RoutinesPage />,
    biblioteca: <ExerciseLibraryPage />,
    mensajes: <MessagesPage />,
    desafios: <ChallengesPage />,
  }),
  // Fuera del menú del alumno: el detalle de una rutina y la sesión activa (se entra desde Mis rutinas y Hoy).
  roleSection(ROLES.STUDENT, STUDENT_NAV, [
    {
      path: STUDENT_ROUTINE.path,
      handle: { title: 'Mis rutinas', subtitle: 'DETALLE DE LA RUTINA' },
      element: <RoutineDetailPage />,
    },
    {
      path: WORKOUT_PATH,
      handle: { title: 'Entrenamiento', subtitle: 'SESIÓN EN CURSO' },
      element: <WorkoutPage />,
    },
  ], {
    hoy: <TodayPage />,
    progreso: <MyProgressPage />,
    rutinas: <MyRoutinesPage />,
    historial: <HistoryPage />,
    asistente: <AssistantPage />,
    turnos: <MyAppointmentsPage />,
    mensajes: <StudentMessagesPage />,
    perfil: <MyProfilePage />,
  }),
  { path: '*', element: <NotFoundPage /> },
];
