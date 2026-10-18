import { Outlet, useMatches } from 'react-router';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useDrawer } from '@/hooks/shared/useDrawer';
import MobileDrawer from './MobileDrawer';
import StudentSidebar from './StudentSidebar';
import Topbar from './Topbar';
import TrainerSidebar from './TrainerSidebar';

const SIDEBARS = { trainer: TrainerSidebar, student: StudentSidebar };

/**
 * Layout de las rutas privadas.
 * - ≥ 1024: sidebar completo de 220 px. 768–1023: sidebar de íconos de 64 px.
 * - < 768: sin sidebar fijo; el botón de menú de la topbar abre el panel lateral.
 * El título de la topbar sale del `handle` de la ruta activa.
 */
export default function AppShell({ role }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const page = useMatches().findLast((match) => match.handle)?.handle ?? {};
  const drawer = useDrawer();
  const Sidebar = SIDEBARS[role];

  return (
    <div className="flex min-h-screen bg-ink0 text-bone0">
      <aside
        data-testid="sidebar-fixed"
        className="sticky top-0 hidden h-screen shrink-0 md:flex md:w-16 lg:w-[220px]"
      >
        <Sidebar user={user} onLogout={logout} />
      </aside>

      <MobileDrawer open={drawer.open} onClose={drawer.close} initialFocusRef={drawer.initialFocusRef}>
        <Sidebar user={user} onLogout={logout} onNavigate={drawer.close} />
      </MobileDrawer>

      <div className="flex min-w-0 flex-1 flex-col" inert={drawer.open}>
        <Topbar
          title={page.title}
          subtitle={page.subtitle}
          role={role}
          user={user}
          menuOpen={drawer.open}
          onMenu={drawer.show}
          menuButtonRef={drawer.triggerRef}
        />
        <main className="flex-1 p-4 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
