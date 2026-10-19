import { useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import BrandMark from '@/components/shared/ui/BrandMark';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import Input from '@/components/shared/ui/Input';
import { NO_FIELD_ERRORS } from '@/utils/fieldErrors';
import { homeFor } from '@/routes/routeTable';
import { toLoginErrors } from './loginErrors';

const UNKNOWN_ROLE_MESSAGE = 'No pudimos iniciar sesión con esa cuenta';

/**
 * Login de entrenadores y alumnos. Si sale bien, el guard de `/login`
 * redirige a la ruta recordada o a la home del rol.
 */
export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState(NO_FIELD_ERRORS);

  async function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setErrors(NO_FIELD_ERRORS);
    setSubmitting(true);
    try {
      const user = await login({
        email: String(data.get('email')).trim(),
        password: String(data.get('password')),
      });
      if (!homeFor(user?.role)) {
        // Rol sin pantalla de inicio: no se deja una sesión que el guard no sabe ubicar.
        await logout();
        setErrors({ form: UNKNOWN_ROLE_MESSAGE, fields: {} });
        setSubmitting(false);
      }
    } catch (error) {
      setErrors(toLoginErrors(error));
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink0 p-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark size={44} />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-[-0.6px] text-bone0">FitTrainer</h1>
            <p className="mt-1 font-mono text-[10px] tracking-[1px] text-ink6">
              INGRESÁ A TU CUENTA
            </p>
          </div>
        </div>
        <Card padding={24}>
          <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="vos@ejemplo.com"
              error={errors.fields.email}
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              error={errors.fields.password}
            />
            {errors.form && (
              <p
                role="alert"
                className="rounded-md border border-hot/25 bg-hot/[0.14] px-3 py-2.5 font-body text-sm text-hot"
              >
                {errors.form}
              </p>
            )}
            <Button type="submit" full loading={submitting} className="mt-1">
              Ingresar
            </Button>
          </form>
        </Card>
        <p className="mt-5 text-center font-body text-sm text-ink6">
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className="text-accentText hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </main>
  );
}
