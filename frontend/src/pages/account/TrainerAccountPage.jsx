import AccountCard from '@/components/account/AccountCard';
import { todayString } from '@/utils/dates';

/** Tu cuenta (PT): cambiar la contraseña y bajar las sesiones de todos sus alumnos en CSV. */
export default function TrainerAccountPage() {
  return (
    <div className="max-w-xl">
      <AccountCard
        exportLabel="Exportar los datos de tus alumnos"
        exportSubtitle="Todas sus sesiones en CSV"
        exportFilename={`fittrainer-alumnos-${todayString()}.csv`}
      />
    </div>
  );
}
