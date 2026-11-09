import AccountCard from '@/components/account/AccountCard';
import TrainerProfileCard from '@/components/account/TrainerProfileCard';

/** Tu cuenta (PT): su nombre y título profesional, cambiar la contraseña y bajar las sesiones de sus alumnos en CSV. */
export default function TrainerAccountPage() {
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <TrainerProfileCard />
      <AccountCard
        exportLabel="Exportar los datos de tus alumnos"
        exportSubtitle="Todas sus sesiones en CSV"
        exportFilenamePrefix="fittrainer-alumnos"
      />
    </div>
  );
}
