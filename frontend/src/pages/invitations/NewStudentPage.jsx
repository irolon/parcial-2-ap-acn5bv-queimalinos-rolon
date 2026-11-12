import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createInvitation } from '@/api/invitations/invitations.api';
import SharePanel from '@/components/invitations/SharePanel';
import StudentForm from '@/components/invitations/StudentForm';
import { TEMPLATES_KEY } from '@/hooks/routine-templates/useRoutineTemplates';
import { NO_FIELD_ERRORS } from '@/utils/fieldErrors';
import { buildInvitationBody, toInvitationErrors, validateInvitationBody } from './invitationForm';

/**
 * Invitar alumno: el entrenador carga los datos, se crea la invitación
 * (`POST /invitations`, por mail y WhatsApp) y se muestra el QR para compartir.
 */
export default function NewStudentPage() {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState(NO_FIELD_ERRORS);
  const [submitting, setSubmitting] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const formRef = useRef(null);
  const focusForm = useRef(false);

  // Tras "Generar otro" el formulario se remonta: el foco vuelve a su primer campo.
  useEffect(() => {
    if (!focusForm.current) return;
    focusForm.current = false;
    formRef.current?.querySelector('input[name="student_name"]')?.focus();
  }, [formKey]);

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
      // La plantilla se borró en otra pestaña: se recargan y el campo suelta la que ya no está.
      if (error?.code === 'TEMPLATE_NOT_FOUND') queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setGenerated(null);
    setErrors(NO_FIELD_ERRORS);
    focusForm.current = true;
    setFormKey((key) => key + 1);
  }

  return (
    <div ref={formRef} className="mx-auto grid max-w-[960px] grid-cols-1 gap-7 lg:grid-cols-2">
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
