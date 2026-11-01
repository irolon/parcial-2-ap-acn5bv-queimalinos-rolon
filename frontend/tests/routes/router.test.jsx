import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import PlaceholderPage from '@/pages/shared/PlaceholderPage';
import { routes } from '@/routes/router';
import { STUDENT_NAV } from '@/routes/routeTable';
import { resetAuthStore } from '../helpers/auth/authStore';
import { STUDENT, TRAINER, renderRoute, setSession } from '../helpers/routes/renderRoute';
import { studentDetail } from '../helpers/students/fixtures';
import { stubStudents } from '../helpers/students/students';

// Las páginas del alumno se reemplazan por una marca: acá se prueba a dónde lleva cada ruta, no lo que hace cada página.
vi.mock('@/pages/student/TodayPage', () => ({ default: () => <p>Página Hoy</p> }));
vi.mock('@/pages/progress/MyProgressPage', () => ({ default: () => <p>Página Mi progreso</p> }));
vi.mock('@/pages/student/MyRoutinesPage', () => ({ default: () => <p>Página Mis rutinas</p> }));
vi.mock('@/pages/student/RoutineDetailPage', () => ({ default: () => <p>Página Detalle de la rutina</p> }));
vi.mock('@/pages/student/HistoryPage', () => ({ default: () => <p>Página Historial</p> }));
vi.mock('@/pages/student/MyProfilePage', () => ({ default: () => <p>Página Mi perfil</p> }));
vi.mock('@/pages/student/WorkoutPage', () => ({ default: () => <p>Página Entrenar</p> }));

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
  stubStudents();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('rutas de alumnos', () => {
  it('/pt/alumnos/nuevo sigue mostrando "Invitar alumno"', () => {
    renderRoute('/pt/alumnos/nuevo');
    expect(screen.getByRole('heading', { level: 1, name: 'Invitar alumno' })).toBeVisible();
  });

  it('/pt/alumnos/:id renderiza la ficha', async () => {
    stubStudents({ detail: studentDetail() });
    renderRoute('/pt/alumnos/st-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Paz' })).toBeVisible();
  });

  it('/pt/alumnos renderiza el panel', () => {
    renderRoute('/pt/alumnos');
    expect(screen.getByRole('heading', { name: 'Alumnos', level: 1 })).toBeVisible();
  });
});

describe('rutas del alumno', () => {
  beforeEach(() => setSession(STUDENT));

  const section = routes.find((route) => route.path === STUDENT_NAV.base).children[0].children;

  it('ningún ítem del menú cae en el placeholder "Próximamente"', () => {
    for (const item of STUDENT_NAV.items) {
      const route = section.find((child) => child.path === item.path);
      expect(route, item.path).toBeDefined();
      expect(route.element.type).not.toBe(PlaceholderPage);
    }
  });

  it.each([
    ['/alumno/hoy', 'Hoy', 'Página Hoy'],
    ['/alumno/progreso', 'Mi progreso', 'Página Mi progreso'],
    ['/alumno/rutinas', 'Mis rutinas', 'Página Mis rutinas'],
    ['/alumno/historial', 'Historial', 'Página Historial'],
    ['/alumno/perfil', 'Mi perfil', 'Página Mi perfil'],
  ])('%s muestra su página bajo el título del menú', async (path, title, content) => {
    renderRoute(path);
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeVisible();
    expect(screen.getByText(content)).toBeVisible();
    expect(screen.queryByText('Próximamente')).not.toBeInTheDocument();
  });

  const menu = () => within(screen.getByTestId('sidebar-fixed')).getByRole('navigation', { name: 'Navegación principal' });

  it('el detalle de una rutina está fuera del menú, dentro del shell y con "Mis rutinas" marcado', async () => {
    renderRoute('/alumno/rutinas/r-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis rutinas' })).toBeVisible();
    expect(screen.getByText('Página Detalle de la rutina')).toBeVisible();
    expect(within(menu()).getByRole('link', { current: 'page' })).toHaveTextContent('Mis rutinas');
  });

  it('la sesión activa está fuera del menú, dentro del shell y sin ítem marcado', async () => {
    renderRoute('/alumno/entrenar');
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrenamiento' })).toBeVisible();
    expect(screen.getByText('Página Entrenar')).toBeVisible();
    expect(within(menu()).queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
    expect(within(menu()).getAllByRole('link')).toHaveLength(STUDENT_NAV.items.length);
  });

  it('/alumno va a Hoy', async () => {
    const { pathname } = renderRoute('/alumno');
    await waitFor(() => expect(pathname()).toBe('/alumno/hoy'));
  });

  it('el asistente salió del menú: su dirección ya no existe', async () => {
    renderRoute('/alumno/asistente');
    expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeVisible();
  });
});
