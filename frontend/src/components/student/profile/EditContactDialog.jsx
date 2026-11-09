import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Input from '@/components/shared/ui/Input';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useUpdateStudent } from '@/hooks/students/useStudents';
import { NO_FIELD_ERRORS, fieldErrorsFrom } from '@/utils/fieldErrors';
import { validatePhone } from '@/utils/students/phone';
import { validateStudentBody } from '@/utils/students/studentForm';

const FORM_ID = 'edit-contact-form';

/** Body del PATCH con solo lo que cambió; el teléfono vaciado va como `null`. */
function contactBody(formData, student) {
  const text = (name) => String(formData.get(name) ?? '').trim();
  const body = {};
  if (text('name') !== (student.name ?? '')) body.name = text('name');
  if (text('phone') !== (student.phone ?? '')) body.phone = text('phone') || null;
  return body;
}

function validateContact(body) {
  const errors = { ...validateStudentBody('name' in body ? { name: body.name } : {}) };
  const phoneError = body.phone ? validatePhone(body.phone) : null;
  if (phoneError) errors.phone = phoneError;
  return errors;
}

/** El alumno edita su nombre y su teléfono (GX2); objetivo y nivel siguen siendo del entrenador/a. */
export default function EditContactDialog({ student, onClose }) {
  const [errors, setErrors] = useState(NO_FIELD_ERRORS);
  const update = useUpdateStudent(student.id);
  const updateUser = useAuthStore((state) => state.updateUser);
  const saving = update.isPending;
  const { fields } = errors;

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    const body = contactBody(new FormData(event.currentTarget), student);
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    const clientErrors = validateContact(body);
    if (Object.keys(clientErrors).length > 0) {
      setErrors({ form: null, fields: clientErrors });
      return;
    }
    setErrors(NO_FIELD_ERRORS);
    try {
      const saved = await update.mutateAsync(body);
      updateUser({ name: saved?.name ?? body.name ?? student.name });
      onClose();
    } catch (error) {
      setErrors(fieldErrorsFrom(error, { fields: ['name', 'phone'], fallback: 'No pudimos guardar los cambios' }));
    }
  }

  return (
    <Dialog
      open
      dismissible={!saving}
      onOpenChange={(next) => !next && onClose()}
      title="Editar datos"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {errors.form && (
          <p
            role="alert"
            className="rounded-md border border-hot/25 bg-hot/[0.14] px-3 py-2.5 font-body text-sm text-hot"
          >
            {errors.form}
          </p>
        )}
        <Input
          label="Nombre y apellido"
          name="name"
          autoComplete="name"
          defaultValue={student.name ?? ''}
          error={fields.name}
        />
        <Input
          label="Teléfono"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={student.phone ?? ''}
          error={fields.phone}
        />
      </form>
    </Dialog>
  );
}
