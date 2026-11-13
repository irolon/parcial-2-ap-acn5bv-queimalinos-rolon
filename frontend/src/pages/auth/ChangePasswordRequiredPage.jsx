import { useNavigate } from 'react-router';
import ChangePasswordForm from '@/components/account/ChangePasswordForm';
import BrandMark from '@/components/shared/ui/BrandMark';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import { useIsChangingPassword } from '@/hooks/account/useChangePassword';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { homeFor } from '@/routes/routeTable';

const FORM_ID = 'required-password-form';

/**
 * `/cambiar-clave` (sin shell, como `/login`): con la clave temporal que le dio su PT, el alumno elige una nueva.
 * Al guardar, el store ya no tiene el flag y va a la home de su rol.
 */
export default function ChangePasswordRequiredPage() {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);
  const logout = useAuthStore((state) => state.logout);
  const saving = useIsChangingPassword();

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink0 p-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark size={44} />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-[-0.6px] text-bone0">
              Elegí una contraseña nueva
            </h1>
            <p className="mt-2 font-body text-sm text-ink6">
              Tu entrenador/a te dio una clave temporal. Elegí una nueva para seguir.
            </p>
          </div>
        </div>
        <Card padding={24}>
          <ChangePasswordForm
            formId={FORM_ID}
            currentLabel="Clave temporal"
            onSuccess={() => navigate(homeFor(role) ?? '/', { replace: true })}
          />
          <Button type="submit" form={FORM_ID} full loading={saving} className="mt-5">
            Guardar y seguir
          </Button>
        </Card>
        <div className="mt-5 flex justify-center">
          <Button variant="ghost" size="sm" onClick={logout} disabled={saving}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </main>
  );
}
