import AccountCard from '@/components/account/AccountCard';

/** Tu cuenta (PT): cambiar la contraseña y bajar las sesiones de todos sus alumnos en CSV. */
export default function TrainerAccountPage() {
  return (
    <div className="max-w-xl">
      <AccountCard
        exportLabel="Exportar los datos de tus alumnos"
        exportSubtitle="Todas sus sesiones en CSV"
        exportFilenamePrefix="fittrainer-alumnos"
      />
    </div>
  );
}
