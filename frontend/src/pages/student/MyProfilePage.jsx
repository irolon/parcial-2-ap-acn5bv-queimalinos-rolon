import { useEffect } from 'react';
import AccountCard from '@/components/account/AccountCard';
import StudentMetrics from '@/components/body-metrics/StudentMetrics';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import TrainerCard from '@/components/student/profile/TrainerCard';
import ActiveRoutineCard from '@/components/students/profile/ActiveRoutineCard';
import MyProfileCard from '@/components/students/profile/MyProfileCard';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useStudentQuery } from '@/hooks/students/useStudents';

// Los datos y la rutina activa salen de la misma ficha (`GET /students/:id`): un solo bloque con su carga y su error.
// La ficha trae solo la rutina activa más reciente; con varias, todas están en Mis rutinas.
function ProfileBlock({ query }) {
  if (query.isPending) {
    return (
      <Card>
        <LoadingState rows={2} label="Cargando tu perfil…" />
      </Card>
    );
  }
  if (query.isError && !query.data) {
    return (
      <Card>
        <ErrorState message="No pudimos cargar tu perfil." onRetry={() => query.refetch()} />
      </Card>
    );
  }
  return (
    <>
      <MyProfileCard student={query.data} />
      <ActiveRoutineCard routine={query.data.active_routine} title="Rutina más reciente" />
    </>
  );
}

/**
 * El `user` del store (sidebar y topbar) se guarda en localStorage y su foto firmada vence en una hora: cada vez que
 * llega la ficha, se copian el nombre y la foto vigentes.
 */
function useSyncUser(student) {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const name = student?.name;
  const avatarUrl = student?.avatar_url ?? null;
  const stale = Boolean(student) && (user?.name !== name || (user?.avatar_url ?? null) !== avatarUrl);
  useEffect(() => {
    if (stale) updateUser({ name, avatar_url: avatarUrl });
  }, [stale, name, avatarUrl, updateUser]);
}

/**
 * Mi perfil: los datos del alumno (cambia su foto, nombre y teléfono; el resto, su entrenador), su rutina activa, sus medidas, que sí
 * puede cargar, y la tarjeta Cuenta (contraseña y CSV). Los dos bloques, la ficha y las medidas, cargan y fallan cada uno por su cuenta.
 */
export default function MyProfilePage() {
  const studentId = useAuthStore((state) => state.user?.id);
  const profile = useStudentQuery(studentId);
  useSyncUser(profile.data);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <ProfileBlock query={profile} />
        <TrainerCard studentId={studentId} />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <StudentMetrics studentId={studentId} />
        <AccountCard
          exportLabel="Exportar mis datos"
          exportSubtitle="Historial completo en formato CSV"
          exportStudentId={studentId}
          exportFilenamePrefix="fittrainer-mis-sesiones"
        />
      </div>
    </div>
  );
}
