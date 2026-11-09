import { useState } from 'react';
import Input from '@/components/shared/ui/Input';
import { useChangePassword } from '@/hooks/account/useChangePassword';
import { validatePasswordChange } from '@/utils/account/passwordRules';
import { NO_FIELD_ERRORS, fieldErrorsFrom } from '@/utils/fieldErrors';
import PasswordRulesList from './PasswordRulesList';

const EMPTY = { current_password: '', new_password: '', repeat: '' };
const toErrors = (error) =>
  fieldErrorsFrom(error, {
    fields: ['current_password', 'new_password'],
    fallback: 'No pudimos cambiar la contraseña',
  });

/**
 * Actual (o temporal), nueva y repetir, con las reglas en vivo. Sin botones: el que envía usa `form={formId}`.
 * Al guardar, el store ya tiene el access nuevo y se llama `onSuccess`.
 */
export default function ChangePasswordForm({ formId, currentLabel = 'Contraseña actual', onSuccess }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState(NO_FIELD_ERRORS);
  const { submit, isPending } = useChangePassword();
  const { fields } = errors;
  const bind = (name) => ({
    name,
    value: values[name],
    onChange: (event) => setValues((prev) => ({ ...prev, [name]: event.target.value })),
    error: fields[name],
    type: 'password',
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (isPending) return;
    const clientErrors = validatePasswordChange(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors({ form: null, fields: clientErrors });
      return;
    }
    setErrors(NO_FIELD_ERRORS);
    try {
      await submit({ current_password: values.current_password, new_password: values.new_password });
    } catch (error) {
      setErrors(toErrors(error));
      return;
    }
    onSuccess?.();
  }

  return (
    <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {errors.form && (
        <p
          role="alert"
          className="rounded-md border border-hot/25 bg-hot/[0.14] px-3 py-2.5 font-body text-sm text-hot"
        >
          {errors.form}
        </p>
      )}
      <Input label={currentLabel} autoComplete="current-password" {...bind('current_password')} />
      <div className="flex flex-col gap-2">
        <Input label="Nueva contraseña" autoComplete="new-password" {...bind('new_password')} />
        <PasswordRulesList password={values.new_password} />
      </div>
      <Input label="Repetir nueva" autoComplete="new-password" {...bind('repeat')} />
    </form>
  );
}
