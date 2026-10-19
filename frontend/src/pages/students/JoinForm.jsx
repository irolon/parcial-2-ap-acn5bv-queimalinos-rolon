import { useState } from 'react';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import Input from '@/components/shared/ui/Input';
import { NO_FIELD_ERRORS } from '@/utils/fieldErrors';
import { invitationErrorMessage, toJoinErrors, validateJoin } from './joinErrors';

function ReadOnly({ label, value }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-[1px] text-ink6">{label}</dt>
      <dd className="mt-1 font-body text-sm text-bone0">{value}</dd>
    </div>
  );
}

/**
 * Datos precargados (solo lectura) + contraseña. `onFatal(message)` se llama si el
 * POST dice que la invitación ya no sirve.
 */
export default function JoinForm({ invitation, token, onFatal }) {
  const join = useAuthStore((s) => s.joinFromInvitation);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState(NO_FIELD_ERRORS);

  async function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = { password: String(data.get('password')), confirm: String(data.get('confirm')) };
    const fields = validateJoin(values);
    if (Object.keys(fields).length > 0) return setErrors({ form: null, fields });
    setErrors(NO_FIELD_ERRORS);
    setSubmitting(true);
    try {
      await join({ token, password: values.password });
    } catch (error) {
      const fatal = invitationErrorMessage(error);
      if (fatal) return onFatal(fatal);
      setErrors(toJoinErrors(error));
      setSubmitting(false);
    }
  }

  return (
    <Card padding={24}>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <dl className="flex flex-col gap-3 rounded-md border border-ink2 bg-ink0 p-3.5">
          <ReadOnly label="Tu entrenador" value={invitation.trainer?.name} />
          <ReadOnly label="Nombre" value={invitation.student_name} />
          <ReadOnly label="Email" value={invitation.student_email} />
        </dl>
        <Input
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="8 caracteres o más"
          error={errors.fields.password}
        />
        <Input
          label="Repetí la contraseña"
          name="confirm"
          type="password"
          autoComplete="new-password"
          error={errors.fields.confirm}
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
          Crear mi cuenta
        </Button>
      </form>
    </Card>
  );
}
