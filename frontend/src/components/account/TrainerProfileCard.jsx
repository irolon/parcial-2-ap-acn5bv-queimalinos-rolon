import { useState } from 'react';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import Input from '@/components/shared/ui/Input';
import { useTrainerProfile } from '@/hooks/account/useTrainerProfile';
import { NO_FIELD_ERRORS, fieldErrorsFrom } from '@/utils/fieldErrors';

const FIELDS = ['name', 'professional_title'];

const initialValues = (me) => ({ name: me.name ?? '', professional_title: me.professional_title ?? '' });

/** Lo que cambió respecto de lo guardado (recortado); el título vaciado va como `null`. */
function changesFrom(values, me) {
  const saved = initialValues(me);
  const body = {};
  const name = values.name.trim();
  const title = values.professional_title.trim();
  if (name !== saved.name) body.name = name;
  if (title !== saved.professional_title) body.professional_title = title || null;
  return body;
}

function ProfileForm({ me, save, saving }) {
  const [values, setValues] = useState(() => initialValues(me));
  const [errors, setErrors] = useState(NO_FIELD_ERRORS);
  const body = changesFrom(values, me);
  const dirty = Object.keys(body).length > 0;
  const setField = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!dirty || saving) return;
    setErrors(NO_FIELD_ERRORS);
    try {
      await save(body);
    } catch (error) {
      setErrors(fieldErrorsFrom(error, { fields: FIELDS, fallback: 'No pudimos guardar los cambios' }));
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {errors.form && (
        <p role="alert" className="rounded-md border border-hot/25 bg-hot/[0.14] px-3 py-2.5 font-body text-sm text-hot">
          {errors.form}
        </p>
      )}
      <Input
        label="Nombre"
        name="name"
        autoComplete="name"
        value={values.name}
        onChange={setField('name')}
        error={errors.fields.name}
      />
      <Input
        label="Título profesional"
        name="professional_title"
        autoComplete="off"
        placeholder="Ej.: Lic. en Educación Física"
        hint="Lo ven tus alumnos en su perfil"
        value={values.professional_title}
        onChange={setField('professional_title')}
        error={errors.fields.professional_title}
      />
      <Button type="submit" className="self-start" disabled={!dirty} loading={saving}>
        Guardar
      </Button>
    </form>
  );
}

/** "Tu perfil" en Tu cuenta (GX2): el PT cambia su nombre y su título profesional, que ven sus alumnos. */
export default function TrainerProfileCard() {
  const { query, save, saving } = useTrainerProfile();
  let content;
  if (query.isPending) content = <LoadingState rows={2} label="Cargando tu perfil…" />;
  else if (query.isError && !query.data) {
    content = <ErrorState message="No pudimos cargar tu perfil." onRetry={() => query.refetch()} />;
  } else content = <ProfileForm me={query.data} save={save} saving={saving} />;

  return (
    <section aria-label="Tu perfil">
      <Card title="Tu perfil">{content}</Card>
    </section>
  );
}
