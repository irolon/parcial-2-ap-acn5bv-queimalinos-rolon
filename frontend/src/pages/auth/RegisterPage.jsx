import { useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import BrandMark from '@/components/shared/ui/BrandMark';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import Input from '@/components/shared/ui/Input';
import { NO_FIELD_ERRORS } from '@/utils/fieldErrors';
import { toRegisterErrors } from './registerErrors';


/**
 * Alta de entrenadores. Si sale bien queda con la sesión iniciada y el guard
 * de `/registro` lo manda a la home del rol (`/pt/dashboard`).
 */
export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState(NO_FIELD_ERRORS);

  async function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const specialty = String(data.get('specialty')).trim();
    setErrors(NO_FIELD_ERRORS);
    setSubmitting(true);
    try {
      await register({
        name: String(data.get('name')).trim(),
        email: String(data.get('email')).trim(),
        password: String(data.get('password')),
        ...(specialty && { specialty }),
      });
    } catch (error) {
      setErrors(toRegisterErrors(error));
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
              CREÁ TU CUENTA DE ENTRENADOR
            </p>
          </div>
        </div>
        <Card padding={24}>
          <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nombre y apellido"
              name="name"
              autoComplete="name"
              placeholder="Laura Pereyra"
              error={errors.fields.name}
            />
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
              autoComplete="new-password"
              hint="8 caracteres o más, con una mayúscula y un número"
              error={errors.fields.password}
            />
            <Input
              label="Especialidad (opcional)"
              name="specialty"
              placeholder="Hipertrofia, funcional…"
              error={errors.fields.specialty}
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
              Crear cuenta
            </Button>
          </form>
        </Card>
        <p className="mt-5 text-center font-body text-sm text-ink6">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-accentText hover:underline">
            Ingresá
          </Link>
        </p>
      </div>
    </main>
  );
}
