import { QrCode } from 'lucide-react';
import { useNavigate } from 'react-router';
import Button from '@/components/shared/ui/Button';
import { NEW_STUDENT, TRAINER_NAV } from '@/routes/routeTable';
import SidebarFrame, { roleSubtitle } from './SidebarFrame';
import { COMPACT_HIDDEN, COMPACT_SR_ONLY } from './compact';

// "Generar QR" lleva a la pantalla de nuevo alumno.
const INVITE_PATH = NEW_STUDENT.path;

function InviteCard({ onNavigate }) {
  const navigate = useNavigate();
  const goToInvite = () => {
    onNavigate?.();
    navigate(INVITE_PATH);
  };
  return (
    <div className="p-3">
      <div className="rounded-lg border border-ink3 bg-ink2 p-3 md:max-lg:border-0 md:max-lg:bg-transparent md:max-lg:p-0">
        <p className={`mb-1 font-mono text-[9px] tracking-[1px] text-ink6 ${COMPACT_HIDDEN}`}>INVITAR</p>
        <p
          className={`mb-2 font-display text-xs font-medium leading-[1.3] text-bone0 ${COMPACT_HIDDEN}`}
        >
          Nuevo alumno en 15 segundos
        </p>
        <Button size="sm" full onClick={goToInvite} title="Generar QR">
          <QrCode size={14} aria-hidden="true" />
          <span className={COMPACT_SR_ONLY}>Generar QR</span>
        </Button>
      </div>
    </div>
  );
}

export default function TrainerSidebar({ user, onLogout, onNavigate }) {
  return (
    <SidebarFrame
      subtitle={roleSubtitle('PRO', user?.name)}
      nav={TRAINER_NAV}
      footer={<InviteCard onNavigate={onNavigate} />}
      user={user}
      onLogout={onLogout}
      onNavigate={onNavigate}
    />
  );
}
