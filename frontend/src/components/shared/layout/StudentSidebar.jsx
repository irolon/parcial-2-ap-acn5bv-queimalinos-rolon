import { STUDENT_NAV } from '@/routes/routeTable';
import SidebarFrame, { roleSubtitle } from './SidebarFrame';

// La tarjeta "TU ENTRENADORA" se suma cuando el backend devuelva el entrenador.
export default function StudentSidebar({ user, onLogout, onNavigate }) {
  return (
    <SidebarFrame
      subtitle={roleSubtitle('ALUMNO', user?.name)}
      nav={STUDENT_NAV}
      user={user}
      onLogout={onLogout}
      onNavigate={onNavigate}
    />
  );
}
