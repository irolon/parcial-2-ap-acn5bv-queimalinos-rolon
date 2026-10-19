import { useState } from 'react';
import { createInvitation } from '@/api/invitations/invitations.api';
import SharePanel from '@/components/invitations/SharePanel';
import StudentForm from '@/components/invitations/StudentForm';
import { NO_FIELD_ERRORS } from '@/utils/fieldErrors';
import { buildInvitationBody, toInvitationErrors, validateInvitationBody } from './invitationForm';

/**
 * Invitar alumno: el entrenador carga los datos, se crea la invitación
 * (`POST /invitations`, por mail y WhatsApp) y se muestra el QR para compartir.
 */
export default function NewStudentPage() {
  const [errors, setErrors] = useState(NO_FIELD_ERRORS);
  const [submitting, setSubmitting] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(event) {
    event.preventDefault();
    const body = buildInvitationBody(new FormData(event.currentTarget));
    const clientErrors = validateInvitationBody(body);
    if (Object.keys(clientErrors).length > 0) {
      setErrors({ form: null, fields: clientErrors });
      return;
    }
    setErrors(NO_FIELD_ERRORS);
    setSubmitting(true);
    try {
      const invitation = await createInvitation(body);
      setGenerated({ invitation, studentName: body.student_name });
    } catch (error) {
      setErrors(toInvitationErrors(error));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setGenerated(null);
    setErrors(NO_FIELD_ERRORS);
    setFormKey((key) => key + 1);
  }

  return (
    <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-7 lg:grid-cols-2">
      <StudentForm
        key={formKey}
        errors={errors}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
      <SharePanel
        invitation={generated?.invitation}
        studentName={generated?.studentName}
        onReset={reset}
      />
    </div>
  );
}
