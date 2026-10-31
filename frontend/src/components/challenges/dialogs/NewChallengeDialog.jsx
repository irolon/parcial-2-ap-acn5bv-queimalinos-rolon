import { useRef, useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { useAchievementsCatalog } from '@/hooks/achievements/useStudentGamification';
import { useCreateChallenge } from '@/hooks/challenges/useChallenges';
import { DEFAULT_CHALLENGE_FORM, toChallengeBody, validateChallengeForm } from '@/utils/challenges/challengeForm';
import { fieldErrorsFrom } from '@/utils/fieldErrors';
import ChallengeFormFields from './ChallengeFormFields';

const FIELDS = ['name', 'goal_type', 'goal_value', 'duration_days', 'description'];
const FORM_ID = 'new-challenge-form';

/**
 * Alta de un desafío propio (un solo POST aunque se haga doble clic). Valida como el backend y muestra por
 * campo los errores del 400. Al guardar llama a `onCreated(desafío)`: la página abre el diálogo de asignar.
 */
export default function NewChallengeDialog({ open, onClose, onCreated }) {
  const catalog = useAchievementsCatalog();
  const create = useCreateChallenge();
  const sending = useRef(false);
  const [values, setValues] = useState(DEFAULT_CHALLENGE_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const rewardId = catalog.data?.find((a) => a.code === 'CHALLENGE_DONE')?.id;

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending.current) return;
    const invalid = validateChallengeForm(values);
    setErrors(invalid);
    setFormError(null);
    if (Object.keys(invalid).length > 0) return;
    sending.current = true;
    try {
      onCreated(await create.mutateAsync(toChallengeBody(values, rewardId)));
    } catch (err) {
      sending.current = false;
      const { form, fields } = fieldErrorsFrom(err, { fields: FIELDS, fallback: 'No pudimos crear el desafío' });
      setErrors(fields);
      setFormError(form);
    }
  }

  return (
    <Dialog
      open={open}
      dismissible={!create.isPending}
      onOpenChange={(next) => !next && onClose()}
      title="Nuevo desafío"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={catalog.isPending} loading={create.isPending}>
            Crear
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit}>
        {formError && (
          <p
            role="alert"
            className="mb-3 rounded-md border border-hot/25 bg-hot/[0.14] px-3 py-2.5 font-body text-sm text-hot"
          >
            {formError}
          </p>
        )}
        <ChallengeFormFields values={values} errors={errors} onChange={handleChange} withReward={Boolean(rewardId)} />
      </form>
    </Dialog>
  );
}
