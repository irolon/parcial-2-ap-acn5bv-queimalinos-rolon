import { useState } from 'react';
import Card from '@/components/shared/ui/Card';
import { useExportCsv } from '@/hooks/account/useExportCsv';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { passwordAgeLabel } from '@/utils/account/passwordAge';
import AccountRow from './AccountRow';
import ChangePasswordDialog from './ChangePasswordDialog';

/**
 * Tarjeta "Cuenta" (alumno en Mi perfil, PT en Tu cuenta): cambiar la contraseña y bajar las sesiones en CSV.
 * `exportStudentId` baja las de un alumno; sin él, las de todos los alumnos del PT. `exportFilenamePrefix` lleva la
 * fecha de la descarga detrás.
 */
export default function AccountCard({ exportLabel, exportSubtitle, exportStudentId, exportFilenamePrefix }) {
  const changedAt = useAuthStore((state) => state.user?.password_changed_at ?? null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [changed, setChanged] = useState(false);
  const csv = useExportCsv({ studentId: exportStudentId, filenamePrefix: exportFilenamePrefix });

  function openDialog() {
    setChanged(false);
    setDialogOpen(true);
  }

  return (
    <section aria-label="Cuenta">
      <Card title="Cuenta">
        <AccountRow
          title="Contraseña"
          subtitle={passwordAgeLabel(changedAt)}
          actionLabel="Cambiar"
          onAction={openDialog}
        >
          {changed && (
            <p role="status" className="mt-2 font-body text-[13px] text-accentText">
              Listo. Cerramos tu sesión en los otros dispositivos.
            </p>
          )}
        </AccountRow>
        <AccountRow
          title={exportLabel}
          subtitle={exportSubtitle}
          actionLabel="Descargar"
          onAction={csv.download}
          loading={csv.isPending}
        >
          {csv.error && !csv.isPending && (
            <p role="alert" className="mt-2 font-body text-[13px] text-hot">
              No pudimos descargar el archivo
            </p>
          )}
        </AccountRow>
      </Card>
      <ChangePasswordDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onChanged={() => setChanged(true)} />
    </section>
  );
}
