import StudentMetrics from '@/components/body-metrics/StudentMetrics';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import ActiveRoutineCard from '@/components/students/profile/ActiveRoutineCard';
import MyProfileCard from '@/components/students/profile/MyProfileCard';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useStudentQuery } from '@/hooks/students/useStudents';

// Los datos y la rutina activa salen de la misma ficha (`GET /students/:id`): un solo bloque con su carga y su error.
function ProfileBlock({ query }) {
  if (query.isPending) {
    return (
      <Card>
        <LoadingState rows={2} label="Cargando tu perfil…" />
      </Card>
    );
  }
  if (query.isError) {
    return (
      <Card>
        <ErrorState message="No pudimos cargar tu perfil." onRetry={() => query.refetch()} />
      </Card>
    );
  }
  return (
    <>
      <MyProfileCard student={query.data} />
      <ActiveRoutineCard routine={query.data.active_routine} />
    </>
  );
}

/**
 * Mi perfil: los datos del alumno de solo lectura (los cambia su entrenador), su rutina activa y sus medidas, que sí
 * puede cargar. Los dos bloques, la ficha y las medidas, cargan y fallan cada uno por su cuenta.
 */
export default function MyProfilePage() {
  const studentId = useAuthStore((state) => state.user?.id);
  const profile = useStudentQuery(studentId);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <ProfileBlock query={profile} />
      </div>
      <StudentMetrics studentId={studentId} />
    </div>
  );
}
